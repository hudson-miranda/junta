import { ImageResponse } from 'next/og';
export const runtime = 'nodejs';
export const alt = 'JUNTA — Seu desejo tem companhia';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let name = slug.replaceAll('-', ' '),
    demand = 0;
  try {
    const res = await fetch(
      `${process.env.API_SERVER_URL ?? 'http://localhost:4000'}/products/${encodeURIComponent(slug)}`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (res.ok) {
      const p = await res.json();
      name = p.name;
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
      <div style={{ fontSize: 55, fontWeight: 700 }}>junta.</div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 75, fontWeight: 700 }}>{name}</div>
        <div style={{ display: 'flex', fontSize: 30, marginTop: 25 }}>
          {`${demand} pessoas querem. Junte sua intenção.`}
        </div>
      </div>
      <div style={{ fontSize: 24 }}>Comprar melhor começa junto.</div>
    </div>,
    size,
  );
}
