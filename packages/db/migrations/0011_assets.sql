-- 0011_assets
-- Authority: PROJECT_SOURCE_OF_TRUTH.md section 8.11, verbatim.
-- One logical unit: asset and media tables.

CREATE TABLE assets (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind              media_kind NOT NULL,
  role              media_role NOT NULL DEFAULT 'OTHER',
  storage_provider  TEXT NOT NULL DEFAULT 'r2',
  storage_key       TEXT UNIQUE,             -- 'products/stones/k1324/primary-01.webp'
  source_url        TEXT NOT NULL,           -- preserved verbatim (241,961 rows)
  source_host       TEXT,                    -- denormalised for filtering
  source_path_stem  TEXT,                    -- 'stone/k1324/cert'
  cdn_url           TEXT,
  mime_type         TEXT,
  bytes             BIGINT,
  width             INTEGER, height INTEGER,
  checksum_sha256   TEXT,
  alt_text          TEXT, title TEXT,
  position          SMALLINT NOT NULL DEFAULT 0,
  srcset_raw        TEXT,
  processing_state  asset_processing_state NOT NULL DEFAULT 'PENDING',
  processing_error  TEXT,
  provenance_kind   provenance_kind NOT NULL DEFAULT 'SOURCE_CRAWL',
  evidence_status   evidence_status NOT NULL DEFAULT 'OBSERVED',
  import_batch_id   UUID REFERENCES import_batches(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);
--> statement-breakpoint
CREATE INDEX ON assets (source_url);
--> statement-breakpoint
CREATE INDEX ON assets (source_path_stem);
--> statement-breakpoint
CREATE INDEX ON assets (processing_state) WHERE processing_state IN ('PENDING','FETCHING','FAILED');
--> statement-breakpoint
CREATE INDEX ON assets (checksum_sha256);
--> statement-breakpoint
CREATE INDEX ON assets (kind, role) WHERE deleted_at IS NULL;
--> statement-breakpoint
CREATE INDEX ON assets USING gin (to_tsvector('english', coalesce(alt_text,'') || ' ' || coalesce(title,'')));
--> statement-breakpoint
CREATE TABLE asset_variants (              -- derived renditions
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id     UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  variant_name TEXT NOT NULL,      -- 'thumb-200','hero-750','zoom-1500','webp','avif'
  width        INTEGER, height INTEGER,
  format       TEXT NOT NULL,
  storage_key  TEXT NOT NULL,
  cdn_url      TEXT,
  bytes        BIGINT,
  quality      SMALLINT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (asset_id, variant_name)
);
--> statement-breakpoint
CREATE INDEX ON asset_variants (asset_id);
--> statement-breakpoint
-- Replaces the untyped 397,727-row relationship dump with intent-revealing rows.
CREATE TABLE asset_usages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id    UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,      -- PRODUCT | GEMSTONE | SETTING_VARIANT | COLLECTION | PAGE | KNOWLEDGE_DOCUMENT
  entity_id   UUID NOT NULL,
  role        media_role NOT NULL DEFAULT 'GALLERY',
  position    SMALLINT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (asset_id, entity_type, entity_id, role, position)
);
--> statement-breakpoint
CREATE INDEX ON asset_usages (entity_type, entity_id, role, position);
--> statement-breakpoint
CREATE TABLE webar_assets (                -- target-only; see section 21
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id           UUID REFERENCES assets(id),
  product_id         UUID REFERENCES products(id),
  setting_variant_id UUID REFERENCES setting_variants(id),
  jewellery_type     jewellery_type NOT NULL,
  model_format       TEXT NOT NULL CHECK (model_format IN ('GLB','GLTF')),
  compression        TEXT CHECK (compression IN ('DRACO','MESHOPT','NONE')),
  storage_key        TEXT NOT NULL,
  cdn_url            TEXT NOT NULL,
  hdr_env_key        TEXT,
  texture_max_px     INTEGER NOT NULL DEFAULT 1024,
  poly_count         INTEGER,
  vertex_count       INTEGER,
  file_bytes         BIGINT,
  fit_rule           JSONB NOT NULL DEFAULT '{}'::jsonb,   -- anchor, scale, rotation per type
  state              asset_processing_state NOT NULL DEFAULT 'PENDING',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX ON webar_assets (jewellery_type, state);
--> statement-breakpoint
CREATE TABLE ar_handoff_tokens (           -- QR desktop to mobile; hash stored only
  token_hash     TEXT PRIMARY KEY,
  product_id     UUID REFERENCES products(id),
  webar_asset_id UUID REFERENCES webar_assets(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at     TIMESTAMPTZ NOT NULL,
  consumed_at    TIMESTAMPTZ,
  uses           SMALLINT NOT NULL DEFAULT 1
);
--> statement-breakpoint
CREATE INDEX ON ar_handoff_tokens (expires_at);
