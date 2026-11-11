// Downloads are deliberately separate: originals stay ignored and sources are recorded.
import { createRequire } from 'node:module';
import { mkdirSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve('next/package.json', { paths: [resolve('apps/web')] }))('sharp');
mkdirSync('apps/api/public/products', { recursive: true });
for (const name of readdirSync('.local/product-originals')) {
  await sharp(`.local/product-originals/${name}`).flatten({ background: '#fff' }).resize({ width: 700, height: 700, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 }).toFile(`apps/api/public/products/${name}.jpg`);
  await sharp(`.local/product-originals/${name}`).resize({ width: 1100, height: 1000, fit: 'inside', withoutEnlargement: true }).webp({ quality: 86 }).toFile(`apps/api/public/products/${name}.webp`);
}
console.log('Prepared catalogue photos. Sources: docs/PRODUCT_IMAGES.md');
