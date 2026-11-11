export function config() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error('JWT_SECRET requires at least 32 characters');
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const origins = (
    process.env.CORS_ORIGINS ??
    'http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:8081'
  )
    .split(',')
    .filter(Boolean);
  if (origins.includes('*')) throw new Error('CORS wildcard forbidden');
  if (process.env.NODE_ENV === 'production' && origins.some((v) => !v.startsWith('https://')))
    throw new Error('Production requires HTTPS origins');
  return {
    secret,
    origins,
    production: process.env.NODE_ENV === 'production',
    webUrl: process.env.WEB_URL ?? 'http://localhost:3000',
  };
}
