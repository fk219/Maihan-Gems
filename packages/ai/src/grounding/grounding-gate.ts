/**
 * packages/ai/src/grounding/grounding-gate.ts
 *
 * Authority: technical_design/18_AI_ORCHESTRATION_ARCHITECTURE.md §6, NFR-06
 *
 * Grounding & Provenance Gate:
 * - Strips unverifiable claims (never softens or hedges)
 * - Computes grounded_ratio = cited claims / total claims (threshold 0.60)
 * - Refusal scripts for NULL structured fields (stone type, origin, treatment, certificate)
 */
import type { Citation } from '../tools/types.js';
import type { FactualClaim, GroundingEvaluation, GroundingResult } from './types.js';

export const REFUSAL_TEMPLATES = {
  STONE_TYPE_NULL:
    'I do not have a recorded stone type for this piece. I can show you the colour, cut and origin we do have, or connect you with a gemologist.',
  ORIGIN_NULL:
    'I do not have a confirmed geographic origin recorded for this stone in our verified catalogue.',
  TREATMENT_NULL_OR_UNKNOWN:
    'I do not have a verified treatment record for this stone. Maihan Gems does not assume stones are untreated without documentary proof.',
  CERTIFICATE_UNVERIFIED:
    'The documentation on file for this stone is currently pending independent verification.',
  PRICE_UNGROUNDED:
    'Live pricing is only quoted from verified database snapshots.',
} as const;

export class GroundingGate {
  /**
   * Evaluates a single factual claim against trusted structured data.
   */
  evaluateClaim(claim: FactualClaim, trustedData: Map<string, any>): GroundingEvaluation {
    const recordKey = `${claim.entityType}:${claim.entityId}`;
    const trustedEntity = trustedData.get(recordKey);

    if (!trustedEntity) {
      return {
        claim,
        verified: false,
        reason: `Entity ${recordKey} not found in trusted tool output.`,
        survivingStatement: null,
      };
    }

    const actualVal = trustedEntity[claim.fieldName];

    // Null refusal check
    if (actualVal === null || actualVal === undefined) {
      return {
        claim,
        verified: false,
        reason: `Field ${claim.fieldName} is NULL in trusted data.`,
        survivingStatement: null,
      };
    }

    // Special check for certificates: verification_status must be VERIFIED
    if (claim.entityType === 'CERTIFICATE') {
      const status = trustedEntity.verification_status ?? trustedEntity.verificationStatus;
      if (status !== 'VERIFIED') {
        return {
          claim,
          verified: false,
          reason: `Certificate ${claim.entityId} has status ${status}, must be VERIFIED to state factual claims.`,
          survivingStatement: null,
        };
      }
    }

    // Value entailment comparison
    const claimedStr = String(claim.claimedValue).trim().toLowerCase();
    const actualStr = String(actualVal).trim().toLowerCase();

    if (claimedStr === actualStr || actualStr.includes(claimedStr)) {
      return {
        claim,
        verified: true,
        reason: 'Claim entailed by trusted value.',
        survivingStatement: claim.statement,
      };
    }

    return {
      claim,
      verified: false,
      reason: `Claimed value "${claimedStr}" not entailed by actual value "${actualStr}".`,
      survivingStatement: null,
    };
  }

  /**
   * Filters candidate statements and strips ungrounded claims.
   */
  processResponse(
    candidateText: string,
    claims: ReadonlyArray<FactualClaim>,
    trustedData: Map<string, any>,
    citations: ReadonlyArray<Citation>,
  ): GroundingResult {
    if (claims.length === 0) {
      return {
        originalText: candidateText,
        groundedText: candidateText,
        totalClaims: 0,
        verifiedClaims: 0,
        strippedClaims: 0,
        groundedRatio: 1.0,
        survivingCitations: citations,
        requiresEscalation: false,
      };
    }

    let groundedText = candidateText;
    let verifiedCount = 0;
    let strippedCount = 0;

    for (const claim of claims) {
      const evaluation = this.evaluateClaim(claim, trustedData);
      if (evaluation.verified) {
        verifiedCount++;
      } else {
        strippedCount++;
        // Strip the ungrounded statement cleanly from the response
        groundedText = groundedText.replace(claim.statement, '').trim();
      }
    }

    const totalClaims = claims.length;
    const groundedRatio = totalClaims > 0 ? verifiedCount / totalClaims : 1.0;

    // Below 0.60 grounded_ratio requires escalation
    const requiresEscalation = groundedRatio < 0.60 || groundedText.length === 0;

    return {
      originalText: candidateText,
      groundedText: requiresEscalation
        ? `${groundedText}\n\n[Note: Portions of this inquiry could not be verified against our official gemmological archive and have been routed to private advisory.]`.trim()
        : groundedText,
      totalClaims,
      verifiedClaims: verifiedCount,
      strippedClaims: strippedCount,
      groundedRatio,
      survivingCitations: citations.filter((c) => c.confidence >= 0.85),
      requiresEscalation,
      escalationReason: requiresEscalation
        ? `Grounded ratio ${groundedRatio.toFixed(2)} below threshold 0.60.`
        : undefined,
    };
  }

  /**
   * Canonical null-refusal script generator.
   */
  generateNullRefusal(field: 'stone_type' | 'origin' | 'treatment' | 'certificate' | 'price'): string {
    switch (field) {
      case 'stone_type':
        return REFUSAL_TEMPLATES.STONE_TYPE_NULL;
      case 'origin':
        return REFUSAL_TEMPLATES.ORIGIN_NULL;
      case 'treatment':
        return REFUSAL_TEMPLATES.TREATMENT_NULL_OR_UNKNOWN;
      case 'certificate':
        return REFUSAL_TEMPLATES.CERTIFICATE_UNVERIFIED;
      case 'price':
        return REFUSAL_TEMPLATES.PRICE_UNGROUNDED;
    }
  }
}
