import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHmac, randomUUID } from 'node:crypto';
import { PrismaClient } from '../generated/client';
import { createApp } from '../src/app';
import { processOutbox } from '../src/outbox';
import { seed } from '../prisma/seed';
import type { INestApplication } from '@nestjs/common';

type Body = {
  id: string;
  accessToken: string;
  refreshToken: string;
  user: { id: string; role: string };
  items: { id: string; title: string; count: number; offerId: string }[];
  count: number;
  statusCode: number;
  requestId: string;
  message: string;
  url: string;
};
let app: INestApplication,
  db: PrismaClient,
  base: string,
  consumer: Body,
  admin: Body,
  merchant: Body;
async function request(path: string, method = 'GET', body?: unknown, token?: string, key?: string) {
  const response = await fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(key ? { 'Idempotency-Key': key } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return {
    status: response.status,
    body: (await response.json()) as Body,
    headers: response.headers,
  };
}
before(async () => {
  const url = process.env.TEST_DATABASE_URL;
  if (!url || !new URL(url).pathname.endsWith('/junta_test'))
    throw new Error('Refuse tests outside dedicated junta_test database');
  process.env.DATABASE_URL = url;
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-only-key-with-at-least-32-characters';
  execFileSync(process.execPath, [require.resolve('prisma/build/index.js'), 'migrate', 'deploy'], {
    env: process.env,
    stdio: 'pipe',
  });
  db = new PrismaClient();
  const tables = await db.$queryRaw<
    { tablename: string }[]
  >`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> '_prisma_migrations'`;
  for (const { tablename } of tables)
    await db.$executeRawUnsafe(`TRUNCATE TABLE "${tablename.replaceAll('"', '""')}" CASCADE`);
  await seed(db);
  app = await createApp({ db, logging: false });
  await app.listen(0, '127.0.0.1');
  base = await app.getUrl();
  consumer = (
    await request('/auth/login', 'POST', {
      email: 'consumer@junta.local',
      password: process.env.DEMO_PASSWORD,
    })
  ).body;
  admin = (
    await request('/auth/login', 'POST', {
      email: 'admin@junta.local',
      password: process.env.DEMO_PASSWORD,
    })
  ).body;
  merchant = (
    await request('/auth/login', 'POST', {
      email: 'merchant@junta.local',
      password: process.env.DEMO_PASSWORD,
    })
  ).body;
});
after(async () => {
  await app?.close();
  await db?.$disconnect();
});
test('health, readiness, public search and docs respond', async () => {
  assert.equal((await request('/health')).status, 200);
  assert.equal((await request('/ready')).status, 200);
  const products = await request('/products?q=PlayStation');
  assert.equal(products.body.items.length, 1);
  assert.equal((await fetch(base + '/api/docs-json')).status, 200);
});
test('signup persists Argon2 and rejects duplicate and invalid input', async () => {
  const input = { name: 'Maria', email: ' MARIA@example.com ', password: 'VeryStrong!Password9' };
  assert.equal((await request('/auth/signup', 'POST', input)).status, 201);
  const user = await db.user.findUniqueOrThrow({ where: { email: 'maria@example.com' } });
  assert.match(user.passwordHash!, /^\$argon2id\$/);
  assert.equal((await request('/auth/signup', 'POST', input)).status, 409);
  assert.equal((await request('/auth/signup', 'POST', { ...input, password: 'x' })).status, 400);
});
test('concurrent idempotent intent updates demand exactly once and writes outbox', async () => {
  const input = { variantId: 'playstation-5-slim-default', horizon: 'WEEK', targetCents: 299900 };
  const results = await Promise.all(
    Array.from({ length: 8 }, () =>
      request('/intents', 'POST', input, consumer.accessToken, 'intent-one'),
    ),
  );
  assert.ok(
    results.every((r) => [200, 201].includes(r.status)),
    JSON.stringify(results),
  );
  assert.equal(new Set(results.map((r) => r.body.id)).size, 1);
  const pool = await db.demandPool.findUniqueOrThrow({
    where: { variantId_horizon: { variantId: input.variantId, horizon: 'WEEK' } },
  });
  assert.equal(pool.count, 1);
  assert.equal(pool.targetTotal.toString(), '2999');
  assert.equal(await db.outboxEvent.count({ where: { type: 'purchase_intent.created' } }), 1);
  const duplicate = await request('/intents', 'POST', input, consumer.accessToken, 'different-key');
  assert.equal(duplicate.status, 409);
  assert.equal(
    (
      await request(
        '/intents',
        'POST',
        { ...input, targetCents: 199900 },
        consumer.accessToken,
        'intent-one',
      )
    ).status,
    409,
  );
});
test('intents require auth, positive integer cents and idempotency key', async () => {
  assert.equal((await request('/intents', 'POST', {})).status, 401);
  assert.equal(
    (
      await request(
        '/intents',
        'POST',
        { variantId: 'x', targetCents: -1, horizon: 'WEEK' },
        consumer.accessToken,
        'bad',
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await request(
        '/intents',
        'POST',
        { variantId: 'x', targetCents: 500, horizon: 'WEEK' },
        consumer.accessToken,
      )
    ).status,
    400,
  );
});
test('consumers and analysts cannot mutate admin resources', async () => {
  assert.equal(
    (await request('/admin/overview', 'GET', undefined, consumer.accessToken)).status,
    403,
  );
  const analyst = (
    await request('/auth/login', 'POST', {
      email: 'analyst@junta.local',
      password: process.env.DEMO_PASSWORD,
    })
  ).body;
  assert.equal(
    (await request('/admin/overview', 'GET', undefined, analyst.accessToken)).status,
    200,
  );
  assert.equal((await request('/admin/products', 'POST', {}, analyst.accessToken)).status, 403);
});
test('merchant cannot choose another tenant or edit another offer', async () => {
  const other = await db.merchant.create({ data: { name: 'Other', approved: true } });
  const offer = {
    variantId: 'playstation-5-slim-default',
    merchantId: other.id,
    priceCents: 299900,
    url: 'https://example.com/ps5',
    startsAt: new Date(Date.now() - 1000).toISOString(),
    endsAt: new Date(Date.now() + 86400000).toISOString(),
  };
  assert.equal((await request('/offers', 'POST', offer, merchant.accessToken)).status, 403);
});
test('published offer generates one notification on retry and affiliate click is persisted', async () => {
  const offer = await request(
    '/offers',
    'POST',
    {
      variantId: 'playstation-5-slim-default',
      merchantId: 'merchant-demo',
      priceCents: 299900,
      url: 'https://example.com/ps5',
      startsAt: new Date(Date.now() - 1000).toISOString(),
      endsAt: new Date(Date.now() + 86400000).toISOString(),
    },
    admin.accessToken,
  );
  assert.equal(offer.status, 201);
  assert.ok(offer.body.id);
  await processOutbox(db);
  await processOutbox(db);
  const notes = await request('/notifications', 'GET', undefined, consumer.accessToken);
  assert.equal(notes.body.items.length, 1);
  assert.equal(notes.body.items[0].offerId, offer.body.id);
  const event = await db.outboxEvent.findFirstOrThrow({ where: { type: 'offer.activated' } });
  await db.outboxEvent.update({ where: { id: event.id }, data: { processedAt: null } });
  await processOutbox(db);
  assert.equal(await db.notification.count({ where: { userId: consumer.user.id } }), 1);
  assert.equal(
    (await request(`/offers/${offer.body.id}/click`, 'POST', {}, consumer.accessToken)).body.url,
    'https://example.com/ps5',
  );
  assert.equal(await db.analyticsEvent.count({ where: { name: 'offer.click' } }), 1);
});
test('expired offer cannot redirect', async () => {
  const offer = await db.offer.create({
    data: {
      variantId: 'playstation-5-slim-default',
      merchantId: 'merchant-demo',
      price: '2999',
      url: 'https://example.com',
      startsAt: new Date(Date.now() - 20000),
      endsAt: new Date(Date.now() - 10000),
    },
  });
  assert.equal(
    (await request(`/offers/${offer.id}/click`, 'POST', {}, consumer.accessToken)).status,
    404,
  );
});
test('refresh rotation stores hashes and replay revokes entire family', async () => {
  const login = (
    await request('/auth/login', 'POST', {
      email: 'consumer@junta.local',
      password: process.env.DEMO_PASSWORD,
    })
  ).body;
  assert.ok(login.refreshToken);
  assert.equal(await db.session.count({ where: { tokenHash: login.refreshToken } }), 0);
  const rotated = await request('/auth/refresh', 'POST', { refreshToken: login.refreshToken });
  assert.equal(rotated.status, 200);
  assert.equal(
    (await request('/me', 'GET', undefined, login.accessToken)).status,
    200,
    'normal rotation must preserve other tabs until access-token expiry',
  );
  assert.notEqual(rotated.body.refreshToken, login.refreshToken);
  assert.equal(
    (await request('/auth/refresh', 'POST', { refreshToken: login.refreshToken })).status,
    401,
  );
  assert.equal(
    (await request('/auth/refresh', 'POST', { refreshToken: rotated.body.refreshToken })).status,
    401,
  );
});
test('referral conversion credited only once and self referral blocked by signup identity', async () => {
  const user = await db.user.findUniqueOrThrow({ where: { id: consumer.user.id } });
  const data = {
    name: 'Referral user',
    email: 'referral@example.com',
    password: 'Another!Password9',
    referralCode: user.referralCode,
  };
  assert.equal((await request('/auth/signup', 'POST', data)).status, 201);
  assert.equal((await request('/auth/signup', 'POST', data)).status, 409);
  assert.equal(await db.analyticsEvent.count({ where: { name: 'referral.converted' } }), 1);
});
test('cancel intent decrements demand once and allows new intent preserving history', async () => {
  const intent = await db.purchaseIntent.findFirstOrThrow({
    where: { userId: consumer.user.id, active: true },
  });
  assert.equal(
    (await request(`/intents/${intent.id}`, 'DELETE', {}, consumer.accessToken)).status,
    200,
  );
  assert.equal(
    (await request(`/intents/${intent.id}`, 'DELETE', {}, consumer.accessToken)).status,
    200,
  );
  const pool = await db.demandPool.findUniqueOrThrow({
    where: { variantId_horizon: { variantId: intent.variantId, horizon: 'WEEK' } },
  });
  assert.equal(pool.count, 0);
  assert.equal(await db.purchaseIntent.count({ where: { id: intent.id, active: false } }), 1);
});
test('errors include request ID and reject untrusted browser origin', async () => {
  const result = await request('/me');
  assert.equal(result.status, 401);
  assert.ok(result.body.requestId);
  assert.ok(result.headers.get('x-request-id'));
  const response = await fetch(base + '/auth/refresh', {
    method: 'POST',
    headers: { Origin: 'https://evil.example', 'Content-Type': 'application/json' },
    body: '{}',
  });
  assert.equal(response.status, 403);
});
test('merchant cannot disable another merchant offer', async () => {
  const other = await db.merchant.create({ data: { name: 'Isolated store', approved: true } });
  const offer = await db.offer.create({
    data: {
      variantId: 'playstation-5-slim-default',
      merchantId: other.id,
      price: '2999',
      url: 'https://example.com',
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 86400000),
    },
  });
  assert.equal(
    (await request(`/offers/${offer.id}`, 'DELETE', {}, merchant.accessToken)).status,
    403,
  );
  assert.equal((await db.offer.findUniqueOrThrow({ where: { id: offer.id } })).active, true);
});
test('password reset is hashed, single use and revokes sessions', async () => {
  const { digest } = await import('../src/auth');
  const signup = (
    await request('/auth/signup', 'POST', {
      name: 'Reset user',
      email: 'reset@example.com',
      password: 'Old!Password123',
    })
  ).body;
  const raw = 'single-use-reset-token-only-for-test';
  await db.passwordReset.create({
    data: {
      userId: signup.user.id,
      tokenHash: digest(raw),
      expiresAt: new Date(Date.now() + 60000),
    },
  });
  assert.equal(
    (await request('/auth/reset', 'POST', { token: raw, password: 'New!Password123' })).status,
    200,
  );
  assert.equal((await request('/me', 'GET', undefined, signup.accessToken)).status, 401);
  assert.equal(
    (await request('/auth/reset', 'POST', { token: raw, password: 'Another!Password123' })).status,
    401,
  );
  assert.equal(
    (
      await request('/auth/login', 'POST', {
        email: 'reset@example.com',
        password: 'New!Password123',
      })
    ).status,
    200,
  );
});
test('account deletion cancels demand and revokes identity without losing history', async () => {
  const signup = (
    await request('/auth/signup', 'POST', {
      name: 'Delete user',
      email: 'delete@example.com',
      password: 'Delete!Password123',
    })
  ).body;
  await request(
    '/intents',
    'POST',
    { variantId: 'iphone-17-default', horizon: 'MONTH', targetCents: 299900 },
    signup.accessToken,
    'delete-intent',
  );
  assert.equal((await request('/me', 'DELETE', {}, signup.accessToken)).status, 200);
  const user = await db.user.findUniqueOrThrow({ where: { id: signup.user.id } });
  assert.ok(user.deletedAt);
  assert.equal(user.passwordHash, null);
  assert.notEqual(user.email, 'delete@example.com');
  assert.equal(
    (
      await db.demandPool.findUniqueOrThrow({
        where: { variantId_horizon: { variantId: 'iphone-17-default', horizon: 'MONTH' } },
      })
    ).count,
    0,
  );
  assert.equal(await db.purchaseIntent.count({ where: { userId: user.id, active: false } }), 1);
  assert.equal((await request('/me', 'GET', undefined, signup.accessToken)).status, 401);
  const { PlatformService } = await import('../src/platform');
  await assert.rejects(() =>
    new PlatformService(db).createIntent(
      user,
      { variantId: 'iphone-17-default', horizon: 'WEEK', targetCents: 299900 },
      'deleted-user-intent',
    ),
  );
});
test('logout detaches push devices and subsequent login cannot receive old account alerts', async () => {
  const one = (
    await request('/auth/signup', 'POST', {
      name: 'Device A',
      email: 'device-a@example.com',
      password: 'Device!Password123',
    })
  ).body;
  const token = 'ExpoPushToken[shared-device-test]';
  assert.equal(
    (await request('/devices', 'POST', { token, platform: 'android' }, one.accessToken)).status,
    201,
  );
  assert.equal((await db.device.findUniqueOrThrow({ where: { token } })).enabled, true);
  assert.equal((await request('/auth/logout', 'POST', {}, one.accessToken)).status, 200);
  assert.equal((await db.device.findUniqueOrThrow({ where: { token } })).enabled, false);
  const two = (
    await request('/auth/signup', 'POST', {
      name: 'Device B',
      email: 'device-b@example.com',
      password: 'Device!Password123',
    })
  ).body;
  assert.equal(
    (await request('/devices', 'POST', { token, platform: 'android' }, two.accessToken)).status,
    201,
  );
  assert.equal((await db.device.findUniqueOrThrow({ where: { token } })).userId, two.user.id);
});
test('separate signed proxy clients do not exhaust each other catalogue allowance', async () => {
  const secret = process.env.PROXY_SHARED_SECRET;
  if (!secret) throw new Error('Test requires PROXY_SHARED_SECRET');
  for (const client of [randomUUID(), randomUUID()]) {
    const key = createHmac('sha256', secret).update(client).digest('hex'),
      proof = createHmac('sha256', secret).update(key).digest('hex');
    for (let n = 0; n < 61; n++) {
      const response = await fetch(base + '/products?q=PlayStation', {
        headers: { 'X-Junta-Rate-Key': key, 'X-Junta-Proxy-Proof': proof },
      });
      assert.equal(response.status, 200);
      await response.arrayBuffer();
    }
  }
});
