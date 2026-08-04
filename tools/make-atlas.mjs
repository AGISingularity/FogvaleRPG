/* Renders tools/atlas.html headless, writes assets/tiles.png, and saves a
   zoomed preview to test/out/atlas-preview.png for visual inspection.
   Fails if index.html's ATLAS_NAMES copy has drifted from tools/atlas.html. */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
mkdirSync(join(ROOT, 'assets'), { recursive: true });
mkdirSync(join(ROOT, 'test', 'out'), { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 1100 } });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
await page.goto('file://' + join(ROOT, 'tools', 'atlas.html'));
await page.waitForFunction(() => window.__atlasReady === true, null, { timeout: 5000 })
  .catch(() => {});
if (errors.length) {
  console.error('atlas.html errors:\n' + errors.join('\n'));
  await browser.close();
  process.exit(1);
}

// guard: the NAMES order must match index.html's ATLAS_NAMES copy (if present)
const names = await page.evaluate(() => NAMES);
const idx = readFileSync(join(ROOT, 'index.html'), 'utf8');
const m = idx.match(/ATLAS_NAMES\s*=\s*\[([^\]]+)\]/);
if (m) {
  const inGame = m[1].match(/'[^']+'/g).map(s => s.slice(1, -1));
  const same = inGame.length === names.length && inGame.every((n, i) => n === names[i]);
  if (!same) {
    console.error('ATLAS_NAMES in index.html has drifted from tools/atlas.html NAMES — fix before exporting.');
    await browser.close();
    process.exit(1);
  }
  console.log('ATLAS_NAMES sync check: OK');
} else {
  console.log('note: index.html has no ATLAS_NAMES yet (pre-renderer-rewrite) — sync check skipped');
}

const dataURL = await page.evaluate(() => window.__atlasDataURL);
writeFileSync(join(ROOT, 'assets', 'tiles.png'), Buffer.from(dataURL.split(',')[1], 'base64'));
await page.screenshot({ path: join(ROOT, 'test', 'out', 'atlas-preview.png'), fullPage: true });
await browser.close();
console.log('wrote assets/tiles.png (' + names.length + ' cells) and test/out/atlas-preview.png');
