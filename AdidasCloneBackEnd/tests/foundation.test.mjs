import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const apps = [
  'api-gateway', 'identity-service', 'customer-service', 'catalog-service',
  'inventory-service', 'order-service', 'payment-service', 'promotion-service',
  'notification-service'
];
test('all eight domains and gateway are present and isolated', () => {
  for (const app of apps) {
    assert.ok(existsSync(resolve(root, 'apps', app, 'src/main.ts')), app);
    const module = read('apps/' + app + '/src/app.module.ts');
    assert.match(module, /HealthModule/);
    assert.doesNotMatch(module, /Prisma|Stripe|Cloudinary|PaymentIntent/);
    if (app !== 'api-gateway') assert.doesNotMatch(module, /@Controller\('api\/v1/);
  }
});
test('Nest majors match and Node 24 is required', () => {
  const p = JSON.parse(read('package.json'));
  assert.equal(p.engines.node, '>=24 <25');
  for (const name of [
    '@nestjs/common', '@nestjs/core', '@nestjs/microservices', '@nestjs/platform-express',
    '@nestjs/testing'
  ]) {
    const ver = (p.dependencies || {})[name] || (p.devDependencies || {})[name];
    assert.match(ver, /^11\./, name);
  }
});
test('no gateway connection to V1 database, email or Stripe', () => {
  const gateway = read('apps/api-gateway/src/main.ts') + read('apps/api-gateway/src/app.module.ts');
  assert.doesNotMatch(gateway, /DATABASE_URL|Prisma|StripeService|nodemailer|sendMail/i);
  assert.match(gateway, /forbidNonWhitelisted: true/);
  assert.match(gateway, /SwaggerModule\.setup/);
});
test('wire-only contracts are versioned and durable messaging is specified', () => {
  const c = read('libs/contracts/src/index.ts');
  const m = read('libs/messaging/src/index.ts');
  assert.match(c, /payment\.succeeded\.v1/);
  assert.match(c, /order\.confirmed\.v1/);
  assert.match(c, /inventory\.reservation\.create\.v1/);
  assert.match(c, /message_id: string/);
  assert.match(c, /correlation_id: string/);
  assert.doesNotMatch(c, /PrismaClient|\@prisma\/client|EntityRepository/);
  assert.match(m, /durable: true/);
  assert.match(m, /noAck: false/);
});
test('domain apps only have infrastructure endpoints during Phase 1', () => {
  for (const app of apps.slice(1)) {
    const mod = read('apps/' + app + '/src/app.module.ts');
    assert.doesNotMatch(mod, /OrdersService|ProductsService|AuthService|PaymentService/);
  }
  const health = read('libs/health/src/health.module.ts');
  assert.match(health, /@Get\('live'\)/);
  assert.match(health, /@Get\('ready'\)/);
});
test('the new V2 compose cannot reuse V1 Docker volumes', () => {
  const compose = read('infra/docker/docker-compose.v2.yml');
  assert.match(compose, /name: adidas-v2/);
  assert.match(compose, /v2_postgres_data:/);
  assert.match(compose, /v2_elasticsearch_data:/);
  assert.doesNotMatch(compose, /adidasclonebackend_es_data|container_name:\s*postgres\b|^\s+postgres_data:/m);
});
test('secrets are not hard-coded and live env files remain ignored', () => {
  const compose = read('infra/docker/docker-compose.v2.yml');
  assert.match(compose, /\$\{V2_POSTGRES_PASSWORD:\?/);
  assert.match(compose, /\$\{V2_RABBITMQ_PASSWORD:\?/);
  const ignore = read('.gitignore');
  assert.match(ignore, /\.env\.\*/);
});


test('isolated V2 PostgreSQL bootstrap uses idempotent SQL without executable shell permission', () => {
  const compose = read('infra/docker/docker-compose.v2.yml');
  const sql = read('infra/docker/10-create-databases.sql');
  assert.match(compose, /10-create-databases\.sql:\/docker-entrypoint-initdb\.d\/10-create-databases\.sql:ro/);
  assert.doesNotMatch(compose, /10-create-databases\.sh/);
  assert.match(sql, /NOT EXISTS/);
  assert.match(sql, /\\gexec/);
  for (const name of ['identity_db', 'customer_db', 'catalog_db', 'inventory_db',
    'order_db', 'payment_db', 'promotion_db']) {
    assert.ok(sql.includes("'" + name + "'"), name);
  }
  assert.doesNotMatch(sql.replace(/^--.*$/gm, ''), /DROP DATABASE|mydb/);
});
