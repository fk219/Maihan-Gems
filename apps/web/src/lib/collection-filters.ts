import type { StorefrontCard } from './storefront-types.js';

export type CatalogSort = 'price-desc' | 'price-asc' | 'carat-desc' | 'title-asc';
export type CatalogView = 'grid' | 'list';

export interface FacetValue {
  value: string;
  count: number;
}

export const CARAT_BUCKETS = [
  { id: 'le1', label: '≤ 1 ct', min: 0, max: 1 },
  { id: '1-3', label: '1–3 ct', min: 1, max: 3 },
  { id: '3-5', label: '3–5 ct', min: 3, max: 5 },
  { id: '5-10', label: '5–10 ct', min: 5, max: 10 },
  { id: '10-30', label: '10–30 ct', min: 10, max: 30 },
  { id: '30-50', label: '30–50 ct', min: 30, max: 50 },
  { id: '50-100', label: '50–100 ct', min: 50, max: 100 },
  { id: '100+', label: '100+ ct', min: 100, max: Number.POSITIVE_INFINITY },
] as const;

export interface CatalogFilterState {
  shapes: string[];
  colours: string[];
  intensities: string[];
  clarities: string[];
  cuts: string[];
  cuttingStyles: string[];
  origins: string[];
  treatments: string[];
  labs: string[];
  metals: string[];
  availabilities: string[];
  caratBuckets: string[];
  minCarat: number;
  maxCarat: number;
  minLength: number;
  maxLength: number;
  minWidth: number;
  maxWidth: number;
  minPrice: number;
  maxPrice: number;
  sort: CatalogSort;
  view: CatalogView;
}

export interface CatalogFacets {
  shapes: FacetValue[];
  colours: FacetValue[];
  intensities: FacetValue[];
  clarities: FacetValue[];
  cuts: FacetValue[];
  cuttingStyles: FacetValue[];
  origins: FacetValue[];
  treatments: FacetValue[];
  labs: FacetValue[];
  metals: FacetValue[];
  availabilities: FacetValue[];
  caratBuckets: FacetValue[];
  carat: { min: number; max: number };
  length: { min: number; max: number };
  width: { min: number; max: number };
  price: { min: number; max: number };
}

function label(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.replace(/_/g, ' ').trim();
  return trimmed.length > 0 ? trimmed : null;
}

function tally(values: Array<string | null | undefined>): FacetValue[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    const next = label(value);
    if (!next) continue;
    counts.set(next, (counts.get(next) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => a.value.localeCompare(b.value));
}

function span(values: number[]): { min: number; max: number } {
  if (values.length === 0) return { min: 0, max: 0 };
  return { min: Math.floor(Math.min(...values) * 10) / 10, max: Math.ceil(Math.max(...values) * 10) / 10 };
}

export function emptyFilterState(facets: CatalogFacets): CatalogFilterState {
  return {
    shapes: [],
    colours: [],
    intensities: [],
    clarities: [],
    cuts: [],
    cuttingStyles: [],
    origins: [],
    treatments: [],
    labs: [],
    metals: [],
    availabilities: [],
    caratBuckets: [],
    minCarat: facets.carat.min,
    maxCarat: facets.carat.max,
    minLength: facets.length.min,
    maxLength: facets.length.max,
    minWidth: facets.width.min,
    maxWidth: facets.width.max,
    minPrice: facets.price.min,
    maxPrice: facets.price.max,
    sort: 'price-desc',
    view: 'grid',
  };
}

export function facetsFromProducts(products: readonly StorefrontCard[]): CatalogFacets {
  const carats = products.map((p) => p.caratTotal).filter((n): n is number => n != null && n > 0);
  const lengths = products.map((p) => p.lengthMm).filter((n): n is number => n != null && n > 0);
  const widths = products.map((p) => p.widthMm).filter((n): n is number => n != null && n > 0);
  const prices = products.map((p) => p.priceUsd).filter((n) => Number.isFinite(n) && n > 0);
  return {
    shapes: tally(products.map((p) => p.shape)),
    colours: tally(products.map((p) => p.colorHue)),
    intensities: tally(products.map((p) => p.colorIntensity)),
    clarities: tally(products.map((p) => p.clarity)),
    cuts: tally(products.map((p) => p.cut)),
    cuttingStyles: tally(products.map((p) => p.cuttingStyle)),
    origins: tally(products.map((p) => p.originCountry)),
    treatments: tally(products.map((p) => p.treatment)),
    labs: tally(products.map((p) => p.certificateLab)),
    metals: tally(products.map((p) => p.metalType)),
    availabilities: tally(products.map((p) => p.availability)),
    caratBuckets: CARAT_BUCKETS.map((bucket) => ({
      value: bucket.id,
      count: products.filter((product) => {
        const carat = product.caratTotal;
        if (carat == null) return false;
        return carat >= bucket.min && carat < (bucket.max === Number.POSITIVE_INFINITY ? Number.POSITIVE_INFINITY : bucket.max + 0.0001);
      }).length,
    })).filter((row) => row.count > 0),
    carat: span(carats),
    length: span(lengths),
    width: span(widths),
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

function inRange(value: number | null | undefined, min: number, max: number, facet: { min: number; max: number }): boolean {
  if (value == null) return true;
  if (min === facet.min && max === facet.max) return true;
  return value >= min && value <= max;
}

export function applyCatalogFilters(
  products: readonly StorefrontCard[],
  state: CatalogFilterState,
  facets?: CatalogFacets,
): StorefrontCard[] {
  const bounds = facets ?? facetsFromProducts(products);
  const filtered = products.filter((product) => {
    if (!selected(product.shape, state.shapes)) return false;
    if (!selected(product.colorHue, state.colours)) return false;
    if (!selected(product.colorIntensity, state.intensities)) return false;
    if (!selected(product.clarity, state.clarities)) return false;
    if (!selected(product.cut, state.cuts)) return false;
    if (!selected(product.cuttingStyle, state.cuttingStyles)) return false;
    if (!selected(product.originCountry, state.origins)) return false;
    if (!selected(product.treatment, state.treatments)) return false;
    if (!selected(product.certificateLab, state.labs)) return false;
    if (!selected(product.metalType, state.metals)) return false;
    if (!selected(product.availability, state.availabilities)) return false;
    if (state.caratBuckets.length > 0) {
      const carat = product.caratTotal;
      if (carat == null) return false;
      const hit = CARAT_BUCKETS.some(
        (bucket) => state.caratBuckets.includes(bucket.id) && carat >= bucket.min && carat < bucket.max + (bucket.max === Number.POSITIVE_INFINITY ? 1 : 0.0001),
      );
      if (!hit) return false;
    }
    if (!inRange(product.caratTotal, state.minCarat, state.maxCarat, bounds.carat)) return false;
    if (!inRange(product.lengthMm, state.minLength, state.maxLength, bounds.length)) return false;
    if (!inRange(product.widthMm, state.minWidth, state.maxWidth, bounds.width)) return false;
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
