import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { rateIdentity } from '../src/rate';
const secret = 'test-proxy-secret-with-at-least-32-characters';
function proof(ip: string) {
  const key = createHmac('sha256', secret).update(ip).digest('hex');
  return {
    'x-junta-rate-key': key,
    'x-junta-proxy-proof': createHmac('sha256', secret).update(key).digest('hex'),
  };
}
test('signed proxy clients receive separate buckets despite sharing a socket', () => {
  assert.notEqual(
    rateIdentity('10.0.0.2', proof('203.0.113.1'), secret, []),
    rateIdentity('10.0.0.2', proof('203.0.113.2'), secret, []),
  );
});
test('forged proof and arbitrary forwarded IP cannot change the bucket', () => {
  const direct = rateIdentity('10.0.0.2', {}, secret, []);
  assert.equal(
    rateIdentity(
      '10.0.0.2',
      {
        'x-junta-rate-key': 'f'.repeat(64),
        'x-junta-proxy-proof': '0'.repeat(64),
        'x-forwarded-for': '203.0.113.1',
        'cf-connecting-ip': '203.0.113.2',
      },
      secret,
      [],
    ),
    direct,
  );
});
test('native clients behind explicitly trusted ingress use validated client address', () => {
  assert.notEqual(
    rateIdentity('::ffff:10.0.0.2', { 'cf-connecting-ip': '203.0.113.1' }, secret, ['10.0.0.2']),
    rateIdentity('10.0.0.2', { 'cf-connecting-ip': '203.0.113.2' }, secret, ['10.0.0.2']),
  );
  assert.equal(
    rateIdentity('10.0.0.2', { 'cf-connecting-ip': 'invalid' }, secret, ['10.0.0.2']),
    rateIdentity('10.0.0.2', {}, secret, []),
  );
});
