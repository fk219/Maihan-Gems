#!/usr/bin/env node
/**
 * apps/web/scripts/v13-system-audit.mjs
 *
 * The v13 gate for the design-system adoption (ADR-030) and the two libraries
 * (ADR-031). Nothing here is inferred: every number comes from the built site.
 *
 * Surfaces gated: /admin/login, /vendor/login, / (the homepage). Widths: 390,
 * 768, 1440. Per capture it records:
 *   - HTTP status, page errors and 5xx responses;
 *   - axe violations for WCAG 2.0/2.1/2.2 A+AA (nodes, not rules);
 *   - document overflow in px;
 *   - the rendered families (two-family rule) and whether Manrope/Montserrat
 *     actually painted;
 *   - the computed primitives: primary button (gradient, radius, 11px/800),
 *     input (12px radius), card (16px radius + gold top hairline), chip
 *     (9999px, 8.5px/700, +0.12em);
 *   - a full-page screenshot in docs/design-shots/v13.
 *
 * Usage (production server on 3113, DATABASE_URL unset):
 *   BASE_URL=http://localhost:3113 node scripts/v13-system-audit.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

const BASE = process.env['BASE_URL'] ?? 'http://localhost:3113';
const here = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(here, '../../../docs/design-shots/v13');
const axePath = path.resolve(here, '../node_modules/axe-core/axe.min.js');
const AXE = readFileSync(axePath, 'utf8');
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const WIDTHS = (process.env['WIDTHS'] ?? '1440,768,390')
  .split(',')
  .map((value) => Number(value.trim()))
  .filter((value) => Number.isFinite(value) && value > 0);
const SHOTS = process.env['SHOTS'] !== '0';

const PAGES = [
  { name: 'admin-login', path: '/admin/login', surface: 'portal' },
  { name: 'vendor-login', path: '/vendor/login', surface: 'portal' },
  { name: 'home', path: '/', surface: 'storefront' },
];

mkdirSync(OUT_DIR, { recursive: true });

const MEASURE = (surface) => {
  const round = (value) => Math.round(value * 100) / 100;
  const styleOf = (selector) => {
    const el = document.querySelector(selector);
    if (el === null) return null;
    const style = getComputedStyle(el);
    return {
      selector,
      fontFamily: style.fontFamily.split(',')[0].replaceAll('"', '').trim(),
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      letterSpacing: style.letterSpacing,
      textTransform: style.textTransform,
      color: style.color,
      backgroundImage: style.backgroundImage.slice(0, 120),
      borderRadius: style.borderRadius,
      borderTopWidth: style.borderTopWidth,
      boxShadow: style.boxShadow.slice(0, 120),
      minHeight: style.minHeight,
    };
  };

  const families = new Map();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
  let node = walker.currentNode;
  while (node !== null) {
    const el = node;
    const hasText = [...el.childNodes].some(
      (child) => child.nodeType === 3 && child.textContent.trim().length > 0,
    );
    const style = getComputedStyle(el);
    const visible = el.offsetParent !== null || style.position === 'fixed';
    if (hasText && visible) {
      const family = style.fontFamily.split(',')[0].replaceAll('"', '').trim();
      families.set(family, (families.get(family) ?? 0) + 1);
    }
    node = walker.nextNode();
  }

  const recipes =
    surface === 'storefront'
      ? [
          styleOf('.mh6-button'),
          styleOf('.mh12-card__frame'),
          styleOf('.mh12-card__fact'),
          styleOf('.mh6-search__form'),
          styleOf('.mh12-card'),
        ]
      : [
          styleOf('.mh-auth__submit'),
          styleOf('.mh-auth__input'),
          styleOf('.mh-auth__card'),
          styleOf('.mh-auth__eyebrow'),
        ];

  return {
    documentHeight: document.documentElement.scrollHeight,
    families: [...families.entries()].sort((a, b) => b[1] - a[1]).map(([family, nodes]) => ({ family, nodes })),
    recipes: recipes.filter((entry) => entry !== null),
    chips: [...document.querySelectorAll('.mi-chip, .portal-badge, .demo-content-badge')]
      .slice(0, 2)
      .map(() => styleOf('.mi-chip, .portal-badge, .demo-content-badge')),
    figures: round(
      document.querySelectorAll('[data-price], .mh12-card__fact').length,
    ),
  };
};

const browser = await chromium.launch();
const results = [];

for (const pageDef of PAGES) {
  for (const width of WIDTHS) {
    const context = await browser.newContext({
      viewport: { width, height: width >= 1024 ? 900 : 844 },
      deviceScaleFactor: 1,
      reducedMotion: 'no-preference',
    });
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('response', (response) => {
      if (response.status() >= 500) pageErrors.push(`HTTP ${response.status()} ${response.url()}`);
    });

    const response = await page.goto(`${BASE}${pageDef.path}`, {
      waitUntil: 'domcontentloaded',
      timeout: 90_000,
    });
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {
      /* a live surface never reaches networkidle; the settle below is the gate */
    });
    const status = response === null ? 0 : response.status();

    await page.evaluate(async () => {
      const step = Math.max(window.innerHeight * 0.8, 400);
      const height = document.documentElement.scrollHeight;
      for (let y = 0; y < height; y += step) {
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
      /* One image that never settles must not stall the gate. */
      await Promise.race([decoded, new Promise((resolve) => setTimeout(resolve, 6000))]);
    });
    await page.waitForTimeout(700);

    console.log(`· measuring ${pageDef.name}@${width}`);

    const measured = await page.evaluate(MEASURE, pageDef.surface);

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
            summary: (node.failureSummary ?? '').replace(/\s+/g, ' ').slice(0, 200),
          })),
        })),
        incomplete: result.incomplete.map((item) => ({ id: item.id, nodes: item.nodes.length })),
        passes: result.passes.length,
      };
    }, WCAG_TAGS);

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));

    const file = path.join(OUT_DIR, `${pageDef.name}-${width}.png`);
    if (SHOTS) await page.screenshot({ path: file, fullPage: true });

    const violationNodes = audit.violations.reduce((sum, item) => sum + item.nodes.length, 0);
    const overflowPx = overflow.scrollWidth - overflow.clientWidth;
    const pass =
      status === 200 && violationNodes === 0 && overflowPx <= 1 && pageErrors.length === 0;

    console.log(
      `${pass ? 'PASS' : 'FAIL'} ${pageDef.name}@${width} status=${status} ` +
        `axe=${violationNodes} overflow=${overflowPx}px ` +
        `families=${measured.families.slice(0, 3).map((f) => `${f.family}(${f.nodes})`).join(' ')} ` +
        `${audit.violations.map((v) => `${v.id}(${v.nodes.length})`).join(',')}`,
    );

    results.push({
      page: pageDef.name,
      surface: pageDef.surface,
      width,
      status,
      overflowPx,
      axe: audit.violations,
      axeIncomplete: audit.incomplete,
      errors: [...pageErrors],
      screenshot: SHOTS
        ? path.relative(path.resolve(here, '../../..'), file).replaceAll('\\', '/')
        : null,
      ...measured,
    });

    pageErrors.length = 0;
    await context.close();
  }
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
  },
  results,
};

writeFileSync(path.join(OUT_DIR, 'audit.json'), JSON.stringify(summary, null, 2));

console.log(
  `\naxe nodes=${summary.scores.axeViolationNodes} ` +
    `overflow=${summary.scores.overflowCaptures} ` +
    `errors=${summary.scores.pageErrorCaptures} nonOk=${summary.scores.nonOkCaptures}`,
);
console.log(`summary: docs/design-shots/v13/audit.json`);
