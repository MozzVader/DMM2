import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync } from 'fs';

const src = 'public/admin.js';
const dst = 'public/admin.min.js';

const code = readFileSync(src, 'utf8');

const result = await esbuild.transform(code, {
  minify: true,
  logLevel: 'warning',
});

writeFileSync(dst, result.code);

const origSize = code.length;
const minSize = result.code.length;
const pct = Math.round((1 - minSize / origSize) * 100);
console.log(`admin.js: ${(origSize / 1024).toFixed(1)}KB → ${(minSize / 1024).toFixed(1)}KB (-${pct}%)`);