#!/usr/bin/env node
/**
 * apps/web/scripts/v14-hero-contrast.mjs
 *
 * Measures the real background behind the hero's text instead of assuming the
 * scrim is enough. The hero copy is hidden, the hero is screenshotted, and the
 * pixels inside each text rectangle are decoded in the page and reduced to the
 * lightest one. That lightest pixel is the worst case for white text.
 *
 * Usage: BASE_URL=http://localhost:3113 node scripts/v14-hero-contrast.mjs
 */
import { chromium } from 'playwright';

const BASE = process.env['BASE_URL'] ?? 'http://localhost:3113';
const WIDTHS = (process.env['WIDTHS'] ?? '390,1440').split(',').map(Number);

const browser = await chromium.launch();

for (const width of WIDTHS) {
  const context = await browser.newContext({
    viewport: { width, height: width >= 1024 ? 900 : 844 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });

  const rects = await page.evaluate(() => {
    const pick = (selector) => {
      const el = document.querySelector(selector);
      if (el === null) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    };
    return {
      title: pick('.mh14-hero__title'),
      form: pick('.mh14-hero__search form'),
      alt: pick('.mh14-hero__alt a'),
    };
  });

  await page.evaluate(() => {
    const inner = document.querySelector('.mh14-hero__inner');
    if (inner !== null) inner.style.visibility = 'hidden';
    const badge = document.querySelector('.demo-content-badge');
    if (badge !== null) badge.style.visibility = 'hidden';
  });
  await page.waitForTimeout(250);
  const shot = (await page.screenshot()).toString('base64');
  await page.evaluate(() => {
    const inner = document.querySelector('.mh14-hero__inner');
    if (inner !== null) inner.style.visibility = '';
    const badge = document.querySelector('.demo-content-badge');
    if (badge !== null) badge.style.visibility = '';
  });

  const result = await page.evaluate(
    async ({ base64, rects: boxes }) => {
      const lin = (c) => {
        const v = c / 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      };
      const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
      const img = new Image();
      img.src = `data:image/png;base64,${base64}`;
      await img.decode();
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const measure = (box) => {
        if (box === null) return null;
        const x = Math.max(0, Math.floor(box.x));
        const y = Math.max(0, Math.floor(box.y));
        const w = Math.min(canvas.width - x, Math.ceil(box.w));
        const h = Math.min(canvas.height - y, Math.ceil(box.h));
        const data = ctx.getImageData(x, y, w, h).data;
        let lightest = 0;
        let rgb = [0, 0, 0];
        for (let i = 0; i < data.length; i += 4) {
          const l = lum(data[i], data[i + 1], data[i + 2]);
          if (l > lightest) {
            lightest = l;
            rgb = [data[i], data[i + 1], data[i + 2]];
          }
        }
        const text = lum(248, 250, 252);
        const ratio = (text + 0.05) / (lightest + 0.05);
        return { lightest: Number(lightest.toFixed(4)), rgb, ratio: Number(ratio.toFixed(2)) };
      };

      return { title: measure(boxes.title), form: measure(boxes.form), alt: measure(boxes.alt) };
    },
    { base64: shot, rects },
  );

  console.log(`hero @${width}: ${JSON.stringify(result)}`);
  await context.close();
}

await browser.close();
