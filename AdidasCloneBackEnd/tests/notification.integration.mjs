import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
import amqp from 'amqplib';

function createSmtpSink() {
  const accepted = [];
  const attempts = new Map();
  const failOnce = new Set();
  const server = createServer(socket => {
    let buffer = '';
    let mode = 'command';
    let body = '';
    let recipients = [];
    socket.write('220 phase6-smtp.test ESMTP\r\n');
    socket.on('data', chunk => {
      buffer += chunk.toString('utf8');
      while (buffer.includes('\r\n')) {
        const split = buffer.indexOf('\r\n');
        const line = buffer.slice(0, split);
        buffer = buffer.slice(split + 2);
        if (mode === 'data') {
          if (line === '.') {
            mode = 'command';
            const recipient = recipients[0] || '';
            attempts.set(recipient, (attempts.get(recipient) || 0) + 1);
            if (failOnce.has(recipient)) {
              failOnce.delete(recipient);
              socket.write('451 4.3.0 Temporary test failure\r\n');
            } else {
              accepted.push({ recipient, raw: body });
              socket.write('250 2.0.0 queued\r\n');
            }
            body = '';
          } else {
            body += (line.startsWith('..') ? line.slice(1) : line) + '\r\n';
          }
          continue;
        }

        const command = line.split(' ', 1)[0].toUpperCase();
        if (command === 'EHLO' || command === 'HELO') {
          socket.write('250-phase6-smtp.test\r\n250 SIZE 10485760\r\n');
        } else if (command === 'MAIL') {
          recipients = [];
          socket.write('250 2.1.0 sender accepted\r\n');
        } else if (command === 'RCPT') {
          const match = line.match(/<([^>]+)>/);
          if (match) recipients.push(match[1].toLowerCase());
          socket.write('250 2.1.5 recipient accepted\r\n');
        } else if (command === 'DATA') {
          body = '';
          mode = 'data';
          socket.write('354 end with <CRLF>.<CRLF>\r\n');
        } else if (command === 'RSET' || command === 'NOOP') {
          socket.write('250 2.0.0 ok\r\n');
        } else if (command === 'QUIT') {
          socket.write('221 2.0.0 bye\r\n');
          socket.end();
        } else {
          socket.write('500 5.5.1 command unsupported\r\n');
        }
      }
    });
  });

  return {
    accepted,
    attempts,
    failRecipientOnce(recipient) { failOnce.add(recipient.toLowerCase()); },
    async listen() {
      server.listen(0, '127.0.0.1');
      await once(server, 'listening');
      return server.address().port;
    },
    async close() {
      if (!server.listening) return;
      server.close();
      await once(server, 'close');
    }
  };
}

function startProcess(environment, logs) {
  const child = spawn(process.execPath, ['dist/apps/notification-service/src/main.js'], {
    env: { ...process.env, ...environment },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  for (const stream of [child.stdout, child.stderr]) {
    stream.on('data', chunk => {
      logs.value = (logs.value + String(chunk)).slice(-12000);
    });
  }
  return child;
}

async function stopProcess(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exit = once(child, 'exit').catch(() => undefined);
  child.kill('SIGTERM');
  await Promise.race([exit, sleep(1500)]);
  if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
}

async function waitReady(child, logs) {
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error('Notification exited before readiness: ' + logs.value);
    try {
      const response = await fetch('http://127.0.0.1:4108/health/ready', {
        signal: AbortSignal.timeout(800)
      });
      if (response.ok) return;
    } catch {}
    await sleep(200);
  }
  throw new Error('Notification readiness timeout: ' + logs.value);
}

function makeEnvelope(eventType, payload) {
  const messageId = randomUUID();
  return {
    contract_version: 1,
    message_id: messageId,
    correlation_id: messageId,
    occurred_at: new Date().toISOString(),
    actor: { kind: 'system' },
    payload
  };
}

async function publish(channel, eventType, payload) {
  const envelope = makeEnvelope(eventType, payload);
  channel.publish('commerce.events', eventType, Buffer.from(JSON.stringify(envelope)), {
    persistent: true,
    contentType: 'application/json',
    messageId: envelope.message_id,
    correlationId: envelope.correlation_id,
    type: eventType
  });
  await channel.waitForConfirms();
  return envelope.message_id;
}

async function waitFor(predicate, message, timeoutMs = 20000) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    const value = await predicate();
    if (value) return value;
    await sleep(100);
  }
  throw new Error('Timed out waiting for ' + message);
}

test('Notification P6: identity/order templates, persistent RMQ ACK, bounded retry and DLQ',
  { timeout: 45000 }, async t => {
    const smtp = createSmtpSink();
    const smtpPort = await smtp.listen();
    const logs = { value: '' };
    let child;
    let connection;
    let channel;

    const brokerHost = process.env.V2_NOTIFICATION_RMQ_HOST || '127.0.0.1';
    const brokerPort = Number(process.env.V2_NOTIFICATION_RMQ_PORT || 5672);
    const brokerUser = process.env.V2_NOTIFICATION_RMQ_USER;
    const brokerPassword = process.env.V2_NOTIFICATION_RMQ_PASSWORD;
    assert.ok(brokerUser && brokerPassword, 'CI/local test must provide Notification RabbitMQ credentials');
    assert.ok(Number.isInteger(brokerPort) && brokerPort > 0 && brokerPort < 65536,
      'Notification RabbitMQ port must be valid');
    const brokerUrl = 'amqp://' + encodeURIComponent(brokerUser) + ':' +
      encodeURIComponent(brokerPassword) + '@' + brokerHost + ':' + brokerPort;

    try {
      child = startProcess({
        NODE_ENV: 'test',
        PORT: '4108',
        V2_NOTIFICATION_ENABLED: 'true',
        V2_NOTIFICATION_RMQ_ENABLED: 'true',
        V2_NOTIFICATION_RMQ_HOST: brokerHost,
        V2_NOTIFICATION_RMQ_PORT: String(brokerPort),
        V2_NOTIFICATION_RMQ_USER: brokerUser,
        V2_NOTIFICATION_RMQ_PASSWORD: brokerPassword,
        V2_NOTIFICATION_SMTP_HOST: '127.0.0.1',
        V2_NOTIFICATION_SMTP_PORT: String(smtpPort),
        V2_NOTIFICATION_SMTP_SECURE: 'false',
        V2_NOTIFICATION_EMAIL_FROM: 'no-reply@adidas-test.example',
        V2_NOTIFICATION_PUBLIC_WEB_URL: 'https://shop.example.test',
        V2_NOTIFICATION_VERIFY_SMTP: 'true'
      }, logs);
      await waitReady(child, logs);

      connection = await amqp.connect(brokerUrl);
      channel = await connection.createConfirmChannel();
      await channel.assertExchange('commerce.events', 'topic', { durable: true });
      await channel.assertQueue('notification.identity-events.dlq', { durable: true });
      await channel.assertQueue('notification.order-events.dlq', { durable: true });

      const suffix = randomUUID().replaceAll('-', '');
      const verificationEmail = 'verify-' + suffix + '@example.test';
      const resetEmail = 'reset-' + suffix + '@example.test';
      const welcomeEmail = 'welcome-' + suffix + '@example.test';
      const orderEmail = 'order-' + suffix + '@example.test';
      const retryEmail = 'retry-' + suffix + '@example.test';
      const token = 'phase6-token-' + suffix + '-verification_token';
      const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      await publish(channel, 'identity.email-verification.requested.v1', {
        account_id: 710001, email: verificationEmail, token, expires_at: future
      });
      await publish(channel, 'identity.password-reset.requested.v1', {
        account_id: 710002, email: resetEmail, token: 'reset_' + suffix + '_0123456789abcdef',
        expires_at: future
      });
      await publish(channel, 'identity.welcome-email.requested.v1', {
        account_id: 710003, email: welcomeEmail
      });
      await publish(channel, 'order.confirmed.v1', {
        order_id: 'phase6-' + suffix.slice(0, 16),
        contact_email: orderEmail,
        currency: 'VND',
        total_minor: 1234567,
        items: [{
          product_name: 'Sneaker <em>sale</em>',
          quantity: 2,
          line_total_minor: 1234567
        }]
      });

      smtp.failRecipientOnce(retryEmail);
      await publish(channel, 'identity.welcome-email.requested.v1', {
        account_id: 710004, email: retryEmail, name: 'Retry test'
      });

      await waitFor(() => smtp.accepted.some(m => m.recipient === verificationEmail),
        'verification email');
      await waitFor(() => smtp.accepted.some(m => m.recipient === resetEmail), 'reset email');
      await waitFor(() => smtp.accepted.some(m => m.recipient === welcomeEmail), 'welcome email');
      await waitFor(() => smtp.accepted.some(m => m.recipient === orderEmail), 'order confirmation email');
      await waitFor(() => smtp.accepted.some(m => m.recipient === retryEmail), 'retry email', 15000);

      // SMTP MIME may soft-wrap quoted-printable body lines and encode '=' as '=3D'.
      // Normalize those transport-level encodings before checking the actual rendered URLs.
      const decodeQuotedPrintable = value => value
        .replace(/=\r?\n/g, '')
        .replace(/=3D/gi, '=');
      const verificationRaw = decodeQuotedPrintable(
        smtp.accepted.find(m => m.recipient === verificationEmail).raw
      );
      assert.ok(verificationRaw.includes('https://shop.example.test/verify-email?token=' + token),
        'verification template must contain the absolute web verification link');
      const resetRaw = decodeQuotedPrintable(
        smtp.accepted.find(m => m.recipient === resetEmail).raw
      );
      assert.ok(resetRaw.includes('https://shop.example.test/reset-password?token=reset_' + suffix),
        'password-reset template must contain the absolute reset link');
      const welcomeRaw = smtp.accepted.find(m => m.recipient === welcomeEmail).raw;
      assert.ok(welcomeRaw.includes('Welcome to Adidas Clone'));
      const orderRaw = smtp.accepted.find(m => m.recipient === orderEmail).raw;
      assert.ok(orderRaw.includes('phase6-' + suffix.slice(0, 16)));
      const htmlStart = orderRaw.toLowerCase().indexOf('content-type: text/html');
      assert.ok(htmlStart >= 0, 'order confirmation must include an HTML MIME part');
      const htmlPart = decodeQuotedPrintable(orderRaw.slice(htmlStart));
      assert.ok(htmlPart.includes('&lt;em&gt;sale&lt;/em&gt;'),
        'HTML templates must escape untrusted product markup');
      assert.equal(htmlPart.includes('<em>sale</em>'), false,
        'untrusted product markup must not become HTML');
      assert.equal(smtp.attempts.get(retryEmail), 2,
        'a temporary SMTP 451 should cause one delayed retry before delivery');
      assert.equal(smtp.accepted.filter(m => m.recipient === retryEmail).length, 1,
        'the retry should produce one accepted message after the transient failure');

      const initialDlq = await channel.checkQueue('notification.identity-events.dlq');
      const expiredId = await publish(channel, 'identity.email-verification.requested.v1', {
        account_id: 710005,
        email: 'expired-' + suffix + '@example.test',
        token: 'expired_' + suffix + '_0123456789abcdef',
        expires_at: new Date(Date.now() - 1000).toISOString()
      });
      await waitFor(async () => {
        const q = await channel.checkQueue('notification.identity-events.dlq');
        return q.messageCount > initialDlq.messageCount;
      }, 'invalid challenge to reach identity DLQ', 10000);
      // The stable event identifier is intentionally not used as an exactly-once SMTP guarantee:
      // a process crash between SMTP acceptance and RabbitMQ ACK can still lead to redelivery.
      assert.ok(expiredId.length > 0);
      t.diagnostic('Verified 4 templates, HTML escaping, transient retry and permanent-failure DLQ');
    } finally {
      if (channel) await channel.close().catch(() => undefined);
      if (connection) await connection.close().catch(() => undefined);
      if (child) await stopProcess(child);
      await smtp.close();
    }
  });
