import type { MetadataRoute } from 'next';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3000';
  let slugs: string[] = [];
  try {
    const r = await fetch(`${process.env.API_SERVER_URL ?? 'http://localhost:4000'}/products`, {
      signal: AbortSignal.timeout(5000),
    });
    if (r.ok) {
      const p = await r.json();
      slugs = p.items.map((v: { slug: string }) => v.slug);
    }
  } catch {
    /* The homepage remains discoverable while the API is offline. */
  }
  return [
    { url: base, lastModified: new Date() },
    ...slugs.map((slug) => ({ url: `${base}/p/${slug}`, lastModified: new Date() })),
  ];
}
