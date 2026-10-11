/**
 * packages/ai/src/rag/retriever.ts
 *
 * Authority: technical_design/19_RETRIEVAL_AND_RAG_ARCHITECTURE.md §4
 *
 * Hybrid knowledge retrieval with trust-tier multipliers:
 * - VERIFIED_PRODUCT_DATA: 1.2
 * - CURATED: 1.0
 * - COMMUNITY: 0.8
 * - UNVERIFIED: 0.5
 */
import type { KnowledgeDoc, KnowledgeChunk, SearchResultChunk, TrustTier } from './types.js';

const TRUST_TIER_MULTIPLIERS: Record<TrustTier, number> = {
  VERIFIED_PRODUCT_DATA: 1.2,
  CURATED: 1.0,
  COMMUNITY: 0.8,
  UNVERIFIED: 0.5,
};

function cosineSimilarity(a: ReadonlyArray<number>, b: ReadonlyArray<number>): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom > 0 ? dot / denom : 0;
}

export class KnowledgeRetriever {
  private readonly docs: Map<string, KnowledgeDoc> = new Map();
  private readonly chunks: KnowledgeChunk[] = [];

  indexDocument(doc: KnowledgeDoc, chunks: ReadonlyArray<KnowledgeChunk>): void {
    this.docs.set(doc.id, doc);
    this.chunks.push(...chunks);
  }

  hybridSearch(
    queryText: string,
    queryEmbedding?: ReadonlyArray<number>,
    limit = 3,
    allowedKinds?: ReadonlyArray<string>,
  ): ReadonlyArray<SearchResultChunk> {
    const terms = queryText.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
    const results: SearchResultChunk[] = [];

    for (const chunk of this.chunks) {
      const doc = this.docs.get(chunk.documentId);
      if (!doc) continue;

      if (allowedKinds && allowedKinds.length > 0 && !allowedKinds.includes(doc.docKind)) {
        continue;
      }

      // 1. Text term matching score
      const contentLower = chunk.content.toLowerCase();
      let matchCount = 0;
      for (const t of terms) {
        if (contentLower.includes(t)) matchCount++;
      }
      const textScore = terms.length > 0 ? matchCount / terms.length : 0.5;

      // 2. Vector score (if embedding provided)
      let vectorScore = 0.5;
      if (queryEmbedding && chunk.embedding) {
        vectorScore = cosineSimilarity(queryEmbedding, chunk.embedding);
      }

      // Hybrid combination
      const baseScore = queryEmbedding && chunk.embedding ? 0.4 * textScore + 0.6 * vectorScore : textScore;
      const multiplier = TRUST_TIER_MULTIPLIERS[chunk.trustTier] ?? 1.0;
      const compositeScore = baseScore * multiplier;

      if (compositeScore > 0.1) {
        results.push({
          ...chunk,
          title: doc.title,
          slug: doc.slug,
          similarity: Number(baseScore.toFixed(4)),
          compositeScore: Number(compositeScore.toFixed(4)),
        });
      }
    }

    results.sort((a, b) => b.compositeScore - a.compositeScore);
    return results.slice(0, limit);
  }
}
