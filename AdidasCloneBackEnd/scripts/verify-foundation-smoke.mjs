import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const apps = [
  ['api-gateway', 4300],
  ['identity-service', 4101],
  ['customer-service', 4102],
  ['catalog-service', 4103],
  ['inventory-service', 4104],
  ['order-service', 4105],
  ['payment-service', 4106],
  ['promotion-service', 4107],
  ['notification-service', 4108]
];

async function awaitHttp(url, child, getLog) {
  for (let attempt = 0; attempt < 60; attempt++) {
    if (child.exitCode !== null) throw new Error('Process exited: ' + getLog());
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1500) });
      if (response.ok) return response;
    } catch { /* still starting */ }
    await sleep(200);
  }
  throw new Error('Timed out waiting for ' + url + '\n' + getLog());
}

async function run() {
  let passed = 0;
  for (const [name, port] of apps) {
    const output = [];
    const child = spawn(process.execPath, [resolve(root, 'dist/apps', name, 'src/main.js')], {
      cwd: root,
      env: {
        ...process.env,
        PORT: String(port),
        NODE_ENV: 'production',
        V2_ALLOWED_ORIGINS: 'http://localhost:3001'
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    const store = chunk => {
      output.push(chunk.toString());
      if (output.length > 50) output.shift();
    };
    child.stderr.on('data', store);
    child.stdout.on('data', store);
    const base = 'http://127.0.0.1:' + port;
    try {
      const live = await awaitHttp(base + '/health/live', child, () => output.join(''));
      assert.equal((await live.json()).status, 'ok', name + ' liveness');

      const ready = await fetch(base + '/health/ready');
      assert.equal(ready.status, 200, name + ' foundation readiness');
      assert.equal((await ready.json()).status, 'ok');

      if (name === 'api-gateway') {
        const api = await fetch(base + '/api/v1/system');
        assert.equal(api.status, 200);
        assert.equal((await api.json()).business_routes_active, false);
        const spec = await fetch(base + '/api/docs-json');
        assert.equal(spec.status, 200);
        assert.ok((await spec.json()).paths['/api/v1/system']);
        const origin = await fetch(base + '/api/v1/system', {
          headers: { Origin: 'https://invalid.example' }
        });
        assert.notEqual(origin.headers.get('access-control-allow-origin'), '*');
        assert.equal(origin.headers.get('access-control-allow-origin'), null);
        const cid = api.headers.get('x-correlation-id');
        assert.match(cid, /^[0-9a-f-]{36}$/i);
      }
      passed++;
      process.stdout.write('PASS ' + name + ' HTTP live/ready\n');
    } finally {
      child.kill('SIGTERM');
      await Promise.race([
        new Promise(resolveExit => child.once('exit', resolveExit)),
        sleep(1500)
      ]);
      if (child.exitCode === null) child.kill('SIGKILL');
    }
  }
  console.log('PASS ' + passed + '/' + apps.length + ' runtime HTTP smoke checks');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
