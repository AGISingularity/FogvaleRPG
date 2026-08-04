/* Renders tools/atlas.html headless (served over http — the compositor needs
   untainted canvas pixel access), writes assets/tiles.png, and saves a zoomed
   preview to test/out/atlas-preview.png.
   Fails if index.html's ATLAS_DEF copy has drifted from tools/atlas.html. */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
mkdirSync(join(ROOT, 'assets'), { recursive: true });
mkdirSync(join(ROOT, 'test', 'out'), { recursive: true });

// sync check first: ATLAS_DEF block must be identical in both files
const defOf = f => {
  const s = readFileSync(join(ROOT, f), 'utf8');
  const m = s.match(/\/\*ATLAS_DEF_START\*\/([\s\S]*?)\/\*ATLAS_DEF_END\*\//);
  return m && m[1].replace(/\s+/g, '');
};
const a = defOf('tools/atlas.html'), b = defOf('index.html');
if (b && a !== b) {
  console.error('ATLAS_DEF in index.html has drifted from tools/atlas.html — fix before exporting.');
  process.exit(1);
}
console.log(b ? 'ATLAS_DEF sync check: OK' : 'note: index.html has no ATLAS_DEF block yet — sync check skipped');

const server = spawn('python3', ['-m', 'http.server', '8744'], { cwd: ROOT, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 700));
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 900, height: 1400 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('http://localhost:8744/tools/atlas.html');
  await page.waitForFunction(() => document.title !== 'Fogvale atlas compositor', null, { timeout: 8000 })
    .catch(() => {});
  const state = await page.title();
  if (state !== 'ready' || errors.length) {
    console.error('atlas.html failed (title=' + state + ')\n' + errors.join('\n'));
    process.exit(1);
  }
  const dataURL = await page.evaluate(() => window.__atlasDataURL);
  writeFileSync(join(ROOT, 'assets', 'tiles.png'), Buffer.from(dataURL.split(',')[1], 'base64'));
  await page.screenshot({ path: join(ROOT, 'test', 'out', 'atlas-preview.png'), fullPage: true });
  console.log('wrote assets/tiles.png and test/out/atlas-preview.png');
} finally {
  await browser.close();
  server.kill();
}
