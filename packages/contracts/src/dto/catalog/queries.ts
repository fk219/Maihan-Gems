/**
 * packages/contracts/src/dto/catalog/queries.ts
 *
 * The CatalogQueryPort — the single catalogue query surface the storefront
 * and (later) search consume (technical_design/10 "Catalogue read model").
 * Phase 3 implements it with structured SQL + facet counts over indexed
 * columns; Phase 5 replaces the implementation BEHIND the same interface and
 * storefront call sites never change.
 *
 * Port rules:
 *   - No HTTP, no caching, no serialization concerns (Phase 3 tasks 6-10 add
 *     those layers elsewhere; the port stays independent of them).
 *   - Every input is total: Zod-validated with defaults, so a port call
 *     cannot smuggle an unvalidated string into SQL.
 *   - Every returned query result is validated against its output schema.
 *   - Identity lookups throw the closed-registry ContractError codes
 *     (PRODUCT_NOT_FOUND / GEMSTONE_NOT_FOUND / SETTING_VARIANT_NOT_FOUND /
 *     SETTING_NOT_FOUND); list queries never throw for empty results.
 *   - Structured filters reject unknown taxonomy values through
 *     `rejectedFilters`, never by silently widening the result set.
 */
import { z } from 'zod';
import {
  PRODUCT_SORT_KEY_SCHEMA,
  SORT_DIRECTION_SCHEMA,
  SettingFiltersSchema,
  PageMetaSchema,
  RejectedFilterSchema,
} from './filters.js';
import { FacetSetSchema } from './facets.js';
import {
  PRODUCT_CURSOR_DEFAULT_LIMIT,
  PRODUCT_CURSOR_MAX_LIMIT,
} from './cursor.js';
import {
  ProductSummarySchema,
  ProductDetailSchema,
  SettingDetailSchema,
  SettingVariantSummarySchema,
  GemstoneDetailSchema,
} from './entities.js';
import { TaxonomyListSchema } from './taxonomy.js';


/**
 * The product-filter wire shape. This port-level schema is intentionally a
 * LOOSE mirror of ProductFiltersSchema ("partial") so that the port accepts
 * partially-specified filter objects and misses nothing structurally — the
 * full ProductFiltersSchema (with required `states`) is applied inside the
 * port after it fills the visibility default. The port cannot import Zod
 * validation that depends on db state; the structural shape is validated
 * HERE (contracts), and the portfolio semantics (states defaulting, unknown
 * value rejection) belong to the port.
 */
export const ProductFilterShapeSchema = z
  .object({
    kind: z.array(z.string()).optional(),
    jewelleryType: z.array(z.string()).optional(),
    gemstoneKind: z.array(z.string()).optional(),
    variety: z.array(z.string()).optional(),
    color: z.array(z.string()).optional(),
    intensity: z.array(z.string()).optional(),
    clarity: z.array(z.string()).optional(),
    treatment: z.array(z.string()).optional(),
    origin: z.array(z.string()).optional(),
    shape: z.array(z.string()).optional(),
    metal: z.array(z.string()).optional(),
    settingStyle: z.array(z.string()).optional(),
    certified: z.boolean().optional(),
    available: z.boolean().optional(),
    minPrice: z.number().optional(),
    maxPrice: z.number().optional(),
    minWeightCt: z.number().optional(),
    maxWeightCt: z.number().optional(),
  })
  .partial()
  .strict();

export const ListQueryCommonSchema = z.object({
  limit: z.number().int().min(1).max(PRODUCT_CURSOR_MAX_LIMIT).default(PRODUCT_CURSOR_DEFAULT_LIMIT),
  cursor: z.string().optional(),
  sort: PRODUCT_SORT_KEY_SCHEMA.default('price'),
  direction: SORT_DIRECTION_SCHEMA.default('asc'),
});

/** The products-list port input: structured filters + keyset pagination. */
export const ProductListQuerySchema = ListQueryCommonSchema.extend({
  filters: ProductFilterShapeSchema.default({}),
});

export type ProductListQuery = z.input<typeof ProductListQuerySchema>;
export type ResolvedProductListQuery = z.output<typeof ProductListQuerySchema>;

export const SettingListQuerySchema = z
  .object({
    filters: SettingFiltersSchema.partial().default({}),
    limit: z.number().int().min(1).max(PRODUCT_CURSOR_MAX_LIMIT).default(PRODUCT_CURSOR_DEFAULT_LIMIT),
    cursor: z.string().optional(),
  })
  .strict();

export type SettingListQuery = z.input<typeof SettingListQuerySchema>;
export type ResolvedSettingListQuery = z.output<typeof SettingListQuerySchema>;

/** The products-list result: items, facets, rejectedFilters, meta. */
export const ProductListResultSchema = z
  .object({
    items: z.array(ProductSummarySchema),
    facets: FacetSetSchema,
    rejected_filters: z.array(RejectedFilterSchema),
    meta: PageMetaSchema,
  })
  .strict();

export type ProductListResult = z.infer<typeof ProductListResultSchema>;

export const SettingListResultSchema = z
  .object({
    items: z.array(SettingDetailSchema),
    facets: FacetSetSchema,
    rejected_filters: z.array(RejectedFilterSchema),
    meta: PageMetaSchema,
  })
  .strict();

export type SettingListResult = z.infer<typeof SettingListResultSchema>;

/**
 * The `{ variant, design }` envelope returned by `getSettingVariantBySku`
 * (the `/settings/{sku}` surface). Composed from the existing entity schemas
 * — an explicit schema for an already-documented port return type, not a
 * parallel contract.
 */
export const SettingVariantEnvelopeSchema = z
  .object({
    variant: SettingVariantSummarySchema,
    design: SettingDetailSchema,
  })
  .strict();

export type SettingVariantEnvelope = z.infer<typeof SettingVariantEnvelopeSchema>;

/** Individual read-model aliases used by the port interface below. */
export type SettingDesignReadModel = z.infer<typeof SettingDetailSchema>;
export type SettingVariantDetailReadModel = SettingDesignReadModel['variants'][number];
export type GemstoneDetailReadModel = z.infer<typeof GemstoneDetailSchema>;
export type ProductDetailReadModel = z.infer<typeof ProductDetailSchema>;
export type TaxonomyReadModel = z.infer<typeof TaxonomyListSchema>;

/**
 * CatalogQueryPort. Implemented in packages/db (the only package permitted
 * to execute SQL); consumed by the storefront module surface.
 */
export interface CatalogQueryPort {
  /** Keyset-paginated product listing with single-pass facets. */
  listProducts(query: ProductListQuery): Promise<ProductListResult>;

  /** Product detail by public slug. Throws PRODUCT_NOT_FOUND. */
  getProductBySlug(slug: string): Promise<ProductDetailReadModel>;

  /** Gemstone detail by public gem_ref. Throws GEMSTONE_NOT_FOUND. */
  getGemstoneByGemRef(gemRef: string): Promise<GemstoneDetailReadModel>;

  /** Design listing (design × metal realisation matrix is never enumerated). */
  listSettings(query: SettingListQuery): Promise<SettingListResult>;

  /** Setting design detail by design_code. Throws SETTING_NOT_FOUND. */
  getSettingByDesignCode(designCode: string): Promise<SettingDesignReadModel>;

  /** Setting variant detail by variant SKU (settings/{sku} surface). Throws SETTING_VARIANT_NOT_FOUND. */
  getSettingVariantBySku(sku: string): Promise<{
    variant: SettingVariantDetailReadModel;
    design: SettingDesignReadModel;
  }>;

  /** Taxonomy read models for the /taxonomy/* surface. */
  getTaxonomy(): Promise<TaxonomyReadModel>;
}

/** Default limit and max-limit constants shared by every list port method. */
export {
  PRODUCT_CURSOR_DEFAULT_LIMIT,
  PRODUCT_CURSOR_MAX_LIMIT,
  FacetSetSchema,
  TaxonomyListSchema,
};
