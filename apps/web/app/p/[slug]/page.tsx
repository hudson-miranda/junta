import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProductDetails } from '@junta/ui';
import type { Product } from '@junta/api-client';
export const dynamic = 'force-dynamic';
async function get(slug: string) {
  try {
    const r = await fetch(
      `${process.env.API_SERVER_URL ?? 'http://localhost:4000'}/products/${encodeURIComponent(slug)}`,
      { cache: 'no-store', signal: AbortSignal.timeout(6000) },
    );
    return r.ok ? ((await r.json()) as Product) : null;
  } catch {
    return null;
  }
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params,
    p = await get(slug);
  return {
    title: `${p?.name ?? 'Produto'} | JUNTA`,
    description: p?.description,
    alternates: { canonical: `/p/${slug}` },
    openGraph: {
      title: `${p?.name ?? 'Produto'} | JUNTA`,
      description: 'Junte sua intenção e busque uma oferta melhor.',
      images: [`/p/${slug}/opengraph-image`],
    },
  };
}
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await get(slug);
  if (!product) notFound();
  return <ProductDetails slug={slug} initial={product} />;
}
