-- 0019_storefront_schema
-- Multi-vendor storefront schema based on Reasy JSON schemas and proposal.
-- Adds: vendors, unified products table, multi-currency pricing, DYO designs

-- Vendors ------------------------------------------------------------------------
CREATE TABLE vendors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT NOT NULL UNIQUE,
  display_name    TEXT NOT NULL,
  legal_name      TEXT,
  country         CHAR(2),
  base_currency   CHAR(3) NOT NULL DEFAULT 'USD',
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'suspended', 'closed')),
  logo_url        TEXT,
  banner_url      TEXT,
  about           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO vendors (id, slug, display_name, legal_name, country, base_currency, status) 
VALUES ('00000000-0000-0000-0000-000000000001', 'maihan', 'Maihan Gems', 'Maihan Gems LLC', 'AE', 'USD', 'active');

-- Product kind enum (gemstone, jewelry, setting)
DO $$ BEGIN
  CREATE TYPE product_type AS ENUM ('gemstone', 'jewelry', 'setting');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Unified Products table ----------------------------------------------------------
CREATE TABLE products (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id         UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES vendors(id),
  kind              product_type NOT NULL,
  sku               TEXT NOT NULL,
  slug              TEXT NOT NULL UNIQUE,
  title             TEXT NOT NULL,
  description       TEXT,
  brand             TEXT,
  collection        TEXT,
  
  status            TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  visibility        TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'b2b_only', 'hidden')),
  
  -- Pricing
  pricing_mode      TEXT NOT NULL CHECK (pricing_mode IN ('fixed', 'per_carat', 'per_gram', 'on_request', 'login_required', 'estimate')),
  base_currency     CHAR(3) NOT NULL DEFAULT 'USD',
  
  made_to_order     BOOLEAN NOT NULL DEFAULT false,
  lead_time_days    INTEGER,
  moq               INTEGER,
  
  tags              TEXT[],
  
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ,
  
  UNIQUE (vendor_id, sku)
);

CREATE INDEX ON products (vendor_id) WHERE deleted_at IS NULL;
CREATE INDEX ON products (kind, status) WHERE deleted_at IS NULL;
CREATE INDEX ON products (slug) WHERE deleted_at IS NULL;

-- Gemstone Details ----------------------------------------------------------------
CREATE TABLE gemstone_details (
  product_id        UUID PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  
  quantity_type     TEXT NOT NULL DEFAULT 'single' CHECK (quantity_type IN ('single', 'pair', 'matched_set', 'lot', 'layout', 'calibrated_parcel')),
  piece_count       INTEGER NOT NULL DEFAULT 1,
  
  stone_type        TEXT NOT NULL, -- sapphire, ruby, emerald, etc
  variety           TEXT,
  
  origin_type       TEXT NOT NULL CHECK (origin_type IN ('natural', 'lab_grown', 'simulant')),
  
  carat_total       NUMERIC(8,3),
  length_mm         NUMERIC(8,3),
  width_mm          NUMERIC(8,3),
  depth_mm          NUMERIC(8,3),
  
  shape             TEXT,
  cut_style         TEXT,
  
  color_hue         TEXT,
  color_trade       TEXT,
  color_intensity   TEXT,
  
  clarity_grade     TEXT,
  
  treatment_status  TEXT,
  treatment_details TEXT,
  
  origin_country    TEXT,
  origin_region     TEXT,
  
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Jewelry Details -----------------------------------------------------------------
CREATE TABLE jewelry_details (
  product_id        UUID PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  
  jewelry_type      TEXT NOT NULL, -- ring, earrings, necklace, pendant, bracelet, etc
  
  metal_type        TEXT, -- gold, platinum, silver
  metal_purity      TEXT, -- 14K, 18K, 925, etc
  metal_color       TEXT, -- yellow, white, rose
  metal_weight_g    NUMERIC(8,3),
  
  total_carat_weight NUMERIC(8,3),
  
  ring_size         TEXT,
  ring_size_system  TEXT,
  
  chain_length_cm   NUMERIC(6,2),
  chain_width_mm    NUMERIC(6,2),
  
  setting_id        UUID REFERENCES products(id), -- links to a setting product
  
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Setting Details -----------------------------------------------------------------
CREATE TABLE setting_details (
  product_id        UUID PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  
  setting_for       TEXT NOT NULL, -- ring, pendant, earrings, necklace, bracelet
  style             TEXT[], -- solitaire, halo, pave, etc
  
  head_type         TEXT,
  prong_count       INTEGER,
  
  shank_profile     TEXT,
  band_width_mm     NUMERIC(6,2),
  
  ring_size_min     TEXT,
  ring_size_max     TEXT,
  
  price_excludes_center BOOLEAN DEFAULT true,
  
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Setting Accepts (compatibility rules) ------------------------------------------
CREATE TABLE setting_accepts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  
  shape             TEXT NOT NULL,
  min_carat         NUMERIC(8,3),
  max_carat         NUMERIC(8,3),
  min_mm            NUMERIC(8,3),
  max_mm            NUMERIC(8,3),
  
  stone_types       TEXT[], -- optional filter by stone type
  
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON setting_accepts (setting_product_id);

-- Product Options & Variants ------------------------------------------------------
CREATE TABLE product_options (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name              TEXT NOT NULL, -- metal, ring_size, length, etc
  position          INTEGER NOT NULL DEFAULT 0,
  
  UNIQUE (product_id, name)
);

CREATE TABLE product_option_values (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  option_id         UUID NOT NULL REFERENCES product_options(id) ON DELETE CASCADE,
  value             TEXT NOT NULL,
  position          INTEGER NOT NULL DEFAULT 0,
  
  -- For metal options
  metal_type        TEXT,
  metal_purity      TEXT,
  metal_color       TEXT,
  
  UNIQUE (option_id, value)
);

CREATE TABLE product_variants (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku               TEXT NOT NULL UNIQUE,
  
  option_value_ids  UUID[], -- references product_option_values
  
  price_delta       NUMERIC(12,2),
  metal_weight_g    NUMERIC(8,3),
  
  is_default        BOOLEAN NOT NULL DEFAULT false,
  status            TEXT NOT NULL DEFAULT 'active',
  
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON product_variants (product_id);

-- Inventory -----------------------------------------------------------------------
CREATE TABLE inventory (
  variant_id        UUID PRIMARY KEY REFERENCES product_variants(id) ON DELETE CASCADE,
  
  on_hand           INTEGER NOT NULL DEFAULT 0,
  reserved          INTEGER NOT NULL DEFAULT 0,
  allow_backorder   BOOLEAN NOT NULL DEFAULT false,
  location          TEXT,
  
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Regions & Currency --------------------------------------------------------------
CREATE TABLE regions (
  code              TEXT PRIMARY KEY, -- AE, TH, GLOBAL
  name              TEXT NOT NULL,
  currency          CHAR(3) NOT NULL, -- AED, THB, USD
  countries         TEXT[], -- country codes
  tax_inclusive     BOOLEAN NOT NULL DEFAULT false,
  default_tax_rate  NUMERIC(5,2),
  
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO regions (code, name, currency, countries, tax_inclusive, default_tax_rate) VALUES
  ('AE', 'United Arab Emirates', 'AED', ARRAY['AE'], true, 5.00),
  ('TH', 'Thailand', 'THB', ARRAY['TH'], false, 7.00),
  ('GLOBAL', 'Global', 'USD', ARRAY[]::TEXT[], false, 0.00);

CREATE TABLE fx_rates (
  base              CHAR(3) NOT NULL,
  quote             CHAR(3) NOT NULL,
  rate              NUMERIC(18,8) NOT NULL,
  source            TEXT,
  fetched_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  PRIMARY KEY (base, quote, fetched_at)
);

-- Seed some initial FX rates
INSERT INTO fx_rates (base, quote, rate, source) VALUES
  ('USD', 'AED', 3.6725, 'manual'),
  ('AED', 'USD', 0.2723, 'manual'),
  ('USD', 'THB', 34.50, 'manual'),
  ('THB', 'USD', 0.0290, 'manual'),
  ('AED', 'THB', 9.40, 'manual'),
  ('THB', 'AED', 0.1064, 'manual');

-- Product Prices ------------------------------------------------------------------
CREATE TABLE product_prices (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id        UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  region_code       TEXT REFERENCES regions(code), -- NULL = base price
  
  currency          CHAR(3) NOT NULL,
  amount            NUMERIC(12,2) NOT NULL,
  compare_at_amount NUMERIC(12,2),
  
  price_per_carat   NUMERIC(12,2),
  price_per_gram    NUMERIC(12,2),
  
  is_override       BOOLEAN NOT NULL DEFAULT false,
  
  valid_from        TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_to          TIMESTAMPTZ,
  
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE (variant_id, region_code, valid_from)
);

CREATE INDEX ON product_prices (variant_id, region_code);

-- Media ---------------------------------------------------------------------------
CREATE TABLE media (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id         UUID REFERENCES vendors(id),
  
  kind              TEXT NOT NULL CHECK (kind IN ('image', 'video', '360', 'model_3d', 'certificate', 'document')),
  storage_key       TEXT NOT NULL,
  url               TEXT NOT NULL,
  
  mime_type         TEXT,
  width             INTEGER,
  height            INTEGER,
  size_bytes        INTEGER,
  
  alt               TEXT,
  is_private        BOOLEAN NOT NULL DEFAULT false,
  
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE media_links (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id          UUID NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  
  entity_type       TEXT NOT NULL, -- product, certificate, etc
  entity_id         UUID NOT NULL,
  
  role              TEXT NOT NULL, -- primary, gallery, thumbnail, certificate
  position          INTEGER NOT NULL DEFAULT 0,
  
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE (entity_type, entity_id, media_id, role)
);

CREATE INDEX ON media_links (entity_type, entity_id);
CREATE INDEX ON media_links (media_id);

-- Certificates --------------------------------------------------------------------
CREATE TABLE certificates (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id         UUID NOT NULL REFERENCES vendors(id),
  
  lab               TEXT NOT NULL, -- GIA, GRS, SSEF, etc
  report_number     TEXT NOT NULL,
  report_type       TEXT,
  issue_date        DATE,
  
  media_id          UUID REFERENCES media(id), -- PDF/image of certificate
  verify_url        TEXT,
  
  verified_status   TEXT NOT NULL DEFAULT 'unverified' CHECK (verified_status IN ('unverified', 'verified', 'rejected')),
  
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE (lab, report_number)
);

CREATE TABLE certificate_links (
  certificate_id    UUID NOT NULL REFERENCES certificates(id) ON DELETE CASCADE,
  product_id        UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  
  PRIMARY KEY (certificate_id, product_id)
);

CREATE INDEX ON certificate_links (product_id);

-- Favorites -----------------------------------------------------------------------
CREATE TABLE favorites (
  user_id           UUID NOT NULL, -- will link to users table when auth is added
  product_id        UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  PRIMARY KEY (user_id, product_id)
);

-- Compare List --------------------------------------------------------------------
CREATE TABLE compare_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID, -- nullable for guest comparison
  session_id        TEXT,
  product_id        UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE (user_id, product_id),
  UNIQUE (session_id, product_id)
);

-- Cart ----------------------------------------------------------------------------
CREATE TABLE carts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID,
  session_id        TEXT,
  
  region_code       TEXT NOT NULL REFERENCES regions(code),
  currency          CHAR(3) NOT NULL,
  
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'converted', 'abandoned', 'expired')),
  
  expires_at        TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON carts (user_id) WHERE status = 'active';
CREATE INDEX ON carts (session_id) WHERE status = 'active';

CREATE TABLE cart_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id           UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  
  variant_id        UUID NOT NULL REFERENCES product_variants(id),
  design_id         UUID, -- for DYO items (references designs table below)
  
  quantity          INTEGER NOT NULL DEFAULT 1,
  
  unit_amount       NUMERIC(12,2) NOT NULL,
  currency          CHAR(3) NOT NULL,
  fx_rate_used      NUMERIC(18,8),
  
  price_locked_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON cart_items (cart_id);

-- Design Your Own (DYO) -----------------------------------------------------------
CREATE TABLE designs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID,
  
  setting_product_id UUID NOT NULL REFERENCES products(id),
  setting_variant_id UUID REFERENCES product_variants(id),
  
  gemstone_product_id UUID NOT NULL REFERENCES products(id),
  
  ring_size         TEXT,
  engraving         TEXT,
  
  preview_media_id  UUID REFERENCES media(id),
  
  status            TEXT NOT NULL DEFAULT 'saved' CHECK (status IN ('saved', 'quoted', 'ordered')),
  
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON designs (user_id);
CREATE INDEX ON designs (setting_product_id);
CREATE INDEX ON designs (gemstone_product_id);
