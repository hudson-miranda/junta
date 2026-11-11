import type { Metadata } from 'next';
import { Shell } from '@junta/ui';
import '@junta/ui/src/styles.css';
export const metadata: Metadata = {
  title: 'JUNTA — Comprar melhor começa junto.',
  description: 'Junte sua intenção de compra, escolha seu preço-alvo e acompanhe ofertas.',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_WEB_URL ??
      (process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'http://localhost:3000'),
  ),
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" data-scroll-behavior="smooth">
      <body>
        <Shell mode="web">{children}</Shell>
      </body>
    </html>
  );
}
