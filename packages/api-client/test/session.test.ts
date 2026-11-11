import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { ApiClient, ApiError } from '../src';
let status = 200,
  calls = 0,
  base: string;
const server = createServer((req, res) => {
  calls++;
  res.writeHead(status, { 'Content-Type': req.url === '/html' ? 'text/html' : 'application/json' });
  res.end(
    req.url === '/html'
      ? '<h1>Unavailable</h1>'
      : JSON.stringify(
          status === 200
            ? { accessToken: 'access', refreshToken: 'rotated', user: { id: 'user' } }
            : { message: 'Unavailable' },
        ),
  );
});
before(async () => {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error();
  base = `http://127.0.0.1:${address.port}`;
});
after(() => {
  server.closeAllConnections();
  server.close();
});
test('temporary failure preserves stored refresh token for retry', async () => {
  status = 503;
  let stored: string | null = 'existing';
  const client = new ApiClient(base, {
    get: async () => stored,
    set: async (v) => {
      stored = v;
    },
  });
  assert.equal(await client.restore(), null);
  assert.equal(stored, 'existing');
});
test('concurrent restore rotates only once and persists replacement', async () => {
  status = 200;
  calls = 0;
  let stored: string | null = 'existing';
  const client = new ApiClient(base, {
    get: async () => stored,
    set: async (v) => {
      stored = v;
    },
  });
  await Promise.all(Array.from({ length: 5 }, () => client.restore()));
  assert.equal(calls, 1);
  assert.equal(stored, 'rotated');
  assert.equal(client.token, 'access');
});
test('invalid refresh revokes stored identity', async () => {
  status = 401;
  let stored: string | null = 'existing';
  const client = new ApiClient(base, {
    get: async () => stored,
    set: async (v) => {
      stored = v;
    },
  });
  assert.equal(await client.restore(), null);
  assert.equal(stored, null);
});
test('HTML proxy failure remains a useful typed API error', async () => {
  status = 503;
  const client = new ApiClient(base);
  await assert.rejects(
    () => client.request('/html'),
    (e) => e instanceof ApiError && e.status === 503,
  );
});
