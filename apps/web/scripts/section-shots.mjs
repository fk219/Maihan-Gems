#!/usr/bin/env node
/**
 * apps/web/scripts/section-shots.mjs
 *
 * One screenshot per homepage section, at one width, so a section can be read
 * on its own instead of inside a 9000 px full-page capture.
 *
 * Usage against a running production server:
 *   BASE_URL=http://localhost:3108 WIDTH=1440 node scripts/section-shots.mjs
 */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const BASE = process.env['BASE_URL'] ?? 'http://localhost:3100';
const WIDTH = Number(process.env['WIDTH'] ?? 1440);
const OUT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  process.env['OUT_DIR'] ?? '../../../docs/design-shots/v8/sections',
);
const SELECTORS = [
  ['index', '.mh6-index'],
  ['atelier', '.mh6-atelier'],
  ['jewellery', '.mh6-jewellery'],
  ['record', '.mh6-record'],
  ['gemologist', '.mh6-gemologist'],
  ['tryon', '.mh6-tryon'],
  ['cta', '.mh6-cta'],
];

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: WIDTH, height: WIDTH >= 1024 ? 900 : 844 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();
await page.goto(BASE + '/', { waitUntil: 'networkidle' });

// Walk the page so every [data-reveal] section has entered, then return.
await page.evaluate(async () => {
  const step = Math.max(window.innerHeight * 0.75, 360);
  const height = document.documentElement.scrollHeight;
  for (let y = 0; y < height; y += step) {
    window.scrollTo(0, y);
    await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 45)));
  }
  window.scrollTo(0, 0);
  await new Promise((resolve) => setTimeout(resolve, 200));
});
await page.waitForTimeout(500);

// Freeze the two looping surfaces so the frame is deterministic.
await page.addStyleTag({
  content: '.mh6-index__track{animation:none !important}.mh6-hero__light{animation:none !important}',
});

for (const [name, selector] of SELECTORS) {
  const element = page.locator(selector).first();
  if ((await element.count()) === 0) {
    console.log(`missing ${name}`);
    continue;
  }
  await element.evaluate((node) => node.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(250);
  const file = path.join(OUT, `${name}-${WIDTH}.png`);
  await element.screenshot({ path: file });
  console.log(path.relative(process.cwd(), file).replaceAll('\\', '/'));
}

await browser.close();
