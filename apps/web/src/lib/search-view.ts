/**
 * apps/web/src/lib/search-view.ts
 *
 * Pure view-model helpers for the search route (/search).
 *
 * Scope authority:
 *   - technical_design/08_FRONTEND_ARCHITECTURE.md (State management: URL state via searchParams)
 *   - technical_design/12_SEARCH_ARCHITECTURE.md
 *   - packages/contracts/src/dto/catalog/search.ts
 *
 * Rules honoured:
 *   - Pure, deterministic, zero side effects.
 *   - Translates between URL searchParams and the Phase 5 SearchQuery contract.
 *   - No invented fields: every filter key is validated against SearchQuerySchema.
 */
import type { ResolvedSearchQuery, SearchQuery, SearchSortKey } from '@maihan/contracts';

export type RawSearchParams = Record<string, string | string[] | undefined>;

function toArray(val: string | string[] | undefined): string[] | undefined {
  if (val === undefined || val === '') return undefined;
  const rawList = Array.isArray(val) ? val : [val];
  const items = rawList
    .flatMap((item) => item.split(','))
    .map((s) => s.trim())
    .filter(Boolean);
  return items.length > 0 ? items : undefined;
}

function toNumber(val: string | string[] | undefined): number | undefined {
  if (val === undefined || val === '') return undefined;
  const raw = Array.isArray(val) ? val[0] : val;
  const num = Number(raw);
  return Number.isFinite(num) ? num : undefined;
}

const VALID_SORT_KEYS = new Set<SearchSortKey>(['relevance', 'price', 'weight', 'recency']);

/** Parse raw URL searchParams into a typed, contract-valid SearchQuery */
export function parseSearchParamsToSearchQuery(sp: RawSearchParams): ResolvedSearchQuery {
  const queryRaw = sp['q'] ?? sp['query'];
  const query = typeof queryRaw === 'string' ? queryRaw.trim() : (Array.isArray(queryRaw) ? queryRaw[0]?.trim() ?? '' : '');

  const sortRaw = typeof sp['sort'] === 'string' ? sp['sort'] : undefined;
  const sort: SearchSortKey = sortRaw !== undefined && VALID_SORT_KEYS.has(sortRaw as SearchSortKey)
    ? (sortRaw as SearchSortKey)
    : 'relevance';

  const dirRaw = typeof sp['direction'] === 'string' ? sp['direction'] : undefined;
  const direction: 'asc' | 'desc' = dirRaw === 'desc' ? 'desc' : 'asc';

  const limitRaw = toNumber(sp['limit']);
  const limit = limitRaw !== undefined && limitRaw >= 1 && limitRaw <= 100 ? limitRaw : 24;

  const cursorRaw = typeof sp['cursor'] === 'string' ? sp['cursor'] : undefined;
  const cursor = cursorRaw !== undefined && cursorRaw !== '' ? cursorRaw : undefined;

  const filters: NonNullable<SearchQuery['filters']> = {};

  const variety = toArray(sp['variety']);
  if (variety !== undefined) filters.variety = variety;

  const color = toArray(sp['color']);
  if (color !== undefined) filters.color = color;

  const shape = toArray(sp['shape']);
  if (shape !== undefined) filters.shape = shape;

  const treatment = toArray(sp['treatment']);
  if (treatment !== undefined) filters.treatment = treatment;

  const origin = toArray(sp['origin']);
  if (origin !== undefined) filters.origin = origin;

  const jewelleryType = toArray(sp['jewelleryType'] ?? sp['jewellery_type']);
  if (jewelleryType !== undefined) filters.jewelleryType = jewelleryType;

  const metal = toArray(sp['metal']);
  if (metal !== undefined) filters.metal = metal;

  const settingStyle = toArray(sp['settingStyle'] ?? sp['style']);
  if (settingStyle !== undefined) filters.settingStyle = settingStyle;

  const minPrice = toNumber(sp['minPrice']);
  if (minPrice !== undefined) filters.minPrice = minPrice;

  const maxPrice = toNumber(sp['maxPrice']);
  if (maxPrice !== undefined) filters.maxPrice = maxPrice;

  const minWeightCt = toNumber(sp['minWeightCt']);
  if (minWeightCt !== undefined) filters.minWeightCt = minWeightCt;

  const maxWeightCt = toNumber(sp['maxWeightCt']);
  if (maxWeightCt !== undefined) filters.maxWeightCt = maxWeightCt;

  return {
    query,
    filters,
    sort,
    direction,
    limit,
    cursor,
    semantic: true,
  };
}

/** Build an href URL with a single facet toggle (add/remove) */
export function buildSearchHref(
  currentParams: RawSearchParams,
  toggleKey: string,
  toggleValue: string,
): string {
  const nextParams = new URLSearchParams();

  // Copy existing query string keys
  for (const [key, raw] of Object.entries(currentParams)) {
    if (raw === undefined || key === 'cursor') continue; // Always reset pagination on filter change
    if (key === toggleKey) continue; // Will be handled below

    if (Array.isArray(raw)) {
      for (const item of raw) nextParams.append(key, item);
    } else {
      nextParams.set(key, raw);
    }
  }

  // Handle toggling the specific facet
  const existingValues = toArray(currentParams[toggleKey]) ?? [];
  const isSelected = existingValues.includes(toggleValue);

  const nextValues = isSelected
    ? existingValues.filter((v) => v !== toggleValue)
    : [...existingValues, toggleValue];

  if (nextValues.length > 0) {
    for (const v of nextValues) {
      nextParams.append(toggleKey, v);
    }
  }

  const qs = nextParams.toString();
  return qs.length > 0 ? `/search?${qs}` : '/search';
}

export interface ActiveChip {
  readonly key: string;
  readonly label: string;
  readonly value: string;
  readonly removeHref: string;
}

/** Extract human-readable active filter chips with remove links */
export function extractActiveFilterChips(currentParams: RawSearchParams): ActiveChip[] {
  const chips: ActiveChip[] = [];

  const DIMENSION_LABELS: Record<string, string> = {
    variety: 'Variety',
    color: 'Colour',
    shape: 'Shape',
    treatment: 'Treatment',
    origin: 'Origin',
    jewelleryType: 'Jewellery',
    jewellery_type: 'Jewellery',
    metal: 'Metal',
    settingStyle: 'Style',
    style: 'Style',
  };

  for (const [key, label] of Object.entries(DIMENSION_LABELS)) {
    const values = toArray(currentParams[key]);
    if (values !== undefined) {
      for (const val of values) {
        chips.push({
          key,
          label: `${label}: ${val.replace(/-/g, ' ')}`,
          value: val,
          removeHref: buildSearchHref(currentParams, key, val),
        });
      }
    }
  }

  return chips;
}

/** Generate pagination base path preserving all filters except cursor */
export function searchPaginationBasePath(currentParams: RawSearchParams): string {
  const params = new URLSearchParams();
  for (const [key, raw] of Object.entries(currentParams)) {
    if (raw === undefined || key === 'cursor') continue;
    if (Array.isArray(raw)) {
      for (const item of raw) params.append(key, item);
    } else {
      params.set(key, raw);
    }
  }
  const qs = params.toString();
  return qs.length > 0 ? `/search?${qs}` : '/search';
}
