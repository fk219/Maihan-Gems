-- 0012_cms
-- Authority: PROJECT_SOURCE_OF_TRUTH.md section 8.12, verbatim.
-- One logical unit: CMS tables.

CREATE TABLE pages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT NOT NULL UNIQUE,
  title         TEXT NOT NULL,
  page_kind     TEXT NOT NULL,      -- STATIC | EDUCATION | BLOG | POLICY | LANDING | SHOWROOM
  status        TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','PUBLISHED','ARCHIVED')),
  blocks        JSONB NOT NULL DEFAULT '[]'::jsonb,   -- typed ContentBlock array
  raw_markdown  TEXT,
  hero_asset_id UUID REFERENCES assets(id),
  template      TEXT NOT NULL DEFAULT 'default',
  published_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ,
  version       INTEGER NOT NULL DEFAULT 1
);
--> statement-breakpoint
CREATE UNIQUE INDEX ON pages (slug) WHERE deleted_at IS NULL;
--> statement-breakpoint
CREATE INDEX ON pages (page_kind, status) WHERE deleted_at IS NULL;
--> statement-breakpoint
CREATE INDEX ON pages USING gin (blocks jsonb_path_ops);
--> statement-breakpoint
CREATE INDEX ON pages USING gin (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(raw_markdown,'')));
--> statement-breakpoint
CREATE TABLE page_revisions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id      UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  version      INTEGER NOT NULL,
  blocks       JSONB NOT NULL,
  raw_markdown TEXT,
  editor_id    UUID,
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (page_id, version)
);
--> statement-breakpoint
CREATE TABLE navigations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key        TEXT NOT NULL,      -- 'header','footer','mega_menu','mobile'
  label      TEXT NOT NULL,
  items      JSONB NOT NULL,     -- nested [{label,href,children,variety_id,external}]
  locale     TEXT NOT NULL DEFAULT 'en',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (key, locale)
);
--> statement-breakpoint
CREATE TABLE redirects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_path   TEXT NOT NULL UNIQUE,
  to_path     TEXT NOT NULL,
  status_code SMALLINT NOT NULL DEFAULT 301,
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX ON redirects (from_path);
--> statement-breakpoint
CREATE TABLE seo_metadata (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_kind      seo_entity_kind NOT NULL,
  entity_id        UUID NOT NULL,
  title            TEXT,
  description      TEXT,
  canonical_path   TEXT,
  og_image_url     TEXT,
  robots           TEXT,
  noindex          BOOLEAN NOT NULL DEFAULT false,
  structured_extra JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entity_kind, entity_id)
);
