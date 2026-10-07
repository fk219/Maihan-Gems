/**
 * packages/domain — enum unions mirrored from the locked schema.
 *
 * These are the PostgreSQL enum types the Task 6 domain surface needs,
 * declared as TypeScript literal unions with membership guards. The members
 * are transcribed verbatim from PROJECT_SOURCE_OF_TRUTH.md section 8.3 —
 * never invented, never extended here. A new member is a schema change and
 * requires the ADR process first (doc 04, "Implementation constraints").
 *
 * Guards throw DomainError with a stable code; they validate, never normalise.
 */
import { DomainError } from './errors.js';

/** Source of Truth section 8.3 — product_kind. */
export const PRODUCT_KINDS = ['CONFIGURED', 'READY_MADE', 'LOOSE_STONE', 'STONE_PAIR', 'SETTING_ONLY'] as const;
export type ProductKind = (typeof PRODUCT_KINDS)[number];

/** Source of Truth section 8.3 — jewellery_type (8 members; R10-equivalent note: BROOCH/CUFFLINKS/CHARM are enum members, not observed categories). */
export const JEWELLERY_TYPES = ['RING', 'EARRINGS', 'NECKLACE', 'PENDANT', 'BRACELET', 'BROOCH', 'CUFFLINKS', 'CHARM'] as const;
export type JewelleryType = (typeof JEWELLERY_TYPES)[number];

/** Source of Truth section 8.3 — gemstone_kind. */
export const GEMSTONE_KINDS = ['SINGLE', 'PAIR'] as const;
export type GemstoneKind = (typeof GEMSTONE_KINDS)[number];

/** Source of Truth section 8.3 — metal_code (all 15 enum members; R10 is enum-only and never observed in evidence). */
export const METAL_CODES = [
  'W10', 'Y10', 'R10',
  'W14', 'Y14', 'R14',
  'W18', 'Y18', 'R18',
  'PT', 'SL',
  'YW14', 'YW18', 'WY14', 'WY18',
] as const;
export type MetalCode = (typeof METAL_CODES)[number];

/** Source of Truth section 8.3 — evidence_status (the evidence hierarchy). */
export const EVIDENCE_STATUSES = ['OBSERVED', 'EXTRACTED', 'PATTERN', 'INFERRED', 'UNKNOWN'] as const;
export type EvidenceStatus = (typeof EVIDENCE_STATUSES)[number];

export function isProductKind(value: string): value is ProductKind {
  return (PRODUCT_KINDS as readonly string[]).includes(value);
}

export function isJewelleryType(value: string): value is JewelleryType {
  return (JEWELLERY_TYPES as readonly string[]).includes(value);
}

export function isGemstoneKind(value: string): value is GemstoneKind {
  return (GEMSTONE_KINDS as readonly string[]).includes(value);
}

export function isMetalCode(value: string): value is MetalCode {
  return (METAL_CODES as readonly string[]).includes(value);
}

export function isEvidenceStatus(value: string): value is EvidenceStatus {
  return (EVIDENCE_STATUSES as readonly string[]).includes(value);
}

export function parseProductKind(value: string): ProductKind {
  if (!isProductKind(value)) throw new DomainError('INVALID_PRODUCT_KIND', `unknown product kind: ${value}`);
  return value;
}

export function parseJewelleryType(value: string): JewelleryType {
  if (!isJewelleryType(value)) throw new DomainError('INVALID_JEWELLERY_TYPE', `unknown jewellery type: ${value}`);
  return value;
}

export function parseGemstoneKind(value: string): GemstoneKind {
  if (!isGemstoneKind(value)) throw new DomainError('INVALID_GEMSTONE_KIND', `unknown gemstone kind: ${value}`);
  return value;
}

export function parseMetalCode(value: string): MetalCode {
  if (!isMetalCode(value)) throw new DomainError('INVALID_METAL_CODE', `unknown metal code: ${value}`);
  return value;
}

export function parseEvidenceStatus(value: string): EvidenceStatus {
  if (!isEvidenceStatus(value)) throw new DomainError('INVALID_EVIDENCE_STATUS', `unknown evidence status: ${value}`);
  return value;
}
