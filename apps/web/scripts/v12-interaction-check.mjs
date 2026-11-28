import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:3113';
const browser = await chromium.launch();

const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(700);

const card = page.locator('.mh12-card').first();
await card.scrollIntoViewIfNeeded();
const before = await card.evaluate((el) => {
  const name = el.querySelector('.mh12-card__draw');
  const img = el.querySelector('img');
  return {
    nameBg: getComputedStyle(name, '::after').transform,
    imgOpacity: getComputedStyle(img).opacity,
  };
});
await card.hover();
await page.waitForTimeout(400);
const after = await card.evaluate((el) => {
  const name = el.querySelector('.mh12-card__draw');
  const img = el.querySelector('img');
  return {
    nameBg: getComputedStyle(name, '::after').transform,
    imgOpacity: getComputedStyle(img).opacity,
  };
});

const action = page.locator('.mh12-featured__action');
await action.scrollIntoViewIfNeeded();
await action.hover();
await page.waitForTimeout(400);
const arrow = await action.evaluate((el) => {
  const arrowEl = el.querySelector('.mh12-action__arrow');
  return {
    transform: getComputedStyle(arrowEl).transform,
    afterTransform: getComputedStyle(el, '::after').transform,
  };
});

await page.keyboard.press('Tab');
const focus = await page.evaluate(() => {
  const el = document.activeElement;
  const style = getComputedStyle(el);
  return { tag: el.tagName, cls: typeof el.className === 'string' ? el.className : '', outline: style.outlineColor, offset: style.outlineOffset };
});

const reduce = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
const reducedPage = await reduce.newPage();
await reducedPage.goto(`${BASE}/`, { waitUntil: 'networkidle' });
const reduced = await reducedPage.evaluate(() => {
  const img = document.querySelector('.mh12-hero__media img');
  return getComputedStyle(img).animationName;
});

console.log(JSON.stringify({ before, after, arrow, focus, reducedHeroAnimation: reduced }, null, 2));
await browser.close();
