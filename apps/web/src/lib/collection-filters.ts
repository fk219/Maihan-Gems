import type { StorefrontCard } from './storefront-types.js';

export type CatalogSort = 'price-desc' | 'price-asc' | 'carat-desc' | 'title-asc';
export type CatalogView = 'grid' | 'list';

export interface CatalogFilterState {
  shapes: string[];
  colours: string[];
  origins: string[];
  treatments: string[];
  labs: string[];
  minCarat: number;
  maxCarat: number;
  minPrice: number;
  maxPrice: number;
  sort: CatalogSort;
  view: CatalogView;
}

export interface CatalogFacets {
  shapes: string[];
  colours: string[];
  origins: string[];
  treatments: string[];
  labs: string[];
  carat: { min: number; max: number };
  price: { min: number; max: number };
}

function label(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.replace(/_/g, ' ').trim();
  return trimmed.length > 0 ? trimmed : null;
}

function unique(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  for (const value of values) {
    const next = label(value);
    if (next) seen.add(next);
  }
  return [...seen].sort((a, b) => a.localeCompare(b));
}

export function emptyFilterState(facets: CatalogFacets): CatalogFilterState {
  return {
    shapes: [],
    colours: [],
    origins: [],
    treatments: [],
    labs: [],
    minCarat: facets.carat.min,
    maxCarat: facets.carat.max,
    minPrice: facets.price.min,
    maxPrice: facets.price.max,
    sort: 'price-desc',
    view: 'grid',
  };
}

export function facetsFromProducts(products: readonly StorefrontCard[]): CatalogFacets {
  const carats = products.map((p) => p.caratTotal).filter((n): n is number => n != null && n > 0);
  const prices = products.map((p) => p.priceUsd).filter((n) => Number.isFinite(n) && n > 0);
  return {
    shapes: unique(products.map((p) => p.shape)),
    colours: unique(products.map((p) => p.colorHue)),
    origins: unique(products.map((p) => p.originCountry)),
    treatments: unique(products.map((p) => p.treatment)),
    labs: unique(products.map((p) => p.certificateLab)),
    carat: {
      min: carats.length ? Math.floor(Math.min(...carats) * 10) / 10 : 0,
      max: carats.length ? Math.ceil(Math.max(...carats) * 10) / 10 : 0,
    },
    price: {
      min: prices.length ? Math.floor(Math.min(...prices)) : 0,
      max: prices.length ? Math.ceil(Math.max(...prices)) : 0,
    },
  };
}

function selected(haystack: string | null | undefined, needles: string[]): boolean {
  if (needles.length === 0) return true;
  const value = label(haystack);
  if (!value) return false;
  return needles.some((n) => n.toLowerCase() === value.toLowerCase());
}

export function applyCatalogFilters(
  products: readonly StorefrontCard[],
  state: CatalogFilterState,
): StorefrontCard[] {
  const filtered = products.filter((product) => {
    if (!selected(product.shape, state.shapes)) return false;
    if (!selected(product.colorHue, state.colours)) return false;
    if (!selected(product.originCountry, state.origins)) return false;
    if (!selected(product.treatment, state.treatments)) return false;
    if (!selected(product.certificateLab, state.labs)) return false;
    if (product.caratTotal != null) {
      if (product.caratTotal < state.minCarat || product.caratTotal > state.maxCarat) return false;
    }
    if (product.priceUsd < state.minPrice || product.priceUsd > state.maxPrice) return false;
    return true;
  });

  const sorted = [...filtered];
  sorted.sort((a, b) => {
    if (state.sort === 'price-asc') return a.priceUsd - b.priceUsd;
    if (state.sort === 'carat-desc') return (b.caratTotal ?? 0) - (a.caratTotal ?? 0);
    if (state.sort === 'title-asc') return a.title.localeCompare(b.title);
    return b.priceUsd - a.priceUsd;
  });
  return sorted;
}
