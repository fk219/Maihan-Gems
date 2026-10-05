-- 0003_migration_staging
-- Authority: PROJECT_SOURCE_OF_TRUTH.md section 8.4, verbatim.
-- One logical unit: the migration and staging schema. Loaded first, never
-- queried by the storefront. Guarantees a replayable pipeline (doc 33).

CREATE TABLE import_batches (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_key           TEXT NOT NULL UNIQUE,        -- e.g. 'ng-2026-10-03-urls-v1'
  source_system       TEXT NOT NULL DEFAULT 'naturalgemstones.com',
  source_artifact     TEXT NOT NULL,               -- 'urls.jsonl'
  source_sha256       TEXT,                        -- integrity gate
  status              job_state NOT NULL DEFAULT 'QUEUED',
  started_at          TIMESTAMPTZ, finished_at TIMESTAMPTZ,
  records_seen        BIGINT DEFAULT 0,
  records_accepted    BIGINT DEFAULT 0,
  records_rejected    BIGINT DEFAULT 0,
  records_quarantined BIGINT DEFAULT 0,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint
-- Raw, verbatim, immutable. One row per source record, never normalized.
CREATE TABLE staging_source_pages (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_batch_id     UUID NOT NULL REFERENCES import_batches(id),
  source_url          TEXT NOT NULL,
  source_path         TEXT,
  source_title        TEXT,
  source_page_type    TEXT,
  source_status_code  INTEGER,
  source_content_hash TEXT,
  source_html_file    TEXT,
  source_html_sha256  TEXT,
  source_html_bytes   INTEGER,
  source_text_length  INTEGER,
  source_json         JSONB NOT NULL,              -- verbatim record
  ingested_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (import_batch_id, source_url)
);
--> statement-breakpoint
CREATE INDEX ON staging_source_pages (import_batch_id);
--> statement-breakpoint
CREATE INDEX ON staging_source_pages USING gin (source_json jsonb_path_ops);
--> statement-breakpoint
-- Deterministic parser output with the evidence ledger for every derived value.
CREATE TABLE staging_parsed_urls (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_batch_id     UUID NOT NULL REFERENCES import_batches(id),
  source_url          TEXT NOT NULL,
  url_family          TEXT NOT NULL,   -- LOOSE_STONE | STONE_PAIR | SETTING | DYO | READY_MADE
                                       -- | VARIETY_INDEX | CATEGORY_INDEX | FUNCTIONAL | EDUCATION | UNKNOWN
  route_depth         SMALLINT,
  variety_slug        TEXT,
  colour_slug         TEXT,
  form_slug           TEXT,             -- pairs | rings | settings
  stone_weight_ct     NUMERIC(8,3),
  origin_slug         TEXT,
  shape_slug          TEXT,
  cut_slug            TEXT,
  jewellery_type_slug TEXT,
  design_code         TEXT,             -- JS<design>
  metal_code          TEXT,
  setting_style       TEXT,
  gem_ref_derived     TEXT,             -- K##### / PR#####
  gem_ref_observed    TEXT,             -- only when present in source data
  derived_sku         TEXT,
  parse_confidence    NUMERIC(4,3) NOT NULL DEFAULT 1.000,
  parse_warnings      JSONB NOT NULL DEFAULT '[]'::jsonb,
  evidence_status     evidence_status NOT NULL DEFAULT 'INFERRED',
  UNIQUE (import_batch_id, source_url)
);
--> statement-breakpoint
CREATE INDEX ON staging_parsed_urls (import_batch_id, url_family);
--> statement-breakpoint
CREATE INDEX ON staging_parsed_urls (gem_ref_derived) WHERE evidence_status = 'INFERRED';
--> statement-breakpoint
-- Field-level conflict ledger: "two source records disagree" must never be lost.
CREATE TABLE staging_conflicts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_batch_id UUID NOT NULL REFERENCES import_batches(id),
  entity_kind   TEXT NOT NULL,
  entity_ref    TEXT NOT NULL,
  field_name    TEXT NOT NULL,
  value_a       TEXT, source_url_a TEXT,
  value_b       TEXT, source_url_b TEXT,
  resolution    TEXT,                  -- NULL until resolved
  resolved_by   UUID, resolved_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX ON staging_conflicts (entity_kind, entity_ref) WHERE resolution IS NULL;
