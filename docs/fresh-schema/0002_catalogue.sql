-- FRESH CLEAN SCHEMA v1 — catalogue core
-- Owner-approved design: technical_design/41 (ADR-035, 2026-10-28).
-- Business rules only: F-INV-01/02/03 composition law (CHECKs + one trigger).
-- No provenance, no staging, no source-tracking columns.

BEGIN;

CREATE TABLE fresh.gemstones (
  id           bigserial PRIMARY KEY,
  ref          text NOT NULL UNIQUE,
  slug         text NOT NULL UNIQUE,
  name         text NOT NULL,
  variety_id   bigint NOT NULL REFERENCES fresh.gemstone_varieties(id),
  colour_id    bigint REFERENCES fresh.gemstone_colours(id),
  origin_id    bigint REFERENCES fresh.gemstone_origins(id),
  shape_id     bigint REFERENCES fresh.shapes(id),
  clarity_id   bigint REFERENCES fresh.clarities(id),
  treatment_id bigint REFERENCES fresh.treatments(id),
  kind         fresh.gemstone_kind NOT NULL DEFAULT 'SINGLE',
  pieces       smallint NOT NULL DEFAULT 1 CHECK (pieces IN (1, 2)),
  weight_ct    numeric(8,3)   CHECK (weight_ct IS NULL OR weight_ct > 0),
  length_mm    numeric(6,2),
  width_mm     numeric(6,2),
  depth_mm     numeric(6,2),
  description  text,
  price_amount numeric(12,2)  CHECK (price_amount IS NULL OR price_amount >= 0),
  currency     char(3)        NOT NULL DEFAULT 'USD',
  quantity     smallint       NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  status       fresh.catalog_status NOT NULL DEFAULT 'DRAFT',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gemstones_kind_pieces_ck CHECK (
    (kind = 'SINGLE' AND pieces = 1) OR (kind = 'PAIR' AND pieces = 2)
  ),
  CONSTRAINT gemstones_status_ck CHECK (
    status IN ('DRAFT','ACTIVE','RESERVED','SOLD','ARCHIVED')
  )
);
CREATE INDEX gemstones_variety_idx  ON fresh.gemstones (variety_id, status);
CREATE INDEX gemstones_colour_idx   ON fresh.gemstones (colour_id) WHERE colour_id IS NOT NULL;
CREATE INDEX gemstones_shape_idx    ON fresh.gemstones (shape_id)  WHERE shape_id  IS NOT NULL;
CREATE INDEX gemstones_price_idx    ON fresh.gemstones (price_amount) WHERE price_amount IS NOT NULL;
CREATE UNIQUE INDEX gemstones_active_slug_idx ON fresh.gemstones (slug);

CREATE TABLE fresh.gemstone_stones (
  id          bigserial PRIMARY KEY,
  gemstone_id bigint NOT NULL REFERENCES fresh.gemstones(id) ON DELETE CASCADE,
  position    smallint NOT NULL CHECK (position IN (1, 2)),
  weight_ct   numeric(8,3) NOT NULL CHECK (weight_ct > 0),
  length_mm   numeric(6,2),
  width_mm    numeric(6,2),
  depth_mm    numeric(6,2),
  CONSTRAINT gemstone_stones_unique_position UNIQUE (gemstone_id, position)
);

CREATE TABLE fresh.settings (
  id               bigserial PRIMARY KEY,
  ref              text NOT NULL UNIQUE,
  slug             text NOT NULL UNIQUE,
  sku              text NOT NULL UNIQUE,
  name             text NOT NULL,
  design_code      text NOT NULL,
  jewellery_type_id bigint NOT NULL REFERENCES fresh.jewellery_types(id),
  style_id         bigint REFERENCES fresh.setting_styles(id),
  metal_id         bigint NOT NULL REFERENCES fresh.metals(id),
  description      text,
  price_amount     numeric(12,2) CHECK (price_amount IS NULL OR price_amount >= 0),
  currency         char(3) NOT NULL DEFAULT 'USD',
  status           fresh.catalog_status NOT NULL DEFAULT 'DRAFT',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT settings_status_ck CHECK (status IN ('DRAFT','ACTIVE','ARCHIVED')),
  CONSTRAINT settings_design_metal_unique UNIQUE (design_code, metal_id)
);
CREATE INDEX settings_jewellery_type_idx ON fresh.settings (jewellery_type_id, status);
CREATE INDEX settings_style_idx          ON fresh.settings (style_id) WHERE style_id IS NOT NULL;
CREATE INDEX settings_metal_idx          ON fresh.settings (metal_id);

CREATE TABLE fresh.setting_compatible_shapes (
  setting_id bigint NOT NULL REFERENCES fresh.settings(id) ON DELETE CASCADE,
  shape_id   bigint NOT NULL REFERENCES fresh.shapes(id),
  PRIMARY KEY (setting_id, shape_id)
);

CREATE TABLE fresh.products (
  id                bigserial PRIMARY KEY,
  ref               text NOT NULL UNIQUE,
  slug              text NOT NULL UNIQUE,
  name              text NOT NULL,
  jewellery_type_id bigint NOT NULL REFERENCES fresh.jewellery_types(id),
  kind              fresh.product_kind NOT NULL,
  setting_id        bigint REFERENCES fresh.settings(id),
  gemstone_id       bigint REFERENCES fresh.gemstones(id),
  description       text,
  price_amount      numeric(12,2) CHECK (price_amount IS NULL OR price_amount >= 0),
  making_fee_amount numeric(10,2) CHECK (making_fee_amount IS NULL OR making_fee_amount >= 0),
  currency          char(3) NOT NULL DEFAULT 'USD',
  status            fresh.catalog_status NOT NULL DEFAULT 'DRAFT',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT products_status_ck CHECK (status IN ('DRAFT','ACTIVE','ARCHIVED')),
  CONSTRAINT products_ready_made_composition_ck CHECK (
    kind <> 'READY_MADE' OR (setting_id IS NULL AND gemstone_id IS NULL)
  ),
  CONSTRAINT products_configured_composition_ck CHECK (
    kind <> 'CONFIGURED' OR (setting_id IS NOT NULL AND gemstone_id IS NOT NULL)
  )
);
CREATE INDEX products_jewellery_type_idx ON fresh.products (jewellery_type_id, status);
CREATE INDEX products_setting_idx        ON fresh.products (setting_id)  WHERE setting_id  IS NOT NULL;
CREATE INDEX products_gemstone_idx       ON fresh.products (gemstone_id) WHERE gemstone_id IS NOT NULL;

CREATE TABLE fresh.configurations (
  id               bigserial PRIMARY KEY,
  code             text NOT NULL UNIQUE,
  composition_hash text NOT NULL UNIQUE,
  jewellery_type_id bigint NOT NULL REFERENCES fresh.jewellery_types(id),
  setting_id       bigint NOT NULL REFERENCES fresh.settings(id),
  gemstone_id      bigint REFERENCES fresh.gemstones(id),
  status           fresh.configuration_status NOT NULL DEFAULT 'OPEN',
  quoted_amount    numeric(12,2) CHECK (quoted_amount IS NULL OR quoted_amount >= 0),
  quoted_at        timestamptz,
  expires_at       timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT configurations_quoted_ck CHECK (
    status NOT IN ('QUOTED','CONVERTED') OR (quoted_amount IS NOT NULL AND quoted_at IS NOT NULL)
  )
);
CREATE INDEX configurations_setting_idx  ON fresh.configurations (setting_id);
CREATE INDEX configurations_gemstone_idx ON fresh.configurations (gemstone_id) WHERE gemstone_id IS NOT NULL;

CREATE TABLE fresh.assets (
  id         bigserial PRIMARY KEY,
  owner_kind text NOT NULL CHECK (owner_kind IN ('gemstone','setting','product','configuration')),
  owner_id   bigint NOT NULL,
  role       fresh.asset_role NOT NULL DEFAULT 'GALLERY',
  url        text NOT NULL,
  position   integer NOT NULL DEFAULT 0,
  alt        text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX assets_owner_idx ON fresh.assets (owner_kind, owner_id, position);

CREATE TABLE fresh.price_history (
  id          bigserial PRIMARY KEY,
  entity_kind text NOT NULL CHECK (entity_kind IN ('gemstone','setting','product')),
  entity_id   bigint NOT NULL,
  amount      numeric(12,2) NOT NULL CHECK (amount >= 0),
  currency    char(3) NOT NULL,
  reason      text,
  changed_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX price_history_entity_idx ON fresh.price_history (entity_kind, entity_id, changed_at DESC);

-- F-INV-02 / F-INV-03: cross-table composition law (single-table parts above are CHECKs).
CREATE OR REPLACE FUNCTION fresh.assert_product_composition() RETURNS trigger AS $$
DECLARE
  stone_kind fresh.gemstone_kind;
  jt_code    text;
BEGIN
  IF NEW.setting_id IS NOT NULL AND NOT EXISTS
    (SELECT 1 FROM fresh.settings s WHERE s.id = NEW.setting_id AND s.status <> 'ARCHIVED') THEN
    RAISE EXCEPTION 'products: setting % is ARCHIVED', NEW.setting_id;
  END IF;
  IF NEW.gemstone_id IS NOT NULL THEN
    SELECT kind INTO stone_kind FROM fresh.gemstones WHERE id = NEW.gemstone_id;
    SELECT code  INTO jt_code    FROM fresh.jewellery_types WHERE id = NEW.jewellery_type_id;
    IF stone_kind = 'PAIR' AND jt_code <> 'EARRING' THEN
      RAISE EXCEPTION 'F-INV-02: pair stones may only be configured into EARRINGS';
    END IF;
    IF stone_kind = 'SINGLE' AND jt_code = 'EARRING' THEN
      RAISE EXCEPTION 'F-INV-03: single stones may not be configured into EARRINGS';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_composition_trg
  BEFORE INSERT OR UPDATE OF setting_id, gemstone_id, jewellery_type_id ON fresh.products
  FOR EACH ROW EXECUTE FUNCTION fresh.assert_product_composition();

CREATE OR REPLACE FUNCTION fresh.set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER gemstones_updated_at_trg     BEFORE UPDATE ON fresh.gemstones      FOR EACH ROW EXECUTE FUNCTION fresh.set_updated_at();
CREATE TRIGGER settings_updated_at_trg      BEFORE UPDATE ON fresh.settings       FOR EACH ROW EXECUTE FUNCTION fresh.set_updated_at();
CREATE TRIGGER products_updated_at_trg      BEFORE UPDATE ON fresh.products       FOR EACH ROW EXECUTE FUNCTION fresh.set_updated_at();
CREATE TRIGGER configurations_updated_at_trg BEFORE UPDATE ON fresh.configurations FOR EACH ROW EXECUTE FUNCTION fresh.set_updated_at();

COMMIT;
