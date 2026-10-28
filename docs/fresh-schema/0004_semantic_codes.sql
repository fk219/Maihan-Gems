-- FRESH CLEAN SCHEMA — 0004 semantic codes + taxonomy completion
-- Approved design: technical_design/42 (§4 families, §5 registry, §6 minting, §8 rules).
-- Additive to 0001–0003. Idempotent for re-application.

BEGIN;

-- 11 gemstone families (doc 42 §4)
CREATE TABLE IF NOT EXISTS fresh.gemstone_families (
  id          bigserial PRIMARY KEY,
  code        text NOT NULL UNIQUE,   -- QUA BER COR GAR TOU FEL SPI CHB TOP SIN ORG
  name        text NOT NULL,
  description text,
  sort        integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- varieties: family link + unique 3-4 letter code (doc 42 §5 registry)
ALTER TABLE fresh.gemstone_varieties ADD COLUMN IF NOT EXISTS family_id bigint REFERENCES fresh.gemstone_families(id);
ALTER TABLE fresh.gemstone_varieties ADD COLUMN IF NOT EXISTS code text;
CREATE UNIQUE INDEX IF NOT EXISTS gemstone_varieties_code_uq ON fresh.gemstone_varieties (code) WHERE code IS NOT NULL;
CREATE INDEX IF NOT EXISTS gemstone_varieties_family_idx ON fresh.gemstone_varieties (family_id);

-- natural vs lab-created vs simulant (owner decision 2026-10-28)
DO $$ BEGIN
  CREATE TYPE fresh.origin_type AS ENUM ('NATURAL','LAB_CREATED','SIMULANT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE fresh.gemstones ADD COLUMN IF NOT EXISTS origin_type fresh.origin_type NOT NULL DEFAULT 'NATURAL';

-- multi-treatment support (doc 42 §9; approved 2026-10-28: Doublet/Triplet/Coated/Filled/Oil-Filled/No Indication)
CREATE TABLE IF NOT EXISTS fresh.gemstone_treatments (
  gemstone_id  bigint NOT NULL REFERENCES fresh.gemstones(id) ON DELETE CASCADE,
  treatment_id bigint NOT NULL REFERENCES fresh.treatments(id),
  note         text,
  PRIMARY KEY (gemstone_id, treatment_id)
);

-- extended treatment vocabulary (owner-approved design values; unused rows are fine)
INSERT INTO fresh.treatments (code, name) VALUES
  ('DOUBLET',   'Doublet'),
  ('TRIPLET',   'Triplet'),
  ('COATED',    'Coated'),
  ('GLASSFILL', 'Glass-Filled'),
  ('OILFILL',   'Oil-Filled'),
  ('NOIND',     'No Indication of Treatment')
ON CONFLICT (code) DO NOTHING;

-- backfill the join table from the legacy single-treatment column (idempotent)
INSERT INTO fresh.gemstone_treatments (gemstone_id, treatment_id)
SELECT id, treatment_id FROM fresh.gemstones WHERE treatment_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- setting stone-capacity range (carat compatibility; carat stays in DB per doc 42 §7)
ALTER TABLE fresh.settings ADD COLUMN IF NOT EXISTS min_ct numeric(6,3);
ALTER TABLE fresh.settings ADD COLUMN IF NOT EXISTS max_ct numeric(6,3);
ALTER TABLE fresh.settings ADD CONSTRAINT settings_ct_range_ck
  CHECK ((min_ct IS NULL AND max_ct IS NULL) OR (min_ct IS NOT NULL AND max_ct IS NOT NULL AND min_ct <= max_ct));

-- atomic minting registry (doc 42 §6 R-2/R-3)
CREATE TABLE IF NOT EXISTS fresh.code_counters (
  scope_key text PRIMARY KEY,      -- e.g. 'G|COR|RUB|AE014', 'J|E|C|W14|HQ', 'V|AE'
  next_no   bigint NOT NULL DEFAULT 1 CHECK (next_no > 0)
);

COMMIT;
