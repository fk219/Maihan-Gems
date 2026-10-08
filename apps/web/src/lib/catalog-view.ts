/**
 * apps/web/src/lib/catalog-view.ts
 *
 * Pure view-model helpers for the catalogue pages (Task 3/4).
 *
 * These functions are the ONLY place that translates between the URL world
 * (searchParams) and the Phase 3 port contract, and between contract DTOs
 * and display view models. They are pure, deterministic and unit-tested; the
 * pages stay thin. No invented fields: every view-model field is copied from
 * the contract DTO it came from.
 */
import type { ProductListQuery, ProductListResult, ProductSummary, TaxonomyReadModel } from '@maihan/contracts';

// ─── URL -> port query ───────────────────────────────────────────────────────

const SORT_KEYS = new Set(['price', 'weight', 'recency']);

/**
 * The URL contract for catalogue listings. Deliberately minimal: only the
 * parameters the Phase 3 port actually accepts (sort, direction, cursor,
 * limit). Anything else is ignored here — inventing query params would
 * fabricate API surface.
 */
export interface ListingParams {
  readonly sort?: string;
  readonly direction?: string;
  readonly cursor?: string;
  readonly limit?: string;
}

export function listingQuery(params: ListingParams): ProductListQuery {
  const sort = params.sort !== undefined && SORT_KEYS.has(params.sort) ? params.sort : 'price';
  const direction = params.direction === 'desc' ? 'desc' : 'asc';
  const limitRaw = Number(params.limit);
  const limit = Number.isInteger(limitRaw) && limitRaw >= 1 && limitRaw <= 100 ? limitRaw : 24;
  return {
    sort: sort as ProductListQuery['sort'],
    direction: direction as ProductListQuery['direction'],
    limit,
    ...(params.cursor !== undefined && params.cursor !== '' ? { cursor: params.cursor } : {}),
    filters: {},
  };
}

/** Base path + params minus the cursor, for Pagination's forward link. */
export function listingBasePath(pathname: string, params: ListingParams): string {
  const search = new URLSearchParams();
  if (params.sort !== undefined) search.set('sort', params.sort);
  if (params.direction !== undefined) search.set('direction', params.direction);
  if (params.limit !== undefined) search.set('limit', params.limit);
  const qs = search.toString();
  return qs === '' ? pathname : `${pathname}?${qs}`;
}

// ─── Taxonomy -> display ─────────────────────────────────────────────────────

export interface VarietyLink {
  readonly slug: string;
  readonly name: string;
}

/** Varieties that are actually browsable (ACTIVE, not DRAFT/ARCHIVED), name-ordered. */
export function browsableVarieties(taxonomy: TaxonomyReadModel): VarietyLink[] {
  return taxonomy.varieties
    .filter((v) => v.state === 'ACTIVE')
    .map((v) => ({ slug: v.slug, name: v.display_name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Chromatic colour families that back a /colour/{slug} route. */
export function browsableColours(taxonomy: TaxonomyReadModel): VarietyLink[] {
  return taxonomy.colours
    .filter((c) => c.state === 'ACTIVE')
    .map((c) => ({ slug: c.slug, name: c.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// ─── Result -> display ───────────────────────────────────────────────────────

export interface ProductListItem {
  readonly slug: string;
  readonly title: string;
  readonly subtitle: string | null;
  readonly kind: ProductSummary['kind'];
  readonly varietyName: string | null;
  readonly weightCt: number | null;
  readonly priceAmount: number;
  readonly currency: string;
  readonly available: boolean;
  /** Full contract summary — the card renders from this verbatim. */
  readonly summary: ProductSummary;
}

export function productListItem(p: ProductSummary): ProductListItem {
  return {
    slug: p.slug,
    title: p.title,
    subtitle: p.subtitle,
    kind: p.kind,
    varietyName: p.variety?.name ?? null,
    weightCt: p.total_weight_ct,
    priceAmount: p.price_amount,
    currency: p.currency,
    available: p.availability,
    summary: p,
  };
}

export function productItems(result: ProductListResult): ProductListItem[] {
  return result.items.map(productListItem);
}
