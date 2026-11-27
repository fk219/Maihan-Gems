#!/usr/bin/env node
/**
 * apps/web/scripts/capture-proofs.mjs
 *
 * Captures the real UI proof assets the homepage ships. This is not a mockup
 * generator: every image is a screenshot of a route rendered by this app.
 *
 * Usage against a running server:
 *   BASE_URL=http://localhost:3108 node scripts/capture-proofs.mjs
 *
 * The fixed global chrome (demo badge, concierge trigger, dev indicator) is
 * hidden for the frame so the capture shows the surface, not the overlay.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const BASE = process.env['BASE_URL'] ?? 'http://localhost:3100';
const OUT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  process.env['OUT_DIR'] ?? '../public/proof',
);
const WIDTH = 1440;
const HEIGHT = 1000;
const QUALITY = 86;

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: WIDTH, height: HEIGHT },
  deviceScaleFactor: 1,
});
const page = await context.newPage();

const HIDE_CHROME = `
  .demo-content-badge,
  .ai-concierge-trigger,
  .ai-concierge-drawer,
  .ai-concierge-backdrop,
  [data-testid='scroll-to-top-button'],
  nextjs-portal,
  [data-nextjs-toast],
  [data-nextjs-dev-tools-button] {
    display: none !important;
  }
`;

async function settle() {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
}

async function shot(name, locator, options = {}) {
  await locator.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(400);
  const box = await locator.boundingBox();
  const file = path.join(OUT, `${name}.jpg`);
  await locator.screenshot({
    path: file,
    type: 'jpeg',
    quality: QUALITY,
    ...options,
  });
  console.log(
    `${name}.jpg ${box === null ? '' : `${Math.round(box.width)}x${Math.round(box.height)}`} <- ${page.url()}`,
  );
  return { name, file, width: Math.round(box?.width ?? 0), height: Math.round(box?.height ?? 0), url: page.url() };
}

const manifest = [];

// 1. The configurator studio.
await page.goto(`${BASE}/design-your-own`, { waitUntil: 'networkidle', timeout: 90_000 });
await page.addStyleTag({ content: HIDE_CHROME });
await settle();
manifest.push(await shot('configurator', page.locator('#dyoj-studio').first()));

// 2. The AI gemologist ask surface.
await page.goto(`${BASE}/concierge`, { waitUntil: 'networkidle', timeout: 90_000 });
await page.addStyleTag({ content: HIDE_CHROME });
await settle();
manifest.push(
  await shot('gemologist', page.locator('div.mx-auto.max-w-6xl').first()),
);

// 3. The certificate dossier, opened from a product record.
await page.goto(`${BASE}/products/elysian-ring`, { waitUntil: 'networkidle', timeout: 90_000 });
await page.addStyleTag({ content: HIDE_CHROME });
await settle();
const certTab = page.getByRole('tab', { name: /Gemstone & Certificate|Certification/i }).first();
if ((await certTab.count()) > 0) {
  await certTab.scrollIntoViewIfNeeded();
  await certTab.click();
  await page.waitForTimeout(400);
}
const viewCertificate = page.getByRole('button', { name: /view certificate/i }).first();
if ((await viewCertificate.count()) === 0) {
  throw new Error('The certificate control was not found on /products/elysian-ring.');
}
await viewCertificate.scrollIntoViewIfNeeded();
await viewCertificate.click();
await page.waitForTimeout(600);
const certPanel = page.locator('[role="dialog"] > div').first();
if ((await certPanel.count()) === 0) {
  throw new Error('The certificate panel did not open on /products/elysian-ring.');
}
manifest.push(await shot('certificate', certPanel));

// 4. The vendor portal door.
await page.goto(`${BASE}/vendor/login`, { waitUntil: 'networkidle', timeout: 90_000 });
await page.addStyleTag({ content: HIDE_CHROME });
await settle();
manifest.push(await shot('vendor', page.locator('section.mh-auth__panel').first()));

await browser.close();

writeFileSync(
  path.join(OUT, 'manifest.json'),
  `${JSON.stringify(
    manifest.map((entry) => ({
      asset: `${entry.name}.jpg`,
      source: new URL(entry.url).pathname,
      width: entry.width,
      height: entry.height,
    })),
    null,
    2,
  )}\n`,
);

console.log(`wrote ${manifest.length} captures + manifest.json to ${OUT}`);
