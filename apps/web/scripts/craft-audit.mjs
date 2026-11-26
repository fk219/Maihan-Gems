#!/usr/bin/env node
/**
 * apps/web/scripts/craft-audit.mjs
 *
 * The v4 craft pass measurement harness. It answers the questions the v3
 * design audit could only count: WHICH node fails contrast, at what ratio,
 * which target is under 24 px, and what the computed type scale actually is.
 *
 * Differences from design-audit.mjs (which it does not replace):
 *   - every axe node is recorded with its selector, snippet, failure summary
 *     and the fg/bg/ratio axe measured, so a before/after pair is diffable;
 *   - the effective type scale (font-size + line-height + tracking) is
 *     sampled from real rendered elements, grouped by size;
 *   - every interactive element's box is measured, so the count of targets
 *     under 24x24 and under 44x44 is exact rather than inferred;
 *   - it writes to a labelled subdirectory so before and after never collide.
 *
 * Usage against a running production server:
 *   BASE_URL=http://localhost:3100 LABEL=before OUT_DIR=../../../docs/design-shots/v4 \
 *     WIDTHS=1440,768,390 node scripts/craft-audit.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

const BASE = process.env['BASE_URL'] ?? 'http://localhost:3100';
const here = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = process.env['OUT_DIR'] ?? '../../../docs/design-shots/v4';
const LABEL = process.env['LABEL'] ?? 'run';
const outDir = path.resolve(here, OUT_DIR, LABEL);
const axePath = path.resolve(here, '../node_modules/axe-core/axe.min.js');
const AXE = readFileSync(axePath, 'utf8');
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

const WIDTHS = (process.env['WIDTHS'] ?? '1440,768,390')
  .split(',')
  .map((value) => Number(value.trim()))
  .filter((value) => Number.isFinite(value) && value > 0);

const ROUTES = [
  { name: 'home', path: '/' },
  { name: 'shop', path: '/shop' },
  { name: 'browse', path: '/browse' },
  { name: 'jewellery', path: '/jewellery' },
  { name: 'gemstones', path: '/gemstones' },
  { name: 'search', path: '/search' },
  { name: 'varieties', path: '/varieties' },
  { name: 'variety', path: '/emerald' },
  { name: 'variety-nested', path: '/varieties/emerald' },
  { name: 'pairs', path: '/pairs' },
  { name: 'pairs-listing', path: '/emerald-pairs' },
  { name: 'rings', path: '/emerald-rings' },
  { name: 'product', path: '/products/merelani-violetish-blue-tanzanite-1-31ct' },
  { name: 'product-gem', path: '/product/merelani-violetish-blue-tanzanite-1-31ct' },
  { name: 'settings', path: '/settings' },
  { name: 'setting', path: '/settings/SET-ARCH-SOL-01' },
  { name: 'colour', path: '/colour/green' },
  { name: 'cart', path: '/cart' },
  { name: 'design-your-own', path: '/design-your-own' },
  { name: 'dyo-review', path: '/design-your-own/review/DEMO-REVIEW' },
  { name: 'concierge', path: '/concierge' },
  { name: 'compare', path: '/compare' },
  { name: 'favorites', path: '/favorites' },
  { name: 'checkout-summary', path: '/checkout/order-summary' },
  { name: 'checkout-payment', path: '/checkout/payment-order' },
  { name: 'checkout-secure', path: '/checkout/secure-payment' },
  { name: 'account-login', path: '/account/login' },
  { name: 'account-register', path: '/account/register' },
  { name: 'contact', path: '/contact' },
  { name: 'showrooms', path: '/showrooms' },
  { name: 'showroom', path: '/showrooms/new-york' },
  { name: 'education', path: '/education' },
  { name: 'education-chapter', path: '/education/reading-a-record' },
  { name: 'blog', path: '/blog' },
  { name: 'blog-post', path: '/blog/inside-the-vault' },
  { name: 'about', path: '/about' },
  { name: 'about-atelier', path: '/about/atelier' },
  { name: 'policy', path: '/policy' },
  { name: 'policy-provenance', path: '/policy/provenance' },
  { name: 'policy-terms', path: '/policy/terms' },
  { name: 'financing', path: '/financing' },
  { name: 'protection-plan', path: '/protection-plan' },
  { name: 'demo', path: '/demo' },
  { name: 'card-preview', path: '/card-preview' },
  { name: 'admin-login', path: '/admin/login' },
  { name: 'vendor-login', path: '/vendor/login' },
  { name: 'not-found', path: '/definitely-not-a-real-route-xyz', expect: [200, 404] },
];

const onlyArg = process.argv.find((arg) => arg.startsWith('--only='));
const only = onlyArg === undefined ? null : new Set(onlyArg.slice('--only='.length).split(','));
const routes = only === null ? ROUTES : ROUTES.filter((route) => only.has(route.name));

/**
 * A full 47-route screenshot set at three widths is ~140 full-page PNGs. For a
 * before/after pair the images only need to be a representative, matched set:
 * the machine-readable record still covers every route. SHOT_ROUTES names the
 * routes to photograph; empty means all of them.
 */
const SHOT_ROUTES = (process.env['SHOT_ROUTES'] ?? '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const shouldShoot = (name) => SHOT_ROUTES.length === 0 || SHOT_ROUTES.includes(name);

mkdirSync(outDir, { recursive: true });

function slug(text) {
  return text.replace(/[^a-z0-9-]/gi, '-').replace(/-+/g, '-');
}

/** Text metrics sampled from what the browser actually painted. */
const MEASURE = () => {
  const round = (value) => Math.round(value * 100) / 100;
  const describe = (el) => {
    const cls = typeof el.className === 'string' ? el.className : el.getAttribute('class') ?? '';
    const own = cls.trim().split(/\s+/).slice(0, 6).join(' ');
    return `${el.tagName.toLowerCase()}${own ? `.${own.replace(/\s+/g, '.')}` : ''}`;
  };
  const sizes = new Map();
  const interactive = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
  let node = walker.currentNode;
  while (node) {
    const el = node;
    const style = getComputedStyle(el);
    const hasText = [...el.childNodes].some(
      (child) => child.nodeType === 3 && child.textContent.trim().length > 1,
    );
    if (hasText && el.offsetParent !== null) {
      const size = round(parseFloat(style.fontSize));
      const key = `${size}|${round(parseFloat(style.lineHeight) / parseFloat(style.fontSize))}|${style.letterSpacing}|${style.fontFamily.split(',')[0]}`;
      const bucket = sizes.get(key) ?? { key, count: 0, samples: [] };
      bucket.count += 1;
      if (bucket.samples.length < 4) bucket.samples.push(describe(el));
      sizes.set(key, bucket);
    }
    const tag = el.tagName.toLowerCase();
    const role = el.getAttribute('role');
    const isInteractive =
      tag === 'a' ||
      tag === 'button' ||
      tag === 'summary' ||
      tag === 'input' ||
      tag === 'select' ||
      tag === 'textarea' ||
      role === 'button' ||
      role === 'option' ||
      role === 'link' ||
      el.hasAttribute('tabindex');
    if (isInteractive && el.offsetParent !== null && !el.hasAttribute('disabled')) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        node = walker.nextNode();
        continue;
      }
      interactive.push({
        target: describe(el),
        text: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 48),
        w: round(rect.width),
        h: round(rect.height),
      });
    }
    node = walker.nextNode();
  }
  const count = (list, predicate) => list.filter(predicate).length;
  return {
    typeScale: [...sizes.values()].sort((a, b) => b.count - a.count),
    interactive: {
      total: interactive.length,
      under24: interactive.filter((item) => item.w < 24 || item.h < 24),
      under44: interactive.filter((item) => item.w < 44 || item.h < 44),
      countUnder24: count(interactive, (item) => item.w < 24 || item.h < 24),
      countUnder44: count(interactive, (item) => item.w < 44 || item.h < 44),
    },
  };
};

const browser = await chromium.launch();
const results = [];

/**
 * Walk the document so every [data-reveal] section has entered, then return to
 * the top. Without this the full-page capture (and axe) sees the pre-reveal
 * state: whole sections sit at opacity 0.01, which is faithfully invisible in
 * the image and which axe composites into false contrast failures (it reported
 * white-on-white for a solid black CTA). The capture must show the page a
 * reader actually gets.
 */
async function settleReveals(page) {
  await page.evaluate(async () => {
    const step = Math.max(window.innerHeight * 0.75, 360);
    const height = document.documentElement.scrollHeight;
    for (let y = 0; y < height; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 45)));
    }
    window.scrollTo(0, 0);
    await new Promise((resolve) => setTimeout(resolve, 150));
  });
  await page.waitForTimeout(650);
}

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

  for (const route of routes) {
    const label = `${route.name}@${width}`;
    try {
      const response = await page.goto(BASE + route.path, {
        waitUntil: 'networkidle',
        timeout: 90_000,
      });
      const expected = route.expect ?? [200];
      const status = response === null ? 0 : response.status();
      if (!expected.includes(status)) {
        console.log(`FAIL ${label}: HTTP ${status} (expected ${expected.join('/')})`);
        results.push({ route: route.path, name: route.name, width, status, error: `HTTP ${status}` });
        continue;
      }

      await settleReveals(page);

      await page.evaluate(AXE);
      const audit = await page.evaluate(async (tags) => {
        const result = await window.axe.run(document, {
          runOnly: { type: 'tag', values: tags },
          resultTypes: ['violations', 'incomplete'],
        });
        const detail = (node) => {
          const check =
            node.any.find((item) => item.id === 'color-contrast') ??
            node.all.find((item) => item.id === 'color-contrast') ??
            node.any[0];
          const data = check?.data ?? {};
          return {
            target: node.target.join(' '),
            html: node.html.slice(0, 220),
            summary: (node.failureSummary ?? '').replace(/\s+/g, ' ').slice(0, 220),
            fg: data.fgColor ?? null,
            bg: data.bgColor ?? null,
            ratio: typeof data.contrastRatio === 'number' ? data.contrastRatio : null,
            expected: typeof data.expectedContrastRatio === 'number' ? data.expectedContrastRatio : null,
            fontSize: data.fontSize ?? null,
            fontWeight: data.fontWeight ?? null,
          };
        };
        return {
          violations: result.violations.map((violation) => ({
            id: violation.id,
            impact: violation.impact ?? 'unknown',
            help: violation.help,
            nodes: violation.nodes.map(detail),
          })),
          incomplete: result.incomplete.map((item) => ({ id: item.id, nodes: item.nodes.length })),
        };
      }, WCAG_TAGS);

      const measured = await page.evaluate(MEASURE);
      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      const overflowPx = overflow.scrollWidth - overflow.clientWidth;

      const file = path.join(outDir, `${slug(route.name)}-${width}.png`);
      const shoot = shouldShoot(route.name);
      if (shoot) await page.screenshot({ path: file, fullPage: true });

      const contrastIncomplete = audit.incomplete
        .filter((item) => item.id === 'color-contrast')
        .reduce((sum, item) => sum + item.nodes, 0);

      console.log(
        `${audit.violations.length === 0 && overflowPx <= 1 && pageErrors.length === 0 ? 'PASS' : 'FAIL'} ${label} ` +
          `status=${status} axe=${audit.violations.reduce((n, v) => n + v.nodes.length, 0)} ` +
          `rules=${audit.violations.length} overflow=${overflowPx}px target<24=${measured.interactive.countUnder24} ` +
          `target<44=${measured.interactive.countUnder44} sizes=${measured.typeScale.length} ` +
          `${audit.violations.map((v) => `${v.id}(${v.nodes.length})`).join(',')}`,
      );

      results.push({
        route: route.path,
        name: route.name,
        width,
        status,
        axe: audit.violations,
        contrastIncomplete,
        overflowPx,
        typeScale: measured.typeScale,
        interactive: {
          total: measured.interactive.total,
          countUnder24: measured.interactive.countUnder24,
          countUnder44: measured.interactive.countUnder44,
          under24: measured.interactive.under24.slice(0, 30),
          under44: measured.interactive.under44.slice(0, 40),
        },
        screenshot: shoot ? path.relative(path.resolve(here, '../../..'), file).replaceAll('\\', '/') : null,
        errors: [...pageErrors],
      });
      pageErrors.length = 0;
    } catch (error) {
      console.log(`FAIL ${label}: ${error instanceof Error ? error.message : String(error)}`);
      results.push({ route: route.path, name: route.name, width, error: String(error) });
      pageErrors.length = 0;
    }
  }
  await context.close();
}

await browser.close();

const ruleNodes = new Map();
for (const result of results) {
  for (const violation of result.axe ?? []) {
    ruleNodes.set(violation.id, (ruleNodes.get(violation.id) ?? 0) + violation.nodes.length);
  }
}

const uniqueScale = new Map();
for (const result of results) {
  if (result.width !== WIDTHS[0]) continue;
  for (const entry of result.typeScale ?? []) {
    const bucket = uniqueScale.get(entry.key) ?? { key: entry.key, count: 0, samples: [] };
    bucket.count += entry.count;
    bucket.samples.push(...entry.samples);
    uniqueScale.set(entry.key, bucket);
  }
}

const summary = {
  base: BASE,
  label: LABEL,
  generatedAt: new Date().toISOString(),
  widths: WIDTHS,
  routes: routes.length,
  captures: results.length,
  passes: results.filter((r) => (r.errors ?? []).length === 0 && r.error === undefined && (r.axe ?? []).length === 0 && (r.overflowPx ?? 0) <= 1).length,
  designPasses: results.filter((r) => r.error === undefined && (r.axe ?? []).length === 0 && (r.overflowPx ?? 0) <= 1).length,
  failures: results.filter((r) => (r.errors ?? []).length > 0 || r.error !== undefined || (r.axe ?? []).length > 0 || (r.overflowPx ?? 0) > 1).length,
  violationNodes: Object.fromEntries([...ruleNodes.entries()].sort((a, b) => b[1] - a[1])),
  violationNodesTotal: [...ruleNodes.values()].reduce((sum, n) => sum + n, 0),
  contrastIncompleteTotal: results.reduce((sum, r) => sum + (r.contrastIncomplete ?? 0), 0),
  overflowCaptures: results.filter((r) => (r.overflowPx ?? 0) > 1).length,
  pageErrorCaptures: results.filter((r) => (r.errors ?? []).length > 0 && ((r.errors ?? []).some((e) => !String(e).includes('axe')))).length,
  targetsUnder24: results.reduce((sum, r) => sum + (r.interactive?.countUnder24 ?? 0), 0),
  targetsUnder44: results.reduce((sum, r) => sum + (r.interactive?.countUnder44 ?? 0), 0),
  typeScaleAtFirstWidth: [...uniqueScale.values()].sort((a, b) => b.count - a.count),
  results,
};

const summaryPath = path.join(outDir, 'audit.json');
writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

console.log(
  `\n${summary.captures} captures · pass=${summary.passes} fail=${summary.failures} · ` +
    `violation nodes=${summary.violationNodesTotal} (${JSON.stringify(summary.violationNodes)}) · ` +
    `contrast-incomplete=${summary.contrastIncompleteTotal} · overflow captures=${summary.overflowCaptures} · ` +
    `targets<24=${summary.targetsUnder24} targets<44=${summary.targetsUnder44} · ` +
    `type scale buckets=${summary.typeScaleAtFirstWidth.length}`,
);
console.log(`summary: ${path.relative(path.resolve(here, '../../..'), summaryPath)}`);
