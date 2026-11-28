#!/usr/bin/env node
/**
 * apps/web/scripts/v14-link-and-focus.mjs
 *
 * Two checks the design gates need, both measured on the running build:
 *   1. every href on the homepage resolves (GET, redirects followed, < 400);
 *   2. the first keyboard stops all paint a visible focus indicator.
 *
 * Usage: BASE_URL=http://localhost:3113 node scripts/v14-link-and-focus.mjs
 */
import { chromium } from 'playwright';

const BASE = process.env['BASE_URL'] ?? 'http://localhost:3113';

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });

const hrefs = await page.evaluate(() =>
  [...new Set([...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')))].filter(
    (href) => href !== null && href.startsWith('/'),
  ),
);

console.log(`links on /: ${hrefs.length}`);
const failures = [];
for (const href of hrefs) {
  const response = await context.request.get(`${BASE}${href}`, { maxRedirects: 10 });
  const status = response.status();
  if (status >= 400) failures.push(`${href} -> ${status}`);
}
console.log(failures.length === 0 ? 'links: all resolve' : `links FAILED:\n  ${failures.join('\n  ')}`);

/* Keyboard: 24 tabs, each stop must have an outline or box-shadow. */
const stops = [];
for (let i = 0; i < 24; i += 1) {
  await page.keyboard.press('Tab');
  const stop = await page.evaluate(() => {
    const el = document.activeElement;
    if (el === null) return null;
    const visible = (node) => {
      if (node === null || node === undefined) return false;
      const s = getComputedStyle(node);
      return (
        (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || s.boxShadow !== 'none'
      );
    };
    const s = getComputedStyle(el);
    const text =
      el.getAttribute('aria-label') ??
      el.textContent?.replace(/\s+/g, ' ').trim().slice(0, 40) ??
      el.tagName;
    return {
      tag: el.tagName,
      text,
      outline: s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0,
      shadow: s.boxShadow !== 'none',
      /* The hero search rings the field, not the bare input. */
      parentRing: visible(el.closest('form')),
    };
  });
  if (stop !== null) stops.push(stop);
}

const invisible = stops.filter(
  (stop) => stop.outline === false && stop.shadow === false && stop.parentRing === false,
);
console.log(`focus stops: ${stops.length}; without a visible indicator: ${invisible.length}`);
if (invisible.length > 0) console.log(JSON.stringify(invisible, null, 2));

await browser.close();
process.exit(failures.length === 0 && invisible.length === 0 ? 0 : 1);
