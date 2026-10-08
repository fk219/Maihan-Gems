/**
 * packages/contracts/src/dto/catalog/taxonomy.ts
 *
 * Taxonomy read models for the /taxonomy/* API surface (Phase 3 task 1:
 "repositories for every catalogue read model"). Reads are list-shaped; a
 taxonomy row is small and reference data is bounded, so the contract is a
 plain list per taxonomy family. Each family carries the evidence status the
 migration recorded for the value, echoed VERBATIM (Phase 2 semantics).
 */
import { z } from 'zod';
import { EvidenceStatusSchema, RecordStateSchema } from './enums.js';

const NullableText = z.string().nullable();
const NonNegativeNum = z.number().finite().nonnegative();

export const SpeciesSchema = z
  .object({
    code: z.string().min(1),
    name: z.string().min(1),
    mineral_name: NullableText,
    mohs_min: NonNegativeNum.nullable(),
    mohs_max: NonNegativeNum.nullable(),
    evidence_status: EvidenceStatusSchema,
  })
  .strict();

export const VarietySchema = z
  .object({
    slug: z.string().min(1),
    name: z.string().min(1),
    display_name: z.string().min(1),
    species_code: NullableText,
    source_route: NullableText,
    is_organic: z.boolean(),
    state: RecordStateSchema,
    evidence_status: EvidenceStatusSchema,
  })
  .strict();

export const ColourSchema = z
  .object({
    slug: z.string().min(1),
    name: z.string().min(1),
    parent_slug: NullableText,
    modifier: NullableText,
    hue: NullableText,
    is_chromatic: z.boolean(),
    sort_order: z.number().int(),
    state: RecordStateSchema,
    evidence_status: EvidenceStatusSchema,
  })
  .strict();

export const IntensitySchema = z
  .object({
    code: z.string().min(1),
    name: z.string().min(1),
    rank: z.number().int(),
    evidence_status: EvidenceStatusSchema,
  })
  .strict();

export const ClaritySchema = z
  .object({
    code: z.string().min(1),
    label: z.string().min(1),
    rank: z.number().int(),
    is_eye_clean: z.boolean(),
    evidence_status: EvidenceStatusSchema,
  })
  .strict();

export const OriginSchema = z
  .object({
    slug: z.string().min(1),
    name: z.string().min(1),
    country_code: NullableText,
    region: NullableText,
    evidence_status: EvidenceStatusSchema,
  })
  .strict();

export const TreatmentSchema = z
  .object({
    code: z.string().min(1),
    label: z.string().min(1),
    requires_disclosure: z.boolean(),
    evidence_status: EvidenceStatusSchema,
  })
  .strict();

export const MetalSchema = z
  .object({
    code: z.string().min(1),
    label: z.string().min(1),
    purity_label: NullableText,
    colour: NullableText,
    is_two_tone: z.boolean(),
    slug_phrase: z.string().min(1),
    sort_order: z.number().int(),
    state: RecordStateSchema,
    evidence_status: EvidenceStatusSchema,
  })
  .strict();

export const SettingStyleSchema = z
  .object({
    code: z.string().min(1),
    label: z.string().min(1),
    slug: z.string().min(1),
    state: RecordStateSchema,
    evidence_status: EvidenceStatusSchema,
  })
  .strict();

export const TaxonomyJewelleryTypeSchema = z
  .object({
    code: z.string().min(1),
    label: z.string().min(1),
    state: RecordStateSchema,
    evidence_status: EvidenceStatusSchema,
  })
  .strict();

export const TaxonomyListSchema = z
  .object({
    species: z.array(SpeciesSchema),
    varieties: z.array(VarietySchema),
    colours: z.array(ColourSchema),
    intensities: z.array(IntensitySchema),
    clarities: z.array(ClaritySchema),
    origins: z.array(OriginSchema),
    treatments: z.array(TreatmentSchema),
    metals: z.array(MetalSchema),
    setting_styles: z.array(SettingStyleSchema),
    jewellery_types: z.array(TaxonomyJewelleryTypeSchema),
  })
  .strict();

export type Species = z.infer<typeof SpeciesSchema>;
export type Variety = z.infer<typeof VarietySchema>;
export type Colour = z.infer<typeof ColourSchema>;
export type Intensity = z.infer<typeof IntensitySchema>;
export type Clarity = z.infer<typeof ClaritySchema>;
export type Origin = z.infer<typeof OriginSchema>;
export type Treatment = z.infer<typeof TreatmentSchema>;
export type Metal = z.infer<typeof MetalSchema>;
export type SettingStyle = z.infer<typeof SettingStyleSchema>;
export type TaxonomyJewelleryType = z.infer<typeof TaxonomyJewelleryTypeSchema>;
export type TaxonomyList = z.infer<typeof TaxonomyListSchema>;
