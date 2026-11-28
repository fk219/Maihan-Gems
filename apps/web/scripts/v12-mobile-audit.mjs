#!/usr/bin/env node
/**
 * apps/web/scripts/v12-mobile-audit.mjs
 *
 * Measures the mobile-first homepage: section heights at every breakpoint,
 * document overflow, effective type scale, card geometry, axe violations and
 * full-page captures. Writes docs/design-shots/v12/mobile-audit.json and the
 * screenshots beside it.
 *
 * Usage (production server running):
 *   BASE_URL=http://localhost:3113 node scripts/v12-mobile-audit.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

const BASE = process.env['BASE_URL'] ?? 'http://localhost:3113';
const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../..');
const outDir = path.join(repoRoot, 'docs/design-shots/v12');
const sectionDir = path.join(outDir, 'sections-mobile-first');
mkdirSync(outDir, { recursive: true });
mkdirSync(sectionDir, { recursive: true });

const AXE = readFileSync(path.resolve(here, '../node_modules/axe-core/axe.min.js'), 'utf8');
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

const WIDTHS = (process.env['WIDTHS'] ?? '320,390,430,768,1024,1440')
  .split(',')
  .map(Number)
  .filter((n) => Number.isFinite(n) && n > 0);

const SHOT_WIDTHS = new Set([320, 390, 768, 1024, 1440]);
const SECTION_WIDTHS = new Set([390, 1440]);

const MEASURE = () => {
  const rect = (el) => {
    const r = el.getBoundingClientRect();
    return { top: Math.round((r.top + window.scrollY) * 100) / 100, height: Math.round(r.height * 100) / 100 };
  };
  const sections = [...document.querySelectorAll('.mh12-home [data-section], .mh12-footer[data-section]')].map(
    (el) => ({ name: el.getAttribute('data-section'), ...rect(el) }),
  );
  const cards = [...document.querySelectorAll('.mh12-marquee__list:not(.mh12-marquee__list--dup) .mh12-card')].slice(0, 2).map((el) => {
    const r = el.getBoundingClientRect();
    return { width: Math.round(r.width * 100) / 100, height: Math.round(r.height * 100) / 100 };
  });
  const jewellery = [...document.querySelectorAll('.mh12-jewellery__rail > li .mh12-card')].slice(0, 2).map((el) => {
    const r = el.getBoundingClientRect();
    return { width: Math.round(r.width * 100) / 100, height: Math.round(r.height * 100) / 100 };
  });
  const sizes = new Map();
  const families = new Set();
  for (const el of document.querySelectorAll('.mh12-home *, .mh12-footer *')) {
    const text = [...el.childNodes].some((node) => node.nodeType === 3 && node.textContent.trim().length > 1);
    if (!text || el.offsetParent === null) continue;
    const style = getComputedStyle(el);
    const size = `${Math.round(parseFloat(style.fontSize) * 100) / 100}/${Math.round(parseFloat(style.lineHeight) * 100) / 100}`;
    sizes.set(size, (sizes.get(size) ?? 0) + 1);
    families.add(style.fontFamily.split(',')[0].replaceAll("'", '').trim());
  }
  const targets = [...document.querySelectorAll('.mh12-home a, .mh12-home button, .mh12-home input, .mh12-home summary, .mh12-footer a, .mh12-footer button, .mh12-footer input, .mh12-footer summary')]
    .filter((el) => el.offsetParent !== null)
    .map((el) => {
      const r = el.getBoundingClientRect();
      return { tag: el.tagName.toLowerCase(), text: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 40), w: Math.round(r.width), h: Math.round(r.height) };
    });
  const images = [...document.querySelectorAll('.mh12-home img, .mh12-footer img')].map((img) => ({
    src: img.getAttribute('src'),
    natural: `${img.naturalWidth}x${img.naturalHeight}`,
    complete: img.complete,
  }));
  return {
    viewport: { width: window.innerWidth, height: window.innerHeight },
    document: {
      height: Math.round(document.documentElement.scrollHeight * 100) / 100,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    },
    sections,
    cards: { marquee: cards, jewellery },
    type: {
      sizes: [...sizes.entries()].sort((a, b) => Number(b[0].split('/')[0]) - Number(a[0].split('/')[0])).map(([size, count]) => ({ size, count })),
      families: [...families],
    },
    targets: {
      total: targets.length,
      under24: targets.filter((t) => t.w < 24 || t.h < 24),
      under44: targets.filter((t) => t.w < 44 || t.h < 44).length,
    },
    images,
  };
}

const browser = await chromium.launch();
const results = [];

for (const width of WIDTHS) {
  const height = width >= 1024 ? 900 : 844;
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    reducedMotion: 'no-preference',
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 500) errors.push(`HTTP ${response.status()} ${response.url()}`);
  });

  const response = await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 90_000 });
  const status = response === null ? 0 : response.status();

  // Walk the document so every lazy image has been requested, then return to
  // the top. Without this the full-page capture shows black boxes where the
  // below-the-fold photography has not loaded yet.
  await page.evaluate(async () => {
    const step = Math.max(window.innerHeight * 0.8, 480);
    const height = document.documentElement.scrollHeight;
    for (let y = 0; y < height; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
    window.scrollTo(0, 0);
    await new Promise((resolve) => setTimeout(resolve, 250));
  });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(400);

  await page.evaluate(AXE);
  const axe = await page.evaluate(async (tags) => {
    const result = await window.axe.run(document, { runOnly: { type: 'tag', values: tags } });
    return {
      violations: result.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, targets: v.nodes.slice(0, 4).map((n) => n.target.join(' ')) })),
      incomplete: result.incomplete.map((v) => ({ id: v.id, nodes: v.nodes.length })),
    };
  }, TAGS);

  const measured = await page.evaluate(MEASURE);
  const overflow = measured.document.scrollWidth - measured.document.clientWidth;
  const violations = axe.violations.reduce((sum, v) => sum + v.nodes, 0);

  if (SHOT_WIDTHS.has(width)) {
    await page.screenshot({ path: path.join(outDir, `home-${width}.png`), fullPage: true });
  }
  if (SECTION_WIDTHS.has(width)) {
    await page.addStyleTag({
      content:
        '.demo-content-badge, .ai-concierge-trigger, [data-testid="scroll-to-top-button"] { display: none !important; }',
    });
    for (const section of measured.sections) {
      const el = await page.$(`[data-section="${section.name}"]`);
      if (el !== null) {
        await el.screenshot({ path: path.join(sectionDir, `${section.name}-${width}.png`) });
      }
    }
  }

  results.push({
    width,
    height,
    status,
    overflow,
    axeViolations: violations,
    axeRules: axe.violations,
    axeIncomplete: axe.incomplete,
    errors,
    ...measured,
  });

  console.log(
    `${width}x${height} status=${status} axe=${violations} overflow=${overflow}px doc=${measured.document.height} sections=${measured.sections
      .map((s) => `${s.name}:${Math.round(s.height)}`)
      .join(' ')} targets<24=${measured.targets.under24.length} <44=${measured.targets.under44}`,
  );
  await context.close();
}

await browser.close();

const report = {
  base: BASE,
  generatedAt: new Date().toISOString(),
  widths: WIDTHS,
  results,
};
writeFileSync(path.join(outDir, 'mobile-audit.json'), JSON.stringify(report, null, 2));
console.log(`\nwritten: ${path.relative(repoRoot, path.join(outDir, 'mobile-audit.json'))}`);
