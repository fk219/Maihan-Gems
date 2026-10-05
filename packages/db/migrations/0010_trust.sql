-- 0010_trust
-- Authority: PROJECT_SOURCE_OF_TRUTH.md section 8.10, verbatim.
-- One logical unit: the six trust and certificate tables. The
-- certificates_subject_ck invariant and the per-field verification_status
-- column (which makes INV-07 enforceable) live here; the certificate_public
-- read model that enforces INV-07 at read time is migration 0017.

CREATE TABLE certificates (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind               document_kind NOT NULL,
  gemstone_id        UUID REFERENCES gemstones(id) ON DELETE CASCADE,
  configuration_id   UUID REFERENCES dyo_configurations(id) ON DELETE SET NULL,
  product_id         UUID REFERENCES products(id) ON DELETE SET NULL,
  lab_name           TEXT,                    -- [UNKNOWN] in source
  certificate_number TEXT,
  issue_date         DATE,
  report_type        TEXT,                    -- e.g. 'SARIN', observed in paths only
  verification_status verification_status NOT NULL DEFAULT 'UNVERIFIED',
  confidence_overall NUMERIC(4,3),
  state              record_state NOT NULL DEFAULT 'ACTIVE',
  source_url         TEXT,
  metadata           JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at         TIMESTAMPTZ,
  CONSTRAINT certificates_subject_ck CHECK (
    num_nonnulls(gemstone_id, configuration_id, product_id) >= 1
  )
);
--> statement-breakpoint
CREATE INDEX ON certificates (gemstone_id) WHERE deleted_at IS NULL;
--> statement-breakpoint
CREATE INDEX ON certificates (verification_status);
--> statement-breakpoint
CREATE INDEX ON certificates (certificate_number) WHERE certificate_number IS NOT NULL;
--> statement-breakpoint
CREATE TABLE certificate_ocr_runs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id   UUID NOT NULL REFERENCES certificates(id) ON DELETE CASCADE,
  run_id           UUID NOT NULL UNIQUE,
  provider         ai_provider NOT NULL,
  model_name       TEXT NOT NULL,
  model_version    TEXT NOT NULL,
  status           job_state NOT NULL DEFAULT 'QUEUED',
  input_asset_id   UUID,
  fields_extracted SMALLINT NOT NULL DEFAULT 0,
  mean_confidence  NUMERIC(4,3),
  raw_response     JSONB,                     -- retained for audit
  cost_usd         NUMERIC(10,6),
  latency_ms       INTEGER,
  error_message    TEXT,
  started_at       TIMESTAMPTZ, finished_at TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX ON certificate_ocr_runs (certificate_id, created_at DESC);
--> statement-breakpoint
CREATE INDEX ON certificate_ocr_runs (status) WHERE status IN ('QUEUED','RUNNING');
--> statement-breakpoint
-- One row per extracted field: this table is what makes INV-07 enforceable.
CREATE TABLE certificate_extractions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id   UUID NOT NULL REFERENCES certificates(id) ON DELETE CASCADE,
  run_id           UUID NOT NULL,
  field_name       TEXT NOT NULL,      -- weight_ct, origin, treatment, lab_name, ...
  raw_text         TEXT,
  normalized_value TEXT,
  numeric_value    NUMERIC(14,4),
  confidence       NUMERIC(4,3) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  bbox             JSONB,
  page_number      SMALLINT,
  model_provider   ai_provider NOT NULL,
  model_name       TEXT NOT NULL,
  model_version    TEXT NOT NULL,
  prompt_version   TEXT NOT NULL,
  extracted_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  evidence_status  evidence_status NOT NULL DEFAULT 'INFERRED',
  -- Per-field verification, distinct from evidence_status. A reviewer's
  -- override of one field must not change the document-level status, and a
  -- document may be VERIFIED only if every material field is VERIFIED.
  verification_status verification_status NOT NULL DEFAULT 'EXTRACTED',
  UNIQUE (certificate_id, run_id, field_name)
);
--> statement-breakpoint
CREATE INDEX ON certificate_extractions (certificate_id, field_name);
--> statement-breakpoint
CREATE INDEX ON certificate_extractions (confidence) WHERE confidence < 0.85;
--> statement-breakpoint
CREATE TABLE certificate_anomalies (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id UUID NOT NULL REFERENCES certificates(id) ON DELETE CASCADE,
  run_id       UUID,
  anomaly_type TEXT NOT NULL,   -- WEIGHT_MISMATCH_SLUG, ORIGIN_CONFLICT,
                                -- DIMENSION_IMPOSSIBLE, TREATMENT_CONFLICT, LOW_CONFIDENCE
  severity     TEXT NOT NULL CHECK (severity IN ('INFO','WARN','ERROR')),
  detail       JSONB NOT NULL,
  resolved_at  TIMESTAMPTZ, resolved_by UUID, resolution TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX ON certificate_anomalies (certificate_id) WHERE resolved_at IS NULL;
--> statement-breakpoint
CREATE INDEX ON certificate_anomalies (severity) WHERE resolved_at IS NULL;
--> statement-breakpoint
CREATE TABLE certificate_reviews (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id    UUID NOT NULL REFERENCES certificates(id) ON DELETE CASCADE,
  reviewer_id       UUID NOT NULL,
  decision          TEXT NOT NULL CHECK (decision IN ('APPROVE','REJECT','REQUEST_CHANGES')),
  notes             TEXT,
  fields_overridden JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX ON certificate_reviews (certificate_id, created_at DESC);
--> statement-breakpoint
CREATE TABLE verification_events (          -- append-only trust ledger
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  certificate_id UUID REFERENCES certificates(id),
  gemstone_id    UUID REFERENCES gemstones(id),
  product_id     UUID REFERENCES products(id),
  event_type     TEXT NOT NULL,   -- UPLOADED, EXTRACTED, CROSS_CHECKED, APPROVED, REJECTED, SUPERSEDED
  from_status    verification_status,
  to_status      verification_status NOT NULL,
  actor_type     TEXT NOT NULL,
  actor_id       UUID,
  detail         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX ON verification_events (certificate_id, id);
--> statement-breakpoint
CREATE INDEX ON verification_events (gemstone_id, id);
