import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyFacebookIdentity } from '../src/facebook';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';

const settings = { appId: 'app-123', appSecret: 'server-only', version: 'v25.0' };
const now = Math.floor(Date.now() / 1000);
const valid = {
  is_valid: true,
  app_id: 'app-123',
  type: 'USER',
  user_id: 'user-42',
  expires_at: now + 3600,
  data_access_expires_at: now + 3600,
};
function transport(
  debug: object,
  profile = { id: 'user-42', email: 'Pessoa@example.com', name: 'Pessoa' },
) {
  return (async (url, options) => {
    assert.ok(String(url).startsWith('https://graph.facebook.com/v25.0/'));
    assert.ok(!String(url).includes(settings.appSecret));
    assert.ok(new Headers(options?.headers).has('authorization'));
    return Response.json(String(url).includes('/debug_token') ? { data: debug } : profile);
  }) as typeof fetch;
}
test('Facebook checks application, user token, expiry and matching profile before accepting identity', async () => {
  const identity = await verifyFacebookIdentity('user-token', settings, transport(valid));
  assert.equal(identity.sub, 'user-42');
  assert.equal(identity.email, 'pessoa@example.com');
  for (const invalid of [
    { app_id: 'another-app' },
    { type: 'PAGE' },
    { expires_at: now - 1 },
    { data_access_expires_at: now - 1 },
    { is_valid: false },
    { user_id: '' },
  ]) {
    await assert.rejects(
      verifyFacebookIdentity('user-token', settings, transport({ ...valid, ...invalid })),
      /Identidade inválida/,
    );
  }
  await assert.rejects(
    verifyFacebookIdentity(
      'user-token',
      settings,
      transport(valid, { id: 'other-user', email: 'x@example.com', name: 'X' }),
    ),
    /Identidade inválida/,
  );
  await assert.rejects(
    verifyFacebookIdentity(
      'user-token',
      settings,
      transport(valid, { id: 'user-42', email: '', name: 'X' }),
    ),
    /email/,
  );
});
test('Facebook fails closed on absent credentials and upstream errors', async () => {
  await assert.rejects(
    verifyFacebookIdentity('user-token', { ...settings, appSecret: '' }),
    /indisponível/,
  );
  await assert.rejects(
    verifyFacebookIdentity(
      'user-token',
      settings,
      (async () => new Response('secret diagnostic', { status: 500 })) as typeof fetch,
    ),
    /temporariamente/,
  );
});
test('Limited Login checks signature, audience, issuer, expiry and challenge nonce', async () => {
  const { privateKey, publicKey } = await generateKeyPair('RS256');
  const jwk = { ...(await exportJWK(publicKey)), kid: 'test-key' };
  const local = createLocalJWKSet({ keys: [jwk] });
  const nonce = 'one-attempt-only';
  async function signed(
    overrides: { audience?: string; issuer?: string; expires?: number; nonce?: string } = {},
  ) {
    return new SignJWT({
      email: 'pessoa@example.com',
      name: 'Pessoa',
      nonce: overrides.nonce ?? nonce,
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
      .setSubject('user-42')
      .setIssuedAt()
      .setExpirationTime(overrides.expires ?? now + 300)
      .setAudience(overrides.audience ?? settings.appId)
      .setIssuer(overrides.issuer ?? 'https://www.facebook.com')
      .sign(privateKey);
  }
  const token = await signed();
  assert.equal((await verifyFacebookIdentity(token, settings, fetch, nonce, local)).sub, 'user-42');
  await assert.rejects(
    verifyFacebookIdentity(token, settings, fetch, undefined, local),
    /Identidade inválida/,
  );
  await assert.rejects(
    verifyFacebookIdentity(token, settings, fetch, 'wrong-nonce', local),
    /Identidade inválida/,
  );
  for (const options of [
    { audience: 'other-app' },
    { issuer: 'https://evil.example' },
    { expires: now - 60 },
  ])
    await assert.rejects(
      verifyFacebookIdentity(await signed(options), settings, fetch, nonce, local),
      /Identidade inválida/,
    );
});
