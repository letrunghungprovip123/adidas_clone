import {
  BadRequestException, ConflictException, Controller, Get, Headers, HttpCode,
  Injectable, Logger, Module, OnModuleDestroy, OnModuleInit, Post, Body, Req,
  ServiceUnavailableException, TooManyRequestsException, UnauthorizedException
} from '@nestjs/common';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { Pool, type PoolClient, type QueryResultRow } from 'pg';
import {
  createHash, createPrivateKey, createPublicKey, randomBytes, randomUUID,
  scrypt, scryptSync, sign, timingSafeEqual, verify, type KeyObject
} from 'node:crypto';
import { lastValueFrom, timeout } from 'rxjs';
import amqp from 'amqplib';
import type { ChannelModel, ConfirmChannel } from 'amqplib';
import type { Request } from 'express';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { COMMANDS, EVENTS } from '../../../../libs/contracts/src';

const ISSUER = 'adidas-clone-v2-identity';
const AUDIENCE = 'adidas-clone-v2-api';
const KEY_ID = 'v2-identity-rs256-1';
const ACCESS_SECONDS = 900;
const REFRESH_DAYS = 30;
const CHALLENGE_WINDOW_MS = 15 * 60 * 1000;

type Account = {
  id: number;
  email: string;
  password_hash: string | null;
  roles: string[];
  status: 'ACTIVE' | 'SUSPENDED' | 'DELETED';
  email_verified_at: Date | null;
  password_reset_required: boolean;
  token_version: number;
  provisioning_state: 'PENDING' | 'READY';
  created_at: Date;
};

type AccountClaims = {
  iss: string; aud: string; sub: string; iat: number; exp: number;
  jti: string; roles: string[]; ver: number; email_verified: boolean;
  customer_provisioned: boolean;
};

type KeyClaims = Record<string, unknown> & {
  iss: string; aud: string; sub: string; iat: number; exp: number;
  jti: string; roles: string[]; ver: number; email_verified: boolean;
  customer_provisioned: boolean;
};

const passwordKdf = { N: 32768, r: 8, p: 1, maxmem: 128 * 1024 * 1024 };
const dummySalt = Buffer.from('v2-identity-fixed-dummy-salt');
const dummyDigest = scryptSync('never-a-real-account-password', dummySalt, 32, passwordKdf);
const DUMMY_PASSWORD_HASH = 'scrypt$32768$8$1$' +
  dummySalt.toString('base64url') + '$' + dummyDigest.toString('base64url');

function scryptAsync(password: string, salt: Buffer, length: number,
  options: {N: number; r: number; p: number; maxmem: number}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, length, options, (error, result) => {
      if (error) reject(error); else resolve(result as Buffer);
    });
  });
}
function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
function emailAddress(value: string): string {
  return value.trim().toLowerCase();
}
function exposeTestTokens(): boolean {
  return process.env.NODE_ENV !== 'production' &&
    process.env.V2_IDENTITY_EXPOSE_TEST_TOKENS === 'true';
}
function safeRequestValue(value: string | undefined): string {
  return (value || '').slice(0, 512);
}
function accountView(account: Account) {
  return {
    id: account.id,
    email: account.email,
    roles: account.roles,
    status: account.status,
    email_verified: Boolean(account.email_verified_at),
    password_reset_required: account.password_reset_required,
    customer_provisioned: account.provisioning_state === 'READY',
    created_at: account.created_at
  };
}

export class RegisterIdentityDto {
  @IsEmail() @MaxLength(254) email!: string;
  @IsString() @MinLength(12) @MaxLength(128) password!: string;
}
export class LoginIdentityDto {
  @IsEmail() @MaxLength(254) email!: string;
  @IsString() @MinLength(1) @MaxLength(128) password!: string;
}
export class RefreshIdentityDto {
  @IsString() @MinLength(32) @MaxLength(200) refresh_token!: string;
}
export class ResetRequestDto {
  @IsEmail() @MaxLength(254) email!: string;
}
export class ResetConfirmDto {
  @IsString() @MinLength(32) @MaxLength(200) token!: string;
  @IsString() @MinLength(12) @MaxLength(128) new_password!: string;
}
export class VerifyEmailDto {
  @IsString() @MinLength(32) @MaxLength(200) token!: string;
}

@Injectable()
export class IdentityDatabase implements OnModuleDestroy {
  readonly pool: Pool;
  constructor() {
    if (!process.env.V2_IDENTITY_DB_HOST || !process.env.V2_IDENTITY_DB_PASSWORD ||
        process.env.V2_IDENTITY_DB_NAME !== 'identity_db') {
      throw new Error('Identity requires dedicated V2 identity_db credentials');
    }
    this.pool = new Pool({
      host: process.env.V2_IDENTITY_DB_HOST,
      port: Number(process.env.V2_IDENTITY_DB_PORT || 5432),
      user: process.env.V2_IDENTITY_DB_USER || 'v2_local',
      password: process.env.V2_IDENTITY_DB_PASSWORD,
      database: 'identity_db',
      max: 10,
      connectionTimeoutMillis: 3000,
      idleTimeoutMillis: 30000,
      statement_timeout: 7500,
      query_timeout: 8000,
      application_name: 'adidas-v2-identity'
    });
    this.pool.on('error', error => console.error('identity database pool unavailable', error.message));
  }
  query<T extends QueryResultRow>(sql: string, args?: unknown[]) {
    return this.pool.query<T>(sql, args);
  }
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch { /* preserve original error */ }
      throw error;
    } finally {
      client.release();
    }
  }
  async ready(): Promise<void> {
    await this.query('SELECT id FROM identity_accounts LIMIT 1');
  }
  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}

@Injectable()
export class IdentityKeys {
  private readonly privateKey: KeyObject;
  private readonly publicKey: KeyObject;
  constructor() {
    const privateB64 = process.env.V2_IDENTITY_JWT_PRIVATE_KEY_B64 || '';
    const publicB64 = process.env.V2_IDENTITY_JWT_PUBLIC_KEY_B64 || '';
    if (!privateB64 || !publicB64) throw new Error('Identity RS256 key pair is required');
    try {
      this.privateKey = createPrivateKey(Buffer.from(privateB64, 'base64').toString('utf8'));
      this.publicKey = createPublicKey(Buffer.from(publicB64, 'base64').toString('utf8'));
    } catch {
      throw new Error('Identity RS256 key configuration is invalid');
    }
    const details = this.privateKey.asymmetricKeyDetails;
    const derivedPublic = createPublicKey(this.privateKey).export({ type: 'spki', format: 'der' });
    const configuredPublic = this.publicKey.export({ type: 'spki', format: 'der' });
    if (this.privateKey.asymmetricKeyType !== 'rsa' || this.publicKey.asymmetricKeyType !== 'rsa' ||
        (details?.modulusLength || 0) < 2048 ||
        !Buffer.from(derivedPublic).equals(Buffer.from(configuredPublic))) {
      throw new Error('Identity requires a matching RSA key pair of at least 2048 bits');
    }
  }
  signAccess(claims: AccountClaims): string {
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: KEY_ID })).toString('base64url');
    const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
    const input = header + '.' + payload;
    const signature = sign('RSA-SHA256', Buffer.from(input), this.privateKey).toString('base64url');
    return input + '.' + signature;
  }
  verifyAccess(token: string): KeyClaims {
    const parts = token.split('.');
    if (parts.length !== 3) throw new UnauthorizedException('Invalid access token');
    let header: Record<string, unknown>;
    let claims: KeyClaims;
    try {
      header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
      claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as KeyClaims;
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }
    const validSignature = header.alg === 'RS256' && header.kid === KEY_ID &&
      verify('RSA-SHA256', Buffer.from(parts[0] + '.' + parts[1]), this.publicKey,
        Buffer.from(parts[2], 'base64url'));
    const now = Math.floor(Date.now() / 1000);
    if (!validSignature || claims.iss !== ISSUER || claims.aud !== AUDIENCE ||
        typeof claims.sub !== 'string' || !/^[1-9][0-9]*$/.test(claims.sub) ||
        !Number.isInteger(claims.exp) || claims.exp <= now ||
        !Number.isInteger(claims.iat) || claims.iat > now + 30 ||
        !Number.isInteger(claims.ver) || !Array.isArray(claims.roles)) {
      throw new UnauthorizedException('Invalid or expired access token');
    }
    return claims;
  }
  jwks() {
    const key = this.publicKey.export({ format: 'jwk' }) as JsonWebKey;
    return {
      keys: [{
        kty: key.kty, n: key.n, e: key.e,
        alg: 'RS256', use: 'sig', kid: KEY_ID
      }]
    };
  }
}

@Injectable()
export class IdentityRmqGateway implements OnModuleInit, OnModuleDestroy {
  private proxy?: ClientProxy;
  private readonly logger = new Logger(IdentityRmqGateway.name);
  async onModuleInit(): Promise<void> {
    if (process.env.V2_IDENTITY_RMQ_ENABLED !== 'true') return;
    const user = process.env.V2_IDENTITY_RMQ_USER;
    const password = process.env.V2_IDENTITY_RMQ_PASSWORD;
    const token = process.env.V2_CUSTOMER_INTERNAL_TOKEN || '';
    if (!user || !password || token.length < 32) {
      throw new Error('Identity requires broker credentials and trusted Customer transport token');
    }
    const uri = 'amqp://' + encodeURIComponent(user) + ':' + encodeURIComponent(password) +
      '@' + (process.env.V2_IDENTITY_RMQ_HOST || 'rabbitmq') + ':5672';
    this.proxy = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: [uri],
        queue: 'customer.commands.q',
        queueOptions: { durable: true, arguments: {
          'x-dead-letter-exchange': 'customer.dlx',
          'x-dead-letter-routing-key': 'customer.failed'
        }}
      }
    });
    await this.proxy.connect();
  }
  async ensureCustomerProfile(customerId: number): Promise<void> {
    if (process.env.V2_IDENTITY_RMQ_ENABLED !== 'true' || !this.proxy) {
      throw new ServiceUnavailableException('Customer profile provisioning is unavailable');
    }
    const token = process.env.V2_CUSTOMER_INTERNAL_TOKEN || '';
    const messageId = randomUUID();
    const envelope = {
      contract_version: 1,
      message_id: messageId,
      correlation_id: messageId,
      occurred_at: new Date().toISOString(),
      actor: { kind: 'system' },
      internal_token: token,
      payload: { customer_id: customerId, idempotency_key: 'identity:provision:' + customerId }
    };
    try {
      const result = await lastValueFrom(this.proxy.send(
        { cmd: COMMANDS.customerProfileEnsure }, envelope
      ).pipe(timeout(6000)));
      if (!result?.ok) throw new Error('Customer rejected provisioning command');
    } catch {
      this.logger.warn('Customer profile provisioning pending; retry scheduled');
      throw new ServiceUnavailableException('Customer profile provisioning is unavailable');
    }
  }
  async onModuleDestroy(): Promise<void> {
    if (this.proxy) await this.proxy.close();
  }
}

@Injectable()
export class IdentityOutboxPublisher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IdentityOutboxPublisher.name);
  private connection?: ChannelModel;
  private channel?: ConfirmChannel;
  private timer?: NodeJS.Timeout;
  private busy = false;

  constructor(private readonly db: IdentityDatabase) {}

  async onModuleInit(): Promise<void> {
    if (process.env.V2_IDENTITY_RMQ_ENABLED !== 'true') return;
    const user = process.env.V2_IDENTITY_RMQ_USER;
    const password = process.env.V2_IDENTITY_RMQ_PASSWORD;
    if (!user || !password) throw new Error('Identity outbox broker credentials are required');
    const uri = 'amqp://' + encodeURIComponent(user) + ':' + encodeURIComponent(password) +
      '@' + (process.env.V2_IDENTITY_RMQ_HOST || 'rabbitmq') + ':5672';
    this.connection = await amqp.connect(uri);
    this.channel = await this.connection.createConfirmChannel();
    await this.channel.assertExchange('commerce.events', 'topic', { durable: true });
    await this.channel.assertQueue('notification.identity-events.q', { durable: true });
    await this.channel.bindQueue('notification.identity-events.q', 'commerce.events',
      EVENTS.identityEmailVerificationRequested);
    await this.channel.bindQueue('notification.identity-events.q', 'commerce.events',
      EVENTS.identityPasswordResetRequested);
    const publisher = this.channel;
    await publisher.assertExchange('identity.dlx', 'direct', { durable: true });
    await publisher.assertQueue('identity.commands.dlq', { durable: true });
    await publisher.bindQueue('identity.commands.dlq', 'identity.dlx', 'identity.failed');
    this.timer = setInterval(() => { void this.tick(); }, 1000);
    this.timer.unref();
  }

  private async tick(): Promise<void> {
    if (this.busy || !this.channel) return;
    this.busy = true;
    try {
      await this.db.transaction(async client => {
        const pending = await client.query<{id: string; topic: string; envelope: Record<string, unknown>}>(
          'SELECT id,topic,envelope FROM identity_outbox WHERE published_at IS NULL ' +
          'ORDER BY created_at,id LIMIT 20 FOR UPDATE SKIP LOCKED'
        );
        for (const row of pending.rows) {
          this.channel!.publish('commerce.events', row.topic, Buffer.from(JSON.stringify(row.envelope)), {
            persistent: true, contentType: 'application/json', messageId: row.id
          });
        }
        if (pending.rowCount) await this.channel!.waitForConfirms();
        for (const row of pending.rows) {
          await client.query(
            "UPDATE identity_outbox SET published_at=clock_timestamp(), " +
            "envelope=jsonb_set(envelope,'{payload,token}','null'::jsonb,true) WHERE id=$1",
            [row.id]
          );
        }
      });
    } catch {
      this.logger.warn('Identity outbox delivery will retry');
    } finally {
      this.busy = false;
    }
  }
  async onModuleDestroy(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
  }
}

@Injectable()
export class IdentityService {
  private readonly logger = new Logger(IdentityService.name);
  constructor(
    private readonly db: IdentityDatabase,
    private readonly keys: IdentityKeys,
    private readonly customer: IdentityRmqGateway
  ) {}

  private async audit(eventType: string, accountId: number | null, ip: string,
    metadata: Record<string, string | number | boolean> = {}): Promise<void> {
    await this.db.query(
      'INSERT INTO identity_audit(event_type,account_id,actor_ip_hash,metadata) VALUES($1,$2,$3,$4)',
      [eventType, accountId, ip ? sha256(ip) : null, JSON.stringify(metadata)]
    );
  }

  private requestFingerprint(scope: string, email: string, ip: string): string {
    return sha256(scope + '\u0000' + email + '\u0000' + ip);
  }
  private async assertNotBlocked(key: string): Promise<void> {
    const result = await this.db.query<{blocked_until: Date | null; window_started_at: Date}>(
      'SELECT blocked_until,window_started_at FROM identity_login_throttles WHERE throttle_key=$1', [key]
    );
    if (!result.rowCount) return;
    const row = result.rows[0];
    if (row.blocked_until && row.blocked_until.getTime() > Date.now()) {
      throw new TooManyRequestsException('Too many attempts; try again later');
    }
    if (Date.now() - row.window_started_at.getTime() >= CHALLENGE_WINDOW_MS) {
      await this.db.query(
        'UPDATE identity_login_throttles SET failure_count=0,blocked_until=NULL,window_started_at=clock_timestamp() ' +
        'WHERE throttle_key=$1', [key]
      );
    }
  }
  private async countFailure(key: string, maxFailures = 5): Promise<void> {
    await this.db.transaction(async client => {
      await client.query(
        'INSERT INTO identity_login_throttles(throttle_key,window_started_at,failure_count) ' +
        'VALUES($1,clock_timestamp(),0) ON CONFLICT DO NOTHING', [key]
      );
      const result = await client.query<{window_started_at: Date; failure_count: number}>(
        'SELECT window_started_at,failure_count FROM identity_login_throttles WHERE throttle_key=$1 FOR UPDATE',
        [key]
      );
      let count = result.rows[0].failure_count;
      if (Date.now() - result.rows[0].window_started_at.getTime() >= CHALLENGE_WINDOW_MS) count = 0;
      count += 1;
      await client.query(
        'UPDATE identity_login_throttles SET window_started_at=CASE WHEN $2=1 THEN clock_timestamp() ' +
        'ELSE window_started_at END,failure_count=$2,blocked_until=CASE WHEN $2 >= $3 ' +
        "THEN clock_timestamp()+interval '15 minutes' ELSE NULL END WHERE throttle_key=$1",
        [key, count, maxFailures]
      );
    });
  }
  private async consumeRegisterLimit(key: string): Promise<void> {
    await this.db.transaction(async client => {
      await client.query(
        'INSERT INTO identity_login_throttles(throttle_key,window_started_at,failure_count) ' +
        'VALUES($1,clock_timestamp(),0) ON CONFLICT DO NOTHING', [key]
      );
      const result = await client.query<{window_started_at: Date; failure_count: number; blocked_until: Date | null}>(
        'SELECT window_started_at,failure_count,blocked_until FROM identity_login_throttles ' +
        'WHERE throttle_key=$1 FOR UPDATE', [key]
      );
      let count = result.rows[0].failure_count;
      if (Date.now() - result.rows[0].window_started_at.getTime() >= CHALLENGE_WINDOW_MS) count = 0;
      if (result.rows[0].blocked_until && result.rows[0].blocked_until.getTime() > Date.now()) {
        throw new TooManyRequestsException('Too many registration attempts; try again later');
      }
      if (count >= 3) {
        await client.query(
          "UPDATE identity_login_throttles SET blocked_until=clock_timestamp()+interval '15 minutes' WHERE throttle_key=$1",
          [key]
        );
        throw new TooManyRequestsException('Too many registration attempts; try again later');
      }
      count += 1;
      await client.query(
        'UPDATE identity_login_throttles SET window_started_at=CASE WHEN $2=1 THEN clock_timestamp() ' +
        'ELSE window_started_at END,failure_count=$2 WHERE throttle_key=$1', [key, count]
      );
    });
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16);
    const digest = await scryptAsync(password, salt, 32, passwordKdf);
    return 'scrypt$32768$8$1$' + salt.toString('base64url') + '$' + digest.toString('base64url');
  }
  private async verifyPassword(stored: string | null, supplied: string): Promise<boolean> {
    let hashValue = stored || DUMMY_PASSWORD_HASH;
    let parts = hashValue.split('    let candidate: Buffer;
    try {
      candidate = await scryptAsync(supplied, Buffer.from(parts[4], 'base64url'), 32, passwordKdf);
    } catch {
      candidate = Buffer.alloc(32);
    }
    const expected = Buffer.from(parts[5], 'base64url');
    const match = candidate.length === expected.length && timingSafeEqual(candidate, expected);
    return Boolean(stored) && validFormat && match;
  }

  private async createChallenge(
    client: PoolClient,
    account: Account,
    purpose: 'EMAIL_VERIFY' | 'PASSWORD_RESET',
    requestFingerprint: string
  ): Promise<string> {
    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = sha256(rawToken);
    const expiry = new Date(Date.now() + (purpose === 'EMAIL_VERIFY' ? 24 : 1) * 60 * 60 * 1000);
    const eventType = purpose === 'EMAIL_VERIFY'
      ? EVENTS.identityEmailVerificationRequested
      : EVENTS.identityPasswordResetRequested;
    const messageId = randomUUID();
    const envelope = {
      contract_version: 1,
      message_id: messageId,
      correlation_id: messageId,
      occurred_at: new Date().toISOString(),
      actor: { kind: 'system' },
      payload: {
        account_id: account.id, email: account.email,
        token: rawToken, expires_at: expiry.toISOString()
      }
    };
    await client.query(
      'INSERT INTO identity_challenges(account_id,purpose,token_hash,expires_at,requested_ip_hash) ' +
      'VALUES($1,$2,$3,$4,$5)',
      [account.id, purpose, tokenHash, expiry, requestFingerprint]
    );
    await client.query(
      'INSERT INTO identity_outbox(topic,envelope) VALUES($1,$2)',
      [eventType, JSON.stringify(envelope)]
    );
    return rawToken;
  }

  private async makeChallenge(emailInput: string, purpose: 'EMAIL_VERIFY' | 'PASSWORD_RESET',
    ip: string): Promise<string | null> {
    const email = emailAddress(emailInput);
    const requestKey = this.requestFingerprint(purpose, email, ip);
    return this.db.transaction(async client => {
      const found = await client.query<Account>(
        'SELECT * FROM identity_accounts WHERE email=$1 FOR UPDATE', [email]
      );
      if (!found.rowCount || found.rows[0].status !== 'ACTIVE') return null;
      const account = found.rows[0];
      if (purpose === 'EMAIL_VERIFY' && account.email_verified_at) return null;
      const recent = await client.query<{n: number}>(
        "SELECT count(*)::integer AS n FROM identity_challenges WHERE account_id=$1 AND purpose=$2 " +
        "AND created_at >= clock_timestamp()-interval '15 minutes'",
        [account.id, purpose]
      );
      if (recent.rows[0].n >= 3) return null;
      return this.createChallenge(client, account, purpose, requestKey);
    });
  }

  private async tryProvisionCustomer(accountId: number): Promise<boolean> {
    try {
      await this.customer.ensureCustomerProfile(accountId);
      await this.db.query(
        "UPDATE identity_accounts SET provisioning_state='READY',updated_at=clock_timestamp() WHERE id=$1",
        [accountId]
      );
      return true;
    } catch {
      await this.db.query(
        "UPDATE identity_accounts SET provisioning_state='PENDING',updated_at=clock_timestamp() WHERE id=$1",
        [accountId]
      );
      return false;
    }
  }
  private async reloadAccount(id: number): Promise<Account> {
    const row = await this.db.query<Account>('SELECT * FROM identity_accounts WHERE id=$1', [id]);
    if (!row.rowCount) throw new UnauthorizedException('Account is unavailable');
    return row.rows[0];
  }
  private accessToken(account: Account): string {
    const now = Math.floor(Date.now() / 1000);
    const claims: AccountClaims = {
      iss: ISSUER, aud: AUDIENCE, sub: String(account.id),
      iat: now, exp: now + ACCESS_SECONDS, jti: randomUUID(),
      roles: account.roles, ver: Number(account.token_version),
      email_verified: Boolean(account.email_verified_at),
      customer_provisioned: account.provisioning_state === 'READY'
    };
    return this.keys.signAccess(claims);
  }
  private async newSession(account: Account, userAgent: string, ip: string, familyId = randomUUID(),
    parentId: string | null = null, sessionId = randomUUID()) {
    const token = randomBytes(48).toString('base64url');
    const expiresAt = new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000);
    await this.db.query(
      'INSERT INTO identity_refresh_sessions(id,family_id,account_id,token_hash,expires_at,parent_id,client_fingerprint_hash) ' +
      'VALUES($1,$2,$3,$4,$5,$6,$7)',
      [sessionId, familyId, account.id, sha256(token), expiresAt, parentId,
        sha256(safeRequestValue(userAgent) + '\u0000' + safeRequestValue(ip))]
    );
    return {
      token_type: 'Bearer',
      access_token: this.accessToken(account),
      expires_in: ACCESS_SECONDS,
      refresh_token: token,
      refresh_expires_at: expiresAt.toISOString(),
      account: accountView(account)
    };
  }

  async register(dto: RegisterIdentityDto, ip: string, userAgent: string) {
    const email = emailAddress(dto.email);
    await this.consumeRegisterLimit(this.requestFingerprint('register', email, ip));
    const passwordHash = await this.hashPassword(dto.password);
    let account: Account;
    let verificationToken: string;
    try {
      const created = await this.db.transaction(async client => {
        const result = await client.query<Account>(
          "INSERT INTO identity_accounts(email,password_hash,roles,status,password_reset_required,provisioning_state) " +
          "VALUES($1,$2,ARRAY['CUSTOMER'],'ACTIVE',false,'PENDING') RETURNING *",
          [email, passwordHash]
        );
        const newAccount = result.rows[0];
        const token = await this.createChallenge(client, newAccount, 'EMAIL_VERIFY',
          this.requestFingerprint('email-verify', email, ip));
        return { account: newAccount, token };
      });
      account = created.account;
      verificationToken = created.token;
    } catch (error) {
      if ((error as {code?: string})?.code === '23505') {
        throw new ConflictException('Email already registered');
      }
      throw error;
    }
    await this.audit('ACCOUNT_REGISTERED', account.id, ip);
    await this.tryProvisionCustomer(account.id);
    account = await this.reloadAccount(account.id);
    const session = await this.newSession(account, userAgent, ip);
    return {
      ...session,
      ...(exposeTestTokens() ? { verification_token: verificationToken } : {})
    };
  }

  async login(dto: LoginIdentityDto, ip: string, userAgent: string) {
    const email = emailAddress(dto.email);
    const throttleKey = this.requestFingerprint('login', email, ip);
    await this.assertNotBlocked(throttleKey);
    const result = await this.db.query<Account>('SELECT * FROM identity_accounts WHERE email=$1', [email]);
    const account = result.rows[0];
    const matches = await this.verifyPassword(account?.password_hash || null, dto.password);
    if (!account || account.status !== 'ACTIVE' || account.password_reset_required || !matches) {
      await this.countFailure(throttleKey, 5);
      await this.audit('LOGIN_FAILED', account?.id ?? null, ip, {reason: 'INVALID_CREDENTIALS'});
      throw new UnauthorizedException('Invalid email or password');
    }
    await this.db.query('DELETE FROM identity_login_throttles WHERE throttle_key=$1', [throttleKey]);
    await this.audit('LOGIN_SUCCEEDED', account.id, ip);
    await this.tryProvisionCustomer(account.id);
    const current = await this.reloadAccount(account.id);
    return this.newSession(current, userAgent, ip);
  }

  async refresh(rawToken: string, userAgent: string, ip: string) {
    const tokenHash = sha256(rawToken);
    const newToken = randomBytes(48).toString('base64url');
    const newSessionId = randomUUID();
    const result = await this.db.transaction(async client => {
      const selected = await client.query<Account & {
        refresh_id: string; family_id: string; expires_at: Date; revoked_at: Date | null
      }>(
        'SELECT s.id AS refresh_id,s.family_id,s.expires_at,s.revoked_at,a.id,a.email,a.password_hash,a.roles,' +
        'a.status,a.email_verified_at,a.password_reset_required,a.token_version,a.provisioning_state,a.created_at ' +
        'FROM identity_refresh_sessions s JOIN identity_accounts a ON a.id=s.account_id ' +
        'WHERE s.token_hash=$1 FOR UPDATE OF s,a', [tokenHash]
      );
      if (!selected.rowCount) return { kind: 'invalid' as const };
      const row = selected.rows[0];
      if (row.revoked_at) {
        await client.query(
          'UPDATE identity_refresh_sessions SET revoked_at=COALESCE(revoked_at,clock_timestamp()) WHERE family_id=$1',
          [row.family_id]
        );
        return { kind: 'replay' as const, accountId: row.id };
      }
      if (row.expires_at.getTime() <= Date.now() || row.status !== 'ACTIVE') {
        await client.query(
          'UPDATE identity_refresh_sessions SET revoked_at=COALESCE(revoked_at,clock_timestamp()) WHERE family_id=$1',
          [row.family_id]
        );
        return { kind: 'expired' as const, accountId: row.id };
      }
      const expiry = new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000);
      await client.query(
        'UPDATE identity_refresh_sessions SET revoked_at=clock_timestamp(),replaced_by=$2 WHERE id=$1',
        [row.refresh_id, newSessionId]
      );
      await client.query(
        'INSERT INTO identity_refresh_sessions(id,family_id,account_id,token_hash,expires_at,parent_id,client_fingerprint_hash) ' +
        'VALUES($1,$2,$3,$4,$5,$6,$7)',
        [newSessionId, row.family_id, row.id, sha256(newToken), expiry, row.refresh_id,
          sha256(safeRequestValue(userAgent) + '\u0000' + safeRequestValue(ip))]
      );
      return { kind: 'ok' as const, account: row, token: newToken, expiresAt: expiry };
    });
    if (result.kind !== 'ok') {
      await this.audit('REFRESH_' + result.kind.toUpperCase(),
        'accountId' in result ? result.accountId : null, ip);
      throw new UnauthorizedException(result.kind === 'replay'
        ? 'Refresh token reuse detected; session family revoked'
        : 'Invalid refresh token');
    }
    await this.tryProvisionCustomer(result.account.id);
    const account = await this.reloadAccount(result.account.id);
    return {
      token_type: 'Bearer',
      access_token: this.accessToken(account),
      expires_in: ACCESS_SECONDS,
      refresh_token: result.token,
      refresh_expires_at: result.expiresAt.toISOString(),
      account: accountView(account)
    };
  }

  async logout(rawToken: string, ip: string) {
    const accountId = await this.db.transaction(async client => {
      const result = await client.query<{family_id: string; account_id: number}>(
        'SELECT family_id,account_id FROM identity_refresh_sessions WHERE token_hash=$1 FOR UPDATE', [sha256(rawToken)]
      );
      if (!result.rowCount) return null;
      await client.query(
        'UPDATE identity_refresh_sessions SET revoked_at=COALESCE(revoked_at,clock_timestamp()) WHERE family_id=$1',
        [result.rows[0].family_id]
      );
      return result.rows[0].account_id;
    });
    if (accountId) await this.audit('LOGOUT', accountId, ip);
    return { ok: true };
  }

  async requestPasswordReset(email: string, ip: string) {
    const token = await this.makeChallenge(email, 'PASSWORD_RESET', ip);
    return {
      message: 'If the account exists, password reset instructions will be sent.',
      ...(token && exposeTestTokens() ? { reset_token: token } : {})
    };
  }
  async requestEmailVerification(email: string, ip: string) {
    const token = await this.makeChallenge(email, 'EMAIL_VERIFY', ip);
    return {
      message: 'If the account requires verification, instructions will be sent.',
      ...(token && exposeTestTokens() ? { verification_token: token } : {})
    };
  }

  async confirmChallenge(purpose: 'EMAIL_VERIFY' | 'PASSWORD_RESET', rawToken: string,
    newPassword?: string) {
    const newHash = purpose === 'PASSWORD_RESET' && newPassword
      ? await this.hashPassword(newPassword) : null;
    const result = await this.db.transaction(async client => {
      const selected = await client.query<{
        challenge_id: string; account_id: number; consumed_at: Date | null; expires_at: Date; status: string
      }>(
        'SELECT ch.id AS challenge_id,ch.account_id,ch.consumed_at,ch.expires_at,a.status ' +
        'FROM identity_challenges ch JOIN identity_accounts a ON a.id=ch.account_id ' +
        'WHERE ch.token_hash=$1 AND ch.purpose=$2 FOR UPDATE OF ch,a',
        [sha256(rawToken), purpose]
      );
      if (!selected.rowCount || selected.rows[0].consumed_at ||
          selected.rows[0].expires_at.getTime() <= Date.now() || selected.rows[0].status !== 'ACTIVE') {
        return { ok: false as const };
      }
      const challenge = selected.rows[0];
      await client.query(
        'UPDATE identity_challenges SET consumed_at=clock_timestamp() WHERE id=$1 AND consumed_at IS NULL',
        [challenge.challenge_id]
      );
      if (purpose === 'EMAIL_VERIFY') {
        await client.query(
          'UPDATE identity_accounts SET email_verified_at=COALESCE(email_verified_at,clock_timestamp()),' +
          'updated_at=clock_timestamp() WHERE id=$1', [challenge.account_id]
        );
      } else {
        await client.query(
          'UPDATE identity_accounts SET password_hash=$2,password_reset_required=false,' +
          'token_version=token_version+1,updated_at=clock_timestamp() WHERE id=$1',
          [challenge.account_id, newHash]
        );
        await client.query(
          'UPDATE identity_refresh_sessions SET revoked_at=COALESCE(revoked_at,clock_timestamp()) ' +
          'WHERE account_id=$1', [challenge.account_id]
        );
      }
      return { ok: true as const, accountId: challenge.account_id };
    });
    if (!result.ok) throw new BadRequestException('Challenge is invalid, expired or already used');
    await this.audit(purpose === 'EMAIL_VERIFY' ? 'EMAIL_VERIFIED' : 'PASSWORD_RESET_COMPLETED', result.accountId, '');
    return { ok: true };
  }

  async me(authorization: string | undefined) {
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException('Bearer access token required');
    }
    const claims = this.keys.verifyAccess(authorization.slice(7));
    const result = await this.db.query<Account>('SELECT * FROM identity_accounts WHERE id=$1', [Number(claims.sub)]);
    if (!result.rowCount || result.rows[0].status !== 'ACTIVE' ||
        Number(result.rows[0].token_version) !== claims.ver) {
      throw new UnauthorizedException('Access token has been revoked');
    }
    return { account: accountView(result.rows[0]) };
  }

  async publicJwks() { return this.keys.jwks(); }

  async provisionPending(limit = 10): Promise<void> {
    const rows = await this.db.query<{id: number}>(
      "SELECT id FROM identity_accounts WHERE status='ACTIVE' AND provisioning_state='PENDING' " +
      'ORDER BY id LIMIT $1', [limit]
    );
    for (const row of rows.rows) await this.tryProvisionCustomer(row.id);
  }
}

@Injectable()
export class IdentityProvisioningWorker implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private busy = false;
  constructor(private readonly service: IdentityService) {}
  onModuleInit(): void {
    if (process.env.V2_IDENTITY_ENABLED !== 'true' || process.env.V2_IDENTITY_RMQ_ENABLED !== 'true') return;
    this.timer = setInterval(() => {
      if (this.busy) return;
      this.busy = true;
      void this.service.provisionPending().catch(() => undefined).finally(() => { this.busy = false; });
    }, 5000);
    this.timer.unref();
  }
  onModuleDestroy(): void { if (this.timer) clearInterval(this.timer); }
}

@Controller('api/v1/auth')
export class IdentityAuthController {
  constructor(private readonly service: IdentityService) {}
  @Post('register')
  register(@Body() body: RegisterIdentityDto, @Req() req: Request) {
    return this.service.register(body, req.ip || '', req.get('user-agent') || '');
  }
  @Post('login') @HttpCode(200)
  login(@Body() body: LoginIdentityDto, @Req() req: Request) {
    return this.service.login(body, req.ip || '', req.get('user-agent') || '');
  }
  @Post('refresh') @HttpCode(200)
  refresh(@Body() body: RefreshIdentityDto, @Req() req: Request) {
    return this.service.refresh(body.refresh_token, req.get('user-agent') || '', req.ip || '');
  }
  @Post('logout') @HttpCode(200)
  logout(@Body() body: RefreshIdentityDto, @Req() req: Request) {
    return this.service.logout(body.refresh_token, req.ip || '');
  }
  @Post('password-reset/request') @HttpCode(200)
  resetRequest(@Body() body: ResetRequestDto, @Req() req: Request) {
    return this.service.requestPasswordReset(body.email, req.ip || '');
  }
  @Post('password-reset/confirm') @HttpCode(200)
  resetConfirm(@Body() body: ResetConfirmDto) {
    return this.service.confirmChallenge('PASSWORD_RESET', body.token, body.new_password);
  }
  @Post('email-verification/request') @HttpCode(200)
  verifyRequest(@Body() body: ResetRequestDto, @Req() req: Request) {
    return this.service.requestEmailVerification(body.email, req.ip || '');
  }
  @Post('email-verification/confirm') @HttpCode(200)
  verifyConfirm(@Body() body: VerifyEmailDto) {
    return this.service.confirmChallenge('EMAIL_VERIFY', body.token);
  }
  @Get('me')
  me(@Headers('authorization') authorization: string | undefined) {
    return this.service.me(authorization);
  }
}

@Controller()
export class IdentityPublicKeysController {
  constructor(private readonly service: IdentityService) {}
  @Get('.well-known/jwks.json')
  jwks() { return this.service.publicJwks(); }
}

@Controller('health')
export class IdentityHealthController {
  constructor(private readonly db: IdentityDatabase) {}
  @Get('live') live() { return { status: 'ok' }; }
  @Get('ready')
  async ready() {
    try {
      await this.db.ready();
      return { status: 'ok', info: { postgres: { status: 'up' }, jwt: { status: 'up' } } };
    } catch {
      throw new ServiceUnavailableException('Identity PostgreSQL unavailable');
    }
  }
}

@Module({
  controllers: [IdentityAuthController, IdentityPublicKeysController, IdentityHealthController],
  providers: [
    IdentityDatabase, IdentityKeys, IdentityRmqGateway, IdentityOutboxPublisher,
    IdentityService, IdentityProvisioningWorker
  ],
  exports: [IdentityDatabase, IdentityService]
})
export class IdentityModule {}
);
    const validFormat = parts.length === 6 && parts[0] === 'scrypt' && Number(parts[1]) === 32768 &&
      Number(parts[2]) === 8 && Number(parts[3]) === 1;
    if (!validFormat) {
      hashValue = DUMMY_PASSWORD_HASH;
      parts = hashValue.split('    let candidate: Buffer;
    try {
      candidate = await scryptAsync(supplied, Buffer.from(parts[4], 'base64url'), 32, passwordKdf);
    } catch {
      candidate = Buffer.alloc(32);
    }
    const expected = Buffer.from(parts[5], 'base64url');
    const match = candidate.length === expected.length && timingSafeEqual(candidate, expected);
    return Boolean(stored) && match;
  }

  private async createChallenge(
    client: PoolClient,
    account: Account,
    purpose: 'EMAIL_VERIFY' | 'PASSWORD_RESET',
    requestFingerprint: string
  ): Promise<string> {
    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = sha256(rawToken);
    const expiry = new Date(Date.now() + (purpose === 'EMAIL_VERIFY' ? 24 : 1) * 60 * 60 * 1000);
    const eventType = purpose === 'EMAIL_VERIFY'
      ? EVENTS.identityEmailVerificationRequested
      : EVENTS.identityPasswordResetRequested;
    const messageId = randomUUID();
    const envelope = {
      contract_version: 1,
      message_id: messageId,
      correlation_id: messageId,
      occurred_at: new Date().toISOString(),
      actor: { kind: 'system' },
      payload: {
        account_id: account.id, email: account.email,
        token: rawToken, expires_at: expiry.toISOString()
      }
    };
    await client.query(
      'INSERT INTO identity_challenges(account_id,purpose,token_hash,expires_at,requested_ip_hash) ' +
      'VALUES($1,$2,$3,$4,$5)',
      [account.id, purpose, tokenHash, expiry, requestFingerprint]
    );
    await client.query(
      'INSERT INTO identity_outbox(topic,envelope) VALUES($1,$2)',
      [eventType, JSON.stringify(envelope)]
    );
    return rawToken;
  }

  private async makeChallenge(emailInput: string, purpose: 'EMAIL_VERIFY' | 'PASSWORD_RESET',
    ip: string): Promise<string | null> {
    const email = emailAddress(emailInput);
    const requestKey = this.requestFingerprint(purpose, email, ip);
    return this.db.transaction(async client => {
      const found = await client.query<Account>(
        'SELECT * FROM identity_accounts WHERE email=$1 FOR UPDATE', [email]
      );
      if (!found.rowCount || found.rows[0].status !== 'ACTIVE') return null;
      const account = found.rows[0];
      if (purpose === 'EMAIL_VERIFY' && account.email_verified_at) return null;
      const recent = await client.query<{n: number}>(
        "SELECT count(*)::integer AS n FROM identity_challenges WHERE account_id=$1 AND purpose=$2 " +
        "AND created_at >= clock_timestamp()-interval '15 minutes'",
        [account.id, purpose]
      );
      if (recent.rows[0].n >= 3) return null;
      return this.createChallenge(client, account, purpose, requestKey);
    });
  }

  private async tryProvisionCustomer(accountId: number): Promise<boolean> {
    try {
      await this.customer.ensureCustomerProfile(accountId);
      await this.db.query(
        "UPDATE identity_accounts SET provisioning_state='READY',updated_at=clock_timestamp() WHERE id=$1",
        [accountId]
      );
      return true;
    } catch {
      await this.db.query(
        "UPDATE identity_accounts SET provisioning_state='PENDING',updated_at=clock_timestamp() WHERE id=$1",
        [accountId]
      );
      return false;
    }
  }
  private async reloadAccount(id: number): Promise<Account> {
    const row = await this.db.query<Account>('SELECT * FROM identity_accounts WHERE id=$1', [id]);
    if (!row.rowCount) throw new UnauthorizedException('Account is unavailable');
    return row.rows[0];
  }
  private accessToken(account: Account): string {
    const now = Math.floor(Date.now() / 1000);
    const claims: AccountClaims = {
      iss: ISSUER, aud: AUDIENCE, sub: String(account.id),
      iat: now, exp: now + ACCESS_SECONDS, jti: randomUUID(),
      roles: account.roles, ver: Number(account.token_version),
      email_verified: Boolean(account.email_verified_at),
      customer_provisioned: account.provisioning_state === 'READY'
    };
    return this.keys.signAccess(claims);
  }
  private async newSession(account: Account, userAgent: string, ip: string, familyId = randomUUID(),
    parentId: string | null = null, sessionId = randomUUID()) {
    const token = randomBytes(48).toString('base64url');
    const expiresAt = new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000);
    await this.db.query(
      'INSERT INTO identity_refresh_sessions(id,family_id,account_id,token_hash,expires_at,parent_id,client_fingerprint_hash) ' +
      'VALUES($1,$2,$3,$4,$5,$6,$7)',
      [sessionId, familyId, account.id, sha256(token), expiresAt, parentId,
        sha256(safeRequestValue(userAgent) + '\u0000' + safeRequestValue(ip))]
    );
    return {
      token_type: 'Bearer',
      access_token: this.accessToken(account),
      expires_in: ACCESS_SECONDS,
      refresh_token: token,
      refresh_expires_at: expiresAt.toISOString(),
      account: accountView(account)
    };
  }

  async register(dto: RegisterIdentityDto, ip: string, userAgent: string) {
    const email = emailAddress(dto.email);
    await this.consumeRegisterLimit(this.requestFingerprint('register', email, ip));
    const passwordHash = await this.hashPassword(dto.password);
    let account: Account;
    let verificationToken: string;
    try {
      const created = await this.db.transaction(async client => {
        const result = await client.query<Account>(
          "INSERT INTO identity_accounts(email,password_hash,roles,status,password_reset_required,provisioning_state) " +
          "VALUES($1,$2,ARRAY['CUSTOMER'],'ACTIVE',false,'PENDING') RETURNING *",
          [email, passwordHash]
        );
        const newAccount = result.rows[0];
        const token = await this.createChallenge(client, newAccount, 'EMAIL_VERIFY',
          this.requestFingerprint('email-verify', email, ip));
        return { account: newAccount, token };
      });
      account = created.account;
      verificationToken = created.token;
    } catch (error) {
      if ((error as {code?: string})?.code === '23505') {
        throw new ConflictException('Email already registered');
      }
      throw error;
    }
    await this.tryProvisionCustomer(account.id);
    account = await this.reloadAccount(account.id);
    const session = await this.newSession(account, userAgent, ip);
    return {
      ...session,
      ...(exposeTestTokens() ? { verification_token: verificationToken } : {})
    };
  }

  async login(dto: LoginIdentityDto, ip: string, userAgent: string) {
    const email = emailAddress(dto.email);
    const throttleKey = this.requestFingerprint('login', email, ip);
    await this.assertNotBlocked(throttleKey);
    const result = await this.db.query<Account>('SELECT * FROM identity_accounts WHERE email=$1', [email]);
    const account = result.rows[0];
    const matches = await this.verifyPassword(account?.password_hash || null, dto.password);
    if (!account || account.status !== 'ACTIVE' || account.password_reset_required || !matches) {
      await this.countFailure(throttleKey, 5);
      throw new UnauthorizedException('Invalid email or password');
    }
    await this.db.query('DELETE FROM identity_login_throttles WHERE throttle_key=$1', [throttleKey]);
    await this.tryProvisionCustomer(account.id);
    const current = await this.reloadAccount(account.id);
    return this.newSession(current, userAgent, ip);
  }

  async refresh(rawToken: string, userAgent: string, ip: string) {
    const tokenHash = sha256(rawToken);
    const newToken = randomBytes(48).toString('base64url');
    const newSessionId = randomUUID();
    const result = await this.db.transaction(async client => {
      const selected = await client.query<Account & {
        refresh_id: string; family_id: string; expires_at: Date; revoked_at: Date | null
      }>(
        'SELECT s.id AS refresh_id,s.family_id,s.expires_at,s.revoked_at,a.id,a.email,a.password_hash,a.roles,' +
        'a.status,a.email_verified_at,a.password_reset_required,a.token_version,a.provisioning_state,a.created_at ' +
        'FROM identity_refresh_sessions s JOIN identity_accounts a ON a.id=s.account_id ' +
        'WHERE s.token_hash=$1 FOR UPDATE OF s,a', [tokenHash]
      );
      if (!selected.rowCount) return { kind: 'invalid' as const };
      const row = selected.rows[0];
      if (row.revoked_at) {
        await client.query(
          'UPDATE identity_refresh_sessions SET revoked_at=COALESCE(revoked_at,clock_timestamp()) WHERE family_id=$1',
          [row.family_id]
        );
        return { kind: 'replay' as const };
      }
      if (row.expires_at.getTime() <= Date.now() || row.status !== 'ACTIVE') {
        await client.query(
          'UPDATE identity_refresh_sessions SET revoked_at=COALESCE(revoked_at,clock_timestamp()) WHERE family_id=$1',
          [row.family_id]
        );
        return { kind: 'expired' as const };
      }
      const expiry = new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000);
      await client.query(
        'UPDATE identity_refresh_sessions SET revoked_at=clock_timestamp(),replaced_by=$2 WHERE id=$1',
        [row.refresh_id, newSessionId]
      );
      await client.query(
        'INSERT INTO identity_refresh_sessions(id,family_id,account_id,token_hash,expires_at,parent_id,client_fingerprint_hash) ' +
        'VALUES($1,$2,$3,$4,$5,$6,$7)',
        [newSessionId, row.family_id, row.id, sha256(newToken), expiry, row.refresh_id,
          sha256(safeRequestValue(userAgent) + '\u0000' + safeRequestValue(ip))]
      );
      return { kind: 'ok' as const, account: row, token: newToken, expiresAt: expiry };
    });
    if (result.kind !== 'ok') {
      throw new UnauthorizedException(result.kind === 'replay'
        ? 'Refresh token reuse detected; session family revoked'
        : 'Invalid refresh token');
    }
    await this.tryProvisionCustomer(result.account.id);
    const account = await this.reloadAccount(result.account.id);
    return {
      token_type: 'Bearer',
      access_token: this.accessToken(account),
      expires_in: ACCESS_SECONDS,
      refresh_token: result.token,
      refresh_expires_at: result.expiresAt.toISOString(),
      account: accountView(account)
    };
  }

  async logout(rawToken: string) {
    await this.db.transaction(async client => {
      const result = await client.query<{family_id: string}>(
        'SELECT family_id FROM identity_refresh_sessions WHERE token_hash=$1 FOR UPDATE', [sha256(rawToken)]
      );
      if (result.rowCount) {
        await client.query(
          'UPDATE identity_refresh_sessions SET revoked_at=COALESCE(revoked_at,clock_timestamp()) WHERE family_id=$1',
          [result.rows[0].family_id]
        );
      }
    });
    return { ok: true };
  }

  async requestPasswordReset(email: string, ip: string) {
    const token = await this.makeChallenge(email, 'PASSWORD_RESET', ip);
    return {
      message: 'If the account exists, password reset instructions will be sent.',
      ...(token && exposeTestTokens() ? { reset_token: token } : {})
    };
  }
  async requestEmailVerification(email: string, ip: string) {
    const token = await this.makeChallenge(email, 'EMAIL_VERIFY', ip);
    return {
      message: 'If the account requires verification, instructions will be sent.',
      ...(token && exposeTestTokens() ? { verification_token: token } : {})
    };
  }

  async confirmChallenge(purpose: 'EMAIL_VERIFY' | 'PASSWORD_RESET', rawToken: string,
    newPassword?: string) {
    const newHash = purpose === 'PASSWORD_RESET' && newPassword
      ? await this.hashPassword(newPassword) : null;
    const result = await this.db.transaction(async client => {
      const selected = await client.query<{
        challenge_id: string; account_id: number; consumed_at: Date | null; expires_at: Date; status: string
      }>(
        'SELECT ch.id AS challenge_id,ch.account_id,ch.consumed_at,ch.expires_at,a.status ' +
        'FROM identity_challenges ch JOIN identity_accounts a ON a.id=ch.account_id ' +
        'WHERE ch.token_hash=$1 AND ch.purpose=$2 FOR UPDATE OF ch,a',
        [sha256(rawToken), purpose]
      );
      if (!selected.rowCount || selected.rows[0].consumed_at ||
          selected.rows[0].expires_at.getTime() <= Date.now() || selected.rows[0].status !== 'ACTIVE') {
        return { ok: false as const };
      }
      const challenge = selected.rows[0];
      await client.query(
        'UPDATE identity_challenges SET consumed_at=clock_timestamp() WHERE id=$1 AND consumed_at IS NULL',
        [challenge.challenge_id]
      );
      if (purpose === 'EMAIL_VERIFY') {
        await client.query(
          'UPDATE identity_accounts SET email_verified_at=COALESCE(email_verified_at,clock_timestamp()),' +
          'updated_at=clock_timestamp() WHERE id=$1', [challenge.account_id]
        );
      } else {
        await client.query(
          'UPDATE identity_accounts SET password_hash=$2,password_reset_required=false,' +
          'token_version=token_version+1,updated_at=clock_timestamp() WHERE id=$1',
          [challenge.account_id, newHash]
        );
        await client.query(
          'UPDATE identity_refresh_sessions SET revoked_at=COALESCE(revoked_at,clock_timestamp()) ' +
          'WHERE account_id=$1', [challenge.account_id]
        );
      }
      return { ok: true as const };
    });
    if (!result.ok) throw new BadRequestException('Challenge is invalid, expired or already used');
    return { ok: true };
  }

  async me(authorization: string | undefined) {
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException('Bearer access token required');
    }
    const claims = this.keys.verifyAccess(authorization.slice(7));
    const result = await this.db.query<Account>('SELECT * FROM identity_accounts WHERE id=$1', [Number(claims.sub)]);
    if (!result.rowCount || result.rows[0].status !== 'ACTIVE' ||
        Number(result.rows[0].token_version) !== claims.ver) {
      throw new UnauthorizedException('Access token has been revoked');
    }
    return { account: accountView(result.rows[0]) };
  }

  async publicJwks() { return this.keys.jwks(); }

  async provisionPending(limit = 10): Promise<void> {
    const rows = await this.db.query<{id: number}>(
      "SELECT id FROM identity_accounts WHERE status='ACTIVE' AND provisioning_state='PENDING' " +
      'ORDER BY id LIMIT $1', [limit]
    );
    for (const row of rows.rows) await this.tryProvisionCustomer(row.id);
  }
}

@Injectable()
export class IdentityProvisioningWorker implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private busy = false;
  constructor(private readonly service: IdentityService) {}
  onModuleInit(): void {
    if (process.env.V2_IDENTITY_ENABLED !== 'true' || process.env.V2_IDENTITY_RMQ_ENABLED !== 'true') return;
    this.timer = setInterval(() => {
      if (this.busy) return;
      this.busy = true;
      void this.service.provisionPending().catch(() => undefined).finally(() => { this.busy = false; });
    }, 5000);
    this.timer.unref();
  }
  onModuleDestroy(): void { if (this.timer) clearInterval(this.timer); }
}

@Controller('api/v1/auth')
export class IdentityAuthController {
  constructor(private readonly service: IdentityService) {}
  @Post('register')
  register(@Body() body: RegisterIdentityDto, @Req() req: Request) {
    return this.service.register(body, req.ip || '', req.get('user-agent') || '');
  }
  @Post('login') @HttpCode(200)
  login(@Body() body: LoginIdentityDto, @Req() req: Request) {
    return this.service.login(body, req.ip || '', req.get('user-agent') || '');
  }
  @Post('refresh') @HttpCode(200)
  refresh(@Body() body: RefreshIdentityDto, @Req() req: Request) {
    return this.service.refresh(body.refresh_token, req.get('user-agent') || '', req.ip || '');
  }
  @Post('logout') @HttpCode(200)
  logout(@Body() body: RefreshIdentityDto) { return this.service.logout(body.refresh_token); }
  @Post('password-reset/request') @HttpCode(200)
  resetRequest(@Body() body: ResetRequestDto, @Req() req: Request) {
    return this.service.requestPasswordReset(body.email, req.ip || '');
  }
  @Post('password-reset/confirm') @HttpCode(200)
  resetConfirm(@Body() body: ResetConfirmDto) {
    return this.service.confirmChallenge('PASSWORD_RESET', body.token, body.new_password);
  }
  @Post('email-verification/request') @HttpCode(200)
  verifyRequest(@Body() body: ResetRequestDto, @Req() req: Request) {
    return this.service.requestEmailVerification(body.email, req.ip || '');
  }
  @Post('email-verification/confirm') @HttpCode(200)
  verifyConfirm(@Body() body: VerifyEmailDto) {
    return this.service.confirmChallenge('EMAIL_VERIFY', body.token);
  }
  @Get('me')
  me(@Headers('authorization') authorization: string | undefined) {
    return this.service.me(authorization);
  }
}

@Controller()
export class IdentityPublicKeysController {
  constructor(private readonly service: IdentityService) {}
  @Get('.well-known/jwks.json')
  jwks() { return this.service.publicJwks(); }
}

@Controller('health')
export class IdentityHealthController {
  constructor(private readonly db: IdentityDatabase) {}
  @Get('live') live() { return { status: 'ok' }; }
  @Get('ready')
  async ready() {
    try {
      await this.db.ready();
      return { status: 'ok', info: { postgres: { status: 'up' }, jwt: { status: 'up' } } };
    } catch {
      throw new ServiceUnavailableException('Identity PostgreSQL unavailable');
    }
  }
}

@Module({
  controllers: [IdentityAuthController, IdentityPublicKeysController, IdentityHealthController],
  providers: [
    IdentityDatabase, IdentityKeys, IdentityRmqGateway, IdentityOutboxPublisher,
    IdentityService, IdentityProvisioningWorker
  ],
  exports: [IdentityDatabase, IdentityService]
})
export class IdentityModule {}
);
    }
    let candidate: Buffer;
    try {
      candidate = await scryptAsync(supplied, Buffer.from(parts[4], 'base64url'), 32, passwordKdf);
    } catch {
      candidate = Buffer.alloc(32);
    }
    const expected = Buffer.from(parts[5], 'base64url');
    const match = candidate.length === expected.length && timingSafeEqual(candidate, expected);
    return Boolean(stored) && match;
  }

  private async createChallenge(
    client: PoolClient,
    account: Account,
    purpose: 'EMAIL_VERIFY' | 'PASSWORD_RESET',
    requestFingerprint: string
  ): Promise<string> {
    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = sha256(rawToken);
    const expiry = new Date(Date.now() + (purpose === 'EMAIL_VERIFY' ? 24 : 1) * 60 * 60 * 1000);
    const eventType = purpose === 'EMAIL_VERIFY'
      ? EVENTS.identityEmailVerificationRequested
      : EVENTS.identityPasswordResetRequested;
    const messageId = randomUUID();
    const envelope = {
      contract_version: 1,
      message_id: messageId,
      correlation_id: messageId,
      occurred_at: new Date().toISOString(),
      actor: { kind: 'system' },
      payload: {
        account_id: account.id, email: account.email,
        token: rawToken, expires_at: expiry.toISOString()
      }
    };
    await client.query(
      'INSERT INTO identity_challenges(account_id,purpose,token_hash,expires_at,requested_ip_hash) ' +
      'VALUES($1,$2,$3,$4,$5)',
      [account.id, purpose, tokenHash, expiry, requestFingerprint]
    );
    await client.query(
      'INSERT INTO identity_outbox(topic,envelope) VALUES($1,$2)',
      [eventType, JSON.stringify(envelope)]
    );
    return rawToken;
  }

  private async makeChallenge(emailInput: string, purpose: 'EMAIL_VERIFY' | 'PASSWORD_RESET',
    ip: string): Promise<string | null> {
    const email = emailAddress(emailInput);
    const requestKey = this.requestFingerprint(purpose, email, ip);
    return this.db.transaction(async client => {
      const found = await client.query<Account>(
        'SELECT * FROM identity_accounts WHERE email=$1 FOR UPDATE', [email]
      );
      if (!found.rowCount || found.rows[0].status !== 'ACTIVE') return null;
      const account = found.rows[0];
      if (purpose === 'EMAIL_VERIFY' && account.email_verified_at) return null;
      const recent = await client.query<{n: number}>(
        "SELECT count(*)::integer AS n FROM identity_challenges WHERE account_id=$1 AND purpose=$2 " +
        "AND created_at >= clock_timestamp()-interval '15 minutes'",
        [account.id, purpose]
      );
      if (recent.rows[0].n >= 3) return null;
      return this.createChallenge(client, account, purpose, requestKey);
    });
  }

  private async tryProvisionCustomer(accountId: number): Promise<boolean> {
    try {
      await this.customer.ensureCustomerProfile(accountId);
      await this.db.query(
        "UPDATE identity_accounts SET provisioning_state='READY',updated_at=clock_timestamp() WHERE id=$1",
        [accountId]
      );
      return true;
    } catch {
      await this.db.query(
        "UPDATE identity_accounts SET provisioning_state='PENDING',updated_at=clock_timestamp() WHERE id=$1",
        [accountId]
      );
      return false;
    }
  }
  private async reloadAccount(id: number): Promise<Account> {
    const row = await this.db.query<Account>('SELECT * FROM identity_accounts WHERE id=$1', [id]);
    if (!row.rowCount) throw new UnauthorizedException('Account is unavailable');
    return row.rows[0];
  }
  private accessToken(account: Account): string {
    const now = Math.floor(Date.now() / 1000);
    const claims: AccountClaims = {
      iss: ISSUER, aud: AUDIENCE, sub: String(account.id),
      iat: now, exp: now + ACCESS_SECONDS, jti: randomUUID(),
      roles: account.roles, ver: Number(account.token_version),
      email_verified: Boolean(account.email_verified_at),
      customer_provisioned: account.provisioning_state === 'READY'
    };
    return this.keys.signAccess(claims);
  }
  private async newSession(account: Account, userAgent: string, ip: string, familyId = randomUUID(),
    parentId: string | null = null, sessionId = randomUUID()) {
    const token = randomBytes(48).toString('base64url');
    const expiresAt = new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000);
    await this.db.query(
      'INSERT INTO identity_refresh_sessions(id,family_id,account_id,token_hash,expires_at,parent_id,client_fingerprint_hash) ' +
      'VALUES($1,$2,$3,$4,$5,$6,$7)',
      [sessionId, familyId, account.id, sha256(token), expiresAt, parentId,
        sha256(safeRequestValue(userAgent) + '\u0000' + safeRequestValue(ip))]
    );
    return {
      token_type: 'Bearer',
      access_token: this.accessToken(account),
      expires_in: ACCESS_SECONDS,
      refresh_token: token,
      refresh_expires_at: expiresAt.toISOString(),
      account: accountView(account)
    };
  }

  async register(dto: RegisterIdentityDto, ip: string, userAgent: string) {
    const email = emailAddress(dto.email);
    await this.consumeRegisterLimit(this.requestFingerprint('register', email, ip));
    const passwordHash = await this.hashPassword(dto.password);
    let account: Account;
    let verificationToken: string;
    try {
      const created = await this.db.transaction(async client => {
        const result = await client.query<Account>(
          "INSERT INTO identity_accounts(email,password_hash,roles,status,password_reset_required,provisioning_state) " +
          "VALUES($1,$2,ARRAY['CUSTOMER'],'ACTIVE',false,'PENDING') RETURNING *",
          [email, passwordHash]
        );
        const newAccount = result.rows[0];
        const token = await this.createChallenge(client, newAccount, 'EMAIL_VERIFY',
          this.requestFingerprint('email-verify', email, ip));
        return { account: newAccount, token };
      });
      account = created.account;
      verificationToken = created.token;
    } catch (error) {
      if ((error as {code?: string})?.code === '23505') {
        throw new ConflictException('Email already registered');
      }
      throw error;
    }
    await this.tryProvisionCustomer(account.id);
    account = await this.reloadAccount(account.id);
    const session = await this.newSession(account, userAgent, ip);
    return {
      ...session,
      ...(exposeTestTokens() ? { verification_token: verificationToken } : {})
    };
  }

  async login(dto: LoginIdentityDto, ip: string, userAgent: string) {
    const email = emailAddress(dto.email);
    const throttleKey = this.requestFingerprint('login', email, ip);
    await this.assertNotBlocked(throttleKey);
    const result = await this.db.query<Account>('SELECT * FROM identity_accounts WHERE email=$1', [email]);
    const account = result.rows[0];
    const matches = await this.verifyPassword(account?.password_hash || null, dto.password);
    if (!account || account.status !== 'ACTIVE' || account.password_reset_required || !matches) {
      await this.countFailure(throttleKey, 5);
      throw new UnauthorizedException('Invalid email or password');
    }
    await this.db.query('DELETE FROM identity_login_throttles WHERE throttle_key=$1', [throttleKey]);
    await this.tryProvisionCustomer(account.id);
    const current = await this.reloadAccount(account.id);
    return this.newSession(current, userAgent, ip);
  }

  async refresh(rawToken: string, userAgent: string, ip: string) {
    const tokenHash = sha256(rawToken);
    const newToken = randomBytes(48).toString('base64url');
    const newSessionId = randomUUID();
    const result = await this.db.transaction(async client => {
      const selected = await client.query<Account & {
        refresh_id: string; family_id: string; expires_at: Date; revoked_at: Date | null
      }>(
        'SELECT s.id AS refresh_id,s.family_id,s.expires_at,s.revoked_at,a.id,a.email,a.password_hash,a.roles,' +
        'a.status,a.email_verified_at,a.password_reset_required,a.token_version,a.provisioning_state,a.created_at ' +
        'FROM identity_refresh_sessions s JOIN identity_accounts a ON a.id=s.account_id ' +
        'WHERE s.token_hash=$1 FOR UPDATE OF s,a', [tokenHash]
      );
      if (!selected.rowCount) return { kind: 'invalid' as const };
      const row = selected.rows[0];
      if (row.revoked_at) {
        await client.query(
          'UPDATE identity_refresh_sessions SET revoked_at=COALESCE(revoked_at,clock_timestamp()) WHERE family_id=$1',
          [row.family_id]
        );
        return { kind: 'replay' as const };
      }
      if (row.expires_at.getTime() <= Date.now() || row.status !== 'ACTIVE') {
        await client.query(
          'UPDATE identity_refresh_sessions SET revoked_at=COALESCE(revoked_at,clock_timestamp()) WHERE family_id=$1',
          [row.family_id]
        );
        return { kind: 'expired' as const };
      }
      const expiry = new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000);
      await client.query(
        'UPDATE identity_refresh_sessions SET revoked_at=clock_timestamp(),replaced_by=$2 WHERE id=$1',
        [row.refresh_id, newSessionId]
      );
      await client.query(
        'INSERT INTO identity_refresh_sessions(id,family_id,account_id,token_hash,expires_at,parent_id,client_fingerprint_hash) ' +
        'VALUES($1,$2,$3,$4,$5,$6,$7)',
        [newSessionId, row.family_id, row.id, sha256(newToken), expiry, row.refresh_id,
          sha256(safeRequestValue(userAgent) + '\u0000' + safeRequestValue(ip))]
      );
      return { kind: 'ok' as const, account: row, token: newToken, expiresAt: expiry };
    });
    if (result.kind !== 'ok') {
      throw new UnauthorizedException(result.kind === 'replay'
        ? 'Refresh token reuse detected; session family revoked'
        : 'Invalid refresh token');
    }
    await this.tryProvisionCustomer(result.account.id);
    const account = await this.reloadAccount(result.account.id);
    return {
      token_type: 'Bearer',
      access_token: this.accessToken(account),
      expires_in: ACCESS_SECONDS,
      refresh_token: result.token,
      refresh_expires_at: result.expiresAt.toISOString(),
      account: accountView(account)
    };
  }

  async logout(rawToken: string) {
    await this.db.transaction(async client => {
      const result = await client.query<{family_id: string}>(
        'SELECT family_id FROM identity_refresh_sessions WHERE token_hash=$1 FOR UPDATE', [sha256(rawToken)]
      );
      if (result.rowCount) {
        await client.query(
          'UPDATE identity_refresh_sessions SET revoked_at=COALESCE(revoked_at,clock_timestamp()) WHERE family_id=$1',
          [result.rows[0].family_id]
        );
      }
    });
    return { ok: true };
  }

  async requestPasswordReset(email: string, ip: string) {
    const token = await this.makeChallenge(email, 'PASSWORD_RESET', ip);
    return {
      message: 'If the account exists, password reset instructions will be sent.',
      ...(token && exposeTestTokens() ? { reset_token: token } : {})
    };
  }
  async requestEmailVerification(email: string, ip: string) {
    const token = await this.makeChallenge(email, 'EMAIL_VERIFY', ip);
    return {
      message: 'If the account requires verification, instructions will be sent.',
      ...(token && exposeTestTokens() ? { verification_token: token } : {})
    };
  }

  async confirmChallenge(purpose: 'EMAIL_VERIFY' | 'PASSWORD_RESET', rawToken: string,
    newPassword?: string) {
    const newHash = purpose === 'PASSWORD_RESET' && newPassword
      ? await this.hashPassword(newPassword) : null;
    const result = await this.db.transaction(async client => {
      const selected = await client.query<{
        challenge_id: string; account_id: number; consumed_at: Date | null; expires_at: Date; status: string
      }>(
        'SELECT ch.id AS challenge_id,ch.account_id,ch.consumed_at,ch.expires_at,a.status ' +
        'FROM identity_challenges ch JOIN identity_accounts a ON a.id=ch.account_id ' +
        'WHERE ch.token_hash=$1 AND ch.purpose=$2 FOR UPDATE OF ch,a',
        [sha256(rawToken), purpose]
      );
      if (!selected.rowCount || selected.rows[0].consumed_at ||
          selected.rows[0].expires_at.getTime() <= Date.now() || selected.rows[0].status !== 'ACTIVE') {
        return { ok: false as const };
      }
      const challenge = selected.rows[0];
      await client.query(
        'UPDATE identity_challenges SET consumed_at=clock_timestamp() WHERE id=$1 AND consumed_at IS NULL',
        [challenge.challenge_id]
      );
      if (purpose === 'EMAIL_VERIFY') {
        await client.query(
          'UPDATE identity_accounts SET email_verified_at=COALESCE(email_verified_at,clock_timestamp()),' +
          'updated_at=clock_timestamp() WHERE id=$1', [challenge.account_id]
        );
      } else {
        await client.query(
          'UPDATE identity_accounts SET password_hash=$2,password_reset_required=false,' +
          'token_version=token_version+1,updated_at=clock_timestamp() WHERE id=$1',
          [challenge.account_id, newHash]
        );
        await client.query(
          'UPDATE identity_refresh_sessions SET revoked_at=COALESCE(revoked_at,clock_timestamp()) ' +
          'WHERE account_id=$1', [challenge.account_id]
        );
      }
      return { ok: true as const };
    });
    if (!result.ok) throw new BadRequestException('Challenge is invalid, expired or already used');
    return { ok: true };
  }

  async me(authorization: string | undefined) {
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException('Bearer access token required');
    }
    const claims = this.keys.verifyAccess(authorization.slice(7));
    const result = await this.db.query<Account>('SELECT * FROM identity_accounts WHERE id=$1', [Number(claims.sub)]);
    if (!result.rowCount || result.rows[0].status !== 'ACTIVE' ||
        Number(result.rows[0].token_version) !== claims.ver) {
      throw new UnauthorizedException('Access token has been revoked');
    }
    return { account: accountView(result.rows[0]) };
  }

  async publicJwks() { return this.keys.jwks(); }

  async provisionPending(limit = 10): Promise<void> {
    const rows = await this.db.query<{id: number}>(
      "SELECT id FROM identity_accounts WHERE status='ACTIVE' AND provisioning_state='PENDING' " +
      'ORDER BY id LIMIT $1', [limit]
    );
    for (const row of rows.rows) await this.tryProvisionCustomer(row.id);
  }
}

@Injectable()
export class IdentityProvisioningWorker implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private busy = false;
  constructor(private readonly service: IdentityService) {}
  onModuleInit(): void {
    if (process.env.V2_IDENTITY_ENABLED !== 'true' || process.env.V2_IDENTITY_RMQ_ENABLED !== 'true') return;
    this.timer = setInterval(() => {
      if (this.busy) return;
      this.busy = true;
      void this.service.provisionPending().catch(() => undefined).finally(() => { this.busy = false; });
    }, 5000);
    this.timer.unref();
  }
  onModuleDestroy(): void { if (this.timer) clearInterval(this.timer); }
}

@Controller('api/v1/auth')
export class IdentityAuthController {
  constructor(private readonly service: IdentityService) {}
  @Post('register')
  register(@Body() body: RegisterIdentityDto, @Req() req: Request) {
    return this.service.register(body, req.ip || '', req.get('user-agent') || '');
  }
  @Post('login') @HttpCode(200)
  login(@Body() body: LoginIdentityDto, @Req() req: Request) {
    return this.service.login(body, req.ip || '', req.get('user-agent') || '');
  }
  @Post('refresh') @HttpCode(200)
  refresh(@Body() body: RefreshIdentityDto, @Req() req: Request) {
    return this.service.refresh(body.refresh_token, req.get('user-agent') || '', req.ip || '');
  }
  @Post('logout') @HttpCode(200)
  logout(@Body() body: RefreshIdentityDto) { return this.service.logout(body.refresh_token); }
  @Post('password-reset/request') @HttpCode(200)
  resetRequest(@Body() body: ResetRequestDto, @Req() req: Request) {
    return this.service.requestPasswordReset(body.email, req.ip || '');
  }
  @Post('password-reset/confirm') @HttpCode(200)
  resetConfirm(@Body() body: ResetConfirmDto) {
    return this.service.confirmChallenge('PASSWORD_RESET', body.token, body.new_password);
  }
  @Post('email-verification/request') @HttpCode(200)
  verifyRequest(@Body() body: ResetRequestDto, @Req() req: Request) {
    return this.service.requestEmailVerification(body.email, req.ip || '');
  }
  @Post('email-verification/confirm') @HttpCode(200)
  verifyConfirm(@Body() body: VerifyEmailDto) {
    return this.service.confirmChallenge('EMAIL_VERIFY', body.token);
  }
  @Get('me')
  me(@Headers('authorization') authorization: string | undefined) {
    return this.service.me(authorization);
  }
}

@Controller()
export class IdentityPublicKeysController {
  constructor(private readonly service: IdentityService) {}
  @Get('.well-known/jwks.json')
  jwks() { return this.service.publicJwks(); }
}

@Controller('health')
export class IdentityHealthController {
  constructor(private readonly db: IdentityDatabase) {}
  @Get('live') live() { return { status: 'ok' }; }
  @Get('ready')
  async ready() {
    try {
      await this.db.ready();
      return { status: 'ok', info: { postgres: { status: 'up' }, jwt: { status: 'up' } } };
    } catch {
      throw new ServiceUnavailableException('Identity PostgreSQL unavailable');
    }
  }
}

@Module({
  controllers: [IdentityAuthController, IdentityPublicKeysController, IdentityHealthController],
  providers: [
    IdentityDatabase, IdentityKeys, IdentityRmqGateway, IdentityOutboxPublisher,
    IdentityService, IdentityProvisioningWorker
  ],
  exports: [IdentityDatabase, IdentityService]
})
export class IdentityModule {}
