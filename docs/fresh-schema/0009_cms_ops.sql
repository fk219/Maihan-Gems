-- FRESH CLEAN SCHEMA — 0009 CMS + ops (technical_design/43 §5)
-- Content + governance. NO redirects table — descoped by design (fresh SEO start).

BEGIN;

CREATE TABLE fresh.pages (
  id              bigserial PRIMARY KEY,
  slug            text NOT NULL UNIQUE,
  title           text NOT NULL,
  state           text NOT NULL DEFAULT 'DRAFT' CHECK (state IN ('DRAFT','PUBLISHED','ARCHIVED')),
  blocks          jsonb NOT NULL DEFAULT '[]'::jsonb,
  seo_title       text,
  seo_description text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE fresh.seo_metadata (
  id          bigserial PRIMARY KEY,
  path        text NOT NULL UNIQUE,
  title       text,
  description text,
  canonical   text,
  og_image    text,
  robots      text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE fresh.audit_log (                          -- append-only: privileged actions
  id          bigserial PRIMARY KEY,
  actor_kind  text NOT NULL CHECK (actor_kind IN ('admin','vendor','customer','system')),
  actor_id    bigint,
  action      text NOT NULL,
  entity_kind text,
  entity_id   bigint,
  before      jsonb,
  after       jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_log_entity_idx ON fresh.audit_log (entity_kind, entity_id, created_at DESC);
CREATE INDEX audit_log_actor_idx  ON fresh.audit_log (actor_kind, actor_id, created_at DESC);

CREATE TABLE fresh.feature_flags (
  key        text PRIMARY KEY,
  enabled    boolean NOT NULL DEFAULT false,
  payload    jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION fresh.set_updated_at_0009() RETURNS trigger AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER pages_updated_at_trg        BEFORE UPDATE ON fresh.pages        FOR EACH ROW EXECUTE FUNCTION fresh.set_updated_at_0009();
CREATE TRIGGER seo_metadata_updated_at_trg BEFORE UPDATE ON fresh.seo_metadata FOR EACH ROW EXECUTE FUNCTION fresh.set_updated_at_0009();
CREATE TRIGGER feature_flags_updated_at_trg BEFORE UPDATE ON fresh.feature_flags FOR EACH ROW EXECUTE FUNCTION fresh.set_updated_at_0009();

COMMIT;
