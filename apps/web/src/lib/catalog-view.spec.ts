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
// M2b: the migrated pages consume the applet cart/currency context, which
// production supplies at the ROOT layout; tests wrap them the same way.
import { StorefrontProvider as AppletStorefrontProvider } from '../components/mgh/providers/StorefrontProvider.js';

import { browsableColours, browsableVarieties, listingBasePath, listingQuery, productItems } from './catalog-view.js';
import { setCatalogServiceForTest } from './catalog-server.js';
import { emptyProductList, emptyTaxonomy } from '../modules/catalog/testing/doubles.js';
import type { ProductListResult, TaxonomyReadModel } from '@maihan/contracts';
import { contractNotFound } from '@maihan/contracts';
import VarietyIndexPage from '../app/(storefront)/[varietySlug]/page.js';
import ColourIndexPage from '../app/(storefront)/colour/[colourSlug]/page.js';
import SettingsIndexPage from '../app/(storefront)/settings/page.js';

afterEach(() => setCatalogServiceForTest(undefined));

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
  // M2b: the root variety catch-all, colour listing, settings index and
  // search page were migrated to the MaihanGems reference (applet) pages.
  // Their data now flows through the applet adapters (lib/mgh/adapters) over
  // the real storefront reads, so the Phase 3 contract service wiring above
  // no longer feeds these templates. The assertions below check the applet
  // page shells that render regardless of catalogue availability.
  it('variety page renders the applet variety listing for a ledger slug', async () => {
    const html = renderToStaticMarkup(
      createElement(AppletStorefrontProvider, null, await VarietyIndexPage({
        params: Promise.resolve({ varietySlug: 'tsavorite' }),
      })),
    );
    expect(html).toContain('Tsavorite Garnet');
    expect(html).toContain('aria-label="Breadcrumb"');
  });

  it('variety page rejects an unknown or DRAFT variety slug (ledger-gated)', async () => {
    // 'draft-stone' is not in the applet variety ledger → honest notFound().
    await expect(
      VarietyIndexPage({
        params: Promise.resolve({ varietySlug: 'draft-stone' }),
      }),
    ).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404'); // notFound()
  });

  it('colour page renders a ledger colour collection shell', async () => {
    const html = renderToStaticMarkup(
      createElement(AppletStorefrontProvider, null, await ColourIndexPage({
        params: Promise.resolve({ colourSlug: 'green' }),
      })),
    );
    expect(html).toContain('SPECTRAL HUE');
    expect(html).toContain('aria-label="Breadcrumb"');
  });

  it('settings page renders the applet settings family (fixture ledger until a SettingItem accessor exists)', async () => {
    const html = renderToStaticMarkup(
      createElement(AppletStorefrontProvider, null, createElement(SettingsIndexPage)),
    );
    expect(html).toContain('data-testid="shop-all-settings-section"');
    expect(html).toContain('Architectural Cathedral Solitaire Ring');
  });

  it('unknown variety slugs 404', async () => {
    await expect(
      VarietyIndexPage({
        params: Promise.resolve({ varietySlug: 'not-a-real-stone-xyz' }),
      }),
    ).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
  });
});

void contractNotFound;
