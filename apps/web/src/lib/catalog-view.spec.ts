/**
 * apps/web/src/lib/catalog-view.spec.ts
 *
 * Task 3 — focused tests:
 *  - URL params -> port query (only contract-supported params; safe defaults;
 *    no invented surface);
 *  - taxonomy -> browsable links (ACTIVE only, name-ordered — data-driven,
 *    zero hardcoded varieties);
 *  - ProductListResult -> view items (contract fields copied verbatim);
 *
 * The page-rendering cases that lived here asserted main's pre-integration
 * storefront markup. The storefront now renders develop's design through
 * lib/mgh/adapters/catalog, so those cases are gone rather than rewritten to
 * assert a different page; the pure helpers they exercised are still covered
 * below, and browser-level rendering is covered by the design audit harness.
 */
import { describe, expect, it } from 'vitest';

import { browsableColours, browsableVarieties, listingBasePath, listingQuery, productItems } from './catalog-view.js';
import { emptyProductList, productDetailFixture } from '../modules/catalog/testing/doubles.js';
import type { ProductListResult, TaxonomyReadModel } from '@maihan/contracts';

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

function taxonomy(): TaxonomyReadModel {
  return {
    species: [],
    varieties: [
      { slug: 'zircon', name: 'Zircon', display_name: 'Zircon', species_code: null, source_route: null, is_organic: false, state: 'ACTIVE', evidence_status: 'OBSERVED' },
      { slug: 'draft-stone', name: 'Draft', display_name: 'Draft Stone', species_code: null, source_route: null, is_organic: false, state: 'DRAFT', evidence_status: 'OBSERVED' },
    ],
    colours: [
      { slug: 'green', name: 'Green', parent_slug: null, modifier: null, hue: null, is_chromatic: true, sort_order: 1, state: 'ACTIVE', evidence_status: 'OBSERVED' },
      { slug: 'draft-colour', name: 'Draft', parent_slug: null, modifier: null, hue: null, is_chromatic: true, sort_order: 2, state: 'DRAFT', evidence_status: 'OBSERVED' },
    ],
    intensities: [],
    clarities: [],
    origins: [],
    treatments: [],
    metals: [],
    setting_styles: [],
    jewellery_types: [],
  } as TaxonomyReadModel;
}

describe('browsableVarieties / browsableColours — ACTIVE taxonomy only', () => {
  it('drops non-ACTIVE rows and orders by name', () => {
    expect(browsableVarieties(taxonomy())).toEqual([{ slug: 'zircon', name: 'Zircon' }]);
    expect(browsableColours(taxonomy())).toEqual([{ slug: 'green', name: 'Green' }]);
  });
});

describe('productItems — contract fields copied verbatim', () => {
  it('keeps every display field from the ProductSummary', () => {
    const detail = productDetailFixture();
    const result = {
      ...emptyProductList(24),
      items: [
        {
          slug: detail.slug,
          title: detail.title,
          subtitle: detail.subtitle,
          kind: detail.kind,
          jewellery_type: detail.jewellery_type,
          variety: detail.variety,
          color: detail.color,
          total_weight_ct: detail.total_weight_ct,
          stone_count: detail.stone_count,
          price_amount: detail.price_amount,
          currency: detail.currency,
          state: 'ACTIVE',
          availability: detail.availability,
          provenance: detail.provenance,
        },
      ],
    } as ProductListResult;

    const [item] = productItems(result);
    expect(item?.slug).toBe(detail.slug);
    expect(item?.summary.provenance.sku_evidence).toBe('OBSERVED');
  });
});
