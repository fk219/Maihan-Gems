#!/usr/bin/env node
/**
 * apps/web/scripts/v12-interactions.mjs
 *
 * The states a static capture cannot show: the hero typeahead on a phone,
 * the footer disclosure open, reduced-motion behaviour, keyboard focus and
 * the desktop hover/pause states. Screenshots and a JSON record go to
 * docs/design-shots/v12/interactions/.
 *
 * Usage: BASE_URL=http://localhost:3113 node scripts/v12-interactions.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

const BASE = process.env['BASE_URL'] ?? 'http://localhost:3113';
const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../..');
const outDir = path.join(repoRoot, 'docs/design-shots/v12/interactions');
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const record = {};

/* 1. phone: the hero typeahead ------------------------------------------- */
{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  const input = page.locator('#mh6-home-search');
  await input.click();
  await input.fill('tan');
  await page.waitForTimeout(900);
  const panel = page.locator('.mh6-search__panel');
  record.typeahead = {
    visible: await panel.isVisible(),
    box: await panel.boundingBox(),
    text: (await panel.textContent())?.replace(/\s+/g, ' ').trim().slice(0, 200),
  };
  await page.screenshot({ path: path.join(outDir, 'search-panel-390.png') });
  await context.close();
}

/* 2. phone: an open footer disclosure ------------------------------------ */
{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.locator('.mh12-fcol summary').first().click();
  await page.waitForTimeout(250);
  const details = page.locator('.mh12-fcol').first();
  record.disclosure = {
    open: await details.evaluate((el) => el.hasAttribute('open')),
    height: Math.round((await details.boundingBox()).height),
  };
  await details.screenshot({ path: path.join(outDir, 'footer-disclosure-open-390.png') });
  await context.close();
}

/* 3. reduced motion ------------------------------------------------------- */
{
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  const state = await page.evaluate(() => {
    const track = document.querySelector('.mh12-marquee__track');
    const hero = document.querySelector('.mh12-hero__media img');
    const card = document.querySelector('.mh12-card');
    return {
      marqueeAnimation: track === null ? null : getComputedStyle(track).animationName,
      heroAnimation: hero === null ? null : getComputedStyle(hero).animationName,
      cardTransition: card === null ? null : getComputedStyle(card).transitionDuration,
      docHeight: document.documentElement.scrollHeight,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      allSectionsVisible: [...document.querySelectorAll('.mh12-home [data-section]')].every(
        (el) => el.getBoundingClientRect().height > 0 && getComputedStyle(el).opacity === '1',
      ),
    };
  });
  record.reducedMotion = state;
  await page.screenshot({ path: path.join(outDir, 'reduced-motion-390.png'), fullPage: true });
  await context.close();
}

/* 4. keyboard focus ------------------------------------------------------- */
{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  const stops = [];
  for (let i = 0; i < 10; i += 1) {
    await page.keyboard.press('Tab');
    const active = await page.evaluate(() => {
      const el = document.activeElement;
      if (el === null) return null;
      const style = getComputedStyle(el);
      return {
        tag: el.tagName.toLowerCase(),
        text: (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 44),
        outlineWidth: style.outlineWidth,
        outlineStyle: style.outlineStyle,
        outlineColor: style.outlineColor,
      };
    });
    stops.push(active);
  }
  record.keyboard = stops;
  await page.screenshot({ path: path.join(outDir, 'keyboard-focus-390.png') });
  await context.close();
}

/* 5. desktop hover and marquee pause ------------------------------------- */
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const clip = page.locator('.mh12-marquee__clip');
  await clip.scrollIntoViewIfNeeded();
  const clipBox = await clip.boundingBox();
  if (clipBox !== null) {
    await page.mouse.move(clipBox.x + clipBox.width / 2, clipBox.y + clipBox.height / 2);
  }
  await page.waitForTimeout(400);
  record.desktopMarqueePause = await page.evaluate(() => {
    const track = document.querySelector('.mh12-marquee__track');
    const cards = document.querySelectorAll('.mh12-marquee__list:not(.mh12-marquee__list--dup) .mh12-card');
    const hovered = [...cards].find((card) => card.matches(':hover'));
    return {
      playState: track === null ? null : getComputedStyle(track).animationPlayState,
      hoveredCardFact: hovered?.querySelector('.mh12-card__fact')?.textContent ?? null,
    };
  });

  const jewelleryCard = page.locator('.mh12-jewellery__rail .mh12-card').first();
  await jewelleryCard.hover();
  await page.waitForTimeout(400);
  record.desktopCardHover = await jewelleryCard.evaluate((el) => {
    const img = el.querySelector('img');
    const underline = el.querySelector('.mh12-u');
    return {
      imageOpacity: img === null ? null : getComputedStyle(img).opacity,
      underlineTransform: underline === null ? null : getComputedStyle(underline, '::after').transform,
    };
  });

  await page.screenshot({ path: path.join(outDir, 'marquee-hover-1440.png') });
  await context.close();
}

await browser.close();
writeFileSync(path.join(outDir, 'interactions.json'), JSON.stringify(record, null, 2));
console.log(JSON.stringify(record, null, 2));
