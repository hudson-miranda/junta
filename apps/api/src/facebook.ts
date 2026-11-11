import { createHmac } from 'node:crypto';
import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';
import { z } from 'zod';

const keys = createRemoteJWKSet(new URL('https://www.facebook.com/.well-known/oauth/openid/jwks/'));
type Settings = { appId: string; appSecret: string; version: string };
export async function verifyFacebookIdentity(
  token: string,
  settings: Settings,
  fetcher: typeof fetch = fetch,
  expectedNonce?: string,
  limitedKeys: JWTVerifyGetKey = keys,
) {
  if (!settings.appId || !settings.appSecret)
    throw new ServiceUnavailableException('Login com Facebook indisponível neste ambiente');
  let identity: { sub?: string; email?: unknown; name?: unknown };
  if (token.split('.').length === 3) {
    try {
      if (!expectedNonce) throw new Error('Missing challenge');
      const { payload } = await jwtVerify(token, limitedKeys, {
        audience: settings.appId,
        issuer: 'https://www.facebook.com',
        algorithms: ['RS256'],
        requiredClaims: ['exp', 'iat', 'sub', 'nonce'],
      });
      if (payload.nonce !== expectedNonce) throw new Error('Invalid challenge');
      identity = payload;
    } catch {
      throw new UnauthorizedException('Identidade inválida');
    }
  } else {
    if (!/^v\d+\.0$/.test(settings.version))
      throw new ServiceUnavailableException('Login com Facebook indisponível neste ambiente');
    const base = `https://graph.facebook.com/${settings.version}`;
    async function get(path: string, authorization: string) {
      let response: Response;
      try {
        response = await fetcher(`${base}${path}`, {
          headers: { Authorization: `Bearer ${authorization}` },
          signal: AbortSignal.timeout(10000),
          redirect: 'error',
        });
      } catch {
        throw new ServiceUnavailableException(
          'Facebook temporariamente indisponível. Tente novamente.',
        );
      }
      if (response.status >= 500)
        throw new ServiceUnavailableException(
          'Facebook temporariamente indisponível. Tente novamente.',
        );
      if (!response.ok) throw new UnauthorizedException('Identidade inválida');
      try {
        return await response.json();
      } catch {
        throw new UnauthorizedException('Identidade inválida');
      }
    }
    const checked = z
      .object({
        data: z.object({
          is_valid: z.literal(true),
          app_id: z.string(),
          type: z.literal('USER'),
          user_id: z.string().min(1),
          expires_at: z.number(),
          data_access_expires_at: z.number().optional(),
        }),
      })
      .safeParse(
        await get(
          `/debug_token?input_token=${encodeURIComponent(token)}`,
          `${settings.appId}|${settings.appSecret}`,
        ),
      );
    const now = Date.now() / 1000;
    if (
      !checked.success ||
      checked.data.data.app_id !== settings.appId ||
      checked.data.data.expires_at <= now ||
      (checked.data.data.data_access_expires_at !== undefined &&
        checked.data.data.data_access_expires_at <= now)
    )
      throw new UnauthorizedException('Identidade inválida');
    const proof = createHmac('sha256', settings.appSecret).update(token).digest('hex');
    const profile = z
      .object({ id: z.string(), email: z.string().optional(), name: z.string().optional() })
      .safeParse(await get(`/me?fields=id,name,email&appsecret_proof=${proof}`, token));
    if (!profile.success || profile.data.id !== checked.data.data.user_id)
      throw new UnauthorizedException('Identidade inválida');
    identity = { ...profile.data, sub: profile.data.id };
  }
  const address = z.email().safeParse(identity.email);
  if (!address.success || !identity.sub)
    throw new UnauthorizedException(
      'Autorize o acesso ao email no Facebook ou entre com outro método.',
    );
  return {
    sub: identity.sub,
    email: address.data.toLowerCase(),
    name: typeof identity.name === 'string' ? identity.name : 'Pessoa JUNTA',
  };
}
