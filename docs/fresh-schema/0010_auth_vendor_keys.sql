-- FRESH CLEAN SCHEMA — 0010 auth additions: vendor API keys
-- Vendor secret is shown ONCE at onboarding approval; only its SHA-256 is stored.

BEGIN;

ALTER TABLE fresh.vendor_onboarding ADD COLUMN IF NOT EXISTS api_key_hash text;
ALTER TABLE fresh.customers      ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

COMMIT;
