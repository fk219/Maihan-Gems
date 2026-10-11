/**
 * packages/ai/src/rag/types.ts
 *
 * Authority: technical_design/19_RETRIEVAL_AND_RAG_ARCHITECTURE.md
 */
export type TrustTier = 'VERIFIED_PRODUCT_DATA' | 'CURATED' | 'COMMUNITY' | 'UNVERIFIED';

export interface KnowledgeDoc {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly docKind: string;
  readonly content: string;
  readonly trustTier: TrustTier;
  readonly locale?: string;
  readonly metadata?: Record<string, unknown>;
}

export interface KnowledgeChunk {
  readonly id: string;
  readonly documentId: string;
  readonly ordinal: number;
  readonly content: string;
  readonly tokenCount: number;
  readonly headingPath: ReadonlyArray<string>;
  readonly embedding?: ReadonlyArray<number>;
  readonly trustTier: TrustTier;
  readonly metadata?: Record<string, unknown>;
}

export interface SearchResultChunk extends KnowledgeChunk {
  readonly title: string;
  readonly slug: string;
  readonly similarity: number;
  readonly compositeScore: number;
}
