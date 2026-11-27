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
  ['hero lede', '.mh6-hero__lede'],
  ['gallery caption', '.v9-gallery__caption'],
  ['gallery origin', '.v9-gallery__origin'],
  ['gallery cert', '.v9-gallery__cert'],
  ['gallery title', '.v9-gallery__title'],
  ['dyo caption', '.v9-dyo__caption'],
  ['dyo step copy', '.v9-step__copy'],
  ['ai fact body', '.v9-gemologist__facts dd'],
  ['ai caption', '.v9-gemologist__caption'],
  ['certificate note', '.v9-certificate__note'],
  ['certificate fact', '.v9-certificate__facts dd'],
  ['atelier meta', '.v9-atelier__meta'],
  ['atelier spec', '.v9-atelier__row-spec'],
  ['vendor note', '.v9-vendor__note'],
  ['close action', '.v9-close__action'],
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
  content: `
    .mh6-hero__light { animation: none !important; }
    .demo-content-badge,
    .ai-concierge-trigger,
    [data-testid='scroll-to-top-button'],
    header { visibility: hidden !important; }
  `,
});

const rows = [];
const linear = (value) => {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};
const rgbLum = (css) => {
  const match = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/.exec(css);
  if (match === null) return 0;
  return (
    0.2126 * linear(Number(match[1])) +
    0.7152 * linear(Number(match[2])) +
    0.0722 * linear(Number(match[3]))
  );
};
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
    ? { darkest: { l: rgbLum(ownBg), hex: ownBg }, lightest: { l: rgbLum(ownBg), hex: ownBg }, width: 0, height: 0 }
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
