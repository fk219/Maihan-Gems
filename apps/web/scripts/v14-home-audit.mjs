#!/usr/bin/env node
/**
 * apps/web/scripts/v14-home-audit.mjs
 *
 * The v14 homepage gate. Every number comes from the built site; nothing is
 * inferred from the source.
 *
 * Per width it records:
 *   - HTTP status and page errors;
 *   - axe violations for WCAG 2.0/2.1/2.2 A+AA (nodes, not rules);
 *   - document horizontal overflow in px;
 *   - every `[data-section]` height in px and in vh;
 *   - the ordered section list, so the brief's sequence is checked from the DOM;
 *   - the hero composition: h1 size / weight / tracking, search width and height,
 *     count of links in the hero;
 *   - a full-page screenshot in docs/design-shots/v14.
 *
 * Usage (production server on 3113, DATABASE_URL unset):
 *   BASE_URL=http://localhost:3113 node scripts/v14-home-audit.mjs
 *   WIDTHS=320,390,430,768,1440 SHOTS=0 node scripts/v14-home-audit.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

const BASE = process.env['BASE_URL'] ?? 'http://localhost:3113';
const here = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(here, '../../../docs/design-shots/v14');
const axePath = path.resolve(here, '../node_modules/axe-core/axe.min.js');
const AXE = readFileSync(axePath, 'utf8');
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const WIDTHS = (process.env['WIDTHS'] ?? '320,390,430,768,1440')
  .split(',')
  .map((value) => Number(value.trim()))
  .filter((value) => Number.isFinite(value) && value > 0);
const SHOTS = process.env['SHOTS'] !== '0';
const HEIGHTS = process.env['HEIGHTS'] ?? (WIDTHS.includes(390) ? '844' : '900');
const REDUCED = process.env['REDUCED'] === '1';

mkdirSync(OUT_DIR, { recursive: true });

const MEASURE = () => {
  const round = (value) => Math.round(value * 10) / 10;
  const vh = window.innerHeight / 100;

  const sections = [...document.querySelectorAll('[data-section]')].map((el) => {
    const rect = el.getBoundingClientRect();
    const height = el.offsetHeight;
    return {
      name: el.getAttribute('data-section'),
      height: round(height),
      vh: round(height / vh),
      width: round(rect.width),
      heading:
        el.querySelector('h1, h2, h3')?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 90) ??
        null,
      actions: el.querySelectorAll('a, button').length,
    };
  });

  const hero = document.querySelector('[data-section="hero"]');
  const h1 = hero?.querySelector('h1');
  const h1Style = h1 === null || h1 === undefined ? null : getComputedStyle(h1);
  const form = hero?.querySelector('form');
  const input = hero?.querySelector('input');
  const heroLinks = hero?.querySelectorAll('a')?.length ?? 0;
  const heroRect = hero?.getBoundingClientRect();
  const h1Rect = h1?.getBoundingClientRect();

  return {
    documentHeight: document.documentElement.scrollHeight,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    sections,
    hero:
      hero === null || hero === undefined
        ? null
        : {
            width: round(heroRect.width),
            height: round(heroRect.height),
            vh: round(heroRect.height / vh),
            h1: h1.textContent.trim(),
            fontFamily: h1Style.fontFamily.split(',')[0].replaceAll('"', '').trim(),
            fontSize: h1Style.fontSize,
            fontWeight: h1Style.fontWeight,
            letterSpacing: h1Style.letterSpacing,
            lines:
              h1Rect === undefined
                ? 0
                : Math.round(h1Rect.height / parseFloat(h1Style.lineHeight)),
            /* 0 means the slogan's own centre is the viewport's centre line. */
            centerOffset:
              h1Rect === undefined
                ? null
                : round(h1Rect.top + h1Rect.height / 2 - window.innerHeight / 2),
            inputWidth:
              input === null || input === undefined ? null : round(input.getBoundingClientRect().width),
            formWidth: form === null || form === undefined ? null : round(form.getBoundingClientRect().width),
            formHeight: form === null || form === undefined ? null : round(form.getBoundingClientRect().height),
            formRadius: form === null || form === undefined ? null : getComputedStyle(form).borderRadius,
            links: heroLinks,
          },
  };
};

const browser = await chromium.launch();
const results = [];

for (const width of WIDTHS) {
  const height = width >= 1024 ? 900 : Number(HEIGHTS);
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    reducedMotion: REDUCED ? 'reduce' : 'no-preference',
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 500) pageErrors.push(`HTTP ${response.status()} ${response.url()}`);
  });

  const response = await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  const status = response === null ? 0 : response.status();

  await page.evaluate(async () => {
    const step = Math.max(window.innerHeight * 0.8, 400);
    const total = document.documentElement.scrollHeight;
    for (let y = 0; y < total; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
    window.scrollTo(0, 0);
    await new Promise((resolve) => setTimeout(resolve, 200));
  });
  await page.evaluate(async () => {
    const decoded = Promise.all(
      [...document.images].map((img) =>
        img.complete && img.naturalWidth > 0
          ? Promise.resolve()
          : new Promise((resolve) => {
              img.addEventListener('load', resolve, { once: true });
              img.addEventListener('error', resolve, { once: true });
            }),
      ),
    );
    await Promise.race([decoded, new Promise((resolve) => setTimeout(resolve, 7000))]);
  });
  await page.waitForTimeout(600);

  const measured = await page.evaluate(MEASURE);

  await page.evaluate(AXE);
  const audit = await page.evaluate(async (tags) => {
    const result = await window.axe.run(document, {
      runOnly: { type: 'tag', values: tags },
      resultTypes: ['violations', 'incomplete'],
    });
    return {
      violations: result.violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact ?? 'unknown',
        help: violation.help,
        nodes: violation.nodes.map((node) => ({
          target: node.target.join(' '),
          html: node.html.slice(0, 200),
          summary: (node.failureSummary ?? '').replace(/\s+/g, ' ').slice(0, 240),
        })),
      })),
      incomplete: result.incomplete.map((item) => ({ id: item.id, nodes: item.nodes.length })),
      passes: result.passes.length,
    };
  }, WCAG_TAGS);

  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    bodyScrollWidth: document.body.scrollWidth,
  }));

  const file = path.join(OUT_DIR, `home-${width}${REDUCED ? '-reduced' : ''}.png`);
  if (SHOTS) await page.screenshot({ path: file, fullPage: true });

  const violationNodes = audit.violations.reduce((sum, item) => sum + item.nodes.length, 0);
  const overflowPx = overflow.scrollWidth - overflow.clientWidth;
  const over70 = measured.sections.filter((s) => s.name !== 'hero' && s.vh > 70);

  console.log(
    `${violationNodes === 0 && overflowPx <= 1 && status === 200 ? 'PASS' : 'FAIL'} ` +
      `home@${width} status=${status} axe=${violationNodes} overflow=${overflowPx}px ` +
      `docH=${measured.documentHeight} ` +
      `${over70.length > 0 ? `OVER70=${over70.map((s) => `${s.name}:${s.vh}vh`).join(',')}` : 'over70=none'}`,
  );
  for (const section of measured.sections) {
    console.log(`    ${String(section.name).padEnd(20)} ${String(section.height).padStart(7)}px  ${String(section.vh).padStart(6)}vh  actions=${section.actions}`);
  }
  if (measured.hero !== null) {
    console.log(
      `    hero: h1=${measured.hero.fontSize}/${measured.hero.fontWeight} ` +
        `tracking=${measured.hero.letterSpacing} lines=${measured.hero.lines} ` +
        `centre=${measured.hero.centerOffset}px ` +
        `form=${measured.hero.formWidth}x${measured.hero.formHeight} r=${measured.hero.formRadius} ` +
        `links=${measured.hero.links} vh=${measured.hero.vh}`,
    );
  }

  results.push({
    width,
    height,
    status,
    overflowPx,
    overflow,
    axe: audit.violations,
    axeIncomplete: audit.incomplete,
    errors: [...pageErrors],
    screenshot: SHOTS ? path.relative(path.resolve(here, '../../..'), file).replaceAll('\\', '/') : null,
    ...measured,
  });

  pageErrors.length = 0;
  await context.close();
}

await browser.close();

const summary = {
  base: BASE,
  generatedAt: new Date().toISOString(),
  widths: WIDTHS,
  scores: {
    axeViolationNodes: results.reduce(
      (sum, result) => sum + result.axe.reduce((n, item) => n + item.nodes.length, 0),
      0,
    ),
    overflowCaptures: results.filter((result) => result.overflowPx > 1).length,
    pageErrorCaptures: results.filter((result) => result.errors.length > 0).length,
    nonOkCaptures: results.filter((result) => result.status !== 200).length,
    sectionsOver70vh: results.flatMap((result) =>
      result.sections
        .filter((section) => section.name !== 'hero' && section.vh > 70)
        .map((section) => `${result.width}:${section.name}:${section.vh}`),
    ),
  },
  results,
};

writeFileSync(path.join(OUT_DIR, 'audit.json'), JSON.stringify(summary, null, 2));

console.log(
  `\naxe nodes=${summary.scores.axeViolationNodes} overflow=${summary.scores.overflowCaptures} ` +
    `errors=${summary.scores.pageErrorCaptures} nonOk=${summary.scores.nonOkCaptures} ` +
    `over70=${summary.scores.sectionsOver70vh.length}`,
);
console.log('summary: docs/design-shots/v14/audit.json');
