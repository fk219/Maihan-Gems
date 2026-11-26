#!/usr/bin/env node
/**
 * apps/web/scripts/design-audit.mjs
 *
 * Storefront v2 verification: screenshots + axe at four widths.
 *
 * For every redesigned route it:
 *   1. loads the page at 1440 / 1024 / 768 / 390 CSS px;
 *   2. fails on a non-expected HTTP status or a page error / 5xx;
 *   3. runs axe-core (WCAG 2.0/2.1/2.2 A+AA) and fails on ANY violation
 *      (not only critical/serious), reporting incomplete checks separately;
 *   4. checks the document does not overflow horizontally;
 *   5. writes a full-page screenshot to docs/design-shots/v2/.
 *
 * Usage (dev or production server running):
 *   BASE_URL=http://localhost:3000 node scripts/design-audit.mjs
 *   BASE_URL=... node scripts/design-audit.mjs --only=home,search
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

const BASE = process.env['BASE_URL'] ?? 'http://localhost:3000';
const here = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = process.env['OUT_DIR'] ?? '../../../docs/design-shots/v2';
const outDir = path.resolve(here, OUT_DIR);
const axePath = path.resolve(here, '../node_modules/axe-core/axe.min.js');
const AXE = readFileSync(axePath, 'utf8');
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

const WIDTHS = (process.env['WIDTHS'] ?? '1440,1024,768,390')
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

mkdirSync(outDir, { recursive: true });

function slug(text) {
  return text.replace(/[^a-z0-9-]/gi, '-').replace(/-+/g, '-');
}

const browser = await chromium.launch();
const results = [];
let failed = false;

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
        results.push({ route: route.path, width, status, error: `HTTP ${status}` });
        failed = true;
        continue;
      }

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
            nodes: violation.nodes.length,
            targets: violation.nodes.slice(0, 3).map((node) => node.target.join(' ')),
          })),
          incomplete: result.incomplete.map((item) => ({ id: item.id, nodes: item.nodes.length })),
        };
      }, WCAG_TAGS);

      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      const overflowPx = overflow.scrollWidth - overflow.clientWidth;

      const file = path.join(outDir, `${slug(route.name)}-${width}.png`);
      await page.screenshot({ path: file, fullPage: true });

      const blocking = audit.violations;
      const routeErrors = [...pageErrors];
      if (blocking.length > 0) routeErrors.push(`${blocking.length} axe violation(s)`);
      if (overflowPx > 1) routeErrors.push(`horizontal overflow ${overflowPx}px`);
      if (routeErrors.length > 0) failed = true;

      const contrastIncomplete = audit.incomplete
        .filter((item) => item.id === 'color-contrast')
        .reduce((sum, item) => sum + item.nodes, 0);

      console.log(
        `${routeErrors.length === 0 ? 'PASS' : 'FAIL'} ${label} ` +
          `status=${status} axe=${blocking.length} incompleteContrast=${contrastIncomplete} overflow=${overflowPx}px ` +
          `${blocking.map((v) => `${v.impact}/${v.id}(${v.nodes})`).join(',')}`,
      );
      results.push({
        route: route.path,
        name: route.name,
        width,
        status,
        axe: blocking,
        incompleteContrast: contrastIncomplete,
        overflowPx,
        screenshot: path.relative(path.resolve(here, '../../..'), file).replaceAll('\\', '/'),
        errors: routeErrors,
      });
      pageErrors.length = 0;
    } catch (error) {
      console.log(`FAIL ${label}: ${error instanceof Error ? error.message : String(error)}`);
      results.push({ route: route.path, name: route.name, width, error: String(error) });
      failed = true;
      pageErrors.length = 0;
    }
  }
  await context.close();
}

await browser.close();

const summaryPath = path.join(outDir, 'audit.json');
writeFileSync(
  summaryPath,
  JSON.stringify(
    {
      base: BASE,
      generatedAt: new Date().toISOString(),
      widths: WIDTHS,
      routes: routes.length,
      passes: results.filter((r) => (r.errors ?? []).length === 0 && r.error === undefined).length,
      failures: results.filter((r) => (r.errors ?? []).length > 0 || r.error !== undefined).length,
      results,
    },
    null,
    2,
  ),
);

console.log(`\n${results.length} captures · summary: ${path.relative(path.resolve(here, '../../..'), summaryPath)}`);
if (failed) {
  console.log('RESULT FAIL');
  process.exit(1);
}
console.log('RESULT PASS — zero axe violations, no overflow, no page errors.');
