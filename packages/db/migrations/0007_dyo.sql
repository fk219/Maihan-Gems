-- 0007_dyo
-- Authority: PROJECT_SOURCE_OF_TRUTH.md section 8.7, verbatim.
-- One logical unit: the DYO tables. customer_id is carried without its foreign
-- key here: customers is created in 0009, and doc 04 (defect D-05) requires
-- the FK to be declared in 0009 once both endpoints exist, keeping the FK
-- graph acyclic and one-pass.

CREATE TABLE dyo_configurations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  configuration_hash    TEXT NOT NULL,
  short_code            TEXT NOT NULL UNIQUE,     -- base62 share code
  jewellery_type        jewellery_type NOT NULL,

  setting_id            UUID REFERENCES settings(id),
  setting_variant_id    UUID REFERENCES setting_variants(id),
  gemstone_id           UUID REFERENCES gemstones(id),
  gemstone_pair_id      UUID REFERENCES gemstones(id),
  side_stones           JSONB NOT NULL DEFAULT '[]'::jsonb,  -- [UNKNOWN] in source
  engraving_text        TEXT,

  selected_options      JSONB NOT NULL DEFAULT '{}'::jsonb,
  state                 dyo_state NOT NULL DEFAULT 'DRAFT',
  compatibility_status  compatibility_result NOT NULL DEFAULT 'UNKNOWN',
  compatibility_detail  JSONB NOT NULL DEFAULT '[]'::jsonb,  -- per-rule explanations
  compatibility_checked_at TIMESTAMPTZ,

  hash_version          SMALLINT NOT NULL DEFAULT 1,
  state_version         INTEGER NOT NULL DEFAULT 1,

  anonymous_session_id  TEXT,
  customer_id           UUID,      -- FK added in section 8.9 (customers is created there)

  source_reference      TEXT,                     -- migrated source SKU or URL
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at            TIMESTAMPTZ,

  CONSTRAINT dyo_one_stone_ck CHECK (
    (gemstone_id IS NOT NULL AND gemstone_pair_id IS NULL)
    OR (gemstone_id IS NULL AND gemstone_pair_id IS NOT NULL)
    OR (gemstone_id IS NULL AND gemstone_pair_id IS NULL)
  ),
  CONSTRAINT dyo_pair_is_earrings_ck CHECK (
    gemstone_pair_id IS NULL OR jewellery_type = 'EARRINGS'
  )
);
--> statement-breakpoint
CREATE UNIQUE INDEX ON dyo_configurations (configuration_hash)
  WHERE state <> 'EXPIRED';
--> statement-breakpoint
CREATE INDEX ON dyo_configurations (anonymous_session_id, updated_at DESC);
--> statement-breakpoint
CREATE INDEX ON dyo_configurations (customer_id) WHERE customer_id IS NOT NULL;
--> statement-breakpoint
CREATE INDEX ON dyo_configurations (state, updated_at DESC);
--> statement-breakpoint
CREATE TABLE dyo_price_snapshots (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  configuration_id     UUID NOT NULL REFERENCES dyo_configurations(id) ON DELETE CASCADE,
  gemstone_component   NUMERIC(12,2) NOT NULL DEFAULT 0,
  setting_component    NUMERIC(12,2) NOT NULL DEFAULT 0,
  side_stone_component NUMERIC(12,2) NOT NULL DEFAULT 0,
  making_component     NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_component   NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_component        NUMERIC(12,2) NOT NULL DEFAULT 0,
  total                NUMERIC(12,2) NOT NULL,
  currency             CHAR(3) NOT NULL DEFAULT 'USD',
  pricing_rule_version TEXT NOT NULL,
  breakdown            JSONB NOT NULL DEFAULT '{}'::jsonb,
  computed_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at           TIMESTAMPTZ
);
--> statement-breakpoint
CREATE INDEX ON dyo_price_snapshots (configuration_id, computed_at DESC);
--> statement-breakpoint
CREATE INDEX ON dyo_price_snapshots (expires_at) WHERE expires_at IS NOT NULL;
--> statement-breakpoint
CREATE TABLE dyo_quotes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_token       TEXT NOT NULL UNIQUE,
  configuration_id  UUID NOT NULL REFERENCES dyo_configurations(id),
  price_snapshot_id UUID NOT NULL REFERENCES dyo_price_snapshots(id),
  idempotency_key   TEXT UNIQUE,
  expires_at        TIMESTAMPTZ NOT NULL,
  consumed_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX ON dyo_quotes (expires_at);
