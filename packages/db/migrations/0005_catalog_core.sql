-- 0005_catalog_core
-- Authority: PROJECT_SOURCE_OF_TRUTH.md section 8.6, verbatim, minus the
-- search-document function, its trigger and the search-document index, which
-- doc 04 assigns to migration 0006 (catalog_search).
-- One logical unit: the catalog core tables plus the three products CHECK
-- constraints that encode INV-01, INV-02 and INV-03 as database constraints.

-- GEMSTONE: individual inventory ------------------------------------------------
CREATE TABLE gemstones (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gem_ref             TEXT NOT NULL UNIQUE,      -- 'K1324' | 'PR5681'
  kind                gemstone_kind NOT NULL,
  variety_id          UUID NOT NULL REFERENCES gemstone_varieties(id),
  species_id          UUID REFERENCES gemstone_species(id),

  total_weight_ct     NUMERIC(8,3) NOT NULL,     -- sum; for pairs the sum of both stones
  stone_count         SMALLINT NOT NULL DEFAULT 1 CHECK (stone_count IN (1,2)),
  length_mm           NUMERIC(8,3),
  width_mm            NUMERIC(8,3),
  depth_mm            NUMERIC(8,3),

  colour_id           UUID REFERENCES gemstone_colours(id),
  intensity_id        UUID REFERENCES colour_intensities(id),
  clarity_id          UUID REFERENCES clarities(id),
  shape               stone_shape,
  cut_label           TEXT,
  cutting_style       cutting_style,

  treatment_id        UUID REFERENCES treatments(id),
  origin_id           UUID REFERENCES gemstone_origins(id),

  price_per_carat     NUMERIC(12,2),
  currency            CHAR(3) NOT NULL DEFAULT 'USD',
  price_amount        NUMERIC(12,2),
  price_evidence      evidence_status NOT NULL DEFAULT 'UNKNOWN',

  availability        BOOLEAN NOT NULL DEFAULT true,
  availability_source TEXT,                     -- 'schema.org/InStock'
  availability_checked_at TIMESTAMPTZ,

  state               record_state NOT NULL DEFAULT 'ACTIVE',

  source_url          TEXT,
  source_slug         TEXT,
  ref_derived_from    TEXT,                     -- 'URL_SLUG' when gem_ref came from a slug
  ref_evidence_status evidence_status NOT NULL DEFAULT 'OBSERVED',
  raw_spec            JSONB NOT NULL DEFAULT '{}'::jsonb,   -- verbatim spec strings
  search_document     TEXT NOT NULL DEFAULT '',             -- maintained by trigger below
  import_batch_id     UUID REFERENCES import_batches(id),
  version             INTEGER NOT NULL DEFAULT 1,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at          TIMESTAMPTZ,

  CONSTRAINT gemstones_kind_ck CHECK (
    (kind = 'SINGLE' AND stone_count = 1) OR (kind = 'PAIR' AND stone_count = 2)
  ),
  CONSTRAINT gemstones_pair_weight_ck CHECK (kind <> 'PAIR' OR total_weight_ct > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX ON gemstones (gem_ref) WHERE deleted_at IS NULL;
--> statement-breakpoint
CREATE INDEX ON gemstones (variety_id)                WHERE deleted_at IS NULL;
--> statement-breakpoint
CREATE INDEX ON gemstones (colour_id, intensity_id)  WHERE deleted_at IS NULL;
--> statement-breakpoint
CREATE INDEX ON gemstones (origin_id)                 WHERE deleted_at IS NULL;
--> statement-breakpoint
CREATE INDEX ON gemstones (treatment_id)              WHERE deleted_at IS NULL;
--> statement-breakpoint
CREATE INDEX ON gemstones (shape)                     WHERE deleted_at IS NULL;
--> statement-breakpoint
CREATE INDEX ON gemstones (variety_id, price_amount)  WHERE deleted_at IS NULL;
--> statement-breakpoint
CREATE INDEX ON gemstones (variety_id, total_weight_ct) WHERE deleted_at IS NULL;
--> statement-breakpoint
CREATE INDEX ON gemstones USING gin (raw_spec jsonb_path_ops);
--> statement-breakpoint
CREATE INDEX ON gemstones (import_batch_id);
--> statement-breakpoint
-- Per-stone measurements: fixes D9 and satisfies INV-06 -----------------------
CREATE TABLE gemstone_stones (          -- 1 row for SINGLE, 2 rows for PAIR
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gemstone_id       UUID NOT NULL REFERENCES gemstones(id) ON DELETE CASCADE,
  position          SMALLINT NOT NULL CHECK (position BETWEEN 1 AND 2),
  weight_ct         NUMERIC(8,3) NOT NULL,
  length_mm         NUMERIC(8,3),
  width_mm          NUMERIC(8,3),
  depth_mm          NUMERIC(8,3),
  raw_weight_text   TEXT,               -- '2.87 Ct.' verbatim
  raw_dimensions_text TEXT,             -- 'Length: 9.84 Width: 7.82 Height: 5.32'
  parse_confidence  NUMERIC(4,3) NOT NULL DEFAULT 1.000,
  evidence_status   evidence_status NOT NULL DEFAULT 'EXTRACTED',
  UNIQUE (gemstone_id, position)
);
--> statement-breakpoint
CREATE INDEX ON gemstone_stones (gemstone_id);
--> statement-breakpoint
-- SETTING: reusable design ----------------------------------------------------
CREATE TABLE settings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  design_code       TEXT NOT NULL UNIQUE,        -- '1150' (numeric core)
  sku_prefix        TEXT NOT NULL DEFAULT 'JS',
  name              TEXT NOT NULL,               -- 'Pave'
  style_id          UUID REFERENCES setting_styles(id),
  jewellery_type    jewellery_type NOT NULL,
  description       TEXT,
  is_vedic          BOOLEAN NOT NULL DEFAULT false,
  side_stone_count  SMALLINT NOT NULL DEFAULT 0,
  source_url        TEXT,
  state             record_state NOT NULL DEFAULT 'ACTIVE',
  evidence_status   evidence_status NOT NULL DEFAULT 'OBSERVED',
  import_batch_id   UUID REFERENCES import_batches(id),
  version           INTEGER NOT NULL DEFAULT 1,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);
--> statement-breakpoint
CREATE UNIQUE INDEX ON settings (design_code) WHERE deleted_at IS NULL;
--> statement-breakpoint
CREATE INDEX ON settings (style_id, jewellery_type) WHERE deleted_at IS NULL;
--> statement-breakpoint
CREATE INDEX ON settings (jewellery_type) WHERE deleted_at IS NULL;
--> statement-breakpoint
-- SETTING VARIANT: design x metal, the sellable mount --------------------------
CREATE TABLE setting_variants (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_id        UUID NOT NULL REFERENCES settings(id),
  metal_code        metal_code NOT NULL,
  sku               TEXT NOT NULL UNIQUE,        -- 'JS1150W14'
  slug              TEXT NOT NULL UNIQUE,        -- '14k-white-gold-pave-ring-setting-js1150w14'
  base_price        NUMERIC(12,2),
  currency          CHAR(3) NOT NULL DEFAULT 'USD',
  price_evidence    evidence_status NOT NULL DEFAULT 'UNKNOWN',
  availability      BOOLEAN NOT NULL DEFAULT true,
  production_days   SMALLINT,                    -- [UNKNOWN] in source
  state             record_state NOT NULL DEFAULT 'ACTIVE',
  source_url        TEXT,
  evidence_status   evidence_status NOT NULL DEFAULT 'OBSERVED',
  import_batch_id   UUID REFERENCES import_batches(id),
  version           INTEGER NOT NULL DEFAULT 1,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ,
  UNIQUE (setting_id, metal_code)
);
--> statement-breakpoint
CREATE UNIQUE INDEX ON setting_variants (sku) WHERE deleted_at IS NULL;
--> statement-breakpoint
CREATE INDEX ON setting_variants (setting_id) WHERE deleted_at IS NULL;
--> statement-breakpoint
CREATE INDEX ON setting_variants (metal_code, state) WHERE deleted_at IS NULL;
--> statement-breakpoint
-- Compatibility rules: deterministic DYO engine input --------------------------
CREATE TABLE setting_compatibility_rules (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_id             UUID NOT NULL REFERENCES settings(id) ON DELETE CASCADE,
  jewellery_type         jewellery_type,             -- NULL means any
  stone_kind             gemstone_kind,               -- SINGLE or PAIR required
  variety_id             UUID REFERENCES gemstone_varieties(id),
  colour_id              UUID REFERENCES gemstone_colours(id),
  shape                  stone_shape,
  min_weight_ct          NUMERIC(8,3),
  max_weight_ct          NUMERIC(8,3),
  min_length_mm          NUMERIC(8,3),
  max_length_mm          NUMERIC(8,3),
  min_width_mm           NUMERIC(8,3),
  max_width_mm           NUMERIC(8,3),
  requires_treatment_id  UUID REFERENCES treatments(id),
  forbids_treatment_id   UUID REFERENCES treatments(id),
  rule_kind              TEXT NOT NULL DEFAULT 'ALLOW'
                         CHECK (rule_kind IN ('ALLOW','DENY','REQUIRES_REVIEW')),
  priority               SMALLINT NOT NULL DEFAULT 100,
  explanation            TEXT NOT NULL,
  evidence_status        evidence_status NOT NULL DEFAULT 'INFERRED',
  source_url             TEXT,
  state                  record_state NOT NULL DEFAULT 'ACTIVE',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX ON setting_compatibility_rules (setting_id)   WHERE state = 'ACTIVE';
--> statement-breakpoint
CREATE INDEX ON setting_compatibility_rules (variety_id)   WHERE state = 'ACTIVE';
--> statement-breakpoint
CREATE INDEX ON setting_compatibility_rules (stone_kind, jewellery_type) WHERE state = 'ACTIVE';
--> statement-breakpoint
-- PRODUCT: the sellable unit ---------------------------------------------------
CREATE TABLE products (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind                product_kind NOT NULL,
  product_number      BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE,
  slug                TEXT NOT NULL UNIQUE,
  title               TEXT NOT NULL,
  subtitle            TEXT,

  setting_variant_id  UUID REFERENCES setting_variants(id),
  gemstone_id         UUID REFERENCES gemstones(id),
  gemstone_pair_id    UUID REFERENCES gemstones(id),

  jewellery_type      jewellery_type NOT NULL,
  variety_id          UUID REFERENCES gemstone_varieties(id),
  colour_id           UUID REFERENCES gemstone_colours(id),

  total_weight_ct     NUMERIC(8,3),
  stone_count         SMALLINT NOT NULL DEFAULT 1,

  price_amount        NUMERIC(12,2) NOT NULL,
  currency            CHAR(3) NOT NULL DEFAULT 'USD',
  price_evidence      evidence_status NOT NULL DEFAULT 'UNKNOWN',
  price_valid_until   DATE,

  state               product_state NOT NULL DEFAULT 'DRAFT',
  availability        BOOLEAN NOT NULL DEFAULT true,

  engraving_enabled   BOOLEAN NOT NULL DEFAULT false,   -- [UNKNOWN] in source
  engraving_text      TEXT,
  options             JSONB NOT NULL DEFAULT '{}'::jsonb,

  source_url          TEXT,
  source_slug         TEXT,
  source_sku          TEXT,                        -- observed SKU only
  source_sku_derived  TEXT,                        -- INFERRED from slug (3.1 Example B)
  sku_evidence_status evidence_status NOT NULL DEFAULT 'OBSERVED',
  seo_title           TEXT,
  seo_description     TEXT,
  short_description   TEXT,
  description         TEXT,
  structured_extra    JSONB NOT NULL DEFAULT '{}'::jsonb,

  import_batch_id     UUID REFERENCES import_batches(id),
  version             INTEGER NOT NULL DEFAULT 1,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at          TIMESTAMPTZ,
  published_at        TIMESTAMPTZ
);
--> statement-breakpoint
CREATE UNIQUE INDEX ON products (slug) WHERE deleted_at IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX ON products (source_url) WHERE source_url IS NOT NULL AND deleted_at IS NULL;
--> statement-breakpoint
CREATE INDEX ON products (kind, state)              WHERE deleted_at IS NULL;
--> statement-breakpoint
CREATE INDEX ON products (jewellery_type, state)    WHERE deleted_at IS NULL;
--> statement-breakpoint
CREATE INDEX ON products (variety_id, state)        WHERE deleted_at IS NULL;
--> statement-breakpoint
CREATE INDEX ON products (colour_id, state)         WHERE deleted_at IS NULL;
--> statement-breakpoint
CREATE INDEX ON products (price_amount)             WHERE deleted_at IS NULL AND state = 'ACTIVE';
--> statement-breakpoint
CREATE INDEX ON products (total_weight_ct)          WHERE deleted_at IS NULL;
--> statement-breakpoint
CREATE INDEX ON products (setting_variant_id)       WHERE deleted_at IS NULL;
--> statement-breakpoint
CREATE INDEX ON products (gemstone_id)              WHERE deleted_at IS NULL;
--> statement-breakpoint
CREATE INDEX ON products USING gin (options jsonb_path_ops)   WHERE deleted_at IS NULL;
--> statement-breakpoint
CREATE INDEX ON products USING gin (
  (setweight(to_tsvector('english',
     coalesce(title,'') || ' ' || coalesce(subtitle,'') || ' ' || coalesce(short_description,'')), 'A'))
);
--> statement-breakpoint
-- INV-01 / INV-02 / INV-03 as database constraints
ALTER TABLE products ADD CONSTRAINT products_composition_ck CHECK (
  CASE kind
    WHEN 'CONFIGURED' THEN
      setting_variant_id IS NOT NULL
      AND ((gemstone_id IS NOT NULL AND gemstone_pair_id IS NULL)
        OR (gemstone_id IS NULL AND gemstone_pair_id IS NOT NULL))
    WHEN 'SETTING_ONLY' THEN
      setting_variant_id IS NOT NULL AND gemstone_id IS NULL AND gemstone_pair_id IS NULL
    ELSE setting_variant_id IS NULL
  END
);
--> statement-breakpoint
ALTER TABLE products ADD CONSTRAINT products_no_pair_on_non_earrings_ck CHECK (
  gemstone_pair_id IS NULL OR jewellery_type = 'EARRINGS'
);
--> statement-breakpoint
ALTER TABLE products ADD CONSTRAINT products_earrings_need_pair_ck CHECK (
  jewellery_type <> 'EARRINGS' OR kind <> 'CONFIGURED' OR gemstone_pair_id IS NOT NULL
);
--> statement-breakpoint
-- Typed product-gemstone relation (side stones, extra stones) -----------------
CREATE TABLE product_gemstones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  gemstone_id UUID NOT NULL REFERENCES gemstones(id),
  role        TEXT NOT NULL DEFAULT 'SIDE'
              CHECK (role IN ('PRIMARY','PAIR','SIDE','ACCENT')),
  position    SMALLINT NOT NULL DEFAULT 1,
  quantity    SMALLINT NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, gemstone_id, role, position)
);
--> statement-breakpoint
CREATE INDEX ON product_gemstones (gemstone_id);
