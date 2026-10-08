/**
 * packages/contracts/src/dto/catalog/filters.ts
 *
 * Structured catalogue filter contracts (Phase 3 task 2 + acceptance
 * criterion "unknown filter values return rejectedFilters with reasons
 * rather than silently widening").
 *
 * Two validation layers, deliberately separated:
 *
 *   1. HERE (contracts, Zod): structural validity — shapes, enum membership,
 *      numeric domains, list size caps. Shape-invalid input never reaches
 *      the query layer.
 *
 *   2. IN THE PORT (the implementation in packages/db): semantic validity —
 *      every taxonomy slug/code descriptor value is resolved against the
 *      taxonomy whitelist (doc 12: "Filters validate against a whitelist
 *      derived from the taxonomy tables. An unknown value returns
 *      rejectedFilters with a reason; it never silently widens the result
 *      set"). Contracts CANNOT check taxonomy members (they must not import
 *      db) and must not pretend otherwise.
 *
 * Every filter accepted here maps to an INDEXED column (doc 12 structured
 * filter table). Structural validity of a filter name is not semantic
 * validity; the port owns the value whitelist.
 *
 * Public visibility is NOT a filter: the port enforces it uniformly
 * (products read at state='ACTIVE' only — the migrated corpus stays DRAFT
 * until Phase 12 curation publishes it, so no DRAFT row can ever cross this
 * boundary by an input combination), which keeps "unpublished products are
 * filtered by state in the repository" (doc 10) a structural property
 * instead of an input-dependent one.
 */
import { z } from 'zod';
import { GEMSTONE_KINDS, JEWELLERY_TYPES, PRODUCT_KINDS } from '@maihan/domain';
import { METAL_CODES, STONE_SHAPE_VALUES } from './enums.js';

/**
 * Slug/token descriptor filter: slugs and codes arrive lowercase from URLs
 * (migration pipeline normalised them). No case transformation is applied —
 * descriptors are matched against taxonomy whitelists, which are lowercase.
 */
const DescriptorListSchema = z.array(z.string().min(1).max(120)).max(50);

/** Array of enum members (schema-enum filter, closed vocabulary). */
const EnumCodeList = <T extends readonly string[]>(values: T) =>
  DescriptorListSchema.superRefine((list, ctx) => {
    for (const v of list) {
      if (!values.includes(v as (typeof values)[number])) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Unknown code: ${v}`,
        });
      }
    }
  });

/** Validated array of enum members as external codes. */
const ProductKindList = EnumCodeList(PRODUCT_KINDS);
const JewelleryTypeList = EnumCodeList(JEWELLERY_TYPES);
const GemstoneKindList = EnumCodeList(GEMSTONE_KINDS);
const StoneShapeList = EnumCodeList(STONE_SHAPE_VALUES);
const MetalCodeList = EnumCodeList(METAL_CODES);

const NonNegativeNumber = z.number().finite().nonnegative();

/** Deterministic sort keys over indexed columns; every product listing is ordered by (<sort>, product_number). */
export const PRODUCT_SORT_KEYS = ['price', 'weight', 'recency'] as const;
export type ProductSortKey = (typeof PRODUCT_SORT_KEYS)[number];
export const PRODUCT_SORT_KEY_SCHEMA = z.enum(PRODUCT_SORT_KEYS);
export const SORT_DIRECTION_SCHEMA = z.enum(['asc', 'desc']);
export type SortDirection = z.infer<typeof SORT_DIRECTION_SCHEMA>;

/** Doc 12 structured filters, mapped to their indexed columns on products. */
export const ProductFiltersSchema = z
  .object({
    kind: ProductKindList,
    jewelleryType: JewelleryTypeList,
    gemstoneKind: GemstoneKindList,
    variety: DescriptorListSchema,
    color: DescriptorListSchema,
    intensity: DescriptorListSchema,
    clarity: DescriptorListSchema,
    treatment: DescriptorListSchema,
    origin: DescriptorListSchema,
    shape: StoneShapeList,
    metal: MetalCodeList,
    settingStyle: DescriptorListSchema,
    certified: z.boolean().optional(),
    available: z.boolean().optional(),
    minPrice: NonNegativeNumber.optional(),
    maxPrice: NonNegativeNumber.optional(),
    minWeightCt: NonNegativeNumber.optional(),
    maxWeightCt: NonNegativeNumber.optional(),
  })
  .strict();

export type ProductFilters = z.infer<typeof ProductFiltersSchema>;

/** Settings-list filters; every member maps to an indexed setting/variant column. */
export const SettingFiltersSchema = z
  .object({
    jewellery_type: JewelleryTypeList,
    style: DescriptorListSchema,
    metal: MetalCodeList,
    vedic: z.boolean().optional(),
  })
  .strict();

export type SettingFilters = z.infer<typeof SettingFiltersSchema>;

/** Gemstone-look filters (gemstone listing read model; all indexed). */
export const GemstoneFiltersSchema = z
  .object({
    gemstone_kind: GemstoneKindList,
    variety: DescriptorListSchema,
    color: DescriptorListSchema,
    intensity: DescriptorListSchema,
    clarity: DescriptorListSchema,
    treatment: DescriptorListSchema,
    origin: DescriptorListSchema,
    shape: StoneShapeList,
    minPrice: NonNegativeNumber.optional(),
    maxPrice: NonNegativeNumber.optional(),
    minWeightCt: NonNegativeNumber.optional(),
    maxWeightCt: NonNegativeNumber.optional(),
  })
  .strict();

export type GemstoneFilters = z.infer<typeof GemstoneFiltersSchema>;

/**
 * The rejectedFilters reason registry. Fixed, deterministic strings — an
 * ad-hoc reason at a call site is a defect (doc 07 closed-registry rule
 * applied to machine-readable detail strings).
 */
export const REJECTED_FILTER_REASONS = ['UNKNOWN_VALUE', 'INVALID_RANGE'] as const;
export type RejectedFilterReason = (typeof REJECTED_FILTER_REASONS)[number];

export const RejectedFilterSchema = z.object({
  filter: z.string().min(1),
  value: z.string().min(1),
  reason: z.enum(REJECTED_FILTER_REASONS),
  message: z.string().min(1),
});

export type RejectedFilter = z.infer<typeof RejectedFilterSchema>;

/** A listing envelope meta block (keyset pagination; no totals anywhere). */
export const PageMetaSchema = z.object({
  limit: z.number().int().min(1),
  has_more: z.boolean(),
  next_cursor: z.string().nullable(),
});

export type PageMeta = z.infer<typeof PageMetaSchema>;
