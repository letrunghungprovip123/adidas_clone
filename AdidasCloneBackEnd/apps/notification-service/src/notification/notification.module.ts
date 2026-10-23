import {
  Controller, Get, Injectable, Logger, Module, OnModuleDestroy, OnModuleInit,
  ServiceUnavailableException
} from '@nestjs/common';
import amqp from 'amqplib';
import type { Channel, ChannelModel, ConfirmChannel, ConsumeMessage } from 'amqplib';
import nodemailer from 'nodemailer';
import { createHash } from 'node:crypto';
import { EVENTS } from '../../../../libs/contracts/src';

type EventEnvelope = {
  contract_version: number;
  message_id: string;
  correlation_id: string;
  occurred_at: string;
  actor?: unknown;
  payload: Record<string, unknown>;
};
type Stream = 'identity' | 'order';
type NotificationMail = { to: string; subject: string; text: string; html: string };
type RetryStage = { seconds: number; queue: string; routingKey: string };
const RETRIES: RetryStage[] = [
  { seconds: 5, queue: 'notification.identity.retry.5s.q', routingKey: 'identity.5s' },
  { seconds: 30, queue: 'notification.identity.retry.30s.q', routingKey: 'identity.30s' },
  { seconds: 120, queue: 'notification.identity.retry.120s.q', routingKey: 'identity.120s' }
];
const ORDER_RETRIES: RetryStage[] = [
  { seconds: 5, queue: 'notification.order.retry.5s.q', routingKey: 'order.5s' },
  { seconds: 30, queue: 'notification.order.retry.30s.q', routingKey: 'order.30s' },
  { seconds: 120, queue: 'notification.order.retry.120s.q', routingKey: 'order.120s' }
];
const IDENTITY_QUEUE = 'notification.identity-events.q';
const ORDER_QUEUE = 'notification.order-events.q';
const RETRY_EXCHANGE = 'notification.retry';
const DEAD_LETTER_EXCHANGE = 'notification.dlx';

class PermanentNotificationError extends Error {
  constructor(readonly reasonCode: string) {
    super(reasonCode);
  }
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => {
    switch (character) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      default: return '&#39;';
    }
  });
}
function requiredString(payload: Record<string, unknown>, key: string, max = 1000): string {
  const value = payload[key];
  if (typeof value !== 'string' || !value.trim() || value.length > max) {
    throw new PermanentNotificationError('INVALID_' + key.toUpperCase());
  }
  return value.trim();
}
function emailAddress(value: unknown): string {
  if (typeof value !== 'string' || value.length > 254) {
    throw new PermanentNotificationError('INVALID_RECIPIENT');
  }
  const email = value.trim();
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) {
    throw new PermanentNotificationError('INVALID_RECIPIENT');
  }
  return email;
}
function safeToken(payload: Record<string, unknown>): string {
  const token = requiredString(payload, 'token', 200);
  if (!/^[A-Za-z0-9_-]{32,200}$/.test(token)) {
    throw new PermanentNotificationError('INVALID_CHALLENGE_TOKEN');
  }
  return token;
}
function htmlDocument(title: string, body: string, action?: { label: string; href: string }): string {
  const button = action
    ? '<p style="margin:28px 0"><a href="' + escapeHtml(action.href) +
      '" style="background:#111;color:#fff;padding:13px 20px;border-radius:4px;text-decoration:none;display:inline-block">' +
      escapeHtml(action.label) + '</a></p><p>If the button does not work, copy this link into your browser:<br>' +
      '<a href="' + escapeHtml(action.href) + '">' + escapeHtml(action.href) + '</a></p>'
    : '';
  return '<!doctype html><html><body style="margin:0;background:#f7f7f7;font-family:Arial,Helvetica,sans-serif;color:#222">' +
    '<main style="max-width:600px;margin:24px auto;padding:32px;background:#fff">' +
    '<p style="font-weight:700;letter-spacing:1px">ADIDAS CLONE</p><h1 style="font-size:24px">' +
    escapeHtml(title) + '</h1><div style="font-size:15px;line-height:1.6">' + body + '</div>' +
    button + '<hr style="border:0;border-top:1px solid #eee;margin-top:32px">' +
    '<p style="font-size:12px;color:#666">This is an automated message. Replies are not monitored.</p>' +
    '</main></body></html>';
}
function actionUrl(path: string, token: string): string {
  const configured = process.env.V2_NOTIFICATION_PUBLIC_WEB_URL || 'http://localhost:3000';
  let base: URL;
  try { base = new URL(configured); }
  catch { throw new PermanentNotificationError('INVALID_PUBLIC_WEB_URL'); }
  if (base.username || base.password ||
      (base.protocol !== 'https:' &&
        !(process.env.NODE_ENV !== 'production' && base.protocol === 'http:' &&
          ['localhost', '127.0.0.1'].includes(base.hostname)))) {
    throw new PermanentNotificationError('INSECURE_PUBLIC_WEB_URL');
  }
  const result = new URL('/' + path.replace(/^\/+/, ''), base);
  result.searchParams.set('token', token);
  return result.toString();
}
function parseSafeAmount(value: unknown, key: string): number {
  const amount = typeof value === 'number' ? value :
    (typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : NaN);
  if (!Number.isSafeInteger(amount) || amount < 0) {
    throw new PermanentNotificationError('INVALID_' + key.toUpperCase());
  }
  return amount;
}
function money(amountMinor: number, currency: string): string {
  const normalized = currency.toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalized)) throw new PermanentNotificationError('INVALID_CURRENCY');
  try {
    const digits = normalized === 'VND' || normalized === 'JPY' || normalized === 'KRW' ? 0 : 2;
    const divisor = digits === 0 ? 1 : 100;
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency', currency: normalized, maximumFractionDigits: digits,
      minimumFractionDigits: digits
    }).format(amountMinor / divisor);
  } catch {
    throw new PermanentNotificationError('INVALID_CURRENCY');
  }
}

@Injectable()
export class NotificationWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationWorker.name);
  private connection?: ChannelModel;
  private consumer?: Channel;
  private publisher?: ConfirmChannel;
  private transporter?: ReturnType<typeof nodemailer.createTransport>;
  private reconnectTimer?: NodeJS.Timeout;
  private connecting = false;
  private connected = false;
  private shuttingDown = false;

  async onModuleInit(): Promise<void> {
    if (process.env.V2_NOTIFICATION_RMQ_ENABLED !== 'true') return;
    this.transporter = this.createTransport();
    if (process.env.V2_NOTIFICATION_VERIFY_SMTP === 'true' || process.env.NODE_ENV === 'production') {
      await this.transporter.verify();
    }
    await this.connectBroker();
  }

  private createTransport(): ReturnType<typeof nodemailer.createTransport> {
    const host = process.env.V2_NOTIFICATION_SMTP_HOST?.trim();
    const port = Number(process.env.V2_NOTIFICATION_SMTP_PORT || 587);
    const from = process.env.V2_NOTIFICATION_EMAIL_FROM?.trim();
    const user = process.env.V2_NOTIFICATION_SMTP_USER || '';
    const password = process.env.V2_NOTIFICATION_SMTP_PASSWORD || '';
    const secure = process.env.V2_NOTIFICATION_SMTP_SECURE === 'true';
    if (!host || !Number.isInteger(port) || port < 1 || port > 65535 || !from) {
      throw new Error('Notification SMTP host, port and sender address are required');
    }
    emailAddress(from);
    if (Boolean(user) !== Boolean(password)) {
      throw new Error('Notification SMTP username and password must be configured together');
    }
    if (process.env.NODE_ENV === 'production' && !secure && !user) {
      throw new Error('Production Notification requires authenticated SMTP or implicit TLS');
    }
    return nodemailer.createTransport({
      host, port, secure,
      ...(user && password ? { auth: { user, pass: password } } : {}),
      requireTLS: process.env.NODE_ENV === 'production' && !secure,
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 20000,
      tls: { minVersion: 'TLSv1.2' },
      pool: true,
      maxConnections: 3,
      maxMessages: 100,
      rateDelta: 1000,
      rateLimit: 5
    });
  }

  private brokerUrl(): string {
    const host = process.env.V2_NOTIFICATION_RMQ_HOST || 'rabbitmq';
    const port = Number(process.env.V2_NOTIFICATION_RMQ_PORT || 5672);
    const user = process.env.V2_NOTIFICATION_RMQ_USER;
    const password = process.env.V2_NOTIFICATION_RMQ_PASSWORD;
    if (!user || !password) throw new Error('Notification RabbitMQ credentials are required');
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error('Notification RabbitMQ port is invalid');
    }
    return 'amqp://' + encodeURIComponent(user) + ':' + encodeURIComponent(password) +
      '@' + host + ':' + port;
  }

  private async connectBroker(): Promise<void> {
    if (this.connecting || this.connected || this.shuttingDown) return;
    this.connecting = true;
    let connection: ChannelModel | undefined;
    try {
      connection = await amqp.connect(this.brokerUrl());
      connection.on('error', () => {
        this.logger.warn('Notification RabbitMQ connection error; reconnect scheduled');
      });
      connection.on('close', () => {
        this.connected = false;
        if (this.connection === connection) {
          this.connection = undefined;
          this.consumer = undefined;
          this.publisher = undefined;
        }
        this.scheduleReconnect();
      });
      const consumer = await connection.createChannel();
      const publisher = await connection.createConfirmChannel();
      await this.declareTopology(consumer);
      await consumer.prefetch(10);
      this.connection = connection;
      this.consumer = consumer;
      this.publisher = publisher;
      await consumer.consume(IDENTITY_QUEUE, message => {
        if (message) void this.handleMessage('identity', message);
      }, { noAck: false });
      await consumer.consume(ORDER_QUEUE, message => {
        if (message) void this.handleMessage('order', message);
      }, { noAck: false });
      this.connected = true;
      if (this.reconnectTimer) {
        clearInterval(this.reconnectTimer);
        this.reconnectTimer = undefined;
      }
      this.logger.log('Notification RabbitMQ consumers connected');
    } catch (error) {
      if (connection) await connection.close().catch(() => undefined);
      throw error;
    } finally {
      this.connecting = false;
    }
  }

  private scheduleReconnect(): void {
    if (this.shuttingDown || this.reconnectTimer) return;
    this.reconnectTimer = setInterval(() => {
      if (this.connected || this.connecting || this.shuttingDown) return;
      void this.connectBroker().catch(() => {
        this.logger.warn('Notification RabbitMQ reconnect failed; retry scheduled');
      });
    }, 5000);
    this.reconnectTimer.unref();
  }

  private async declareTopology(channel: Channel): Promise<void> {
    await channel.assertExchange('commerce.events', 'topic', { durable: true });
    await channel.assertExchange(RETRY_EXCHANGE, 'direct', { durable: true });
    await channel.assertExchange(DEAD_LETTER_EXCHANGE, 'direct', { durable: true });

    await channel.assertQueue(IDENTITY_QUEUE, { durable: true });
    await channel.assertQueue(ORDER_QUEUE, { durable: true });
    await channel.assertQueue('notification.identity-events.dlq', { durable: true });
    await channel.assertQueue('notification.order-events.dlq', { durable: true });
    await channel.bindQueue('notification.identity-events.dlq', DEAD_LETTER_EXCHANGE, 'notification.identity.failed');
    await channel.bindQueue('notification.order-events.dlq', DEAD_LETTER_EXCHANGE, 'notification.order.failed');

    await channel.bindQueue(IDENTITY_QUEUE, 'commerce.events', EVENTS.identityEmailVerificationRequested);
    await channel.bindQueue(IDENTITY_QUEUE, 'commerce.events', EVENTS.identityPasswordResetRequested);
    await channel.bindQueue(IDENTITY_QUEUE, 'commerce.events', EVENTS.identityWelcomeEmailRequested);
    await channel.bindQueue(IDENTITY_QUEUE, 'commerce.events', 'notification.identity.retry');
    await channel.bindQueue(ORDER_QUEUE, 'commerce.events', EVENTS.orderConfirmed);
    await channel.bindQueue(ORDER_QUEUE, 'commerce.events', 'notification.order.retry');

    await this.declareRetries(channel, 'identity', RETRIES);
    await this.declareRetries(channel, 'order', ORDER_RETRIES);
  }

  private async declareRetries(channel: Channel, stream: Stream, stages: RetryStage[]): Promise<void> {
    for (const stage of stages) {
      const queue = stream === 'identity' ? stage.queue : stage.queue.replace('identity', 'order');
      const routingKey = stage.routingKey.replace('identity', stream);
      await channel.assertQueue(queue, {
        durable: true,
        arguments: {
          'x-message-ttl': stage.seconds * 1000,
          'x-dead-letter-exchange': 'commerce.events',
          'x-dead-letter-routing-key': 'notification.' + stream + '.retry'
        }
      });
      await channel.bindQueue(queue, RETRY_EXCHANGE, routingKey);
    }
  }

  private eventType(stream: Stream, message: ConsumeMessage): string {
    const headers = message.properties.headers || {};
    const candidate = message.properties.type ||
      (typeof headers['x-notification-event-type'] === 'string'
        ? headers['x-notification-event-type'] : message.fields.routingKey);
    const allowed: readonly string[] = stream === 'identity'
      ? [
          EVENTS.identityEmailVerificationRequested,
          EVENTS.identityPasswordResetRequested,
          EVENTS.identityWelcomeEmailRequested
        ]
      : [EVENTS.orderConfirmed];
    if (typeof candidate !== 'string' || !allowed.includes(candidate)) {
      throw new PermanentNotificationError('UNSUPPORTED_EVENT_TYPE');
    }
    return candidate;
  }

  private envelope(message: ConsumeMessage): EventEnvelope {
    let value: unknown;
    try { value = JSON.parse(message.content.toString('utf8')); }
    catch { throw new PermanentNotificationError('INVALID_JSON'); }
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new PermanentNotificationError('INVALID_ENVELOPE');
    }
    const envelope = value as Record<string, unknown>;
    if (envelope.contract_version !== 1 ||
        typeof envelope.message_id !== 'string' || envelope.message_id.length < 8 ||
        envelope.message_id.length > 180 ||
        typeof envelope.correlation_id !== 'string' ||
        typeof envelope.occurred_at !== 'string' || !Number.isFinite(Date.parse(envelope.occurred_at)) ||
        !envelope.payload || typeof envelope.payload !== 'object' || Array.isArray(envelope.payload)) {
      throw new PermanentNotificationError('INVALID_ENVELOPE');
    }
    return envelope as unknown as EventEnvelope;
  }

  private emailFor(stream: Stream, eventType: string, envelope: EventEnvelope): NotificationMail {
    const payload = envelope.payload;
    const to = emailAddress(payload.email ?? payload.contact_email);
    const firstName = typeof payload.name === 'string' && payload.name.trim()
      ? payload.name.trim().slice(0, 100) : 'there';

    if (eventType === EVENTS.identityWelcomeEmailRequested) {
      const html = htmlDocument('Welcome', '<p>Hello ' + escapeHtml(firstName) +
        ',</p><p>Welcome to Adidas Clone. Your account has been created successfully.</p>' +
        '<p>Use the email verification message to confirm your email address.</p>');
      return { to, subject: 'Welcome to Adidas Clone', text:
        'Hello ' + firstName + ',\n\nWelcome to Adidas Clone. Your account has been created successfully.\n',
        html };
    }

    if (eventType === EVENTS.identityEmailVerificationRequested) {
      const token = safeToken(payload);
      const expiresAt = Date.parse(requiredString(payload, 'expires_at', 80));
      if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
        throw new PermanentNotificationError('EMAIL_VERIFICATION_EXPIRED');
      }
      const href = actionUrl('verify-email', token);
      return {
        to, subject: 'Verify your Adidas Clone email address',
        text: 'Verify your email address using this link: ' + href +
          '\nThis link expires at ' + new Date(expiresAt).toISOString() + '.\n',
        html: htmlDocument('Verify your email address',
          '<p>Confirm that this email address belongs to you. The link expires at ' +
          escapeHtml(new Date(expiresAt).toISOString()) + '.</p>',
          { label: 'Verify email address', href })
      };
    }

    if (eventType === EVENTS.identityPasswordResetRequested) {
      const token = safeToken(payload);
      const expiresAt = Date.parse(requiredString(payload, 'expires_at', 80));
      if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
        throw new PermanentNotificationError('PASSWORD_RESET_EXPIRED');
      }
      const href = actionUrl('reset-password', token);
      return {
        to, subject: 'Reset your Adidas Clone password',
        text: 'A password reset was requested for your account. Use this link to continue: ' + href +
          '\nIf you did not request this, ignore this email. The link expires at ' +
          new Date(expiresAt).toISOString() + '.\n',
        html: htmlDocument('Reset your password',
          '<p>A password reset was requested for your account. If you did not request it, you can ignore this email.</p>' +
          '<p>The link expires at ' + escapeHtml(new Date(expiresAt).toISOString()) + '.</p>',
          { label: 'Reset password', href })
      };
    }

    if (stream === 'order' && eventType === EVENTS.orderConfirmed) {
      const orderIdValue = payload.order_id ?? payload.id;
      const orderId = typeof orderIdValue === 'number' || typeof orderIdValue === 'string'
        ? String(orderIdValue) : '';
      if (!/^[A-Za-z0-9_-]{1,100}$/.test(orderId)) {
        throw new PermanentNotificationError('INVALID_ORDER_ID');
      }
      const total = parseSafeAmount(payload.total_minor, 'total_minor');
      const currency = typeof payload.currency === 'string' ? payload.currency : 'VND';
      const totalText = money(total, currency);
      const rawItems = payload.items;
      if (rawItems !== undefined && (!Array.isArray(rawItems) || rawItems.length > 100)) {
        throw new PermanentNotificationError('INVALID_ORDER_ITEMS');
      }
      const items = (Array.isArray(rawItems) ? rawItems : []).map((item: unknown) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
          throw new PermanentNotificationError('INVALID_ORDER_ITEM');
        }
        const row = item as Record<string, unknown>;
        const name = typeof row.product_name === 'string' ? row.product_name :
          (typeof row.name === 'string' ? row.name : 'Item');
        const quantity = parseSafeAmount(row.quantity, 'item_quantity');
        if (quantity < 1 || quantity > 1000) throw new PermanentNotificationError('INVALID_ITEM_QUANTITY');
        const subtotalValue = row.line_total_minor ?? row.line_total;
        const subtotal = parseSafeAmount(subtotalValue, 'line_total');
        return { name: name.slice(0, 200), quantity, subtotal };
      });
      const rowsText = items.map(item => item.name + ' × ' + item.quantity + ' — ' +
        money(item.subtotal, currency)).join('\n');
      const rowsHtml = items.map(item => '<li>' + escapeHtml(item.name) + ' × ' + item.quantity +
        ' — ' + escapeHtml(money(item.subtotal, currency)) + '</li>').join('');
      const bodyText = 'Your order #' + orderId + ' has been confirmed.\n\n' +
        (rowsText ? rowsText + '\n\n' : '') + 'Order total: ' + totalText + '\n';
      const bodyHtml = '<p>Hello ' + escapeHtml(firstName) + ',</p><p>Your order <strong>#' +
        escapeHtml(orderId) + '</strong> has been confirmed.</p>' +
        (rowsHtml ? '<ul>' + rowsHtml + '</ul>' : '') +
        '<p><strong>Order total: ' + escapeHtml(totalText) + '</strong></p>';
      return { to, subject: 'Order #' + orderId + ' confirmed', text: bodyText,
        html: htmlDocument('Order confirmed', bodyHtml) };
    }

    throw new PermanentNotificationError('UNSUPPORTED_EVENT_TYPE');
  }

  private messageId(envelope: EventEnvelope, eventType: string): string {
    const sender = process.env.V2_NOTIFICATION_EMAIL_FROM || 'no-reply@example.invalid';
    const domain = sender.split('@').at(-1)?.replace(/[^\w.-]/g, '') || 'example.invalid';
    const digest = sha256(eventType + '\u0000' + envelope.message_id).slice(0, 40);
    return '<' + digest + '@' + domain + '>';
  }

  private isTransient(error: unknown): boolean {
    if (error instanceof PermanentNotificationError) return false;
    const failure = error && typeof error === 'object'
      ? error as { code?: unknown; responseCode?: unknown; permanent?: unknown } : {};
    if (failure.permanent === true) return false;
    if (failure.permanent === false) return true;
    const responseCode = Number(failure.responseCode);
    if (Number.isFinite(responseCode) && responseCode >= 500 && responseCode < 600) return false;
    if (Number.isFinite(responseCode) && responseCode >= 400 && responseCode < 500) return true;
    return true; // Unknown transport failures receive a bounded retry before dead-lettering.
  }

  private async sendMail(stream: Stream, message: ConsumeMessage): Promise<void> {
    if (!this.transporter) throw new Error('Notification mail transport unavailable');
    const envelope = this.envelope(message);
    const eventType = this.eventType(stream, message);
    const email = this.emailFor(stream, eventType, envelope);
    const info = await this.transporter.sendMail({
      from: process.env.V2_NOTIFICATION_EMAIL_FROM,
      to: email.to,
      subject: email.subject,
      text: email.text,
      html: email.html,
      messageId: this.messageId(envelope, eventType),
      headers: {
        'X-Notification-Event-Type': eventType,
        'X-Notification-Event-ID': sha256(envelope.message_id)
      }
    });
    if (!info.accepted || info.accepted.length === 0) {
      throw new PermanentNotificationError('SMTP_RECIPIENT_REJECTED');
    }
    this.logger.log('Email accepted by SMTP event=' + eventType +
      ' event_ref=' + sha256(envelope.message_id).slice(0, 16));
  }

  private async deadLetter(stream: Stream, message: ConsumeMessage, reasonCode: string): Promise<void> {
    if (!this.publisher || !this.consumer) throw new Error('Notification channels unavailable');
    const eventType = typeof message.properties.type === 'string'
      ? message.properties.type : 'unknown';
    this.publisher.publish(DEAD_LETTER_EXCHANGE, 'notification.' + stream + '.failed',
      message.content, {
        persistent: true,
        contentType: message.properties.contentType || 'application/json',
        messageId: message.properties.messageId || undefined,
        correlationId: message.properties.correlationId || undefined,
        type: eventType,
        headers: { ...(message.properties.headers || {}), 'x-notification-failure-code': reasonCode }
      });
    await this.publisher.waitForConfirms();
    this.consumer.ack(message);
    this.logger.warn('Notification event moved to DLQ stream=' + stream + ' reason=' + reasonCode);
  }

  private async retryLater(stream: Stream, message: ConsumeMessage): Promise<void> {
    if (!this.publisher || !this.consumer) throw new Error('Notification channels unavailable');
    const envelope = this.envelope(message);
    const eventType = this.eventType(stream, message);
    const prior = message.properties.headers?.['x-notification-retry'];
    const retryCount = typeof prior === 'number' && Number.isSafeInteger(prior) && prior >= 0
      ? prior : (typeof prior === 'string' && /^\d+$/.test(prior) ? Number(prior) : 0);
    const stages = stream === 'identity' ? RETRIES : ORDER_RETRIES;
    if (retryCount >= stages.length) {
      await this.deadLetter(stream, message, 'RETRIES_EXHAUSTED');
      return;
    }
    const stage = stages[retryCount];
    const headers = {
      ...(message.properties.headers || {}),
      'x-notification-retry': retryCount + 1,
      'x-notification-event-type': eventType,
      'x-notification-stream': stream
    };
    this.publisher.publish(RETRY_EXCHANGE, stage.routingKey.replace('identity', stream),
      message.content, {
        persistent: true,
        contentType: 'application/json',
        messageId: envelope.message_id,
        correlationId: envelope.correlation_id,
        type: eventType,
        headers
      });
    await this.publisher.waitForConfirms();
    this.consumer.ack(message);
    this.logger.warn('Notification delivery scheduled for retry stream=' + stream +
      ' delay_seconds=' + stage.seconds + ' event_ref=' + sha256(envelope.message_id).slice(0, 16));
  }

  private async handleMessage(stream: Stream, message: ConsumeMessage): Promise<void> {
    try {
      await this.sendMail(stream, message);
      this.consumer?.ack(message);
    } catch (error) {
      try {
        if (error instanceof PermanentNotificationError) {
          await this.deadLetter(stream, message, error.reasonCode);
          return;
        }
        if (this.isTransient(error)) {
          await this.retryLater(stream, message);
          return;
        }
        await this.deadLetter(stream, message, 'PERMANENT_DELIVERY_FAILURE');
      } catch {
        // Leave the original message unacknowledged when retry/DLQ publication cannot be confirmed.
        try { this.consumer?.nack(message, false, true); } catch { /* connection closure will requeue */ }
      }
    }
  }

  health(): { consumerEnabled: boolean; connected: boolean } {
    return {
      consumerEnabled: process.env.V2_NOTIFICATION_RMQ_ENABLED === 'true',
      connected: this.connected
    };
  }

  async onModuleDestroy(): Promise<void> {
    this.shuttingDown = true;
    if (this.reconnectTimer) clearInterval(this.reconnectTimer);
    this.transporter?.close();
    await this.consumer?.close().catch(() => undefined);
    await this.publisher?.close().catch(() => undefined);
    await this.connection?.close().catch(() => undefined);
  }
}

@Controller('health')
export class NotificationHealthController {
  constructor(private readonly worker: NotificationWorker) {}
  @Get('live') live() { return { status: 'ok' }; }
  @Get('ready') ready() {
    const status = this.worker.health();
    if (status.consumerEnabled && !status.connected) {
      throw new ServiceUnavailableException('Notification RabbitMQ consumer unavailable');
    }
    return {
      status: 'ok',
      info: {
        notification: { status: 'up' },
        rabbitmq: { status: status.connected ? 'up' : (status.consumerEnabled ? 'down' : 'disabled') }
      }
    };
  }
}

@Module({
  controllers: [NotificationHealthController],
  providers: [NotificationWorker],
  exports: [NotificationWorker]
})
export class NotificationModule {}
