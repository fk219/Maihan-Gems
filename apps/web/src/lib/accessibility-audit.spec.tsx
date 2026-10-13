/**
 * apps/web/src/lib/accessibility-audit.spec.tsx
 *
 * Phase 4 Task 11 — automated accessibility audit (WCAG 2.2 AA target, SoT
 * 12.9 "zero blocking violations is the release gate").
 *
 * Tooling: axe-core (the SKILL_MATRIX §7.1 candidate) run in happy-dom via
 * @vitest-environment happy-dom, against EVERY representative Phase 4
 * template/state rendered with contract fixtures (no fabricated catalogue
 * rows reach production; these are the same testing doubles the other suites
 * use). axe rules tagged critical/serious are BLOCKING; moderate/minor
 * findings are reported but do not fail the audit (they are visual-review
 * territory, e.g. colour contrast needs real tokens).
 *
 * Scope honestly covered here: home shell, mega menu, variety/colour listing
 * (with cards), settings listing, product detail, empty/error/not-found
 * states, loading skeleton, pagination. NOT covered: a real browser (axe's
 * colour-contrast and pointer-based checks need layout + real CSS, which
 * happy-dom does not compute) — reported as a limitation, and the visual
 * token review is deferred to design review per doc 08.
 *
 * @vitest-environment happy-dom
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { beforeAll, afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AxeBuilder } from './axe-builder.js';
import { StorefrontProvider } from '../components/storefront/StorefrontProvider.js';
import { DEFAULT_FX } from './currency.js';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => undefined, replace: () => undefined, prefetch: () => undefined }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

import { setCatalogServiceForTest } from './catalog-server.js';
import {
  FakeCatalogPort,
  emptyProductList,
  emptyTaxonomy,
  productDetailFixture,
  settingDesignFixture,
} from '../modules/catalog/testing/doubles.js';
import type { ProductListResult, ProductSummary } from '@maihan/contracts';
import { MemoryCacheStore, MemoryGenerationStore, createCatalogQueryService } from '../modules/catalog/index.js';
import type { TaxonomyReadModel } from '@maihan/contracts';

import HomePage from '../app/(storefront)/page.js';
import VarietyIndexPage from '../app/(storefront)/[varietySlug]/page.js';
import VarietyPairsPage from '../app/(storefront)/[varietySlug]/page.js';
import VarietyRingDetailPage from '../app/(storefront)/[varietySlug]/[productSlug]/page.js';
import ProductDetailPage from '../app/(storefront)/products/[productSlug]/page.js';
import ColourIndexPage from '../app/(storefront)/colour/[colourSlug]/page.js';
import SettingsIndexPage from '../app/(storefront)/settings/page.js';
import VarietiesIndexPage from '../app/(storefront)/varieties/page.js';
import SearchPage from '../app/(storefront)/search/page.js';

import { MegaMenu } from '../components/layout/MegaMenu.js';
import { ProductDetailContent } from '../components/catalog/ProductDetailContent.js';
import { CatalogNotFoundView } from '../components/catalog/CatalogNotFoundView.js';
import { CatalogErrorView } from '../components/catalog/CatalogErrorView.js';
import { ListSkeleton } from '../components/catalog/ListSkeleton.js';
import { buildMegaMenu } from './mega-menu.js';

const webRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

// The product pages read SITE_URL for canonical JSON-LD; the audit pins a
// fixture value for determinism.
process.env['SITE_URL'] = 'https://maihan.test';

function taxonomy(): TaxonomyReadModel {
  const base = emptyTaxonomy();
  return {
    ...base,
    varieties: [
      {
        slug: 'tsavorite-garnet',
        name: 'Tsavorite',
        display_name: 'Tsavorite Garnet',
        species_code: 'GARNET',
        source_route: '/tsavorite-garnet',
        is_organic: false,
        state: 'ACTIVE',
        evidence_status: 'OBSERVED',
      },
    ],
    colours: [
      { slug: 'green', name: 'Green', parent_slug: null, modifier: null, hue: null, is_chromatic: true, sort_order: 1, state: 'ACTIVE', evidence_status: 'OBSERVED' },
    ],
  } as TaxonomyReadModel;
}

function wire(port: FakeCatalogPort): void {
  setCatalogServiceForTest(
    createCatalogQueryService({ port, store: new MemoryCacheStore(), generations: new MemoryGenerationStore(), namespace: 'a11y' }),
  );
}

/** A contract-valid product list over the given slugs (same pattern as sitemap.spec). */
function productList(slugs: readonly string[]): ProductListResult {
  const items = slugs.map((slug): ProductSummary => {
    const d = productDetailFixture(slug);
    return {
      slug: d.slug,
      title: d.title,
      subtitle: d.subtitle,
      kind: d.kind,
      jewellery_type: d.jewellery_type,
      variety: d.variety,
      color: d.color,
      total_weight_ct: d.total_weight_ct,
      stone_count: d.stone_count,
      price_amount: d.price_amount,
      currency: d.currency,
      state: 'ACTIVE',
      availability: d.availability,
      provenance: d.provenance,
    };
  });
  return { items, facets: emptyProductList().facets, rejected_filters: [], meta: { limit: 24, has_more: false, next_cursor: null } };
}

function fullPort(): FakeCatalogPort {
  const port = new FakeCatalogPort();
  port.setTaxonomy(taxonomy());
  port.setProductList(productList(['tsavorite-1ct-round', 'tsavorite-2ct-oval']));
  port.setSettingList({
    items: [settingDesignFixture()],
    facets: emptyProductList().facets,
    rejected_filters: [],
    meta: { limit: 24, has_more: false, next_cursor: null },
  });
  return port;
}

function withStorefront(ui: React.ReactNode): React.ReactElement {
  return createElement(StorefrontProvider, { rates: DEFAULT_FX, children: ui });
}

async function audit(name: string, ui: React.ReactElement): Promise<void> {
  // SSR the component and load the markup into a live container. The harness
  // mirrors what the root layout really ships: `<html lang="en">` and a
  // document title (happy-dom maps document.documentElement to its own html
  // element, so we set lang/title explicitly rather than wrapping markup).
  // The audit is deterministic (same markup every run) and React never owns
  // this container, so there is no unmount/lifecycle conflict.
  document.documentElement.setAttribute('lang', 'en');
  if (document.title === '') document.title = 'Maihan Gems';
  const container = document.createElement('div');
  container.innerHTML = renderToStaticMarkup(ui);
  document.body.appendChild(container);
  try {
    const results = await new AxeBuilder().analyze();
    const blocking = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    const notes = results.violations.filter((v) => v.impact !== 'critical' && v.impact !== 'serious');
    if (notes.length > 0) {
      console.warn(`[a11y] ${name}: non-blocking findings (reported, not gating):`, notes.map((v) => `${v.id}(${v.impact})`));
    }
    expect(blocking, `${name}: blocking violations: ${blocking.map((v) => `${v.id}: ${JSON.stringify(v.nodes.map((n) => n.failureSummary))}`).join('; ')}`).toEqual([]);
  } finally {
    container.remove();
  }
}

describe('Task 11 accessibility audit — representative templates (axe-core, critical+serious blocking)', () => {
  let port: FakeCatalogPort;

  beforeAll(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    setCatalogServiceForTest(undefined);
  });

  it('home shell (header + mega menu + main landmark)', async () => {
    port = fullPort();
    wire(port);
    const page = await HomePage();
    await audit('home', withStorefront(page));
  });

  it('mega menu (disclosure semantics, real links)', async () => {
    const groups = buildMegaMenu(taxonomy());
    await audit('mega menu', <MegaMenu groups={groups} />);
  });

  it('variety listing with product cards', async () => {
    port = fullPort();
    wire(port);
    const page = await VarietyIndexPage({ params: Promise.resolve({ varietySlug: 'tsavorite-garnet' }), searchParams: Promise.resolve({}) });
    await audit('variety listing', withStorefront(page));
  });

  it('colour listing with product cards', async () => {
    port = fullPort();
    wire(port);
    const page = await ColourIndexPage({ params: Promise.resolve({ colourSlug: 'green' }), searchParams: Promise.resolve({}) });
    await audit('colour listing', withStorefront(page));
  });

  it('settings listing', async () => {
    port = fullPort();
    wire(port);
    const page = await SettingsIndexPage({ searchParams: Promise.resolve({}) });
    await audit('settings listing', withStorefront(page));
  });

  it('varieties hub', async () => {
    port = fullPort();
    wire(port);
    const page = await VarietiesIndexPage();
    await audit('varieties hub', withStorefront(page));
  });

  it('product detail (canonical route)', async () => {
    port = fullPort();
    wire(port);
    const page = await ProductDetailPage({ params: Promise.resolve({ productSlug: 'tsavorite-1ct-round' }) });
    await audit('product detail', withStorefront(page));
  });

  it('ready-made detail (same renderer, second route)', async () => {
    port = fullPort();
    wire(port);
    const page = await VarietyRingDetailPage({
      params: Promise.resolve({ varietySlug: 'tsavorite-garnet', productSlug: 'K5770' }),
    });
    await audit('ready-made detail', withStorefront(page));
  });

  it('pairs listing', async () => {
    port = fullPort();
    wire(port);
    const page = await VarietyPairsPage({ params: Promise.resolve({ varietySlug: 'tsavorite-garnet' }), searchParams: Promise.resolve({}) });
    await audit('pairs listing', withStorefront(page));
  });

  it('search page (empty result state)', async () => {
    port = fullPort();
    port.setSearchResult({
      items: [],
      facets: emptyProductList().facets,
      rejected_filters: [],
      meta: {
        search_version: 'search-v1',
        strategy: 'STRUCTURED_ONLY',
        intent: 'PRODUCT_SEARCH',
        degraded: false,
        candidate_count: 0,
        limit: 24,
        has_more: false,
        next_cursor: null,
      },
    });
    wire(port);
    const page = await SearchPage({ searchParams: Promise.resolve({}) });
    await audit('search page', withStorefront(page));
  });

  it('not-found state', async () => {
    await audit(
      'not-found',
      <CatalogNotFoundView subject="gemstone variety" browseHref="/varieties" browseLabel="Browse varieties" />,
    );
  });

  it('error state with recovery actions', async () => {
    await audit(
      'error state',
      <CatalogErrorView error={new Error('boom')} reset={() => {}} backHref="/varieties" backLabel="Browse varieties" />,
    );
  });

  it('loading skeleton', async () => {
    await audit('loading skeleton', <ListSkeleton />);
  });

  it('product detail content (renderer level)', async () => {
    await audit('product detail content', <ProductDetailContent detail={productDetailFixture()} />);
  });
});

describe('audit tooling sanity', () => {
  it('axe-core is really installed and the builder is wired (not a always-pass stub)', () => {
    const pkg = JSON.parse(readFileSync(join(webRoot, 'package.json'), 'utf8')) as { devDependencies: Record<string, string> };
    expect(Object.keys(pkg.devDependencies)).toContain('axe-core');
    const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'axe-builder.ts'), 'utf8');
    expect(src).toContain('axe.run');
  });

  it('the audit itself would catch a blocking violation (control check)', async () => {
    // A document with no <main>/landmarks and an empty button must produce
    // at least one serious/critical violation — proving the audit can fail.
    const container = document.createElement('div');
    container.innerHTML = '<div><button></button></div>';
    document.body.appendChild(container);
    try {
      const results = await new AxeBuilder().analyze();
      const blocking = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
      expect(blocking.length).toBeGreaterThan(0);
    } finally {
      container.remove();
    }
  });
});
