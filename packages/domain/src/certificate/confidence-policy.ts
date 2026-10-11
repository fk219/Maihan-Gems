/**
 * packages/domain/src/certificate/confidence-policy.ts
 *
 * Authority:
 *   - technical_design/17_CERTIFICATE_INTELLIGENCE.md Section "Confidence policy"
 *   - Invariant INV-07 (a field not VERIFIED may never render as verified truth)
 *
 * Rules:
 *   - High: >= 0.90 (Auto-acceptable; promotable to CROSS_CHECKED if cross-checks pass)
 *   - Medium: 0.70 - 0.89 (Accepted but flagged; surfaced as "extracted, unverified")
 *   - Low: 0.50 - 0.69 (Routed to human review; never displayed as fact)
 *   - Rejected: < 0.50 (Stored as rejected; field reads as NULL in public reads)
 *
 * Whole-document verification rule:
 *   Every material field >= 0.90, zero unresolved ERROR anomalies, plus human approval.
 */
import type { CertificateExtractionSchema } from './types.js';

export type ConfidenceBand = 'HIGH' | 'MEDIUM' | 'LOW' | 'REJECTED';

export function evaluateConfidenceBand(confidence: number): ConfidenceBand {
  if (confidence >= 0.90) return 'HIGH';
  if (confidence >= 0.70) return 'MEDIUM';
  if (confidence >= 0.50) return 'LOW';
  return 'REJECTED';
}

export function isFieldPubliclyDisplayable(confidence: number): boolean {
  // Fields below 0.50 are withheld from public views (per migration 0017 and doc 17)
  return confidence >= 0.50;
}

export interface MaterialFieldAssessment {
  readonly fieldName: string;
  readonly confidence: number;
  readonly isHighConfidence: boolean;
  readonly valuePresent: boolean;
}

export function assessMaterialFields(
  extraction: CertificateExtractionSchema,
): ReadonlyArray<MaterialFieldAssessment> {
  const assessments: MaterialFieldAssessment[] = [];

  // Material fields: weight_ct, origin, treatments, lab_name
  if (extraction.stone.weight_ct.value !== null) {
    assessments.push({
      fieldName: 'weight_ct',
      confidence: extraction.stone.weight_ct.confidence,
      isHighConfidence: extraction.stone.weight_ct.confidence >= 0.90,
      valuePresent: true,
    });
  }

  if (extraction.origin.value !== null) {
    assessments.push({
      fieldName: 'origin',
      confidence: extraction.origin.confidence,
      isHighConfidence: extraction.origin.confidence >= 0.90,
      valuePresent: true,
    });
  }

  if (extraction.lab_name.value !== null) {
    assessments.push({
      fieldName: 'lab_name',
      confidence: extraction.lab_name.confidence,
      isHighConfidence: extraction.lab_name.confidence >= 0.90,
      valuePresent: true,
    });
  }

  for (let i = 0; i < extraction.treatments.length; i++) {
    const t = extraction.treatments[i]!;
    assessments.push({
      fieldName: `treatment_${i}`,
      confidence: t.confidence,
      isHighConfidence: t.confidence >= 0.90,
      valuePresent: true,
    });
  }

  return assessments;
}

export function canAutomateCrossCheckTransition(
  extraction: CertificateExtractionSchema,
  hasErrorAnomalies: boolean,
): boolean {
  if (hasErrorAnomalies) return false;

  const assessments = assessMaterialFields(extraction);
  if (assessments.length === 0) return false;

  // Threshold: all extracted material fields >= 0.85 and no ERROR anomalies
  return assessments.every((a) => a.confidence >= 0.85);
}

export function canPromoteToVerified(
  extraction: CertificateExtractionSchema,
  hasUnresolvedErrorAnomalies: boolean,
  hasHumanApproval: boolean,
): boolean {
  if (!hasHumanApproval) return false;
  if (hasUnresolvedErrorAnomalies) return false;

  const assessments = assessMaterialFields(extraction);
  if (assessments.length === 0) return false;

  // Whole-document threshold: every material field >= 0.90
  return assessments.every((a) => a.confidence >= 0.90);
}
