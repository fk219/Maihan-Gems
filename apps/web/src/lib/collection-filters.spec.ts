import { describe, expect, it } from 'vitest';

import {
  applyCatalogFilters,
  emptyFilterState,
  facetsFromProducts,
} from './collection-filters.js';
import type { StorefrontCard } from './storefront-types.js';

function card(partial: Partial<StorefrontCard> & Pick<StorefrontCard, 'id' | 'title'>): StorefrontCard {
  return {
    sku: partial.id,
    slug: partial.id,
    kind: 'gemstone',
    description: null,
    priceUsd: 1000,
    stoneType: 'sapphire',
    variety: null,
    caratTotal: 1,
    shape: 'cushion',
    colorHue: 'blue',
    originCountry: 'Sri Lanka',
    treatment: 'no_enhancement',
    quantityType: 'single',
    jewelryType: null,
    settingFor: null,
    style: null,
    metalType: null,
    metalColor: null,
    imageUrl: null,
    vendorName: null,
    certificateLab: 'GIA',
    ...partial,
  };
}

describe('collection-filters', () => {
  const products = [
    card({ id: 'a', title: 'Blue cushion', priceUsd: 2000, caratTotal: 2, shape: 'cushion', colorHue: 'blue' }),
    card({ id: 'b', title: 'Pink oval', priceUsd: 800, caratTotal: 0.8, shape: 'oval', colorHue: 'pink', originCountry: 'Madagascar', treatment: 'heated', certificateLab: 'GRS' }),
    card({ id: 'c', title: 'Yellow pear', priceUsd: 1500, caratTotal: 1.5, shape: 'pear', colorHue: 'yellow' }),
  ];

  it('builds facets from the collection', () => {
    const facets = facetsFromProducts(products);
    expect(facets.shapes).toEqual(['cushion', 'oval', 'pear']);
    expect(facets.colours).toEqual(['blue', 'pink', 'yellow']);
    expect(facets.carat.min).toBe(0.8);
    expect(facets.price.max).toBe(2000);
  });

  it('filters by shape, colour and price', () => {
    const state = emptyFilterState(facetsFromProducts(products));
    state.shapes = ['oval'];
    expect(applyCatalogFilters(products, state).map((p) => p.id)).toEqual(['b']);

    const byColour = emptyFilterState(facetsFromProducts(products));
    byColour.colours = ['blue'];
    expect(applyCatalogFilters(products, byColour).map((p) => p.id)).toEqual(['a']);

    const byPrice = emptyFilterState(facetsFromProducts(products));
    byPrice.maxPrice = 1000;
    expect(applyCatalogFilters(products, byPrice).map((p) => p.id)).toEqual(['b']);
  });

  it('sorts by carat descending', () => {
    const state = emptyFilterState(facetsFromProducts(products));
    state.sort = 'carat-desc';
    expect(applyCatalogFilters(products, state).map((p) => p.id)).toEqual(['a', 'c', 'b']);
  });
});
