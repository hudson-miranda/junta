import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
const nextRequire = createRequire(
  require.resolve('next/package.json', { paths: [resolve('apps/web')] }),
);
const sharp = nextRequire('sharp');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><rect width="1024" height="1024" rx="210" fill="#2549eb"/><g transform="translate(285 190) rotate(38 230 300)"><rect x="40" y="250" width="180" height="430" rx="90" fill="white"/><rect x="240" y="20" width="180" height="430" rx="90" fill="white"/><circle cx="95" cy="110" r="70" fill="#ff775e"/></g></svg>`;
mkdirSync('apps/mobile/assets', { recursive: true });
for (const name of ['icon', 'adaptive-icon', 'splash'])
  await sharp(Buffer.from(svg)).png().toFile(`apps/mobile/assets/${name}.png`);
for (const name of ['web', 'admin', 'merchant']) {
  mkdirSync(`apps/${name}/app`, { recursive: true });
  writeFileSync(`apps/${name}/app/icon.svg`, svg);
}
console.log('Generated provisional vector-derived JUNTA identity assets.');
