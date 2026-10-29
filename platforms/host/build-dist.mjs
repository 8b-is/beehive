#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const DIST = path.join(ROOT, 'dist');
fs.mkdirSync(DIST, { recursive: true });

const copies = [
  ['web/index.html', 'index.html'],
  ['data/beehive-state.json', 'beehive-state.json'],
  ['install.sh', 'install.sh'],
];

for (const [from, to] of copies) {
  const source = path.join(ROOT, from);
  if (!fs.existsSync(source)) {
    console.error(`[dist] missing ${from}`);
    process.exit(1);
  }
  fs.copyFileSync(source, path.join(DIST, to));
}
console.log(`[dist] wrote ${copies.length} files to ${DIST}`);
