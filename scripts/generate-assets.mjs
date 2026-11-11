import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
const nextRequire = createRequire(
  require.resolve('next/package.json', { paths: [resolve('apps/web')] }),
);
const sharp = nextRequire('sharp');
const mark = readFileSync('assets/brand/junta-symbol.svg', 'utf8');
const logo = readFileSync('assets/brand/junta-logo.svg', 'utf8');
const inner = mark.slice(mark.indexOf('>') + 1, mark.lastIndexOf('</svg>'));
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><rect width="1024" height="1024" rx="220" fill="#2549eb"/><g transform="translate(220 200) scale(9.1)">${inner.replaceAll('#2549eb', '#fff')}</g></svg>`;
mkdirSync('apps/mobile/assets', { recursive: true });
for (const name of ['icon', 'adaptive-icon', 'splash'])
  await sharp(Buffer.from(svg)).png().toFile(`apps/mobile/assets/${name}.png`);
for (const name of ['web', 'admin', 'merchant']) {
  mkdirSync(`apps/${name}/app`, { recursive: true });
  writeFileSync(`apps/${name}/app/icon.svg`, svg);
  mkdirSync(`apps/${name}/public/brand`, { recursive: true });
  writeFileSync(`apps/${name}/public/brand/junta-logo.svg`, logo);
}
console.log('Generated JUNTA identity assets from assets/brand/junta-symbol.svg.');

await sharp(Buffer.from(mark)).resize(128, 128).png().toFile('apps/mobile/assets/brand-symbol.png');
await sharp(Buffer.from(logo))
  .resize({ width: 640 })
  .png()
  .toFile('apps/mobile/assets/junta-logo.png');
