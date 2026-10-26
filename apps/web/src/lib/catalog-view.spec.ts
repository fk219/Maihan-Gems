/**
 * apps/web/src/lib/catalog-view.spec.ts
 *
 * Task 3 — focused tests:
 *  - URL params -> port query (only contract-supported params; safe defaults;
 *    no invented surface);
 *  - taxonomy -> browsable links (ACTIVE only, name-ordered — data-driven,
 *    zero hardcoded varieties);
 *  - ProductListResult -> view items (contract fields copied verbatim);
 *  - variety + colour + settings pages rendering through the cached service
 *    over the FakeCatalogPort, including the taxonomy-gated not-found path.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('next/headers', () => ({
  headers: async () => new Headers(),
  cookies: async () => ({ get: () => undefined }),
}));
import { StorefrontProvider } from '../components/storefront/StorefrontProvider.js';
import { DEFAULT_FX } from './currency.js';

import { browsableColours, browsableVarieties, listingBasePath, listingQuery, productItems } from './catalog-view.js';
import { setCatalogServiceForTest } from './catalog-server.js';
import { emptyProductList, emptyTaxonomy, FakeCatalogPort } from '../modules/catalog/testing/doubles.js';
import { createCatalogQueryService, MemoryCacheStore, MemoryGenerationStore } from '../modules/catalog/index.js';
import type { ProductListResult, TaxonomyReadModel } from '@maihan/contracts';
import { contractNotFound } from '@maihan/contracts';
import VarietyIndexPage from '../app/(storefront)/[varietySlug]/page.js';
import ColourIndexPage from '../app/(storefront)/colour/[colourSlug]/page.js';
import SettingsIndexPage from '../app/(storefront)/settings/page.js';

afterEach(() => setCatalogServiceForTest(undefined));

function wireService(port: FakeCatalogPort): void {
  setCatalogServiceForTest(
    createCatalogQueryService({
      port,
      store: new MemoryCacheStore(),
      generations: new MemoryGenerationStore(),
      namespace: 't3',
    }),
  );
}

describe('listingQuery — URL params to the Phase 3 port contract', () => {
  it('applies documented defaults (price/asc/24) and no invented params', () => {
    expect(listingQuery({})).toEqual({ sort: 'price', direction: 'asc', limit: 24, filters: {} });
  });

  it('accepts only the port-supported sort keys and direction', () => {
    expect(listingQuery({ sort: 'weight', direction: 'desc' })).toMatchObject({ sort: 'weight', direction: 'desc' });
    expect(listingQuery({ sort: 'nonsense' })).toMatchObject({ sort: 'price' });
  });

  it('clamps limit to the port contract window and passes the cursor through', () => {
    expect(listingQuery({ limit: '500' })).toMatchObject({ limit: 24 });
    expect(listingQuery({ limit: '2', cursor: 'c_abc' })).toMatchObject({ limit: 2, cursor: 'c_abc' });
  });
});

describe('listingBasePath — forward-link base without the cursor', () => {
  it('keeps sort/limit, drops the cursor', () => {
    expect(listingBasePath('/green-tourmaline', { sort: 'weight', cursor: 'c_x' })).toBe('/green-tourmaline?sort=weight');
    expect(listingBasePath('/settings', {})).toBe('/settings');
  });
});

const TAXONOMY: TaxonomyReadModel = {
  ...emptyTaxonomy(),
  varieties: [
    { slug: 'zircon', name: 'Zircon', display_name: 'Zircon', species_code: null, source_route: null, is_organic: false, state: 'ACTIVE', evidence_status: 'OBSERVED' },
    { slug: 'draft-stone', name: 'Draft', display_name: 'Draft', species_code: null, source_route: null, is_organic: false, state: 'DRAFT', evidence_status: 'INFERRED' },
    { slug: 'aquamarine', name: 'Aquamarine', display_name: 'Aquamarine', species_code: null, source_route: null, is_organic: false, state: 'ACTIVE', evidence_status: 'OBSERVED' },
  ],
  colours: [
    { slug: 'green', name: 'Green', parent_slug: null, modifier: null, hue: null, is_chromatic: true, sort_order: 1, state: 'ACTIVE', evidence_status: 'OBSERVED' },
    { slug: 'archived-colour', name: 'Old', parent_slug: null, modifier: null, hue: null, is_chromatic: true, sort_order: 2, state: 'ARCHIVED', evidence_status: 'OBSERVED' },
  ],
};

describe('taxonomy-driven links — no hardcoded varieties', () => {
  it('lists ACTIVE varieties name-ordered and skips DRAFT', () => {
    expect(browsableVarieties(TAXONOMY)).toEqual([
      { slug: 'aquamarine', name: 'Aquamarine' },
      { slug: 'zircon', name: 'Zircon' },
    ]);
  });

  it('lists ACTIVE colours only', () => {
    expect(browsableColours(TAXONOMY)).toEqual([{ slug: 'green', name: 'Green' }]);
  });
});

const SUMMARY_ROW: ProductListResult['items'][number] = {
  slug: 'pave-green-tourmaline-ring',
  title: 'Pave Green Tourmaline Ring 1.28 Ct., 14K White Gold',
  subtitle: null,
  kind: 'CONFIGURED',
  jewellery_type: 'RING',
  variety: { slug: 'green-tourmaline', name: 'Green Tourmaline' },
  color: { slug: 'green', name: 'Green' },
  total_weight_ct: 1.28,
  stone_count: 1,
  price_amount: 975,
  currency: 'USD',
  state: 'ACTIVE',
  availability: true,
  provenance: {
    source_url: 'https://naturalgemstones.com/green-tourmaline/x-k1324',
    source_sku: 'JS1383R14-K1324',
    source_sku_derived: null,
    import_batch: 'stage:canonical-catalog',
    price_evidence: 'OBSERVED',
    sku_evidence: 'OBSERVED',
  },
};

function listResultWith(): ProductListResult {
  return { ...emptyProductList(24), items: [SUMMARY_ROW] };
}

describe('productItems — contract DTO to view item, verbatim fields', () => {
  it('copies the summary fields the card renders; nothing invented', () => {
    const item = productItems(listResultWith())[0]!;
    expect(item).toMatchObject({
      slug: 'pave-green-tourmaline-ring',
      varietyName: 'Green Tourmaline',
      weightCt: 1.28,
      priceAmount: 975,
      currency: 'USD',
      available: true,
    });
    expect(item.summary.provenance.sku_evidence).toBe('OBSERVED');
  });
});

describe('catalog pages — server-rendered through the cached service', () => {
  it('variety page renders the taxonomy-driven listing', async () => {
    const html = renderToStaticMarkup(
      createElement(StorefrontProvider, {
        rates: DEFAULT_FX,
        children: await VarietyIndexPage({
          params: Promise.resolve({ varietySlug: 'zircon' }),
          searchParams: Promise.resolve({}),
        }),
      }),
    );
    expect(html).toContain('Zircon');
    expect(html).toContain('aria-label="Breadcrumb"');
  });

  it('variety page lists captured zircon stones from the research catalog', async () => {
    const html = renderToStaticMarkup(
      createElement(StorefrontProvider, {
        rates: DEFAULT_FX,
        children: await VarietyIndexPage({
          params: Promise.resolve({ varietySlug: 'zircon' }),
          searchParams: Promise.resolve({}),
        }),
      }),
    );
    expect(html).toMatch(/Zircon/i);
    // 2026-10-22: the dev DB now carries ACTIVE zircon products (K10379/K10381),
    // so the page serves the DB listing path ("Refine" toolbar) rather than the
    // NGC fixture path ("Filter"). Assert on the data-truth markers both paths
    // share: a real product card price and the collection facet nav.
    expect(html).toMatch(/USD [0-9]+\.[0-9]{2}/);
    expect(html).toContain('aria-label="Collection facets"');
  });

  it('variety page rejects an unknown or DRAFT variety (taxonomy-gated)', async () => {
    const port = new FakeCatalogPort();
    port.setTaxonomy(TAXONOMY);
    wireService(port);

    await expect(
      VarietyIndexPage({
        params: Promise.resolve({ varietySlug: 'draft-stone' }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404'); // notFound()
  });

  it('colour page renders a known ACTIVE colour', async () => {
    const port = new FakeCatalogPort();
    port.setProductList(listResultWith());
    port.setTaxonomy(TAXONOMY);
    wireService(port);

    const html = renderToStaticMarkup(
      await ColourIndexPage({
        params: Promise.resolve({ colourSlug: 'green' }),
        searchParams: Promise.resolve({}),
      }),
    );
    expect(html).toContain('<h1>Green Gemstones</h1>');
    expect(html).toContain('Pave Green Tourmaline Ring');
  });

  it('settings page renders design summaries from the settings contract', async () => {
    const port = new FakeCatalogPort();
    port.setSettingList({
      ...emptyProductList(24),
      items: [
        {
          design_code: 'JS1409',
          name: 'Solitaire Setting',
          jewellery_type: 'RING',
          style: { code: 'solitaire', label: 'Solitaire' },
          is_vedic: false,
          side_stone_count: 0,
          variant_count: 6,
          state: 'ACTIVE',
          provenance: { source_url: 'https://naturalgemstones.com/gemstone-ring-settings/js1409', evidence_status: 'OBSERVED', import_batch: 'stage:canonical-catalog' },
        },
      ],
    } as never);
    wireService(port);

    const html = renderToStaticMarkup(
      createElement(StorefrontProvider, {
        rates: DEFAULT_FX,
        children: await SettingsIndexPage({ searchParams: Promise.resolve({}) }),
      }),
    );
    expect(html).toContain('Ring settings');
    expect(html).toContain('Solitaire');
  });

  it('unknown variety slugs 404', async () => {
    await expect(
      VarietyIndexPage({
        params: Promise.resolve({ varietySlug: 'not-a-real-stone-xyz' }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
  });
});

void contractNotFound;
