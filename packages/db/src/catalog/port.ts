/**
 * packages/db/src/catalog/port.ts
 *
 * THE CatalogQueryPort implementation (Phase 3 tasks 2–5 assembled).
 *
 * The interface lives in @maihan/contracts (the query contract the
 * storefront calls and Phase 5 swaps); THIS is its SQL-backed
 * implementation, the only package permitted to execute queries.
 *
 * Port rules honoured here:
 *   - every input is Zod-validated against the contract query schemas
 *     BEFORE any SQL exists (a port call cannot smuggle unvalidated input);
 *   - structured filters ride indexed columns only (predicates.ts is the
 *     single WHERE authority; whitelists.ts resolves taxonomy values);
 *   - unknown taxonomy values are reported in `rejected_filters` and can
 *     never enter the result set (never silently widened);
 *   - facets are computed in the SAME single dispatch as the page, over the
 *     same snapshot and the same plan (one grouped pass);
 *   - pagination is keyset on the deterministic (sort, product_number)
 *     tuple; a foreign cursor is a VALIDATION_FAILED contract error;
 *   - identity lookups throw closed-registry ContractError codes; list
 *     queries never throw for empty results;
 *   - provenance travels verbatim from the Phase 2 columns (mappers.ts);
 *     INFERRED rows are labelled INFERRED and nothing promotes evidence.
 */
import {
  ProductListQuerySchema,
  SettingListQuerySchema,
  type CatalogQueryPort,
  type ProductListResult,
  type SettingListResult,
  type TaxonomyReadModel,
  type RejectedFilter,
  type CursorPayload,
  type ProductSortKey,
  type SortDirection,
  PRODUCT_CURSOR_MAX_LIMIT,
  encodeProductCursor,
  encodeSettingCursor,
  TaxonomyListSchema,
  contractNotFound,
  SettingFiltersSchema,
} from '@maihan/contracts';
import type { CatalogDatabase } from './executor.js';
import {
  resolveFilterWhitelists,
} from './whitelists.js';
import {
  resolveProductFilters,
  type RawSpecFilters,
} from './predicates.js';
import {
  runProductList,
  findProductDetailBySlug,
  type ProductListSqlPlan,
} from './products-repository.js';
import {
  findGemstoneByGemRef,
} from './gemstones-repository.js';
import {
  runSettingList,
  runSettingFacets,
  findSettingVariantsForDesigns,
  findSettingDetailByDesignCode,
  findSettingVariantBySku,
  type SettingListSqlPlan,
} from './settings-repository.js';
import { loadTaxonomy } from './taxonomy-repository.js';
import {
  validateProductCursor,
  validateSettingCursor,
  clampLimit,
} from './sort.js';
import { invalidCursorError } from './query-assembly.js';
import {
  mapProductSummaries,
  mapProductDetail,
  mapGemstoneDetail,
  mapSettingDesign,
} from './mappers.js';

export type { CatalogQueryPort };

/** Resolved product-list query ready for SQL planning. */
interface ResolvedListQuery {
  filters: RawSpecFilters;
  limit: number;
  cursor: string | undefined;
  sortKey: ProductSortKey;
  direction: SortDirection;
}

function resolveProductListQuery(query: unknown): ResolvedListQuery {
  const parsed = ProductListQuerySchema.parse(query);
  const f = parsed.filters;
  const filters: RawSpecFilters = {
    kind: f.kind ?? [],
    jewelleryType: f.jewelleryType ?? [],
    gemstoneKind: f.gemstoneKind ?? [],
    variety: f.variety ?? [],
    color: f.color ?? [],
    intensity: f.intensity ?? [],
    clarity: f.clarity ?? [],
    treatment: f.treatment ?? [],
    origin: f.origin ?? [],
    shape: f.shape ?? [],
    metal: f.metal ?? [],
    settingStyle: f.settingStyle ?? [],
    certified: f.certified === true,
    available: f.available === true,
    minPrice: f.minPrice,
    maxPrice: f.maxPrice,
    minWeightCt: f.minWeightCt,
    maxWeightCt: f.maxWeightCt,
  };
  return {
    filters,
    limit: clampLimit(parsed.limit, PRODUCT_CURSOR_MAX_LIMIT),
    cursor: parsed.cursor,
    sortKey: parsed.sort,
    direction: parsed.direction,
  };
}

/** Products listing: whitelist resolution → plan → single-dispatch query. */
async function listProductsImpl(db: CatalogDatabase, query: unknown): Promise<ProductListResult> {
  const resolved = resolveProductListQuery(query);

  const { whitelist, rejected: whitelistRejected } = await resolveFilterWhitelists(db, {
    variety: resolved.filters.variety,
    color: resolved.filters.color,
    intensity: resolved.filters.intensity,
    clarity: resolved.filters.clarity,
    treatment: resolved.filters.treatment,
    origin: resolved.filters.origin,
    settingStyle: resolved.filters.settingStyle,
  });

  const { plan, rejected: planRejected } = resolveProductFilters(resolved.filters, whitelist);
  const rejected: RejectedFilter[] = [...whitelistRejected, ...planRejected];

  const cursor: CursorPayload | null = validateProductCursor(resolved.cursor, {
    sortKey: resolved.sortKey,
    direction: resolved.direction,
  });

  const sqlPlan: ProductListSqlPlan = {
    filterPlan: plan,
    sortKey: resolved.sortKey,
    direction: resolved.direction,
    limitPlusOne: resolved.limit + 1,
    cursor,
  };

  const raw = await runProductList(db, sqlPlan);
  const hasMore = raw.items.length > resolved.limit;
  const pageRows = hasMore ? raw.items.slice(0, resolved.limit) : raw.items;
  const items = mapProductSummaries(pageRows);

  let nextCursor: string | null = null;
  if (hasMore && pageRows.length > 0) {
    const last = pageRows[pageRows.length - 1] as Record<string, unknown>;
    const sortValue = Number(last['sort_value']);
    const productNumber = Number(last['product_number']);
    if (!Number.isFinite(sortValue) || !Number.isInteger(productNumber)) {
      throw invalidCursorError('mint-value-missing', 'next_cursor');
    }
    nextCursor = encodeProductCursor({
      v: 1,
      s: resolved.sortKey,
      d: resolved.direction,
      n: productNumber,
      a: sortValue,
    });
  }

  // Facet set: contract requires EVERY closed dimension present (may be empty).
  const facetSet: Record<string, unknown> = {
    variety: [],
    color: [],
    jewellery_type: [],
    metal: [],
    settingStyle: [],
    shape: [],
    origin: [],
    treatment: [],
  };
  for (const arm of raw.facets) {
    const dimension = arm['dimension'];
    if (typeof dimension !== 'string' || !(dimension in facetSet)) continue;
    (facetSet[dimension] as unknown[]).push({
      value: String(arm['value']),
      label: String(arm['label']),
      count: Number(arm['count']),
      selected: isSelected(dimension, String(arm['value']), resolved.filters),
    });
  }

  return {
    items,
    facets: facetSet as ProductListResult['facets'],
    rejected_filters: rejected,
    meta: { limit: resolved.limit, has_more: hasMore, next_cursor: nextCursor },
  };
}

/** `selected` marks a facet value present in the active filter of its dimension. */
function isSelected(dimension: string, value: string, filters: RawSpecFilters): boolean {
  switch (dimension) {
    case 'variety':
      return filters.variety.includes(value);
    case 'color':
      return filters.color.includes(value);
    case 'jewellery_type':
      return filters.jewelleryType.includes(value);
    case 'metal':
      return filters.metal.includes(value);
    case 'settingStyle':
      return filters.settingStyle.includes(value);
    case 'shape':
      return filters.shape.includes(value);
    case 'origin':
      return filters.origin.includes(value);
    case 'treatment':
      return filters.treatment.includes(value);
    default:
      return false;
  }
}

export function createCatalogQueryPort(db: CatalogDatabase): CatalogQueryPort {
  return {
    listProducts: (query) => listProductsImpl(db, query),

    async getProductBySlug(slug) {
      const row = await findProductDetailBySlug(db, slug);
      if (row === null) {
        throw contractNotFound('PRODUCT_NOT_FOUND', 'slug', slug);
      }
      // Product detail carries no per-stone rows (gemstone detail is its own surface).
      return mapProductDetail(row, []);
    },

    async getGemstoneByGemRef(gemRef) {
      const row = await findGemstoneByGemRef(db, gemRef);
      if (row === null) {
        throw contractNotFound('GEMSTONE_NOT_FOUND', 'gem_ref', gemRef);
      }
      // The gemstone id never leaves this layer (doc 07); the stones query
      // takes it from the detail row via a dedicated lookup below.
      const stones = await findGemstoneStonesByGemRef(db, gemRef);
      return mapGemstoneDetail(row, stones);
    },

    async listSettings(query) {
      const parsed = SettingListQuerySchema.parse(query);
      const f = SettingFiltersSchema.parse({
        jewellery_type: parsed.filters.jewellery_type ?? [],
        style: parsed.filters.style ?? [],
        metal: parsed.filters.metal ?? [],
        vedic: parsed.filters.vedic,
      });

      // Style descriptors resolve against the taxonomy whitelist; unknowns
      // land in rejected_filters exactly like products.
      const { whitelist, rejected } = await resolveFilterWhitelists(db, {
        variety: [],
        color: [],
        intensity: [],
        clarity: [],
        treatment: [],
        origin: [],
        settingStyle: f.style,
      });
      const styleIds = f.style
        .map((slug) => whitelist.settingStyle.get(slug)?.id)
        .filter((id): id is string => id !== undefined);

      const limit = clampLimit(parsed.limit, PRODUCT_CURSOR_MAX_LIMIT);
      const cursor = validateSettingCursor(parsed.cursor);
      const plan: SettingListSqlPlan = {
        jewelleryType: f.jewellery_type,
        styleIds,
        metalCodes: f.metal,
        vedicOnly: f.vedic === true,
        limitPlusOne: limit + 1,
        afterDesignCode: cursor === null ? null : cursor.n,
      };

      const rows = await runSettingList(db, plan);
      const hasMore = rows.length > limit;
      const pageRows = hasMore ? rows.slice(0, limit) : rows;
      const designIds = pageRows.map((r) => String((r as Record<string, unknown>)['id']));

      // One batched variants query for the page's designs (no N+1).
      const variantRows =
        designIds.length === 0
          ? []
          : await findSettingVariantsForDesigns(db, designIds);

      const variantsByDesign = new Map<string, Record<string, unknown>[]>()
      for (const v of variantRows as unknown as Record<string, unknown>[]) {
        const key = String(v['setting_id']);
        const list = variantsByDesign.get(key) ?? [];
        list.push(v);
        variantsByDesign.set(key, list);
      }

      const items = pageRows.map((r) =>
        mapSettingDesign(
          { ...(r as Record<string, unknown>), description: null },
          variantsByDesign.get(String((r as Record<string, unknown>)['id'])) ?? [],
        ),
      );

      let nextCursor: string | null = null;
      if (hasMore && pageRows.length > 0) {
        const last = pageRows[pageRows.length - 1] as Record<string, unknown>;
        nextCursor = encodeSettingCursor({ v: 1, d: 'design_code', n: String(last['design_code']) });
      }

      // Settings facets: single grouped pass over the SAME filtered base.
      const facetRaw = await runSettingFacets(db, plan);
      const facetSet: Record<string, unknown> = {
        settingStyle: [],
        jewellery_type: [],
        metal: [],
        variety: [],
        color: [],
        shape: [],
        origin: [],
        treatment: [],
      };
      for (const arm of facetRaw.items) {
        const dimension = arm['dimension'];
        if (typeof dimension !== 'string' || !(dimension in facetSet)) continue;
        (facetSet[dimension] as unknown[]).push({
          value: String(arm['value']),
          label: String(arm['label']),
          count: Number(arm['count']),
          selected:
            (dimension === 'settingStyle' && f.style.includes(String(arm['value']))) ||
            (dimension === 'jewellery_type' && f.jewellery_type.includes(String(arm['value']))) ||
            (dimension === 'metal' && f.metal.includes(String(arm['value']))),
        });
      }

      const result: SettingListResult = {
        items,
        facets: facetSet as SettingListResult['facets'],
        rejected_filters: rejected,
        meta: { limit, has_more: hasMore, next_cursor: nextCursor },
      };
      return result;
    },

    async getSettingByDesignCode(designCode) {
      const row = await findSettingDetailByDesignCode(db, designCode);
      if (row === null) {
        throw contractNotFound('SETTING_NOT_FOUND', 'design_code', designCode);
      }
      const variants = await findSettingVariantsForDesigns(db, [String(row['id'])]);
      return mapSettingDesign(row, variants as unknown as Record<string, unknown>[]);
    },

    async getSettingVariantBySku(sku) {
      const ref = await findSettingVariantBySku(db, sku);
      if (ref === null) {
        throw contractNotFound('SETTING_VARIANT_NOT_FOUND', 'sku', sku);
      }
      const designCode = String(ref['design_code']);
      const row = await findSettingDetailByDesignCode(db, designCode);
      if (row === null) {
        throw contractNotFound('SETTING_NOT_FOUND', 'design_code', designCode);
      }
      const variants = await findSettingVariantsForDesigns(db, [String(row['id'])]);
      const design = mapSettingDesign(row, variants as unknown as Record<string, unknown>[]);
      const variant = design.variants.find((v) => v.sku === sku);
      if (variant === undefined) {
        throw contractNotFound('SETTING_VARIANT_NOT_FOUND', 'sku', sku);
      }
      return { variant, design };
    },

    async getTaxonomy() {
      const raw = await loadTaxonomy(db);
      return TaxonomyListSchema.parse(raw) as TaxonomyReadModel;
    },

    async search(query) {
      const { executeSearch } = await import('../search/search-service.js');
      return executeSearch(db, query);
    },

    async suggest(query) {
      const { executeSuggest } = await import('../search/search-service.js');
      return executeSuggest(db, query);
    },

    async similarGemstones(gemRef, limit) {
      const { executeSimilarGemstones } = await import('../search/search-service.js');
      return executeSimilarGemstones(db, gemRef, limit);
    },
  };
}

/**
 * Gemstone stones for a gem_ref: the id stays inside this layer (doc 07);
 * findGemstoneByGemRef already filters soft-deleted, so an empty set here
 * means the gem_ref vanished between the two reads (benign, empty stones).
 */
async function findGemstoneStonesByGemRef(db: CatalogDatabase, gemRef: string) {
  const statement = (await import('drizzle-orm')).sql`
    SELECT s.position, s.weight_ct::float8 AS weight_ct,
           s.length_mm::float8 AS length_mm, s.width_mm::float8 AS width_mm,
           s.depth_mm::float8 AS depth_mm,
           s.raw_weight_text AS raw_weight_text,
           s.raw_dimensions_text AS raw_dimensions_text,
           s.evidence_status::text AS evidence_status
      FROM gemstone_stones s
      JOIN gemstones g ON g.id = s.gemstone_id
     WHERE g.gem_ref = ${gemRef}
     ORDER BY s.position
  `;
  const result = await db.execute(statement);
  return result.rows as unknown as import('./gemstones-repository.js').GemstoneStoneRow[];
}


