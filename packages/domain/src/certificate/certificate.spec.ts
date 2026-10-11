/**
 * packages/domain/src/certificate/certificate.spec.ts
 *
 * Test suite for Phase 8 Certificate Intelligence:
 *   - Confidence policies and threshold boundaries
 *   - 9 Authoritative Cross-Check anomaly evaluations
 *   - Deterministic State Machine transitions & human approval requirement
 */
import { describe, it, expect } from 'vitest';
import {
  evaluateConfidenceBand,
  isFieldPubliclyDisplayable,
  canAutomateCrossCheckTransition,
  canPromoteToVerified,
} from './confidence-policy.js';
import { runCertificateCrossChecks } from './cross-checks.js';
import { transitionCertificateStatus } from './state-machine.js';
import { expectErrorCode } from '../testing/expect-domain-code.js';
import type { CertificateExtractionSchema, StructuredGemstoneData } from './types.js';

function createMockExtraction(
  overrides?: Partial<CertificateExtractionSchema>,
): CertificateExtractionSchema {
  return {
    lab_name: { value: 'GIA', confidence: 0.95 },
    report_type: { value: 'GEM_REPORT', confidence: 0.92 },
    certificate_number: { value: 'GIA-21849102', confidence: 0.96 },
    issue_date: { value: '2026-01-15', confidence: 0.91 },
    stone: {
      weight_ct: { value: 3.42, confidence: 0.98 },
      length_mm: { value: 9.8, confidence: 0.94 },
      width_mm: { value: 7.9, confidence: 0.94 },
      depth_mm: { value: 5.2, confidence: 0.93 },
    },
    treatments: [{ value: 'NO_ENHANCEMENT', confidence: 0.95 }],
    origin: { value: 'Sri Lanka (Ceylon)', confidence: 0.92 },
    ...overrides,
  };
}

describe('Certificate Intelligence — Confidence Policy & Thresholds', () => {
  it('categorises confidence into the correct authoritative bands', () => {
    expect(evaluateConfidenceBand(0.95)).toBe('HIGH');
    expect(evaluateConfidenceBand(0.90)).toBe('HIGH');
    expect(evaluateConfidenceBand(0.89)).toBe('MEDIUM');
    expect(evaluateConfidenceBand(0.70)).toBe('MEDIUM');
    expect(evaluateConfidenceBand(0.69)).toBe('LOW');
    expect(evaluateConfidenceBand(0.50)).toBe('LOW');
    expect(evaluateConfidenceBand(0.49)).toBe('REJECTED');
    expect(evaluateConfidenceBand(0.12)).toBe('REJECTED');
  });

  it('withholds values below 0.50 from public display', () => {
    expect(isFieldPubliclyDisplayable(0.95)).toBe(true);
    expect(isFieldPubliclyDisplayable(0.50)).toBe(true);
    expect(isFieldPubliclyDisplayable(0.499)).toBe(false);
    expect(isFieldPubliclyDisplayable(0.1)).toBe(false);
  });

  it('correctly assesses whether all material fields are >= 0.85 for cross-check promotion', () => {
    const highExtraction = createMockExtraction();
    expect(canAutomateCrossCheckTransition(highExtraction, false)).toBe(true);
    expect(canAutomateCrossCheckTransition(highExtraction, true)).toBe(false); // blocked by ERROR anomaly

    // Origin confidence 0.54 (charter worked example)
    const lowOriginExtraction = createMockExtraction({
      origin: { value: 'Nigeria', confidence: 0.54 },
    });
    expect(canAutomateCrossCheckTransition(lowOriginExtraction, false)).toBe(false);
  });

  it('enforces whole-document verification threshold (>= 0.90, zero errors, human approval)', () => {
    const valid = createMockExtraction();
    expect(canPromoteToVerified(valid, false, true)).toBe(true);
    expect(canPromoteToVerified(valid, false, false)).toBe(false); // human review required
    expect(canPromoteToVerified(valid, true, true)).toBe(false); // error anomaly blocks

    // One material field at 0.88 (< 0.90) blocks verification
    const borderline = createMockExtraction({
      origin: { value: 'Sri Lanka', confidence: 0.88 },
    });
    expect(canPromoteToVerified(borderline, false, true)).toBe(false);
  });
});

describe('Certificate Intelligence — Authoritative Cross-Checks', () => {
  const baseStructured: StructuredGemstoneData = {
    slugWeightCt: 3.42,
    totalWeightCt: 3.42,
    stoneCount: 1,
    origin: 'Ratnapura, Sri Lanka',
    dimensions: { lengthMm: 9.8, widthMm: 7.9, depthMm: 5.2 },
    knownTreatments: ['NO_ENHANCEMENT'],
    certificateNumber: 'GIA-21849102',
  };

  it('emits no anomalies when OCR and structured data match perfectly', () => {
    const extraction = createMockExtraction();
    const anomalies = runCertificateCrossChecks(extraction, baseStructured);
    expect(anomalies).toEqual([]);
  });

  it('detects WEIGHT_MISMATCH_SLUG when OCR weight differs by > 2%', () => {
    const extraction = createMockExtraction({
      stone: {
        weight_ct: { value: 3.6, confidence: 0.98 }, // 3.6 vs 3.42 is ~5.2% difference
        length_mm: { value: 9.8, confidence: 0.9 },
        width_mm: { value: 7.9, confidence: 0.9 },
        depth_mm: { value: 5.2, confidence: 0.9 },
      },
    });
    const anomalies = runCertificateCrossChecks(extraction, baseStructured);
    const weightAnomaly = anomalies.find((a) => a.type === 'WEIGHT_MISMATCH_SLUG');
    expect(weightAnomaly).toBeDefined();
    expect(weightAnomaly?.severity).toBe('ERROR');
  });

  it('detects WEIGHT_MISMATCH_SUM for pairs when individual weights do not sum to total', () => {
    const pairStructured: StructuredGemstoneData = {
      stoneCount: 2,
      totalWeightCt: 4.0,
      individualWeights: [2.1, 2.2], // 4.3 vs 4.0 is > 2%
    };
    const extraction = createMockExtraction({
      stone: {
        weight_ct: { value: 4.0, confidence: 0.95 },
        length_mm: { value: null, confidence: 0 },
        width_mm: { value: null, confidence: 0 },
        depth_mm: { value: null, confidence: 0 },
      },
    });
    const anomalies = runCertificateCrossChecks(extraction, pairStructured);
    const sumAnomaly = anomalies.find((a) => a.type === 'WEIGHT_MISMATCH_SUM');
    expect(sumAnomaly).toBeDefined();
    expect(sumAnomaly?.severity).toBe('ERROR');
  });

  it('detects DIMENSION_IMPOSSIBLE when calculated density is out of bounds (< 1.5 or > 4.5)', () => {
    // Impossible: 10ct stone with tiny dimensions (ultra dense)
    const extraction = createMockExtraction({
      stone: {
        weight_ct: { value: 10.0, confidence: 0.95 },
        length_mm: { value: 4.0, confidence: 0.95 },
        width_mm: { value: 4.0, confidence: 0.95 },
        depth_mm: { value: 2.0, confidence: 0.95 },
      },
    });
    const anomalies = runCertificateCrossChecks(extraction, baseStructured);
    const denseAnomaly = anomalies.find((a) => a.type === 'DIMENSION_IMPOSSIBLE');
    expect(denseAnomaly).toBeDefined();
    expect(denseAnomaly?.severity).toBe('ERROR');
  });

  it('detects DIMENSION_MISMATCH when OCR dimensions differ by > 5%', () => {
    const extraction = createMockExtraction({
      stone: {
        weight_ct: { value: 3.42, confidence: 0.98 },
        length_mm: { value: 11.0, confidence: 0.95 }, // 11.0 vs 9.8 is > 5%
        width_mm: { value: 7.9, confidence: 0.95 },
        depth_mm: { value: 5.2, confidence: 0.95 },
      },
    });
    const anomalies = runCertificateCrossChecks(extraction, baseStructured);
    const dimAnomaly = anomalies.find((a) => a.type === 'DIMENSION_MISMATCH');
    expect(dimAnomaly).toBeDefined();
    expect(dimAnomaly?.severity).toBe('WARN');
  });

  it('detects ORIGIN_CONFLICT when OCR origin conflicts with database origin', () => {
    const extraction = createMockExtraction({
      origin: { value: 'Madagascar', confidence: 0.9 }, // Madagascar vs Sri Lanka
    });
    const anomalies = runCertificateCrossChecks(extraction, baseStructured);
    const originAnomaly = anomalies.find((a) => a.type === 'ORIGIN_CONFLICT');
    expect(originAnomaly).toBeDefined();
    expect(originAnomaly?.severity).toBe('WARN');
  });

  it('detects TREATMENT_CONFLICT when OCR declares treatment but DB says NO_ENHANCEMENT', () => {
    const extraction = createMockExtraction({
      treatments: [{ value: 'HEAT_TREATED', confidence: 0.95 }],
    });
    const anomalies = runCertificateCrossChecks(extraction, baseStructured);
    const treatAnomaly = anomalies.find((a) => a.type === 'TREATMENT_CONFLICT');
    expect(treatAnomaly).toBeDefined();
    expect(treatAnomaly?.severity).toBe('ERROR');
  });

  it('detects LOW_CONFIDENCE anomaly when a material field is below 0.85', () => {
    const extraction = createMockExtraction({
      origin: { value: 'Nigeria', confidence: 0.54 },
    });
    const anomalies = runCertificateCrossChecks(extraction, baseStructured);
    const lowConf = anomalies.find((a) => a.type === 'LOW_CONFIDENCE');
    expect(lowConf).toBeDefined();
    expect(lowConf?.severity).toBe('WARN');
  });
});

describe('Certificate Intelligence — State Machine', () => {
  it('transitions UNVERIFIED -> EXTRACTED when fields exist', () => {
    const next = transitionCertificateStatus('UNVERIFIED', {
      type: 'EXTRACT',
      hasExtractedFields: true,
    });
    expect(next).toBe('EXTRACTED');
  });

  it('transitions EXTRACTED -> CROSS_CHECKED only when all fields >= 0.85 and no errors', () => {
    const promoted = transitionCertificateStatus('EXTRACTED', {
      type: 'CROSS_CHECK',
      allFieldsAbove85: true,
      hasErrorAnomaly: false,
    });
    expect(promoted).toBe('CROSS_CHECKED');

    const blockedByError = transitionCertificateStatus('EXTRACTED', {
      type: 'CROSS_CHECK',
      allFieldsAbove85: true,
      hasErrorAnomaly: true,
    });
    expect(blockedByError).toBe('EXTRACTED');

    const blockedByConfidence = transitionCertificateStatus('EXTRACTED', {
      type: 'CROSS_CHECK',
      allFieldsAbove85: false,
      hasErrorAnomaly: false,
    });
    expect(blockedByConfidence).toBe('EXTRACTED');
  });

  it('transitions CROSS_CHECKED -> VERIFIED with human approval and >= 0.90 confidence', () => {
    const verified = transitionCertificateStatus('CROSS_CHECKED', {
      type: 'APPROVE',
      isHumanReviewer: true,
      allMaterialFieldsAbove90: true,
    });
    expect(verified).toBe('VERIFIED');
  });

  it('strictly forbids automated verification without human approval', () => {
    expectErrorCode(
      () =>
        transitionCertificateStatus('CROSS_CHECKED', {
          type: 'APPROVE',
          isHumanReviewer: false,
          allMaterialFieldsAbove90: true,
        }),
      'HUMAN_REVIEW_REQUIRED',
    );
  });

  it('strictly forbids verification if material fields are under 0.90', () => {
    expectErrorCode(
      () =>
        transitionCertificateStatus('CROSS_CHECKED', {
          type: 'APPROVE',
          isHumanReviewer: true,
          allMaterialFieldsAbove90: false,
        }),
      'INSUFFICIENT_CONFIDENCE_FOR_VERIFICATION',
    );
  });

  it('allows REJECT from any non-terminal state', () => {
    expect(transitionCertificateStatus('UNVERIFIED', { type: 'REJECT', reason: 'Unreadable' })).toBe('REJECTED');
    expect(transitionCertificateStatus('EXTRACTED', { type: 'REJECT', reason: 'Tampered' })).toBe('REJECTED');
    expect(transitionCertificateStatus('CROSS_CHECKED', { type: 'REJECT', reason: 'Fraudulent' })).toBe('REJECTED');
  });
});
