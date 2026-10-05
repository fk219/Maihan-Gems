-- 0001_extensions
-- Authority: PROJECT_SOURCE_OF_TRUTH.md section 8.1 (statements verbatim) and
-- technical_design/04 section "Extensions".
-- One logical unit: the six extensions the validated schema requires, in the
-- documented order. doc 04 requires this migration to "fail loudly" if a
-- required extension is unavailable on the target before any table is
-- created; the final DO block asserts that availability.
-- Extension notes (Source of Truth section 8.1):
--   vector               required  -- pgvector: vector(1024) + HNSW
--   citext               required  -- customers.email is CITEXT
--   pg_trgm              required  -- GIN trigram: typo tolerance, slug similarity
--   unaccent             required  -- diacritic-insensitive search
--   btree_gin            required  -- scalar columns inside composite GIN
--   pg_stat_statements   optional  -- requires shared_preload_libraries (doc 04)

CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS citext;
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS unaccent;
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS btree_gin;
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
--> statement-breakpoint
DO $$
DECLARE
  missing_required text;
  missing_optional text;
BEGIN
  SELECT string_agg(name, ', ') INTO missing_required
  FROM (VALUES ('vector'), ('citext'), ('pg_trgm'), ('unaccent'), ('btree_gin')) AS required(name)
  WHERE NOT EXISTS (SELECT 1 FROM pg_extension ext WHERE ext.extname = required.name);

  IF missing_required IS NOT NULL THEN
    RAISE EXCEPTION 'migration 0001_extensions: required PostgreSQL extensions absent on target: %', missing_required;
  END IF;

  SELECT string_agg(name, ', ') INTO missing_optional
  FROM (VALUES ('pg_stat_statements')) AS optional(name)
  WHERE NOT EXISTS (SELECT 1 FROM pg_extension ext WHERE ext.extname = optional.name);

  IF missing_optional IS NOT NULL THEN
    RAISE WARNING 'migration 0001_extensions: optional extension absent (doc 04 marks pg_stat_statements optional): %', missing_optional;
  END IF;
END
$$;
