import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';
export function rateIdentity(
  peer: string,
  headers: Record<string, unknown>,
  secret: string,
  trustedIngress: string[],
) {
  const key = headers['x-junta-rate-key'],
    proof = headers['x-junta-proxy-proof'];
  if (
    secret.length >= 32 &&
    typeof key === 'string' &&
    /^[a-f0-9]{64}$/.test(key) &&
    typeof proof === 'string' &&
    /^[a-f0-9]{64}$/.test(proof)
  ) {
    const expected = createHmac('sha256', secret).update(key).digest();
    if (timingSafeEqual(expected, Buffer.from(proof, 'hex'))) return `proxy:${key}`;
  }
  const socket = peer.replace(/^::ffff:/, ''),
    forwarded = headers['cf-connecting-ip'];
  const ip =
    trustedIngress.includes(socket) && typeof forwarded === 'string' && isIP(forwarded)
      ? forwarded
      : socket;
  return `direct:${createHash('sha256').update(ip).digest('hex')}`;
}
