/**
 * packages/contracts/src/dto/catalog/enums.ts
 *
 * Catalogue contract enums.
 *
 * Source of Truth 8.3 is transcribed verbatim into `packages/domain`
 * (packages/domain/src/enums.ts). Packages/contracts MUST NOT re-transcribe
 * an enum that domain already owns — a second transcription could drift from
 * the locked schema. Where domain has the enum it is re-exported from the
 * domain constants verbatim; where no domain surface exists (the enums below
 * were not needed by tasks 6-8), the union is transcribed here directly from
 * migrations/0002_enums.sql with the file reference in the comment.
 */
import {
  EVIDENCE_STATUSES,
  GEMSTONE_KINDS,
  JEWELLERY_TYPES,
  METAL_CODES,
  PRODUCT_KINDS,
} from '@maihan/domain';

import { z } from 'zod';

/** SoT 8.3 evidence_status — re-exported from domain, never re-transcribed. */
export const EVIDENCE_STATUS_VALUES = EVIDENCE_STATUSES;
export const PRODUCT_KIND_VALUES = PRODUCT_KINDS;
export const JEWELLERY_TYPE_VALUES = JEWELLERY_TYPES;
export const GEMSTONE_KIND_VALUES = GEMSTONE_KINDS;
export const METAL_CODE_VALUES = METAL_CODES;

/** SoT 8.3 metal_code — re-exported from domain for the filter schemas. */
export { METAL_CODES };

/** migrations/0002_enums.sql — product_state. */
export const PRODUCT_STATE_VALUES = [
  'DRAFT',
  'ACTIVE',
  'ARCHIVED',
  'SOLD_OUT',
  'DISCONTINUED',
] as const;
export type ProductState = (typeof PRODUCT_STATE_VALUES)[number];

/** migrations/0002_enums.sql — record_state (gemstones, settings, setting_variants). */
export const RECORD_STATE_VALUES = ['DRAFT', 'ACTIVE', 'ARCHIVED'] as const;
export type RecordState = (typeof RECORD_STATE_VALUES)[number];

/** migrations/0002_enums.sql — stone_shape. */
export const STONE_SHAPE_VALUES = [
  'OVAL',
  'ROUND',
  'CUSHION',
  'EMERALD_CUT',
  'PEAR',
  'RADIANT',
  'PRINCESS',
  'HEART',
  'TRILLION',
  'ASSCHER_OCTAGON',
  'BAGUETTE',
  'MARQUISE',
  'OTHER',
] as const;
export type StoneShape = (typeof STONE_SHAPE_VALUES)[number];

/** migrations/0002_enums.sql — cutting_style. */
export const CUTTING_STYLE_VALUES = ['FACETED', 'CABOCHON', 'OTHER'] as const;
export type CuttingStyle = (typeof CUTTING_STYLE_VALUES)[number];

export const EvidenceStatusSchema = z.enum(EVIDENCE_STATUSES);
export const ProductKindSchema = z.enum(PRODUCT_KINDS);
export const JewelleryTypeSchema = z.enum(JEWELLERY_TYPES);
export type JewelleryType = z.infer<typeof JewelleryTypeSchema>;
export const GemstoneKindSchema = z.enum(GEMSTONE_KINDS);
export const MetalCodeSchema = z.enum(METAL_CODES);
export const ProductStateSchema = z.enum(PRODUCT_STATE_VALUES);
export const RecordStateSchema = z.enum(RECORD_STATE_VALUES);
export const StoneShapeSchema = z.enum(STONE_SHAPE_VALUES);
export const CuttingStyleSchema = z.enum(CUTTING_STYLE_VALUES);
