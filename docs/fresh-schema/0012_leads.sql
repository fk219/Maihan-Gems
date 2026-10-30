-- FRESH CLEAN SCHEMA — 0012 leads + admin inventory management
-- Newsletter signups + viewing requests from the storefront.

BEGIN;

CREATE TABLE IF NOT EXISTS fresh.leads (
  id         bigserial PRIMARY KEY,
  email      text NOT NULL,
  name       text,
  source     text NOT NULL DEFAULT 'newsletter' CHECK (source IN ('newsletter','viewing_request','contact')),
  status     text NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW','CONTACTED','CONVERTED','LOST')),
  note       text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX leads_email_source_uq ON fresh.leads (lower(email), source);
CREATE INDEX leads_status_idx ON fresh.leads (status, created_at DESC);

COMMIT;
