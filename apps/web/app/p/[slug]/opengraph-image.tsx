import { BrandMark } from '@junta/ui/src/brand';
import { ImageResponse } from 'next/og';
export const runtime = 'nodejs';
export const alt = 'JUNTA — Seu desejo tem companhia';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let name = slug.replaceAll('-', ' '),
    demand = 0,
    photo: string | undefined;
  try {
    const res = await fetch(
      `${process.env.API_SERVER_URL ?? 'http://localhost:4000'}/products/${encodeURIComponent(slug)}`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (res.ok) {
      const p = await res.json();
      name = p.name;
      if (
        typeof p.imageUrl === 'string' &&
        /^\/assets\/products\/[a-z0-9-]+\.webp$/.test(p.imageUrl)
      ) {
        const asset = await fetch(
          `${process.env.API_SERVER_URL ?? 'http://localhost:4000'}${p.imageUrl.replace('.webp', '.jpg')}`,
          { signal: AbortSignal.timeout(5000) },
        );
        if (asset.ok)
          photo = `data:image/jpeg;base64,${Buffer.from(await asset.arrayBuffer()).toString('base64')}`;
      }
      demand = p.variants.reduce((n: number, v: { demand: number }) => n + v.demand, 0);
    }
  } catch {
    /* Preserve useful sharing when the API is temporarily unavailable. */
  }
  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        width: '100%',
        height: '100%',
        padding: 70,
        background: '#2549eb',
        color: 'white',
        fontFamily: 'sans-serif',
      }}
    >
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 55, fontWeight: 700 }}
      >
        <BrandMark inverse />
        junta
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 30 }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ fontSize: photo ? 57 : 75, fontWeight: 700 }}>{name}</div>
          <div style={{ display: 'flex', fontSize: 30, marginTop: 25 }}>
            {`${demand} pessoas querem. Junte sua intenção.`}
          </div>
        </div>
        {photo && (
          <img
            src={photo}
            alt={name}
            width={330}
            height={300}
            style={{ objectFit: 'contain', borderRadius: 20, background: '#fff' }}
          />
        )}
      </div>
      <div style={{ fontSize: 24 }}>Comprar melhor começa junto.</div>
    </div>,
    size,
  );
}
