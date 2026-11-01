-- FRESH CLEAN SCHEMA — 0017 email verification + outbox dispatch state
-- Verification tokens are hashed and single-use; outbox rows track send
-- attempts so a provider adapter can retry safely.

BEGIN;

CREATE TABLE IF NOT EXISTS fresh.email_verifications (
  id          bigserial PRIMARY KEY,
  customer_id bigint NOT NULL REFERENCES fresh.customers(id) ON DELETE CASCADE,
  token_hash  text NOT NULL UNIQUE,
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS email_verifications_customer_idx ON fresh.email_verifications (customer_id);

ALTER TABLE fresh.email_outbox ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0;
ALTER TABLE fresh.email_outbox ADD COLUMN IF NOT EXISTS last_error text;

CREATE INDEX IF NOT EXISTS customer_addresses_customer_idx ON fresh.customer_addresses (customer_id, is_default DESC);

COMMIT;
