-- 0021 NGC research catalog: storefronts, categories, stone_specs, ordered media, compatibility, multi-currency list prices.

CREATE TABLE IF NOT EXISTS storefronts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  domain          TEXT,
  path_prefix     TEXT NOT NULL DEFAULT '',
  default_stone_filter TEXT,
  branding        JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO storefronts (slug, name, path_prefix, default_stone_filter, branding) VALUES
  ('maihan', 'Maihan Gems', '', NULL, '{"wordmark":"MAIHAN","kicker":"GEMS · Atelier"}'::jsonb),
  ('sapphire', 'Maihan Sapphire', '/sapphire', 'sapphire', '{"wordmark":"MAIHAN","kicker":"SAPPHIRE"}'::jsonb),
  ('ruby', 'Maihan Ruby', '/ruby', 'ruby', '{"wordmark":"MAIHAN","kicker":"RUBY"}'::jsonb),
  ('emerald', 'Maihan Emerald', '/emerald', 'emerald', '{"wordmark":"MAIHAN","kicker":"EMERALD"}'::jsonb)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  path_prefix = EXCLUDED.path_prefix,
  default_stone_filter = EXCLUDED.default_stone_filter,
  branding = EXCLUDED.branding;

CREATE TABLE IF NOT EXISTS categories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id       UUID REFERENCES categories(id),
  kind            TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  description     TEXT,
  hero_image      TEXT,
  sort            INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  legacy_source_url TEXT
);

CREATE TABLE IF NOT EXISTS gem_types (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id     UUID REFERENCES categories(id),
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  parent_gem_type_id UUID REFERENCES gem_types(id),
  mohs            NUMERIC(4,1),
  family          TEXT
);

CREATE TABLE IF NOT EXISTS lookup_values (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain          TEXT NOT NULL,
  value           TEXT NOT NULL,
  label           TEXT NOT NULL,
  sort            INTEGER NOT NULL DEFAULT 0,
  UNIQUE (domain, value)
);

ALTER TABLE products ADD COLUMN IF NOT EXISTS public_code TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS description_html TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS availability TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS dyo_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS source_payload JSONB;
ALTER TABLE products ADD COLUMN IF NOT EXISTS storefront_slugs TEXT[] NOT NULL DEFAULT ARRAY['maihan']::text[];

CREATE UNIQUE INDEX IF NOT EXISTS products_public_code_uidx ON products (public_code) WHERE public_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS stone_specs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  role            TEXT NOT NULL DEFAULT 'primary',
  position        INTEGER NOT NULL DEFAULT 0,
  quantity        INTEGER NOT NULL DEFAULT 1,
  gem_type        TEXT,
  gem_subtype     TEXT,
  weight_ct       NUMERIC(8,3),
  total_weight_ct NUMERIC(8,3),
  length_mm       NUMERIC(6,2),
  width_mm        NUMERIC(6,2),
  depth_mm        NUMERIC(6,2),
  shape           TEXT,
  cut             TEXT,
  cutting_style   TEXT,
  color           TEXT,
  color_intensity TEXT,
  color_grade     TEXT,
  clarity         TEXT,
  enhancement     TEXT,
  origin          TEXT,
  is_star         BOOLEAN NOT NULL DEFAULT false,
  star_appearance TEXT,
  special_features TEXT[],
  lab             TEXT,
  lab_color       TEXT,
  lab_report_no   TEXT,
  price_per_ct_usd NUMERIC(12,2)
);

CREATE INDEX IF NOT EXISTS stone_specs_product_idx ON stone_specs (product_id);
CREATE INDEX IF NOT EXISTS stone_specs_shape_weight_idx ON stone_specs (shape, weight_ct);

CREATE TABLE IF NOT EXISTS product_color_categories (
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  color_category  TEXT NOT NULL,
  PRIMARY KEY (product_id, color_category)
);

CREATE TABLE IF NOT EXISTS product_media_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  kind            TEXT NOT NULL,
  sort            INTEGER NOT NULL DEFAULT 0,
  title           TEXT,
  description     TEXT,
  url             TEXT,
  storage_key     TEXT,
  source_url      TEXT,
  file_name       TEXT,
  frames_count    INTEGER,
  frame_url_pattern TEXT,
  is_primary      BOOLEAN NOT NULL DEFAULT false,
  is_past_creation BOOLEAN NOT NULL DEFAULT false,
  source_type_code INTEGER,
  generated_by    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_media_items_product_idx ON product_media_items (product_id, sort);

ALTER TABLE product_media_items ADD COLUMN IF NOT EXISTS cloudinary_public_id TEXT;
ALTER TABLE product_media_items ADD COLUMN IF NOT EXISTS cloudinary_resource_type TEXT;

ALTER TABLE setting_accepts ADD COLUMN IF NOT EXISTS min_length_mm NUMERIC(6,2);
ALTER TABLE setting_accepts ADD COLUMN IF NOT EXISTS max_length_mm NUMERIC(6,2);
ALTER TABLE setting_accepts ADD COLUMN IF NOT EXISTS min_width_mm NUMERIC(6,2);
ALTER TABLE setting_accepts ADD COLUMN IF NOT EXISTS max_width_mm NUMERIC(6,2);
ALTER TABLE setting_accepts ADD COLUMN IF NOT EXISTS stone_count INTEGER NOT NULL DEFAULT 1;
ALTER TABLE setting_accepts ADD COLUMN IF NOT EXISTS tolerance_mm NUMERIC(6,2) NOT NULL DEFAULT 0.3;
ALTER TABLE setting_accepts ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE TABLE IF NOT EXISTS product_storefronts (
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  storefront_id   UUID NOT NULL REFERENCES storefronts(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, storefront_id)
);
