#!/usr/bin/env node
/**
 * apps/web/scripts/v13-bundle-measure.mjs
 *
 * The v13 JS gate: what the three gated surfaces actually download as scripts,
 * measured from the browser's own resource timing (encoded/gzip bytes), not
 * from a manifest guess. It also names the chunks that carry Skullet and Sileo
 * so the report can separate initial from on-demand.
 *
 * Usage (production server on 3113):
 *   BASE_URL=http://localhost:3113 node scripts/v13-bundle-measure.mjs
 */
import { writeFileSync } from 'node:fs';

import { chromium } from 'playwright';

const BASE = process.env['BASE_URL'] ?? 'http://localhost:3113';
const ROUTES = [
  { name: 'admin-login', path: '/admin/login' },
  { name: 'vendor-login', path: '/vendor/login' },
  { name: 'home', path: '/' },
];

const browser = await chromium.launch();
const out = [];

for (const route of ROUTES) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.goto(`${BASE}${route.path}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(1200);

  const resources = await page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .filter((entry) => entry.name.endsWith('.js') || entry.initiatorType === 'script')
      .map((entry) => ({
        name: entry.name.split('/').slice(-1)[0],
        url: entry.name,
        transferKb: Math.round((entry.transferSize / 1024) * 10) / 10,
        encodedKb: Math.round(((entry.encodedBodySize ?? 0) / 1024) * 10) / 10,
        decodedKb: Math.round(((entry.decodedBodySize ?? 0) / 1024) * 10) / 10,
      })),
  );

  const total = resources.reduce((sum, item) => sum + item.encodedKb, 0);
  out.push({ page: route.name, jsFiles: resources.length, totalEncodedKb: Math.round(total * 10) / 10, resources });
  console.log(
    `${route.name}: ${resources.length} scripts, ${(Math.round(total * 10) / 10).toFixed(1)} KB encoded`,
  );
  await context.close();
}

await browser.close();
writeFileSync(new URL('../.next/v13-bundle-measure.json', import.meta.url), JSON.stringify(out, null, 2));
console.log('wrote apps/web/.next/v13-bundle-measure.json');
