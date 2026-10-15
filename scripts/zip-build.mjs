// Pack dist/ into a zip whose root is index.html, for the CrazyGames upload.
// Fails if the build uses root-absolute asset paths (those break in a subfolder).
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const out = join(root, 'rider-dash-crazygames.zip');

const htmlPath = join(dist, 'index.html');
const html = readFileSync(htmlPath, 'utf8');
const bad = [...html.matchAll(/(?:src|href)=["']\/[^"']+["']/g)].map((m) => m[0]);
if (bad.length) {
  console.error('Build uses root-absolute paths, which break when CrazyGames hosts a subfolder:');
  for (const line of bad) console.error('  ' + line);
  process.exit(1);
}
if (!html.includes('crazygames-sdk-v3.js')) {
  console.error('index.html does not load the CrazyGames SDK v3.');
  process.exit(1);
}

function walk(dir) {
  let bytes = 0;
  let files = 0;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const st = statSync(path);
    if (st.isDirectory()) {
      const inner = walk(path);
      bytes += inner.bytes;
      files += inner.files;
    } else {
      bytes += st.size;
      files += 1;
    }
  }
  return { bytes, files };
}

const { bytes, files } = walk(dist);
const mb = bytes / (1024 * 1024);
rmSync(out, { force: true });

const py = `
import os, sys, zipfile
dist, out = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(out, 'w', compression=zipfile.ZIP_DEFLATED) as z:
    for dirpath, _, names in os.walk(dist):
        for name in names:
            full = os.path.join(dirpath, name)
            z.write(full, os.path.relpath(full, dist))
`;
const packed = spawnSync('python3', ['-c', py, dist, out], { encoding: 'utf8' });
if (packed.status !== 0) {
  console.error(packed.stderr || packed.stdout || 'python3 failed to write the zip');
  process.exit(packed.status ?? 1);
}

const limits = [
  ['initial download (mobile homepage)', 20],
  ['initial download', 50],
  ['total upload', 250],
];
console.log(`Rider Dash zip: ${relative(root, out)}`);
console.log(`  ${files} files, ${mb.toFixed(3)} MB uncompressed (${bytes} bytes)`);
console.log('  CrazyGames limits: initial ≤ 50 MB (≤ 20 MB for the mobile homepage), total ≤ 250 MB, ≤ 1500 files.');
for (const [label, max] of limits) {
  console.log(`  ${label}: ${mb.toFixed(3)} MB / ${max} MB`);
}
console.log(`  file count: ${files} / 1500`);
if (mb > 50 || files > 1500) process.exit(1);
