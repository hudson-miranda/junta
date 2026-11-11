import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const files = execFileSync('git', ['ls-files', '-z']).toString().split('\0').filter(Boolean);
const patterns = [
  /gh[pousr]_[A-Za-z0-9]{30,}/,
  /AKIA[A-Z0-9]{16}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /xox[baprs]-[A-Za-z0-9-]{20,}/,
];
const found = [];
for (const file of files) {
  if (/\.(png|ico|jpg|zip|woff2?)$/.test(file)) continue;
  const text = readFileSync(file, 'utf8');
  if (patterns.some((p) => p.test(text))) found.push(file);
  if (/(^|\/)\.env($|\.)/.test(file) && !file.endsWith('.env.example')) found.push(file);
}
if (found.length) {
  console.error('Potential secret files:', [...new Set(found)].join(', '));
  process.exit(1);
}
console.log(`Secret scan passed: ${files.length} tracked files; environment values never printed.`);
