/**
 * One-off v10 section plates: one screenshot per v9 homepage section, at four
 * widths, into docs/design-shots/v10/sections. Chrome is hidden for the plate
 * only; the live page keeps it. Run against a running production server:
 *   BASE_URL=http://localhost:3112 node scripts/v10-section-shots.mjs
 */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const BASE = process.env['BASE_URL'] ?? 'http://localhost:3112';
const WIDTHS = (process.env['WIDTHS'] ?? '1440,1024,768,390').split(',').map(Number);
const OUT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../docs/design-shots/v10/sections',
);

const SELECTORS = [
  ['collection', '.v9-gallery'],
  ['dyo', '.v9-dyo'],
  ['gemologist', '.v9-gemologist'],
  ['certificate', '.v9-certificate'],
  ['atelier', '.v9-atelier'],
  ['vendor', '.v9-vendor'],
  ['close', '.v9-close'],
];

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();

for (const WIDTH of WIDTHS) {
  const context = await browser.newContext({ viewport: { width: WIDTH, height: WIDTH >= 1024 ? 900 : 844 } });
  const page = await context.newPage();
  await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 120_000 });

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

  // Remove the fixed chrome from the plate without changing the section layout.
  await page.addStyleTag({
    content: `
      header,
      .demo-content-badge,
      .ai-concierge-trigger,
      [data-testid='scroll-to-top-button'],
      nextjs-portal,
      [data-nextjs-toast],
      [data-nextjs-dev-tools-button] { visibility: hidden !important; }
    `,
  });

  for (const [name, selector] of SELECTORS) {
    const element = page.locator(selector).first();
    if ((await element.count()) === 0) {
      console.log(`missing ${name}@${WIDTH}`);
      continue;
    }
    await element.evaluate((node) => node.scrollIntoView({ block: 'start' }));
    await page.waitForTimeout(300);
    const file = path.join(OUT, `${name}-${WIDTH}.png`);
    await element.screenshot({ path: file });
    console.log(path.relative(process.cwd(), file).replaceAll('\\', '/'));
  }
  await context.close();
}
await browser.close();
