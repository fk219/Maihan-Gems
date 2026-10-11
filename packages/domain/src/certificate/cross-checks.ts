/**
 * packages/domain/src/certificate/cross-checks.ts
 *
 * Authority:
 *   - technical_design/17_CERTIFICATE_INTELLIGENCE.md Section "Cross-checks"
 *   - INITIAL_IMPLEMENTATION_PLAN.md Phase 8 Task 5
 *
 * Implements the 9 authoritative cross-checks:
 *   1. WEIGHT_MISMATCH_SLUG: OCR total differs from slug or total_weight_ct by > 2% (ERROR)
 *   2. WEIGHT_MISMATCH_SUM: for pairs, individual OCR weights do not sum to total_weight_ct (ERROR)
 *   3. DIMENSION_IMPOSSIBLE: implied density outside 1.5 - 4.5 g/cm3 for stated species (ERROR)
 *   4. DIMENSION_MISMATCH: OCR dimensions differ from structured dimensions by > 5% (WARN)
 *   5. ORIGIN_CONFLICT: OCR origin differs from structured origin (WARN)
 *   6. TREATMENT_CONFLICT: OCR declares treatment that structured marks UNKNOWN / NO_ENHANCEMENT conflict (ERROR)
 *   7. NUMBER_MISMATCH: certificate number present in OCR but not stored or vice versa (WARN)
 *   8. LOW_CONFIDENCE: any material field below 0.85 (WARN)
 *   9. MULTIPLE_STONES_DETECTED: document describes more stones than gemstone.stone_count (WARN)
 */
import type {
  CertificateExtractionSchema,
  StructuredGemstoneData,
  AnomalyReport,
} from './types.js';

export function runCertificateCrossChecks(
  extraction: CertificateExtractionSchema,
  structured: StructuredGemstoneData,
): ReadonlyArray<AnomalyReport> {
  const anomalies: AnomalyReport[] = [];

  const ocrWeight = extraction.stone.weight_ct.value;
  const ocrLength = extraction.stone.length_mm.value;
  const ocrWidth = extraction.stone.width_mm.value;
  const ocrDepth = extraction.stone.depth_mm.value;

  // 1. WEIGHT_MISMATCH_SLUG (ERROR)
  if (ocrWeight !== null && typeof ocrWeight === 'number') {
    const targetWeight = structured.slugWeightCt ?? structured.totalWeightCt;
    if (targetWeight !== undefined && targetWeight !== null && targetWeight > 0) {
      const diffPct = Math.abs(ocrWeight - targetWeight) / targetWeight;
      if (diffPct > 0.02) {
        anomalies.push({
          type: 'WEIGHT_MISMATCH_SLUG',
          severity: 'ERROR',
          detail: {
            ocrWeight,
            targetWeight,
            diffPct: Math.round(diffPct * 10000) / 100,
            thresholdPct: 2.0,
          },
        });
      }
    }
  }

  // 2. WEIGHT_MISMATCH_SUM (ERROR)
  if (
    structured.stoneCount === 2 &&
    structured.individualWeights &&
    structured.individualWeights.length === 2 &&
    structured.totalWeightCt
  ) {
    const sum = structured.individualWeights[0]! + structured.individualWeights[1]!;
    const diffPct = Math.abs(sum - structured.totalWeightCt) / structured.totalWeightCt;
    if (diffPct > 0.02) {
      anomalies.push({
        type: 'WEIGHT_MISMATCH_SUM',
        severity: 'ERROR',
        detail: {
          individualWeights: structured.individualWeights,
          sum,
          totalWeightCt: structured.totalWeightCt,
          diffPct: Math.round(diffPct * 10000) / 100,
        },
      });
    }
  }

  // 3. DIMENSION_IMPOSSIBLE (ERROR)
  // Approximate volume of ellipsoid / gem in cm3:
  // V ≈ (4/3 * pi * (L/2) * (W/2) * (D/2)) / 1000 cm3
  // 1 ct = 0.200 grams. Implied density = mass_g / volume_cm3.
  if (
    ocrWeight !== null &&
    ocrLength !== null &&
    ocrWidth !== null &&
    ocrDepth !== null &&
    ocrLength > 0 &&
    ocrWidth > 0 &&
    ocrDepth > 0
  ) {
    const massGrams = ocrWeight * 0.2;
    const volumeMm3 = (Math.PI / 6) * ocrLength * ocrWidth * ocrDepth;
    const volumeCm3 = volumeMm3 / 1000;
    if (volumeCm3 > 0) {
      const density = massGrams / volumeCm3;
      if (density < 1.5 || density > 4.5) {
        anomalies.push({
          type: 'DIMENSION_IMPOSSIBLE',
          severity: 'ERROR',
          detail: {
            ocrWeight,
            dimensionsMm: [ocrLength, ocrWidth, ocrDepth],
            calculatedDensity: Math.round(density * 100) / 100,
            validRange: [1.5, 4.5],
          },
        });
      }
    }
  }

  // 4. DIMENSION_MISMATCH (WARN)
  if (structured.dimensions) {
    const dims = [
      { name: 'length', ocr: ocrLength, db: structured.dimensions.lengthMm },
      { name: 'width', ocr: ocrWidth, db: structured.dimensions.widthMm },
      { name: 'depth', ocr: ocrDepth, db: structured.dimensions.depthMm },
    ];
    for (const d of dims) {
      if (d.ocr !== null && d.db !== undefined && d.db !== null && d.db > 0) {
        const diff = Math.abs(d.ocr - d.db) / d.db;
        if (diff > 0.05) {
          anomalies.push({
            type: 'DIMENSION_MISMATCH',
            severity: 'WARN',
            detail: {
              dimension: d.name,
              ocr: d.ocr,
              db: d.db,
              diffPct: Math.round(diff * 10000) / 100,
              thresholdPct: 5.0,
            },
          });
        }
      }
    }
  }

  // 5. ORIGIN_CONFLICT (WARN)
  if (extraction.origin.value !== null && structured.origin) {
    const normOcrOrigin = extraction.origin.value.trim().toLowerCase();
    const normDbOrigin = structured.origin.trim().toLowerCase();
    // Check direct substring inclusion or word token overlap
    const ocrTokens = normOcrOrigin.split(/[\s,()\/]+/).filter((t) => t.length > 2);
    const dbTokens = normDbOrigin.split(/[\s,()\/]+/).filter((t) => t.length > 2);
    const hasTokenOverlap = ocrTokens.some((t) => dbTokens.includes(t));

    if (!normDbOrigin.includes(normOcrOrigin) && !normOcrOrigin.includes(normDbOrigin) && !hasTokenOverlap) {
      anomalies.push({
        type: 'ORIGIN_CONFLICT',
        severity: 'WARN',
        detail: {
          ocrOrigin: extraction.origin.value,
          dbOrigin: structured.origin,
        },
      });
    }
  }

  // 6. TREATMENT_CONFLICT (ERROR)
  if (extraction.treatments.length > 0 && structured.knownTreatments) {
    const declaredTreatments = extraction.treatments
      .map((t) => t.value.trim().toUpperCase())
      .filter((v) => v !== 'NO_ENHANCEMENT' && v !== 'NONE' && v !== 'UNTREATED');

    const dbTreatments = structured.knownTreatments.map((t) => t.trim().toUpperCase());
    const isDbUntreated =
      dbTreatments.includes('NO_ENHANCEMENT') || dbTreatments.length === 0;

    if (declaredTreatments.length > 0 && isDbUntreated) {
      anomalies.push({
        type: 'TREATMENT_CONFLICT',
        severity: 'ERROR',
        detail: {
          ocrTreatments: declaredTreatments,
          dbTreatments,
        },
      });
    }
  }

  // 7. NUMBER_MISMATCH (WARN)
  const ocrNum = extraction.certificate_number.value;
  const dbNum = structured.certificateNumber;
  if ((ocrNum && !dbNum) || (!ocrNum && dbNum) || (ocrNum && dbNum && ocrNum.trim() !== dbNum.trim())) {
    anomalies.push({
      type: 'NUMBER_MISMATCH',
      severity: 'WARN',
      detail: {
        ocrCertificateNumber: ocrNum ?? null,
        dbCertificateNumber: dbNum ?? null,
      },
    });
  }

  // 8. LOW_CONFIDENCE (WARN)
  const checkFields = [
    { field: 'weight_ct', conf: extraction.stone.weight_ct.confidence, val: extraction.stone.weight_ct.value },
    { field: 'origin', conf: extraction.origin.confidence, val: extraction.origin.value },
    { field: 'lab_name', conf: extraction.lab_name.confidence, val: extraction.lab_name.value },
    { field: 'certificate_number', conf: extraction.certificate_number.confidence, val: extraction.certificate_number.value },
  ];
  for (const f of checkFields) {
    if (f.val !== null && f.conf < 0.85) {
      anomalies.push({
        type: 'LOW_CONFIDENCE',
        severity: 'WARN',
        detail: {
          field: f.field,
          confidence: f.conf,
          threshold: 0.85,
        },
      });
    }
  }

  // 9. MULTIPLE_STONES_DETECTED (WARN)
  // If report states multiple stones while structured stoneCount is 1
  if (
    structured.stoneCount === 1 &&
    extraction.report_type.value &&
    extraction.report_type.value.toLowerCase().includes('pair')
  ) {
    anomalies.push({
      type: 'MULTIPLE_STONES_DETECTED',
      severity: 'WARN',
      detail: {
        reportType: extraction.report_type.value,
        stoneCount: structured.stoneCount,
      },
    });
  }

  return anomalies;
}
