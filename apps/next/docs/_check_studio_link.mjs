#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = '/home/dev/npm-jpcore';
const requireFromNext = createRequire(path.join(root, 'apps/next/package.json'));
const rootPkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
console.log('workspaces', rootPkg.workspaces);

const studioPkgPath = requireFromNext.resolve('@olonjs/studio/package.json');
const studioEntry = requireFromNext.resolve('@olonjs/studio');
console.log('studio package.json ->', studioPkgPath);
console.log('studio entry ->', studioEntry);

const realPkg = fs.realpathSync(studioPkgPath);
console.log('realpath package.json ->', realPkg);
console.log('is workspace package?', realPkg.includes(`${path.sep}packages${path.sep}studio${path.sep}`));

const src = path.join(root, 'packages/studio/src/admin/AdminSidebar.tsx');
const dist = path.join(root, 'packages/studio/dist/olonjs-studio.js');
for (const f of [src, dist]) {
  const st = fs.statSync(f);
  console.log('mtime', st.mtime.toISOString(), f);
}

const srcText = fs.readFileSync(src, 'utf8');
const m = srcText.match(/<h2[^>]*>[\s\S]*?<\/h2>/);
console.log('src h2 snippet:', m ? m[0].replace(/\s+/g, ' ').slice(0, 120) : '(none)');

const distText = fs.readFileSync(dist, 'utf8');
const hits = [];
for (const needle of ['Studio.', 'Studio</', '"Studio"', "'Studio'"]) {
  if (distText.includes(needle)) hits.push(needle);
}
console.log('dist needles present:', hits);
console.log('exports', JSON.parse(fs.readFileSync(path.join(root, 'packages/studio/package.json'), 'utf8')).exports);
