import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
test('gateway CORS and port config fail closed in production', () => {
  const source = readFileSync(resolve(root, 'libs/config/src/index.ts'), 'utf8');
  assert.match(source, /production/);
  assert.match(source, /V2_ALLOWED_ORIGINS is required/);
  assert.match(source, /origins\.includes\('\*'\)/);
  assert.match(source, /Number\.isInteger/);
});
test('all application ports are unique; public gateway does not collide with V1', () => {
  const apps = ['api-gateway','identity-service','customer-service','catalog-service',
    'inventory-service','order-service','payment-service','promotion-service','notification-service'];
  const seen = new Set();
  for (const name of apps) {
    const text = readFileSync(resolve(root,'apps',name,'src/main.ts'),'utf8');
    const port = Number(text.match(/process\.env\.PORT, (\d+)/)?.[1]);
    assert.ok(port >= 4100 && port <= 4300, name);
    assert.ok(!seen.has(port), name);
    seen.add(port);
  }
  assert.equal(seen.size, 9);
});
