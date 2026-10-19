/**
 * packages/contracts/src/dto/catalog/entities.ts
 *
 * Catalogue read-model DTOs (Phase 3 task 1 read models + task 5 provenance).
 *
 * Field-naming contract: snake_case throughout, matching the locked schema
 * column names — no translation layer between read model and contract, and
 * no chance of silently exposing a wrong-named evidence column.
 *
 * Contract invariants enforced here:
 *   - Every exposed provenance field appears only next to its evidence
 *     status (task 5: "no response exposes a field whose evidence status it
 *     does not also declare").
 *   - Evidence statuses are echoed, never upgraded: the mapping layer in
 *     packages/db copies `ref_evidence_status`, `price_evidence`,
 *     `sku_evidence_status` and `evidence_status` verbatim from the Phase 2
 *     rows. INFERRED stays INFERRED in a response; UNVERIFIED (documents)
 *     never appears here because the catalogue port exposes no documents.
 *   - Internal UUIDs never appear. Identity is carried by the public keys:
 *     slug (product), design_code/sku (setting), gem_ref (gemstone).
 */
import { z } from 'zod';
import {
  CuttingStyleSchema,
  GemstoneKindSchema,
  JewelleryTypeSchema,
  MetalCodeSchema,
  ProductKindSchema,
  ProductStateSchema,
  RecordStateSchema,
  StoneShapeSchema,
} from './enums.js';
import {
  GemstoneProvenanceSchema,
  ProductProvenanceSchema,
  SettingProvenanceSchema,
  SettingVariantProvenanceSchema,
} from '../shared/provenance.js';

const NullableText = z.string().nullable();
const NonNegativeNum = z.number().finite().nonnegative();

/** Taxonomy label pair used inside aggregate responses. */
export const TaxonomyRefSchema = z
  .object({ slug: z.string().min(1), name: z.string().min(1) })
  .strict();
export type TaxonomyRef = z.infer<typeof TaxonomyRefSchema>;

export const CodeRefSchema = z
  .object({ code: z.string().min(1), label: z.string().min(1) })
  .strict();
export type CodeRef = z.infer<typeof CodeRefSchema>;

// ─── PRODUCT ──────────────────────────────────────────────────────────────────

/** One gallery media item, resolved from `assets` via `asset_usages` (doc 24). */
export const ProductMediaSchema = z
  .object({
    url: z.string().min(1),
    kind: z.string().min(1),
    role: z.string().min(1),
    position: z.number().int().min(0),
    alt: z.string().nullable(),
  })
  .strict();
export type ProductMedia = z.infer<typeof ProductMediaSchema>;

export const ProductSummarySchema = z
  .object({
    slug: z.string().min(1),
    title: z.string().min(1),
    subtitle: NullableText,
    kind: ProductKindSchema,
    jewellery_type: JewelleryTypeSchema,
    variety: TaxonomyRefSchema.nullable(),
    color: TaxonomyRefSchema.nullable(),
    total_weight_ct: NonNegativeNum.nullable(),
    stone_count: z.number().int().min(1),
    price_amount: NonNegativeNum,
    currency: z.string().length(3),
    state: ProductStateSchema,
    availability: z.boolean(),
    provenance: ProductProvenanceSchema,
  })
  .strict();

export type ProductSummary = z.infer<typeof ProductSummarySchema>;

/** Product detail extends the summary with the composed aggregate. */
export const ProductDetailSchema = ProductSummarySchema.extend({
  description: NullableText,
  short_description: NullableText,
  seo_title: NullableText,
  seo_description: NullableText,
  engraving_enabled: z.boolean(),
  /** The single committed setting variant of INV-01 (null for LOOSE_STONE / STONE_PAIR realisations). */
  setting_variant: z
    .object({ sku: z.string().min(1), slug: z.string().min(1), design_code: z.string().min(1) })
    .strict()
    .nullable(),
  /** Exactly one of gemstone / gemstone_pair for CONFIGURED (INV-01); null elsewhere. */
  gemstone: z
    .object({
      gem_ref: z.string().min(1),
      kind: GemstoneKindSchema,
      provenance: GemstoneProvenanceSchema,
    })
    .strict()
    .nullable(),
  gemstone_pair: z
    .object({
      gem_ref: z.string().min(1),
      kind: GemstoneKindSchema,
      provenance: GemstoneProvenanceSchema,
    })
    .strict()
    .nullable(),
  /** Gallery media (photos, video, 360, certificates) ordered by position; empty when none. */
  media: ProductMediaSchema.array(),
});

export type ProductDetail = z.infer<typeof ProductDetailSchema>;

// ─── GEMSTONE ─────────────────────────────────────────────────────────────────

export const GemstoneSummarySchema = z
  .object({
    gem_ref: z.string().min(1),
    kind: GemstoneKindSchema,
    variety: TaxonomyRefSchema.nullable(),
    species: TaxonomyRefSchema.nullable(),
    color: TaxonomyRefSchema.nullable(),
    intensity: CodeRefSchema.nullable(),
    clarity: CodeRefSchema.nullable(),
    shape: StoneShapeSchema.nullable(),
    cut_label: NullableText,
    cutting_style: CuttingStyleSchema.nullable(),
    total_weight_ct: NonNegativeNum.nullable(),
    stone_count: z.number().int().min(1),
    length_mm: NonNegativeNum.nullable(),
    width_mm: NonNegativeNum.nullable(),
    depth_mm: NonNegativeNum.nullable(),
    treatment: z
      .object({ code: z.string().min(1), label: z.string().min(1), requires_disclosure: z.boolean() })
      .strict()
      .nullable(),
    origin: TaxonomyRefSchema.nullable(),
    price_per_carat: NonNegativeNum.nullable(),
    price_amount: NonNegativeNum.nullable(),
    currency: z.string().length(3),
    availability: z.boolean(),
    state: RecordStateSchema,
    provenance: GemstoneProvenanceSchema,
  })
  .strict();

export type GemstoneSummary = z.infer<typeof GemstoneSummarySchema>;

/** Per-stone measurement row (gemstone_stones; never a concatenated string — doc 10 constraint 5). */
export const GemstoneStoneSchema = z
  .object({
    position: z.number().int().min(1).max(2),
    weight_ct: NonNegativeNum.nullable(),
    length_mm: NonNegativeNum.nullable(),
    width_mm: NonNegativeNum.nullable(),
    depth_mm: NonNegativeNum.nullable(),
    raw_weight_text: NullableText,
    raw_dimensions_text: NullableText,
    evidence_status: z.enum(['OBSERVED', 'EXTRACTED', 'PATTERN', 'INFERRED', 'UNKNOWN']),
  })
  .strict();

export type GemstoneStone = z.infer<typeof GemstoneStoneSchema>;

export const GemstoneDetailSchema = GemstoneSummarySchema.extend({
  stones: z.array(GemstoneStoneSchema).max(2),
});

export type GemstoneDetail = z.infer<typeof GemstoneDetailSchema>;

// ─── SETTING VARIANT + SETTING ────────────────────────────────────────────────

export const SettingVariantSummarySchema = z
  .object({
    sku: z.string().min(1),
    slug: z.string().min(1),
    metal: z.string().min(1),
    base_price: NonNegativeNum.nullable(),
    currency: z.string().length(3),
    availability: z.boolean(),
    state: RecordStateSchema,
    provenance: SettingVariantProvenanceSchema,
  })
  .strict();

export type SettingVariantSummary = z.infer<typeof SettingVariantSummarySchema>;

export const SettingSummarySchema = z
  .object({
    design_code: z.string().min(1),
    name: z.string().min(1),
    jewellery_type: JewelleryTypeSchema,
    style: CodeRefSchema.nullable(),
    is_vedic: z.boolean(),
    side_stone_count: z.number().int().min(0),
    variant_count: z.number().int().min(0),
    state: RecordStateSchema,
    provenance: SettingProvenanceSchema,
  })
  .strict();

export type SettingSummary = z.infer<typeof SettingSummarySchema>;

/** Design-level detail: the design plus its sellable variants (design × metal, never the cross-product — doc 10 constraint 1). */
export const SettingDetailSchema = SettingSummarySchema.extend({
  description: NullableText,
  variants: z.array(SettingVariantSummarySchema),
});

export type SettingDetail = z.infer<typeof SettingDetailSchema>;

export const MetalCodeRefSchema = z
  .object({ code: MetalCodeSchema, label: z.string().min(1) })
  .strict();
export type MetalCodeRef = z.infer<typeof MetalCodeRefSchema>;
