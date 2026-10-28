-- FRESH CLEAN SCHEMA — 0003 vendors + multi-vendor traceability
-- Approved design: technical_design/42 (§2, §8 R-2/R-4) + technical_design/41 §4.
-- NULL vendor_id = house stock. vendor_ref is vendor-only (never storefront).
-- Additive to 0001+0002; idempotent guards for re-application.

BEGIN;

CREATE TABLE IF NOT EXISTS fresh.vendors (
  id         bigserial PRIMARY KEY,
  code       text NOT NULL UNIQUE,             -- V-{CC}-{NNN}, system-minted; V-HQ-000 reserved, no row
  name       text NOT NULL,
  country    char(2),
  status     fresh.catalog_status NOT NULL DEFAULT 'DRAFT',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vendors_status_ck CHECK (status IN ('DRAFT','ACTIVE','ARCHIVED'))
);

-- vendor attribution on the three sellable catalogue entities
ALTER TABLE fresh.gemstones ADD COLUMN IF NOT EXISTS vendor_id   bigint REFERENCES fresh.vendors(id);
ALTER TABLE fresh.gemstones ADD COLUMN IF NOT EXISTS vendor_ref  text;
ALTER TABLE fresh.settings  ADD COLUMN IF NOT EXISTS vendor_id   bigint REFERENCES fresh.vendors(id);
ALTER TABLE fresh.settings  ADD COLUMN IF NOT EXISTS vendor_ref  text;
ALTER TABLE fresh.products  ADD COLUMN IF NOT EXISTS vendor_id   bigint REFERENCES fresh.vendors(id);
ALTER TABLE fresh.products  ADD COLUMN IF NOT EXISTS vendor_ref  text;

-- per-vendor uniqueness: two vendors may both use "RB-123"; one vendor may not repeat it
CREATE UNIQUE INDEX IF NOT EXISTS gemstones_vendor_ref_uq ON fresh.gemstones (vendor_id, vendor_ref) WHERE vendor_ref IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS settings_vendor_ref_uq  ON fresh.settings  (vendor_id, vendor_ref) WHERE vendor_ref IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS products_vendor_ref_uq  ON fresh.products  (vendor_id, vendor_ref) WHERE vendor_ref IS NOT NULL;

-- traceability joins (Dubai stone + Thailand setting lookups)
CREATE INDEX IF NOT EXISTS gemstones_vendor_idx ON fresh.gemstones (vendor_id) WHERE vendor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS settings_vendor_idx  ON fresh.settings  (vendor_id) WHERE vendor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS products_vendor_idx  ON fresh.products  (vendor_id) WHERE vendor_id IS NOT NULL;

COMMIT;
