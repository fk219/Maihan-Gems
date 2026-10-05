-- 0015_search_function
-- Authority: PROJECT_SOURCE_OF_TRUTH.md section 8.15, verbatim.
-- One logical unit: the vector search function. Embedding dimension 1024 is
-- fixed by ADR-018; changing it requires a full re-embed plus an HNSW rebuild.

-- Embedding dimension 1024 is a deliberate single-dimension choice (ADR-018).
-- Changing it requires a full re-embed plus an HNSW rebuild.
CREATE OR REPLACE FUNCTION match_knowledge_chunks(
  query_embedding vector(1024),
  query_text      text,
  match_count     int  DEFAULT 10,
  filter_doc_kind text[] DEFAULT NULL
)
RETURNS TABLE (
  chunk_id      uuid,
  document_id   uuid,
  document_slug text,
  title         text,
  content       text,
  heading_path  text[],
  similarity    double precision,
  text_rank     real,
  trust_tier    text
)
LANGUAGE sql STABLE AS $$
  WITH semantic AS (
    SELECT c.id, c.document_id, c.content, c.heading_path,
           1 - (c.embedding <=> query_embedding) AS sim
    FROM knowledge_chunks c
    JOIN knowledge_documents d ON d.id = c.document_id
    WHERE d.deleted_at IS NULL
      AND (filter_doc_kind IS NULL OR d.doc_kind = ANY(filter_doc_kind))
    ORDER BY c.embedding <=> query_embedding
    LIMIT GREATEST(match_count * 4, 40)
  ),
  lexical AS (
    SELECT c.id,
           ts_rank_cd(to_tsvector('english', c.content),
                      websearch_to_tsquery('english', query_text)) AS trank
    FROM knowledge_chunks c
    JOIN knowledge_documents d ON d.id = c.document_id
    WHERE d.deleted_at IS NULL
      AND query_text <> ''
      AND to_tsvector('english', c.content) @@ websearch_to_tsquery('english', query_text)
    LIMIT GREATEST(match_count * 4, 40)
  )
  SELECT s.id, d.id, d.slug, d.title, s.content, s.heading_path,
         s.sim, COALESCE(l.trank, 0)::real, d.trust_tier
  FROM semantic s
  JOIN knowledge_documents d ON d.id = s.document_id
  LEFT JOIN lexical l ON l.id = s.id
  ORDER BY (s.sim * 0.6 + COALESCE(l.trank, 0) * 0.4) DESC
  LIMIT match_count;
$$;
