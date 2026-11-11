import type { NextRequest } from 'next/server';
import { createHmac } from 'node:crypto';
export const dynamic = 'force-dynamic';
async function proxy(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const origin = request.headers.get('origin');
  if (origin && origin !== request.nextUrl.origin)
    return Response.json({ message: 'Origem não permitida' }, { status: 403 });
  const { path } = await params;
  if (path.some((p) => p === '.' || p === '..')) return new Response(null, { status: 400 });
  const target = new URL(
    path.map(encodeURIComponent).join('/'),
    (process.env.API_SERVER_URL ?? 'http://localhost:4000').replace(/\/$/, '') + '/',
  );
  target.search = request.nextUrl.search;
  const headers = new Headers({ 'X-Junta-Browser': '1' });
  const secret = process.env.PROXY_SHARED_SECRET;
  if (secret) {
    const ip = (
      request.headers.get('x-vercel-forwarded-for') ??
      request.headers.get('x-forwarded-for') ??
      'local'
    )
      .split(',')[0]
      .trim();
    const key = createHmac('sha256', secret).update(ip).digest('hex');
    headers.set('X-Junta-Rate-Key', key);
    headers.set('X-Junta-Proxy-Proof', createHmac('sha256', secret).update(key).digest('hex'));
  }
  for (const name of [
    'content-type',
    'authorization',
    'idempotency-key',
    'cookie',
    'x-request-id',
  ]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const init: RequestInit & { duplex?: 'half' } = {
    method: request.method,
    headers,
    redirect: 'manual',
    signal: AbortSignal.timeout(20000),
    ...(request.method === 'GET' || request.method === 'HEAD'
      ? {}
      : { body: request.body, duplex: 'half' }),
  };
  try {
    const upstream = await fetch(target, init),
      out = new Headers();
    for (const name of ['content-type', 'x-request-id', 'retry-after']) {
      const value = upstream.headers.get(name);
      if (value) out.set(name, value);
    }
    for (const cookie of upstream.headers.getSetCookie()) {
      let value = cookie.replace('Path=/auth', 'Path=/api/auth');
      if (request.nextUrl.protocol === 'https:' && !/; Secure/i.test(value)) value += '; Secure';
      out.append('set-cookie', value);
    }
    return new Response(upstream.body, { status: upstream.status, headers: out });
  } catch {
    return Response.json(
      { message: 'O JUNTA está temporariamente indisponível. Tente novamente.' },
      { status: 503 },
    );
  }
}
export { proxy as GET, proxy as POST, proxy as PATCH, proxy as DELETE, proxy as PUT };
