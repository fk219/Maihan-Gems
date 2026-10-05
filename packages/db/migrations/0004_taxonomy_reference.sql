-- 0004_taxonomy_reference
-- Authority: PROJECT_SOURCE_OF_TRUTH.md section 8.5, verbatim.
-- One logical unit: the 12 reference and taxonomy tables.

CREATE TABLE gemstone_species (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT NOT NULL UNIQUE,        -- 'garnet','tourmaline','beryl','corundum'
  name          TEXT NOT NULL,
  mineral_name  TEXT,
  mohs_min      NUMERIC(3,1),
  mohs_max      NUMERIC(3,1),
  description   TEXT,
  evidence_status evidence_status NOT NULL DEFAULT 'INFERRED',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE gemstone_varieties (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  species_id     UUID REFERENCES gemstone_species(id),
  slug           TEXT NOT NULL UNIQUE,       -- 'tsavorite-garnet'
  name           TEXT NOT NULL,
  display_name   TEXT NOT NULL,
  source_route   TEXT UNIQUE,                -- '/tsavorite-garnet'
  description    TEXT,
  care_instructions TEXT,
  is_organic     BOOLEAN NOT NULL DEFAULT false,   -- pearls, coral, opal
  state          record_state NOT NULL DEFAULT 'ACTIVE',
  evidence_status evidence_status NOT NULL DEFAULT 'OBSERVED',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at     TIMESTAMPTZ
);
--> statement-breakpoint
CREATE INDEX ON gemstone_varieties (species_id) WHERE deleted_at IS NULL;
--> statement-breakpoint
CREATE INDEX ON gemstone_varieties USING gin (to_tsvector('english', name));
--> statement-breakpoint
CREATE TABLE gemstone_colours (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT NOT NULL UNIQUE,        -- 'bluish-green'
  name          TEXT NOT NULL,               -- 'Bluish Green'
  parent_id     UUID REFERENCES gemstone_colours(id),
  modifier      TEXT,                        -- 'bluish' | 'greenish' | 'orangish'
  hue           TEXT,
  is_chromatic  BOOLEAN NOT NULL DEFAULT true,
  sort_order    SMALLINT NOT NULL DEFAULT 100,
  state         record_state NOT NULL DEFAULT 'ACTIVE',
  evidence_status evidence_status NOT NULL DEFAULT 'OBSERVED'
);
--> statement-breakpoint
CREATE INDEX ON gemstone_colours (parent_id);
--> statement-breakpoint
CREATE TABLE colour_intensities (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT NOT NULL UNIQUE,        -- 'medium'
  name          TEXT NOT NULL,
  rank          SMALLINT NOT NULL,           -- 1..5 for ordering
  evidence_status evidence_status NOT NULL DEFAULT 'OBSERVED'
);
--> statement-breakpoint
CREATE TABLE gemstone_origins (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT NOT NULL UNIQUE,        -- 'tanzania'
  name          TEXT NOT NULL,
  country_code  CHAR(2),
  region        TEXT,
  description   TEXT,
  evidence_status evidence_status NOT NULL DEFAULT 'OBSERVED'
);
--> statement-breakpoint
CREATE TABLE treatments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          treatment_code NOT NULL UNIQUE,
  label         TEXT NOT NULL,
  description   TEXT,
  requires_disclosure BOOLEAN NOT NULL DEFAULT true,
  price_impact  SMALLINT NOT NULL DEFAULT 0,  -- -2..+2 merchandising hint only
  evidence_status evidence_status NOT NULL DEFAULT 'OBSERVED'
);
--> statement-breakpoint
CREATE TABLE treatment_labels (               -- verbatim source strings
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment_id  UUID REFERENCES treatments(id),
  raw_label     TEXT NOT NULL UNIQUE,         -- 'Vapor-Infused Coating'
  evidence_status evidence_status NOT NULL DEFAULT 'OBSERVED'
);
--> statement-breakpoint
CREATE TABLE clarities (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT NOT NULL UNIQUE,
  label         TEXT NOT NULL,
  rank          SMALLINT NOT NULL,
  is_eye_clean  BOOLEAN NOT NULL DEFAULT false,
  evidence_status evidence_status NOT NULL DEFAULT 'OBSERVED'
);
--> statement-breakpoint
CREATE TABLE clarity_labels (               -- D9 detection lives here
  raw_label      TEXT PRIMARY KEY,           -- 'Very Slightly Included Very Slightly Included'
  clarity_id     UUID NOT NULL REFERENCES clarities(id),
  is_doubled     BOOLEAN NOT NULL DEFAULT false,
  token_count    SMALLINT NOT NULL DEFAULT 1,
  evidence_status evidence_status NOT NULL DEFAULT 'OBSERVED'
);
--> statement-breakpoint
CREATE INDEX ON clarity_labels (clarity_id);
--> statement-breakpoint
CREATE TABLE metals (
  code             metal_code PRIMARY KEY,
  label            TEXT NOT NULL,
  purity_label     TEXT,                       -- '14K', '950', '925'
  purity_value     NUMERIC(5,2),
  colour           TEXT,                       -- yellow|white|rose|platinum|silver
  is_two_tone      BOOLEAN NOT NULL DEFAULT false,
  secondary_colour TEXT,
  slug_phrase      TEXT NOT NULL UNIQUE,       -- '14k-yellow-white'
  sort_order       SMALLINT NOT NULL DEFAULT 100,
  state            record_state NOT NULL DEFAULT 'ACTIVE',
  evidence_status  evidence_status NOT NULL DEFAULT 'OBSERVED'
);
--> statement-breakpoint
CREATE INDEX ON metals (colour) WHERE state = 'ACTIVE';
--> statement-breakpoint
CREATE TABLE setting_styles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT NOT NULL UNIQUE,         -- 'three_stone'
  label         TEXT NOT NULL,                -- 'Three Stone'
  slug          TEXT NOT NULL,                -- 'three-stone'
  description   TEXT,
  state         record_state NOT NULL DEFAULT 'ACTIVE',
  evidence_status evidence_status NOT NULL DEFAULT 'OBSERVED'
);
--> statement-breakpoint
CREATE TABLE jewellery_types (
  code          jewellery_type PRIMARY KEY,
  label         TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  uses_pair     BOOLEAN NOT NULL DEFAULT false,   -- INV-02
  uses_single   BOOLEAN NOT NULL DEFAULT false,   -- INV-03
  state         record_state NOT NULL DEFAULT 'ACTIVE',
  evidence_status evidence_status NOT NULL DEFAULT 'OBSERVED'
);
-- Seed from evidence happens in the reference-data seeder task (plan task 9),
-- never in a migration: migrations carry DDL only, no business data.
