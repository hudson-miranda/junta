import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
if (existsSync('.env') && !process.argv.includes('--replace-local')) {
  console.log('.env already exists; preserved.');
} else {
  writeFileSync('.env', readFileSync('.env.example','utf8').replace('replace-with-a-random-secret-at-least-32-characters',randomBytes(32).toString('hex')).replace('DEMO_PASSWORD=',`DEMO_PASSWORD=Junta!${randomBytes(12).toString('hex')}`));
  console.log('Generated ignored local .env; secrets are not printed.');
}
