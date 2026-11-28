#!/usr/bin/env node
/**
 * apps/web/scripts/v14-scroll-sequence.mjs
 *
 * The mobile scroll sequence for the v14 homepage: one 390 x 844 frame per
 * section, captured at that section's own offset, plus the handover between
 * the hero and the variety band. Named by what the frame shows, not by a raw
 * scroll offset.
 *
 * Usage (production server on 3113):
 *   BASE_URL=http://localhost:3113 node scripts/v14-scroll-sequence.mjs
 */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

const BASE = process.env['BASE_URL'] ?? 'http://localhost:3113';
const OUT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  process.env['OUT_DIR'] ?? '../../../docs/design-shots/v14/scroll',
);
const WIDTH = Number(process.env['WIDTH'] ?? 390);
const HEIGHT = Number(process.env['HEIGHT'] ?? 844);

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: WIDTH, height: HEIGHT },
  deviceScaleFactor: 1,
});
const page = await context.newPage();
await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 120_000 });
await page.waitForTimeout(700);

const sections = await page.evaluate(() =>
  [...document.querySelectorAll('[data-section]')].map((el) => ({
    name: el.getAttribute('data-section'),
    top: Math.round(el.getBoundingClientRect().top + window.scrollY),
  })),
);

const frames = [];
frames.push({ name: '00-hero', y: 0 });
frames.push({ name: '01-hero-to-varieties', y: Math.round(HEIGHT * 0.72) });
for (const section of sections) {
  if (section.name === 'hero') continue;
  frames.push({ name: `${String(frames.length).padStart(2, '0')}-${section.name}`, y: section.top });
}

for (const frame of frames) {
  await page.evaluate((y) => window.scrollTo(0, y), frame.y);
  await page.waitForTimeout(450);
  const file = path.join(OUT, `${frame.name}-${WIDTH}.png`);
  await page.screenshot({ path: file });
  console.log(path.relative(process.cwd(), file).replaceAll('\\', '/'));
}

await browser.close();
