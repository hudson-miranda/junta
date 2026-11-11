import type { MetadataRoute } from 'next';
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/settings', '/me', '/notifications', '/reset'],
    },
    sitemap: `${process.env.NEXT_PUBLIC_WEB_URL ?? (process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'http://localhost:3000')}/sitemap.xml`,
  };
}
