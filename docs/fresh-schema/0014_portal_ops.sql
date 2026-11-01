-- FRESH CLEAN SCHEMA — 0014 portal + commerce operations
-- HOLD submissions · password resets · transactional email outbox · search indexes.

BEGIN;

-- Vendor submissions: owner-requested four-state moderation (HOLD included).
ALTER TABLE fresh.vendor_submissions DROP CONSTRAINT IF EXISTS vendor_submissions_status_check;
ALTER TABLE fresh.vendor_submissions
  ADD CONSTRAINT vendor_submissions_status_check
  CHECK (status IN ('DRAFT','SUBMITTED','HOLD','APPROVED','REJECTED'));

-- Password resets for every actor kind (token hash only, single use).
CREATE TABLE IF NOT EXISTS fresh.password_resets (
  id         bigserial PRIMARY KEY,
  actor_kind text NOT NULL CHECK (actor_kind IN ('CUSTOMER','VENDOR','ADMIN')),
  actor_id   bigint NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS password_resets_actor_idx ON fresh.password_resets (actor_kind, actor_id);

-- Transactional email outbox. The dev transport leaves rows QUEUED and logs the
-- message; a production provider drains this table (no provider is faked).
CREATE TABLE IF NOT EXISTS fresh.email_outbox (
  id         bigserial PRIMARY KEY,
  to_email   text NOT NULL,
  subject    text NOT NULL,
  body       text NOT NULL,
  kind       text NOT NULL DEFAULT 'TRANSACTIONAL' CHECK (kind IN ('TRANSACTIONAL','MARKETING')),
  state      text NOT NULL DEFAULT 'QUEUED' CHECK (state IN ('QUEUED','SENT','FAILED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at    timestamptz
);
CREATE INDEX IF NOT EXISTS email_outbox_state_idx ON fresh.email_outbox (state, created_at);

-- Search quality: trigram indexes for settings and variety names.
CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA fresh;
CREATE INDEX IF NOT EXISTS settings_name_trgm_idx ON fresh.settings USING gin (name fresh.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS settings_slug_trgm_idx ON fresh.settings USING gin (slug fresh.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS varieties_name_trgm_idx ON fresh.gemstone_varieties USING gin (name fresh.gin_trgm_ops);

COMMIT;
