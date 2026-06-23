import * as esbuild from 'esbuild';
import { readFileSync } from 'fs';

const src = 'public/admin.js';
const dst = 'public/admin.min.js';

await esbuild.build({
  entryPoints: [src],
  outfile: dst,
  minify: true,
  format: 'iife',
  bundle: false,
  allowOverwrite: true,
  logLevel: 'warning',
});

const origSize = readFileSync(src).length;
const minSize = readFileSync(dst).length;
const pct = Math.round((1 - minSize / origSize) * 100);
console.log(`admin.js: ${(origSize / 1024).toFixed(1)}KB → ${(minSize / 1024).toFixed(1)}KB (-${pct}%)`);