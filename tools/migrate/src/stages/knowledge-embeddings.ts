/**
 * tools/migrate — stage "knowledge-embeddings" (doc 33 & doc 18 §RAG).
 *
 * Idempotently populates `knowledge_documents` and `knowledge_chunks` (with
 * deterministic 1024-dim HNSW vectors and content-hash reentrancy) from:
 *   1. The curated gemmological education corpus (`seedCuratedKnowledgeCorpus`)
 *   2. Any published CMS pages (`pages` where `status = 'PUBLISHED'`)
 */
import { buildDeterministicEmbedding1024, seedCuratedKnowledgeCorpus } from '@maihan/db';
import type { StageContext } from './context.js';

export interface KnowledgeEmbeddingsResult {
  readonly curatedDocuments: number;
  readonly cmsDocuments: number;
  readonly chunksUpserted: number;
}

export async function runKnowledgeEmbeddings(
  ctx: StageContext,
): Promise<KnowledgeEmbeddingsResult> {
  const db = ctx.db;
  const curated = await seedCuratedKnowledgeCorpus(db);

  // Sync any published CMS pages into knowledge_documents & knowledge_chunks
  const pagesRes = await db.query<{
    id: string;
    slug: string;
    title: string;
    page_kind: string;
  }>(
    `SELECT id::text AS id, slug, title, page_kind::text AS page_kind
     FROM pages
     WHERE status = 'PUBLISHED' AND deleted_at IS NULL
     ORDER BY slug ASC`,
  );

  let cmsDocuments = 0;
  let cmsChunks = 0;

  for (const page of pagesRes.rows) {
    const contentText = `${page.title} (${page.page_kind})`;
    const vec = buildDeterministicEmbedding1024(contentText);
    const tokenCount = contentText.split(/\s+/).filter(Boolean).length;
    const docKind =
      page.page_kind === 'GEMSTONE_EDUCATION'
        ? 'EDUCATION'
        : page.page_kind === 'LEGAL'
          ? 'POLICY'
          : page.page_kind;

    const docUpsert = await db.query<{ id: string }>(
      `INSERT INTO knowledge_documents (
         slug, title, doc_kind, locale, source_page_id, content,
         trust_tier, status, checksum_sha256, embedded_at, embedding_model
       ) VALUES ($1, $2, $3, 'en', $4::uuid, $5, 'CURATED', 'ACTIVE', md5($5), now(), 'deterministic-1024-v1')
       ON CONFLICT (slug) DO UPDATE
       SET title = EXCLUDED.title,
           content = EXCLUDED.content,
           checksum_sha256 = EXCLUDED.checksum_sha256
       RETURNING id::text AS id`,
      [page.slug, page.title, docKind, page.id, contentText],
    );
    const docId = docUpsert.rows[0]?.id;
    if (docId) {
      cmsDocuments += 1;
      await db.query(
        `INSERT INTO knowledge_chunks (
           document_id, ordinal, content, token_count, heading_path,
           embedding, embedding_model, metadata
         ) VALUES ($1::uuid, 0, $2, $3, $4::text[], $5::vector, 'deterministic-1024-v1', $6::jsonb)
         ON CONFLICT (document_id, ordinal) DO UPDATE
         SET content = EXCLUDED.content,
             token_count = EXCLUDED.token_count,
             embedding = EXCLUDED.embedding`,
        [
          docId,
          contentText,
          tokenCount,
          [page.title],
          vec,
          JSON.stringify({ slug: page.slug, source_page_id: page.id }),
        ],
      );
      cmsChunks += 1;
    }
  }

  return {
    curatedDocuments: curated.documentsUpserted,
    cmsDocuments,
    chunksUpserted: curated.chunksUpserted + cmsChunks,
  };
}
