/**
 * packages/ai/src/grounding/types.ts
 *
 * Authority: technical_design/18_AI_ORCHESTRATION_ARCHITECTURE.md §6
 */
import type { Citation } from '../tools/types.js';

export interface FactualClaim {
  readonly statement: string;
  readonly entityType: 'PRODUCT' | 'GEMSTONE' | 'CERTIFICATE' | 'DYO_RULE' | 'KNOWLEDGE';
  readonly entityId: string;
  readonly fieldName: string;
  readonly claimedValue: string | number;
  readonly sourceCitation?: Citation;
}

export interface GroundingEvaluation {
  readonly claim: FactualClaim;
  readonly verified: boolean;
  readonly reason: string;
  readonly survivingStatement: string | null;
}

export interface GroundingResult {
  readonly originalText: string;
  readonly groundedText: string;
  readonly totalClaims: number;
  readonly verifiedClaims: number;
  readonly strippedClaims: number;
  readonly groundedRatio: number;
  readonly survivingCitations: ReadonlyArray<Citation>;
  readonly requiresEscalation: boolean;
  readonly escalationReason?: string;
}
