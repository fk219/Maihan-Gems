/**
 * packages/db/src/search/types.ts
 *
 * Search internal and candidate types across the retrieval arms:
 *   - Structured arm
 *   - Full-text arm
 *   - Trigram fallback arm
 *   - Semantic arm
 */
import type { ProductSummary } from '@maihan/contracts';

export interface SearchCandidate {
  readonly productId: string;
  readonly structuredScore: number;
  readonly textRank: number;
  readonly trigramSimilarity: number;
  readonly semanticSimilarity: number;
  readonly row: Record<string, unknown>;
}

export interface ScoredSearchResult {
  readonly item: ProductSummary;
  readonly finalScore: number;
  readonly textRank: number;
  readonly semanticSimilarity: number;
  readonly businessModifier: number;
  readonly facetBonus: number;
  readonly availabilitySignal: number;
  readonly recencySignal: number;
}
