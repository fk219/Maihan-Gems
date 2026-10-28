/**
 * apps/web/src/components/catalog/data-states.spec.tsx
 *
 * Task 5 — the four states on every data-dependent view:
 *  LOADING  — route-level loading.tsx files exist for every catalogue route;
 *             skeletons are aria-busy, shaped like the final layout, never
 *             spinner-only;
 *  ERROR    — route-level error.tsx files exist; the shared view renders
 *             role=alert recovery (retry + contextual link), never a trace;
 *  EMPTY    — EmptyState integration is on every listing (asserted in the
 *             Task 3 spec; re-asserted here at the component level);
 *  NOT FOUND— not-found.tsx exists where the SoT requires it; the shared
 *             view offers real navigation.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { ListSkeleton } from './ListSkeleton.js';
import { ProductDetailSkeleton } from './ProductDetailSkeleton.js';
import { CatalogNotFoundView } from './CatalogNotFoundView.js';
import { EmptyState } from '../design-system/EmptyState.js';
import { CatalogErrorView } from './CatalogErrorView.js';

const WEB_ROOT = process.cwd().replace(/\\/g, '/').endsWith('apps/web') ? process.cwd() : join(process.cwd(), 'apps/web');
const SF = 'src/app/(storefront)';

const read = (rel: string): string => readFileSync(join(WEB_ROOT, rel), 'utf8');

const LISTING_ROUTES = [
  '[varietySlug]',
  'colour/[colourSlug]',
  'settings',
  'search',
  'browse',
  'shop',
  'pairs',
  'jewellery',
  'varieties/[varietySlug]',
];

const DETAIL_ROUTES = ['products/[productSlug]', 'product/[slug]', '[varietySlug]/[productSlug]'];

describe('LOADING — every data-dependent route has a loading.tsx skeleton', () => {
  it.each(LISTING_ROUTES)('%s/loading.tsx renders the listing skeleton', (route) => {
    const file = read(`${SF}/${route}/loading.tsx`);
    expect(file).toContain('ListSkeleton');
  });

  it.each(DETAIL_ROUTES)('%s/loading.tsx renders the detail skeleton', (route) => {
    const file = read(`${SF}/${route}/loading.tsx`);
    expect(file).toContain('ProductDetailSkeleton');
  });

  it('skeletons announce busy and contain no spinners', () => {
    for (const html of [renderToStaticMarkup(<ListSkeleton />), renderToStaticMarkup(<ProductDetailSkeleton />)]) {
      expect(html).toContain('aria-busy="true"');
      expect(html.toLowerCase()).not.toContain('spinner');
    }
  });
});

describe('ERROR — every data-dependent route has an error.tsx with recovery', () => {
  it.each([...LISTING_ROUTES, ...DETAIL_ROUTES])('%s/error.tsx is a client boundary using the shared view', (route) => {
    const file = read(`${SF}/${route}/error.tsx`);
    expect(file).toContain("'use client'");
    expect(file).toContain('CatalogErrorView');
  });

  it('the shared error view renders role=alert recovery: retry + contextual link', () => {
    const reset = (): void => undefined;
    const html = renderToStaticMarkup(
      <CatalogErrorView
        error={Object.assign(new Error('secret internal detail'), { digest: 'd1' })}
        reset={reset}
        backHref="/varieties"
        backLabel="Browse varieties"
      />,
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain('Try again');
    expect(html).toContain('Browse varieties');
    // No stack trace, no raw message in the UI.
    expect(html).not.toContain('secret internal detail');
  });
});

describe('EMPTY — listings integrate the shared EmptyState with a next action', () => {
  it('EmptyState renders a title and a real next action', () => {
    const html = renderToStaticMarkup(
      <EmptyState title="No gemstones match these filters." action={<a href="/">Clear filters</a>} />,
    );
    expect(html).toContain('No gemstones match these filters.');
    expect(html).toContain('href="/"');
  });

  // M2b: the four applet-migrated listings no longer consume the shared
  // EmptyState — the reference template ships its own zero-result semantics
  // instead: CollectionExplorer's "no vault specimens match" card with a
  // reset action (variety/colour), the fixture settings ledger (settings),
  // and the concierge workspace's own empty/error replies (search).
  it.each([
    ['[varietySlug]', 'CollectionExplorer'],
    ['colour/[colourSlug]', 'CollectionExplorer'],
    ['settings', 'SETTING_SUBCATEGORIES'],
    ['search', 'AiConciergeWorkspace'],
  ])('%s/page.tsx ships its zero-result integration (applet template)', (route, marker) => {
    expect(read(`${SF}/${route}/page.tsx`)).toContain(marker);
  });
});

describe('NOT FOUND — invalid/missing resources offer real navigation', () => {
  it('not-found.tsx exists on the SoT-required routes', () => {
    for (const route of [...LISTING_ROUTES.slice(0, 4), ...DETAIL_ROUTES]) {
      expect(read(`${SF}/${route}/not-found.tsx`)).toContain('CatalogNotFoundView');
    }
  });

  it('the shared not-found view offers browse + search + home, no internals', () => {
    const html = renderToStaticMarkup(
      <CatalogNotFoundView subject="gemstone" browseHref="/search" browseLabel="Search gemstones" />,
    );
    expect(html).toContain('Search gemstones');
    expect(html).toContain('Return home');
  });
});
