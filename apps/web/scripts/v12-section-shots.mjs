#!/usr/bin/env node
/**
 * apps/web/scripts/v12-section-shots.mjs
 *
 * Captures one screenshot per homepage band at the desktop viewport, so the
 * delivery report can be checked band by band without a 6,000 px image.
 *
 * Usage: BASE_URL=http://localhost:3113 node scripts/v12-section-shots.mjs
 */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

const BASE = process.env['BASE_URL'] ?? 'http://localhost:3113';
const here = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(here, '../../../docs/design-shots/v12/sections');
const WIDTH = Number(process.env['WIDTH'] ?? 1440);

mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: WIDTH, height: 1600 } });
await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 90_000 });
await page.waitForTimeout(800);

const sections = await page.$$('[data-section]');
for (const section of sections) {
  const name = await section.getAttribute('data-section');
  await section.screenshot({ path: path.join(OUT_DIR, `${name}-${WIDTH}.png`) });
  console.log(`shot ${name}@${WIDTH}`);
}

await browser.close();
