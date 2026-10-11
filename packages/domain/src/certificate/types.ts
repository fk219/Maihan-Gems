/**
 * packages/domain/src/certificate/types.ts
 *
 * Authority:
 *   - INITIAL_IMPLEMENTATION_PLAN.md Phase 8
 *   - technical_design/17_CERTIFICATE_INTELLIGENCE.md
 *   - PROJECT_SOURCE_OF_TRUTH.md Section 8.10, 18.7
 *   - Invariant INV-07 (a field not VERIFIED may never render as verified truth)
 */
import { DomainError } from '../errors.js';

export const VERIFICATION_STATUSES = [
  'UNVERIFIED',
  'EXTRACTED',
  'CROSS_CHECKED',
  'VERIFIED',
  'REJECTED',
] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const DOCUMENT_KINDS = [
  'CERTIFICATE',
  'GEM_REPORT',
  'APPRAISAL',
  'INVOICE',
  'POLICY',
  'OTHER',
] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

export const ANOMALY_SEVERITIES = ['INFO', 'WARN', 'ERROR'] as const;
export type AnomalySeverity = (typeof ANOMALY_SEVERITIES)[number];

export const ANOMALY_TYPES = [
  'WEIGHT_MISMATCH_SLUG',
  'WEIGHT_MISMATCH_SUM',
  'DIMENSION_IMPOSSIBLE',
  'DIMENSION_MISMATCH',
  'ORIGIN_CONFLICT',
  'TREATMENT_CONFLICT',
  'NUMBER_MISMATCH',
  'LOW_CONFIDENCE',
  'MULTIPLE_STONES_DETECTED',
] as const;
export type AnomalyType = (typeof ANOMALY_TYPES)[number];

export interface ExtractedField<T = string | number | null> {
  readonly value: T;
  readonly confidence: number;
  readonly bbox?: readonly [number, number, number, number] | null;
  readonly rawText?: string | null;
}

export interface CertificateExtractionSchema {
  readonly lab_name: ExtractedField<string | null>;
  readonly report_type: ExtractedField<string | null>;
  readonly certificate_number: ExtractedField<string | null>;
  readonly issue_date: ExtractedField<string | null>;
  readonly stone: {
    readonly weight_ct: ExtractedField<number | null>;
    readonly length_mm: ExtractedField<number | null>;
    readonly width_mm: ExtractedField<number | null>;
    readonly depth_mm: ExtractedField<number | null>;
  };
  readonly treatments: ReadonlyArray<ExtractedField<string>>;
  readonly origin: ExtractedField<string | null>;
}

export interface AnomalyReport {
  readonly type: AnomalyType;
  readonly severity: AnomalySeverity;
  readonly detail: Record<string, unknown>;
}

export interface StructuredGemstoneData {
  readonly slugWeightCt?: number | null;
  readonly totalWeightCt?: number | null;
  readonly stoneCount: number;
  readonly individualWeights?: ReadonlyArray<number>;
  readonly species?: string | null;
  readonly dimensions?: {
    readonly lengthMm?: number | null;
    readonly widthMm?: number | null;
    readonly depthMm?: number | null;
  } | null;
  readonly origin?: string | null;
  readonly knownTreatments?: ReadonlyArray<string>;
  readonly certificateNumber?: string | null;
}

export function isVerificationStatus(value: string): value is VerificationStatus {
  return (VERIFICATION_STATUSES as readonly string[]).includes(value);
}

export function parseVerificationStatus(value: string): VerificationStatus {
  if (!isVerificationStatus(value)) {
    throw new DomainError('INVALID_VERIFICATION_STATUS', `unknown verification status: ${value}`);
  }
  return value;
}
