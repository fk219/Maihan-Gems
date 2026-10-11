/**
 * packages/domain/src/configuration/compatibility-engine.ts
 *
 * Authority:
 *   - technical_design/14_DYO_ARCHITECTURE.md sections 5 & 6
 *   - PROJECT_SOURCE_OF_TRUTH.md section 7.2 (INV-01, INV-02, INV-03)
 *
 * Rules:
 *   1. Structural invariants first:
 *      - INV-01: exactly one setting variant AND (one gemstone XOR one pair)
 *      - INV-02: pair attached only to EARRINGS
 *      - INV-03: single gemstone attached only to non-EARRINGS (RING, PENDANT, NECKLACE, BRACELET, etc.)
 *   2. Persisted rules evaluated:
 *      - DENY beats ALLOW
 *      - REQUIRES_REVIEW yields REQUIRES_REVIEW, not a block
 *      - More specific ALLOW beats less specific
 *   3. If any DENY or invariant fails => INCOMPATIBLE
 *   4. If no matching rule => UNKNOWN (never false compatibility)
 */
import type { JewelleryType, CompatibilityResult, GemstoneKind } from '../enums.js';

export interface EvaluatedStoneInput {
  readonly kind: GemstoneKind; // 'SINGLE' or 'PAIR'
  readonly varietyId?: string | null;
  readonly colourId?: string | null;
  readonly shape?: string | null;
  readonly weightCt?: number | null;
  readonly lengthMm?: number | null;
  readonly widthMm?: number | null;
  readonly treatmentId?: string | null;
}

export interface EvaluatedSettingInput {
  readonly settingId: string;
  readonly jewelleryType: JewelleryType;
}

export interface CompatibilityRuleInput {
  readonly id: string;
  readonly settingId: string;
  readonly jewelleryType?: JewelleryType | null;
  readonly stoneKind: GemstoneKind;
  readonly varietyId?: string | null;
  readonly colourId?: string | null;
  readonly shape?: string | null;
  readonly minWeightCt?: number | null;
  readonly maxWeightCt?: number | null;
  readonly minLengthMm?: number | null;
  readonly maxLengthMm?: number | null;
  readonly minWidthMm?: number | null;
  readonly maxWidthMm?: number | null;
  readonly requiresTreatmentId?: string | null;
  readonly forbidsTreatmentId?: string | null;
  readonly ruleKind: 'ALLOW' | 'DENY' | 'REQUIRES_REVIEW';
  readonly priority: number;
  readonly explanation: string;
}

export interface RuleOutcomeDetail {
  readonly ruleId?: string;
  readonly rule: string;
  readonly outcome: 'PASS' | 'FAIL' | 'REVIEW';
  readonly message: string;
  readonly limit?: number;
  readonly actual?: number;
}

export interface CompatibilityEvaluationOutput {
  readonly status: CompatibilityResult;
  readonly ruleDetails: readonly RuleOutcomeDetail[];
}

export function evaluateCompatibility(
  setting: EvaluatedSettingInput,
  stone: EvaluatedStoneInput | null,
  rules: readonly CompatibilityRuleInput[],
): CompatibilityEvaluationOutput {
  const details: RuleOutcomeDetail[] = [];

  // Step 1: Structural Invariants
  if (stone === null) {
    return {
      status: 'INCOMPATIBLE',
      ruleDetails: [
        {
          rule: 'INV-01',
          outcome: 'FAIL',
          message: 'A complete configuration requires a gemstone or gemstone pair.',
        },
      ],
    };
  }

  // INV-02: Pair attached ONLY to EARRINGS
  if (stone.kind === 'PAIR' && setting.jewelleryType !== 'EARRINGS') {
    details.push({
      rule: 'INV-02',
      outcome: 'FAIL',
      message: `Gemstone pair may only attach to EARRINGS; selected jewellery type is ${setting.jewelleryType}.`,
    });
  }

  // INV-03: Single stone attached ONLY to non-EARRINGS
  if (stone.kind === 'SINGLE' && setting.jewelleryType === 'EARRINGS') {
    details.push({
      rule: 'INV-03',
      outcome: 'FAIL',
      message: 'Earrings require a matched gemstone pair; single stone is not permitted.',
    });
  }

  if (details.length > 0) {
    return {
      status: 'INCOMPATIBLE',
      ruleDetails: details,
    };
  }

  // Step 2: Filter matching rules for this setting
  const matchingRules = rules.filter((r) => {
    if (r.settingId !== setting.settingId) return false;
    if (r.jewelleryType && r.jewelleryType !== setting.jewelleryType) return false;
    if (r.stoneKind !== stone.kind) return false;
    if (r.varietyId && stone.varietyId && r.varietyId !== stone.varietyId) return false;
    if (r.colourId && stone.colourId && r.colourId !== stone.colourId) return false;
    if (r.shape && stone.shape && r.shape !== stone.shape) return false;

    // Weight bounds
    if (r.minWeightCt != null && stone.weightCt != null && stone.weightCt < r.minWeightCt) return false;
    if (r.maxWeightCt != null && stone.weightCt != null && stone.weightCt > r.maxWeightCt) return false;

    // Dimension bounds
    if (r.minLengthMm != null && stone.lengthMm != null && stone.lengthMm < r.minLengthMm) return false;
    if (r.maxLengthMm != null && stone.lengthMm != null && stone.lengthMm > r.maxLengthMm) return false;
    if (r.minWidthMm != null && stone.widthMm != null && stone.widthMm < r.minWidthMm) return false;
    if (r.maxWidthMm != null && stone.widthMm != null && stone.widthMm > r.maxWidthMm) return false;

    // Treatment bounds
    if (r.requiresTreatmentId && stone.treatmentId !== r.requiresTreatmentId) return false;
    if (r.forbidsTreatmentId && stone.treatmentId === r.forbidsTreatmentId) return false;

    return true;
  });

  // Step 3: If no rule matches, return UNKNOWN (never false compatibility per SoT)
  if (matchingRules.length === 0) {
    return {
      status: 'UNKNOWN',
      ruleDetails: [
        {
          rule: 'RULE_MATCH',
          outcome: 'REVIEW',
          message: 'No empirical compatibility rule verified for this combination. Concierge consultation recommended.',
        },
      ],
    };
  }

  // Precedence order:
  // 1. Any DENY rule triggers immediate INCOMPATIBLE
  const denyRule = matchingRules.find((r) => r.ruleKind === 'DENY');
  if (denyRule) {
    return {
      status: 'INCOMPATIBLE',
      ruleDetails: [
        {
          ruleId: denyRule.id,
          rule: 'DENY_RULE',
          outcome: 'FAIL',
          message: denyRule.explanation,
        },
      ],
    };
  }

  // 2. Any REQUIRES_REVIEW rule triggers REQUIRES_REVIEW
  const reviewRule = matchingRules.find((r) => r.ruleKind === 'REQUIRES_REVIEW');
  if (reviewRule) {
    return {
      status: 'REQUIRES_REVIEW',
      ruleDetails: [
        {
          ruleId: reviewRule.id,
          rule: 'REQUIRES_REVIEW_RULE',
          outcome: 'REVIEW',
          message: reviewRule.explanation,
        },
      ],
    };
  }

  // 3. ALLOW rule matched
  const allowRule = matchingRules.find((r) => r.ruleKind === 'ALLOW');
  if (allowRule) {
    return {
      status: 'COMPATIBLE',
      ruleDetails: [
        {
          ruleId: allowRule.id,
          rule: 'ALLOW_RULE',
          outcome: 'PASS',
          message: allowRule.explanation,
        },
      ],
    };
  }

  return {
    status: 'UNKNOWN',
    ruleDetails: [],
  };
}
