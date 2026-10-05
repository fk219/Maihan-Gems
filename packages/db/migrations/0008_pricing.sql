-- 0008_pricing
-- Authority: PROJECT_SOURCE_OF_TRUTH.md section 8.8, verbatim.
-- One logical unit: the pricing tables. Money is NUMERIC(12,2); never
-- floating point (Source of Truth section 8.2).

CREATE TABLE price_lists (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  currency    CHAR(3) NOT NULL DEFAULT 'USD',
  state       record_state NOT NULL DEFAULT 'ACTIVE',
  valid_from  TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_to    TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE price_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  price_list_id   UUID NOT NULL REFERENCES price_lists(id) ON DELETE CASCADE,
  subject_type    TEXT NOT NULL
                  CHECK (subject_type IN ('GEMSTONE','SETTING_VARIANT','PRODUCT','SIDE_STONE','ADDON')),
  subject_id      UUID NOT NULL,
  amount          NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  currency        CHAR(3) NOT NULL DEFAULT 'USD',
  cost_component  NUMERIC(12,2),                 -- internal, never exposed
  evidence_status evidence_status NOT NULL DEFAULT 'INFERRED',
  valid_from      TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_to        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX ON price_entries (price_list_id, subject_type, subject_id, valid_from);
--> statement-breakpoint
CREATE INDEX ON price_entries (subject_type, subject_id, valid_to);
--> statement-breakpoint
-- Records the verified observation that price != weight * per_carat (0/1024).
CREATE TABLE price_model_observations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID REFERENCES products(id),
  source_url      TEXT NOT NULL,
  observed_total  NUMERIC(12,2) NOT NULL,
  observed_weight NUMERIC(8,3),
  observed_ppc    NUMERIC(12,2),
  gem_component   NUMERIC(12,2),
  implied_making  NUMERIC(12,2),
  ratio           NUMERIC(8,4),
  import_batch_id UUID REFERENCES import_batches(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX ON price_model_observations (source_url);
