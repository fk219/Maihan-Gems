#!/usr/bin/env node
/**
 * apps/web/scripts/contrast-probe.mjs
 *
 * axe cannot resolve contrast over a gradient, so it reports it as
 * "incomplete" rather than a pass. This probe measures the one surface on the
 * homepage that axe cannot settle: the gold field, plus every other new text
 * block whose background is painted by an image or a gradient.
 *
 * Method: for each target it reads the computed text colour, hides the glyphs
 * (colour: transparent) and screenshots the exact box, then decodes the pixels
 * in-page and takes the DARKEST pixel for dark text (the LIGHTEST for light
 * text). That worst-case pixel is the ratio reported. An element with its own
 * solid background is measured against that background instead, so a rounded
 * corner cannot be mistaken for the surface under the text.
 *
 * Usage: BASE_URL=http://localhost:3108 node scripts/contrast-probe.mjs
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:3108';

const TARGETS = [
  ['atelier eyebrow', '.mh6-eyebrow--field'],
  ['atelier title', '.mh6-atelier__title'],
  ['atelier lede', '.mh6-atelier__lede'],
  ['atelier step copy', '.mh6-atelier__step-copy'],
  ['atelier numeral', '.mh6-atelier__num'],
  ['atelier button label', '.mh6-atelier .mh6-button--ink'],
  ['index certificate ref', '.mh6-index__facts span:last-child'],
  ['index body meta', '.mh6-index__facts span:first-child'],
  ['jewellery price', '.mh6-jewellery__row-price'],
  ['jewellery spec', '.mh6-jewellery__row-spec'],
  ['jewellery caption meta', '.mh6-jewellery__caption-meta'],
  ['record term', '.mh6-record__facts dt'],
  ['record body', '.mh6-record__facts dd'],
  ['gemologist copy', '.mh6-gemologist__copy'],
  ['gemologist note', '.mh6-gemologist__note'],
  ['tryon caption', '.mh6-tryon__caption'],
  ['tryon note', '.mh6-tryon__note'],
  ['cta eyebrow', '.mh6-cta .mh6-eyebrow'],
  ['cta title', '.mh6-cta__title'],
  ['cta plaque line', '.mh6-cta__plaque-line'],
  ['cta plaque note', '.mh6-cta__note'],
];

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await context.newPage();
await page.goto(BASE + '/', { waitUntil: 'networkidle' });
await page.evaluate(async () => {
  const step = Math.max(window.innerHeight * 0.75, 360);
  const height = document.documentElement.scrollHeight;
  for (let y = 0; y < height; y += step) {
    window.scrollTo(0, y);
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 45)));
  }
  window.scrollTo(0, 0);
  await new Promise((r) => setTimeout(r, 200));
});
await page.waitForTimeout(500);
await page.addStyleTag({
  content: '.mh6-index__track{animation:none !important}.mh6-hero__light{animation:none !important}',
});

const rows = [];
for (const [name, selector] of TARGETS) {
  const el = page.locator(selector).first();
  if ((await el.count()) === 0) {
    rows.push({ name, selector, status: 'missing' });
    continue;
  }
  await el.evaluate((node) => node.scrollIntoView({ block: 'center', inline: 'center' }));
  await page.waitForTimeout(200);
  const color = await el.evaluate((node) => getComputedStyle(node).color);
  const ownBg = await el.evaluate((node) => getComputedStyle(node).backgroundColor);
  const solid = !/rgba\([^)]*,\s*0\)/.test(ownBg) && ownBg !== 'transparent';
  await el.evaluate((node) => {
    node.dataset['probeColor'] = node.style.color;
    node.style.color = 'transparent';
  });
  await page.waitForTimeout(80);
  const buffer = solid ? null : await el.screenshot();
  await el.evaluate((node) => {
    node.style.color = node.dataset['probeColor'] ?? '';
    delete node.dataset['probeColor'];
  });

  const sampled = solid
    ? { darkest: { l: 0, hex: ownBg }, lightest: { l: 0, hex: ownBg }, width: 0, height: 0 }
    : await page.evaluate(async (dataUrl) => {
    const channel = (value) => {
      const c = value / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    const lum = (r, g, b) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = dataUrl;
    });
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    const { data, width, height } = ctx.getImageData(0, 0, image.width, image.height);
    let darkest = { l: 1, hex: '' };
    let lightest = { l: 0, hex: '' };
    const hex = (r, g, b) => `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 200) continue;
      const l = lum(data[i], data[i + 1], data[i + 2]);
      if (l < darkest.l) darkest = { l, hex: hex(data[i], data[i + 1], data[i + 2]) };
      if (l > lightest.l) lightest = { l, hex: hex(data[i], data[i + 1], data[i + 2]) };
    }
    return { darkest, lightest, width, height };
  }, `data:image/png;base64,${buffer.toString('base64')}`);

  const channel = (value) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const match = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/.exec(color);
  const fg = 0.2126 * channel(Number(match[1])) + 0.7152 * channel(Number(match[2])) + 0.0722 * channel(Number(match[3]));
  const against = fg > 0.35 ? sampled.lightest : sampled.darkest;
  const hi = Math.max(fg, against.l);
  const lo = Math.min(fg, against.l);
  const measurement = (hi + 0.05) / (lo + 0.05);
  rows.push({
    name,
    fg: color,
    worstBg: against.hex,
    ratio: Math.round(measurement * 100) / 100,
    pass: measurement >= 4.5,
    box: `${sampled.width}x${sampled.height}`,
  });
}

await browser.close();

for (const row of rows) {
  if (row.status === 'missing') {
    console.log(`MISSING  ${row.name}`);
    continue;
  }
  console.log(
    `${row.pass ? 'PASS' : 'FAIL'}  ${row.ratio.toFixed(2).padStart(5)}  ${row.name.padEnd(22)} fg=${row.fg} bg=${row.worstBg} box=${row.box}`,
  );
}
const failures = rows.filter((r) => r.pass === false || r.status === 'missing').length;
console.log(`\n${rows.length - failures}/${rows.length} pass, ${failures} fail`);
process.exit(failures === 0 ? 0 : 1);
