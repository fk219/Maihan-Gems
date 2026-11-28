#!/usr/bin/env node
/**
 * apps/web/scripts/v12-spec-audit.mjs
 *
 * Measures the homepage against docs/BRAND_ANALYSIS.md §8 and writes the
 * numbers the delivery report quotes. Nothing is inferred: every value comes
 * from the rendered page at the four gated widths.
 *
 * It records:
 *   - section bands (name, surface, height) and the paper/obsidian share;
 *   - the photography area share (image boxes / document area);
 *   - the distinct type sizes and families inside the page content;
 *   - every gold-coloured element (computed colour, background, border);
 *   - hero height, first-price y, card box, footer height, grid gaps;
 *   - overflow, axe violations and page errors at 1440/1024/768/390;
 *   - full-page screenshots under docs/design-shots/v12 (SHOTS=0 to skip).
 *
 * Usage (production server on 3112):
 *   BASE_URL=http://localhost:3112 node scripts/v12-spec-audit.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

const BASE = process.env['BASE_URL'] ?? 'http://localhost:3112';
const here = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(here, '../../../docs/design-shots/v12');
const axePath = path.resolve(here, '../node_modules/axe-core/axe.min.js');
const AXE = readFileSync(axePath, 'utf8');
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const WIDTHS = (process.env['WIDTHS'] ?? '1440,1024,768,390')
  .split(',')
  .map((value) => Number(value.trim()))
  .filter((value) => Number.isFinite(value) && value > 0);
const SHOTS = process.env['SHOTS'] !== '0';

mkdirSync(OUT_DIR, { recursive: true });

const MEASURE = () => {
  const round = (value) => Math.round(value * 100) / 100;
  const home = document.querySelector('.mh12-home');
  const footer = document.querySelector('.mh12-footer');
  const scope = [home, footer].filter(Boolean);

  const sections = [...document.querySelectorAll('[data-section]')].map((section) => {
    const rect = section.getBoundingClientRect();
    return {
      name: section.getAttribute('data-section'),
      surface: section.getAttribute('data-surface'),
      top: round(rect.top + window.scrollY),
      height: round(rect.height),
    };
  });

  const docHeight = document.documentElement.scrollHeight;
  const docWidth = document.documentElement.clientWidth;
  const bySurface = { paper: 0, obsidian: 0, other: 0 };
  for (const section of sections) {
    if (section.surface === 'paper') bySurface.paper += section.height;
    else if (section.surface === 'obsidian') bySurface.obsidian += section.height;
    else bySurface.other += section.height;
  }

  /* Every image inside the page content, including the footer wordmark-free
     block (there is none there). Box area, not intrinsic area. */
  let mediaArea = 0;
  const media = [];
  for (const root of scope) {
    for (const img of root.querySelectorAll('img')) {
      const rect = img.getBoundingClientRect();
      const area = rect.width * rect.height;
      mediaArea += area;
      media.push({
        src: img.getAttribute('src'),
        w: round(rect.width),
        h: round(rect.height),
        area: Math.round(area),
      });
    }
  }

  /* Distinct rendered type sizes and families for text-bearing elements. */
  const sizes = new Map();
  const families = new Map();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
  let node = walker.currentNode;
  while (node) {
    const el = node;
    if (scope.some((root) => root.contains(el))) {
      const hasText = [...el.childNodes].some(
        (child) => child.nodeType === 3 && child.textContent.trim().length > 0,
      );
      const style = getComputedStyle(el);
      const visible = el.offsetParent !== null || style.position === 'fixed';
      if (hasText && visible) {
        const size = `${round(parseFloat(style.fontSize))}px`;
        sizes.set(size, (sizes.get(size) ?? 0) + 1);
        const family = style.fontFamily.split(',')[0].replaceAll('"', '').trim();
        families.set(family, (families.get(family) ?? 0) + 1);
      }
    }
    node = walker.nextNode();
  }

  /* Gold, by computed paint. #C9A84C, and both gradient stops. */
  const goldNeedles = ['201, 168, 76', '204, 146, 0', '233, 205, 107', '#c9a84c', '#cc9200', '#e9cd6b'];
  const gold = [];
  for (const root of scope) {
    for (const el of root.querySelectorAll('*')) {
      const style = getComputedStyle(el);
      const props = {
        color: style.color,
        backgroundColor: style.backgroundColor,
        backgroundImage: style.backgroundImage,
        borderTopColor: style.borderTopColor,
        borderBottomColor: style.borderBottomColor,
        borderLeftColor: style.borderLeftColor,
        borderRightColor: style.borderRightColor,
        textDecorationColor: style.textDecorationColor,
        outlineColor: style.outlineColor,
      };
      const hits = Object.entries(props).filter(([, value]) =>
        goldNeedles.some((needle) => String(value).toLowerCase().includes(needle)),
      );
      if (hits.length > 0) {
        const cls = typeof el.className === 'string' ? el.className : '';
        gold.push({
          tag: el.tagName.toLowerCase(),
          cls: cls.split(/\s+/).filter(Boolean).slice(0, 4).join('.'),
          text: (el.textContent ?? '').trim().slice(0, 48),
          properties: hits.map(([prop, value]) => `${prop}=${value}`),
        });
      }
    }
  }

  const rectOf = (selector) => {
    const el = document.querySelector(selector);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return { top: round(rect.top + window.scrollY), w: round(rect.width), h: round(rect.height) };
  };

  const cards = [...document.querySelectorAll('.mh12-card')].map((card) => {
    const rect = card.getBoundingClientRect();
    return { w: round(rect.width), h: round(rect.height) };
  });

  const firstPrice = rectOf('.mh12-card__price');

  const hero = document.querySelector('.mh12-hero');
  const heroImage = document.querySelector('.mh12-hero__media img');
  const heroStyle = heroImage ? getComputedStyle(heroImage) : null;

  const styleOf = (selector) => {
    const el = document.querySelector(selector);
    if (!el) return null;
    const style = getComputedStyle(el);
    return {
      fontFamily: style.fontFamily.split(',')[0].replaceAll('"', '').trim(),
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      lineHeight: style.lineHeight,
      letterSpacing: style.letterSpacing,
      textTransform: style.textTransform,
      color: style.color,
      backgroundColor: style.backgroundColor,
      borderRadius: style.borderRadius,
      borderWidth: style.borderTopWidth,
      boxShadow: style.boxShadow,
      transitionDuration: style.transitionDuration,
      transitionProperty: style.transitionProperty,
      fontVariantNumeric: style.fontVariantNumeric,
    };
  };

  return {
    documentHeight: docHeight,
    documentWidth: docWidth,
    sections,
    surfaces: {
      paper: round(bySurface.paper),
      obsidian: round(bySurface.obsidian),
      other: round(bySurface.other),
      paperPct: round((bySurface.paper / docHeight) * 100),
      obsidianPct: round((bySurface.obsidian / docHeight) * 100),
      otherPct: round((bySurface.other / docHeight) * 100),
    },
    computed: {
      h1: styleOf('.mh12-hero__title'),
      h2: styleOf('.mh12-featured__head .mh12-h2'),
      lede: styleOf('.mh12-hero__lede'),
      body: styleOf('.mh12-record__facts dd'),
      cardName: styleOf('.mh12-card__name'),
      label: styleOf('.mh12-card__spec'),
      price: styleOf('.mh12-card__price'),
      card: styleOf('.mh12-card'),
      cardImage: styleOf('.mh12-card__frame img'),
      cardNameDraw: styleOf('.mh12-card__draw'),
      action: styleOf('.mh12-featured__action'),
      footer: styleOf('.mh12-footer'),
      closingAction: styleOf('.mh12-closing__action'),
    },
    media: {
      area: Math.round(mediaArea),
      pageArea: docWidth * docHeight,
      sharePct: round((mediaArea / (docWidth * docHeight)) * 100),
      items: media,
    },
    type: {
      sizes: [...sizes.entries()]
        .sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]))
        .map(([size, count]) => ({ size, count })),
      families: [...families.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([family, count]) => ({ family, count })),
    },
    gold: {
      count: gold.length,
      items: gold,
    },
    hero: hero
      ? {
          height: round(hero.getBoundingClientRect().height),
          animationName: heroStyle?.animationName ?? null,
          firstPriceTop: firstPrice?.top ?? null,
        }
      : null,
    cards,
    categories: [...document.querySelectorAll('.mh12-cat')].map((cat) => {
      const rect = cat.getBoundingClientRect();
      return { w: round(rect.width), h: round(rect.height) };
    }),
    footer: rectOf('.mh12-footer'),
    gridGap: getComputedStyle(document.querySelector('.mh12-grid-4') ?? document.body).columnGap,
    sideMargin: (() => {
      const wrap = document.querySelector('.mh12-cats .mh12-wrap');
      if (!wrap) return null;
      const rect = wrap.getBoundingClientRect();
      return {
        left: round(rect.left),
        right: round(document.documentElement.clientWidth - rect.right),
      };
    })(),
  };
};

const browser = await chromium.launch();
const results = [];

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

  const response = await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 90_000 });
  const status = response === null ? 0 : response.status();

  // Walk the page so lazy images decode and nothing is mid-entrance, then
  // return to the top. The hero entrance is 600 ms; wait it out.
  await page.evaluate(async () => {
    const step = Math.max(window.innerHeight * 0.8, 400);
    const height = document.documentElement.scrollHeight;
    for (let y = 0; y < height; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
    window.scrollTo(0, 0);
    await new Promise((resolve) => setTimeout(resolve, 200));
  });
  /* Lazy images must be decoded before the full-page capture, or a card can
     photograph as an empty frame. */
  await page.evaluate(async () => {
    await Promise.all(
      [...document.images].map((img) =>
        img.complete && img.naturalWidth > 0
          ? Promise.resolve()
          : new Promise((resolve) => {
              img.addEventListener('load', resolve, { once: true });
              img.addEventListener('error', resolve, { once: true });
            }),
      ),
    );
  });
  await page.waitForTimeout(700);

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
          summary: (node.failureSummary ?? '').replace(/\s+/g, ' ').slice(0, 200),
        })),
      })),
      incomplete: result.incomplete.map((item) => ({ id: item.id, nodes: item.nodes.length })),
      passes: result.passes.length,
    };
  }, WCAG_TAGS);

  /* The same audit scoped to the page's own content, so the report can say
     how much of the 'incomplete' noise belongs to the approved chrome. */
  const contentAudit = await page.evaluate(async (tags) => {
    const roots = [document.querySelector('.mh12-home'), document.querySelector('.mh12-footer')].filter(
      (node) => node !== null,
    );
    if (roots.length === 0) return null;
    const result = await window.axe.run(roots, {
      runOnly: { type: 'tag', values: tags },
      resultTypes: ['violations', 'incomplete'],
    });
    return {
      violations: result.violations.map((violation) => ({
        id: violation.id,
        nodes: violation.nodes.map((node) => ({
          target: node.target.join(' '),
          html: node.html.slice(0, 160),
          summary: (node.failureSummary ?? '').replace(/\s+/g, ' ').slice(0, 200),
        })),
      })),
      incomplete: result.incomplete.map((item) => ({
        id: item.id,
        nodes: item.nodes.map((node) => ({
          target: node.target.join(' '),
          html: node.html.slice(0, 160),
          summary: (node.failureSummary ?? '').replace(/\s+/g, ' ').slice(0, 200),
        })),
      })),
    };
  }, WCAG_TAGS);

  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));

  const file = path.join(OUT_DIR, `home-${width}.png`);
  if (SHOTS) await page.screenshot({ path: file, fullPage: true });

  const violationNodes = audit.violations.reduce((sum, item) => sum + item.nodes.length, 0);
  const overflowPx = overflow.scrollWidth - overflow.clientWidth;

  console.log(
    `${status === 200 && violationNodes === 0 && overflowPx <= 1 && pageErrors.length === 0 ? 'PASS' : 'FAIL'} ` +
      `${width}px status=${status} axe=${violationNodes} ` +
      `overflow=${overflowPx}px doc=${measured.documentHeight} ` +
      `paper=${measured.surfaces.paperPct}% dark=${measured.surfaces.obsidianPct}% ` +
      `media=${measured.media.sharePct}% sizes=${measured.type.sizes.map((s) => s.size).join('/')} ` +
      `gold=${measured.gold.count} hero=${measured.hero?.height} footer=${measured.footer?.h} ` +
      `${audit.violations.map((v) => `${v.id}(${v.nodes.length})`).join(',')}`,
  );

  results.push({
    width,
    status,
    overflowPx,
    axe: audit.violations,
    axeIncomplete: audit.incomplete,
    contentAxe: contentAudit,
    errors: [...pageErrors],
    screenshot: SHOTS ? path.relative(path.resolve(here, '../../..'), file).replaceAll('\\', '/') : null,
    ...measured,
  });

  pageErrors.length = 0;
  await context.close();
}

await browser.close();

const at1440 = results.find((result) => result.width === 1440) ?? results[0];
const summary = {
  base: BASE,
  generatedAt: new Date().toISOString(),
  widths: WIDTHS,
  scores: {
    axeViolationNodes: results.reduce(
      (sum, result) => sum + result.axe.reduce((n, v) => n + v.nodes.length, 0),
      0,
    ),
    contentViolationNodes: results.reduce(
      (sum, result) =>
        sum + (result.contentAxe?.violations ?? []).reduce((n, v) => n + v.nodes.length, 0),
      0,
    ),
    contentIncompleteNodes: results.reduce(
      (sum, result) =>
        sum +
        (result.contentAxe?.incomplete ?? [])
          .filter((item) => item.id === 'color-contrast')
          .reduce((n, item) => n + item.nodes.length, 0),
      0,
    ),
    overflowCaptures: results.filter((result) => result.overflowPx > 1).length,
    pageErrorCaptures: results.filter((result) => result.errors.length > 0).length,
    nonOkCaptures: results.filter((result) => result.status !== 200).length,
  },
  at1440: {
    documentHeight: at1440.documentHeight,
    surfaces: at1440.surfaces,
    media: { area: at1440.media.area, sharePct: at1440.media.sharePct },
    computed: at1440.computed,
    typeSizes: at1440.type.sizes,
    typeFamilies: at1440.type.families,
    gold: at1440.gold,
    hero: at1440.hero,
    cards: at1440.cards,
    categories: at1440.categories,
    footer: at1440.footer,
    gridGap: at1440.gridGap,
    sideMargin: at1440.sideMargin,
    sections: at1440.sections,
  },
  results,
};

const summaryPath = path.join(OUT_DIR, 'audit.json');
writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

console.log(
  `\naxe nodes=${summary.scores.axeViolationNodes} ` +
    `content-incomplete=${summary.scores.contentIncompleteNodes} ` +
    `overflow=${summary.scores.overflowCaptures} ` +
    `errors=${summary.scores.pageErrorCaptures} nonOk=${summary.scores.nonOkCaptures}`,
);
console.log(`summary: ${path.relative(path.resolve(here, '../../..'), summaryPath)}`);
