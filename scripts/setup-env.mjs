import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
if (existsSync('.env') && !process.argv.includes('--replace-local')) {
  console.log('.env already exists; preserved.');
} else {
  writeFileSync(
    '.env',
    readFileSync('.env.example', 'utf8')
      .replace(
        'replace-with-a-random-secret-at-least-32-characters',
        randomBytes(32).toString('hex'),
      )
      .replace('DEMO_PASSWORD=', `DEMO_PASSWORD=Junta!${randomBytes(12).toString('hex')}`),
    // Proxy secret is independently generated below.
  );
  console.log('Generated ignored local .env; secrets are not printed.');
}
if (
  process.argv.includes('--ensure-proxy') ||
  !readFileSync('.env', 'utf8').includes('PROXY_SHARED_SECRET=') ||
  /^PROXY_SHARED_SECRET=$/m.test(readFileSync('.env', 'utf8'))
) {
  let value = readFileSync('.env', 'utf8');
  if (!/^PROXY_SHARED_SECRET=.+$/m.test(value)) {
    const entry = `PROXY_SHARED_SECRET=${randomBytes(32).toString('hex')}`;
    value = value.includes('PROXY_SHARED_SECRET=')
      ? value.replace(/^PROXY_SHARED_SECRET=$/m, entry)
      : `${value}\n${entry}\n`;
    writeFileSync('.env', value);
    console.log('Ensured independent proxy secret (value hidden).');
  }
}
