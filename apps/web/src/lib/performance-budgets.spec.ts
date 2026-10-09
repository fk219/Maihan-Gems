/**
 * apps/web/src/lib/performance-budgets.spec.ts
 *
 * Task 10 — the budget CONFIGURATION and the checker's fail-closed contract.
 *
 * The real measurement runs against a production build (CI runs the script
 * after `next build`). These tests pin the parts that must never drift:
 *  - the budgets are the SoT 12.11 values VERBATIM (170/190 KB gzip) —
 *    a lowered threshold here would silently weaken the gate;
 *  - the two enforced routes are the representative category and product
 *    templates the plan requires;
 *  - the checker script exists and is wired as a runnable script.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const webRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const config = JSON.parse(readFileSync(join(webRoot, 'performance-budgets.json'), 'utf8')) as {
  source: string;
  budgets: Array<{ label: string; route: string; maxInitialJsGzipKb: number }>;
};

describe('performance-budgets.json — SoT 12.11 verbatim', () => {
  it('cites its authority', () => {
    expect(config.source).toContain('12.11');
  });

  it('enforces the two representative templates at the SoT budgets (no lowered threshold)', () => {
    expect(config.budgets).toHaveLength(2);
    const category = config.budgets.find((b) => b.label === 'category page');
    const product = config.budgets.find((b) => b.label === 'product page');
    expect(category, 'category template must be enforced').toBeDefined();
    expect(product, 'product template must be enforced').toBeDefined();
    expect(category?.route).toBe('(storefront)/[varietySlug]');
    expect(product?.route).toBe('(storefront)/products/[productSlug]');
    // SoT 12.11 verbatim. If this fails, someone changed the threshold —
    // that requires a source-of-truth change, not a config edit.
    expect(category?.maxInitialJsGzipKb).toBe(170);
    expect(product?.maxInitialJsGzipKb).toBe(190);
  });

  it('routes exist in the route manifest (the enforced templates are real routes)', () => {
    // Both routes are App Router pages under src/app; their dynamic-segment
    // folders must exist on disk.
    expect(existsSync(join(webRoot, 'src/app/(storefront)/[varietySlug]/page.tsx'))).toBe(true);
    expect(existsSync(join(webRoot, 'src/app/(storefront)/products/[productSlug]/page.tsx'))).toBe(true);
  });
});

describe('budget checker script — wired and fail-closed by contract', () => {
  const script = join(webRoot, 'scripts/check-bundle-budgets.mjs');

  it('exists and is executable-facing (a real script, not a stub)', () => {
    expect(existsSync(script)).toBe(true);
    const src = readFileSync(script, 'utf8');
    expect(src).toContain('process.exit');
    expect(src).toContain('gzipSync');
    expect(src).toContain('rootMainFiles');
    expect(src).toContain('page_client-reference-manifest.js');
  });

  it('fails closed: a missing build and a missing chunk are errors, not skips', () => {
    const src = readFileSync(script, 'utf8');
    expect(src).toContain('no production build found');
    expect(src).toContain('not on disk');
  });

  it('does not claim an LCP pass (bundle checks cannot measure real-user LCP)', () => {
    const src = readFileSync(script, 'utf8');
    expect(src).toContain('NOT measurable');
  });
});
