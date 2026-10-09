/**
 * packages/domain/src/search/ranking.ts
 *
 * Search ranking function and business modifier table (Phase 5 Task 7).
 *
 * Scope authority:
 *   - INITIAL_IMPLEMENTATION_PLAN.md Phase 5 Task 7:
 *     "Implement the weighted ranking function with the documented modifier table."
 *   - PROJECT_SOURCE_OF_TRUTH.md §11.3 & §14
 *   - technical_design/12_SEARCH_ARCHITECTURE.md §91-119:
 *     "score = 0.34 * textRankNormalised
 *            + 0.22 * semanticSimilarity (0 when semantic arm is off)
 *            + 0.16 * businessSignal
 *            + 0.12 * facetMatchBonus
 *            + 0.10 * availabilitySignal
 *            + 0.06 * recencySignal
 *
 *      Business modifiers:
 *        Verified certificate: x1.15
 *        stone_type recorded: x1.08
 *        In stock: x1.05
 *        Ready-made (J SKU): x0.95
 *        Heat Treated disclosed: x1.00 (NEVER penalised)
 *        Pair: x1.00
 *        Draft or archived: excluded"
 */

export interface SearchRankingWeights {
  readonly textRank: number;
  readonly semantic: number;
  readonly business: number;
  readonly facet: number;
  readonly availability: number;
  readonly recency: number;
}

export interface SearchRankingModifiers {
  readonly verifiedCertificate: number;
  readonly stoneTypeRecorded: number;
  readonly inStock: number;
  readonly readyMade: number;
  /**
   * CRITICAL GEMOLOGICAL INVARIANT:
   * Treatment is NEVER a ranking penalty. Modifying factor is strictly 1.00.
   */
  readonly heatTreated: number;
  readonly pair: number;
}

export interface SearchRankingConfig {
  readonly version: string;
  readonly weights: SearchRankingWeights;
  readonly modifiers: SearchRankingModifiers;
}

export const DEFAULT_SEARCH_RANKING_CONFIG: SearchRankingConfig = Object.freeze({
  version: 'ranking-v1',
  weights: Object.freeze({
    textRank: 0.34,
    semantic: 0.22,
    business: 0.16,
    facet: 0.12,
    availability: 0.10,
    recency: 0.06,
  }),
  modifiers: Object.freeze({
    verifiedCertificate: 1.15,
    stoneTypeRecorded: 1.08,
    inStock: 1.05,
    readyMade: 0.95,
    heatTreated: 1.00, // STRICT ARCHITECTURAL INVARIANT: NEVER DEMOTE TREATED STONES
    pair: 1.00,
  }),
});

export interface CandidateRankingSignals {
  readonly productId: string;
  readonly textRank: number;            // 0.0 to 1.0
  readonly semanticSimilarity: number;  // 0.0 to 1.0
  readonly businessSignal?: number;     // defaults to 1.0
  readonly facetMatchBonus?: number;    // defaults to 1.0
  readonly availability: boolean;       // in stock
  readonly state: string;               // 'ACTIVE' | 'DRAFT' | 'ARCHIVED'
  readonly createdAtEpochMs?: number;
  readonly referenceTimeEpochMs?: number;

  // Modifiers
  readonly hasVerifiedCertificate?: boolean;
  readonly stoneTypeRecorded?: boolean;
  readonly isReadyMade?: boolean;
  readonly isTreated?: boolean;
  readonly isPair?: boolean;
}

export interface RankedScoreBreakdown {
  readonly productId: string;
  readonly baseScore: number;
  readonly finalScore: number;
  readonly textComponent: number;
  readonly semanticComponent: number;
  readonly businessComponent: number;
  readonly facetComponent: number;
  readonly availabilityComponent: number;
  readonly recencyComponent: number;
  readonly modifierMultiplier: number;
  readonly excluded: boolean;
}

/**
 * Calculates deterministic normalized recency score between 0.0 and 1.0.
 * Decay half-life: 180 days.
 */
export function calculateRecencySignal(
  createdAtEpochMs?: number,
  referenceTimeEpochMs?: number,
): number {
  if (!createdAtEpochMs || !referenceTimeEpochMs || createdAtEpochMs > referenceTimeEpochMs) {
    return 1.0;
  }
  const ageDays = (referenceTimeEpochMs - createdAtEpochMs) / (1000 * 60 * 60 * 24);
  if (ageDays <= 0) return 1.0;
  // Half-life exponential decay: e^(-age / 180)
  return Math.max(0.0, Math.min(1.0, Math.exp(-ageDays / 180)));
}

/**
 * Computes business modifier multiplier for a candidate.
 */
export function calculateBusinessModifier(
  candidate: CandidateRankingSignals,
  config: SearchRankingConfig = DEFAULT_SEARCH_RANKING_CONFIG,
): number {
  let modifier = 1.0;

  if (candidate.hasVerifiedCertificate) {
    modifier *= config.modifiers.verifiedCertificate;
  }
  if (candidate.stoneTypeRecorded) {
    modifier *= config.modifiers.stoneTypeRecorded;
  }
  if (candidate.availability) {
    modifier *= config.modifiers.inStock;
  }
  if (candidate.isReadyMade) {
    modifier *= config.modifiers.readyMade;
  }
  if (candidate.isTreated) {
    modifier *= config.modifiers.heatTreated; // x1.00
  }
  if (candidate.isPair) {
    modifier *= config.modifiers.pair;
  }

  return modifier;
}

/**
 * Pure scoring function for a single candidate.
 */
export function scoreCandidate(
  candidate: CandidateRankingSignals,
  config: SearchRankingConfig = DEFAULT_SEARCH_RANKING_CONFIG,
): RankedScoreBreakdown {
  // Publication gate: draft or archived items are excluded (score 0.0)
  if (candidate.state !== 'ACTIVE') {
    return Object.freeze({
      productId: candidate.productId,
      baseScore: 0.0,
      finalScore: 0.0,
      textComponent: 0.0,
      semanticComponent: 0.0,
      businessComponent: 0.0,
      facetComponent: 0.0,
      availabilityComponent: 0.0,
      recencyComponent: 0.0,
      modifierMultiplier: 0.0,
      excluded: true,
    });
  }

  const { weights } = config;
  const textRankNorm = Math.max(0.0, Math.min(1.0, candidate.textRank));
  const semanticSim = Math.max(0.0, Math.min(1.0, candidate.semanticSimilarity));
  const business = Math.max(0.0, Math.min(1.0, candidate.businessSignal ?? 1.0));
  const facetBonus = Math.max(0.0, Math.min(1.0, candidate.facetMatchBonus ?? 1.0));
  const availabilitySig = candidate.availability ? 1.0 : 0.0;
  const recencySig = calculateRecencySignal(
    candidate.createdAtEpochMs,
    candidate.referenceTimeEpochMs,
  );

  const textComponent = weights.textRank * textRankNorm;
  const semanticComponent = weights.semantic * semanticSim;
  const businessComponent = weights.business * business;
  const facetComponent = weights.facet * facetBonus;
  const availabilityComponent = weights.availability * availabilitySig;
  const recencyComponent = weights.recency * recencySig;

  const baseScore =
    textComponent +
    semanticComponent +
    businessComponent +
    facetComponent +
    availabilityComponent +
    recencyComponent;

  const modifierMultiplier = calculateBusinessModifier(candidate, config);
  const finalScore = baseScore * modifierMultiplier;

  return Object.freeze({
    productId: candidate.productId,
    baseScore,
    finalScore,
    textComponent,
    semanticComponent,
    businessComponent,
    facetComponent,
    availabilityComponent,
    recencyComponent,
    modifierMultiplier,
    excluded: false,
  });
}

/**
 * Deterministically sorts scored candidates:
 * Primary: finalScore DESC
 * Secondary (tie-breaker): productId DESC
 */
export function rankCandidates(
  candidates: readonly CandidateRankingSignals[],
  config: SearchRankingConfig = DEFAULT_SEARCH_RANKING_CONFIG,
): readonly RankedScoreBreakdown[] {
  const scored = candidates
    .map((c) => scoreCandidate(c, config))
    .filter((s) => !s.excluded);

  return Object.freeze(
    scored.sort((a, b) => {
      if (b.finalScore !== a.finalScore) {
        return b.finalScore - a.finalScore;
      }
      return b.productId.localeCompare(a.productId);
    }),
  );
}
