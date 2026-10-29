-- FRESH CLEAN SCHEMA — 0010 auth additions: vendor API keys
-- Vendor secret is shown ONCE at onboarding approval; only its SHA-256 is stored.

BEGIN;

ALTER TABLE fresh.vendor_onboarding ADD COLUMN IF NOT EXISTS api_key_hash text;
ALTER TABLE fresh.customers      ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

COMMIT;

-- Search quality: trigram index for fuzzy gemstone matching (owner: "search quality" follow-up)
CREATE INDEX CONCURRENTLY IF NOT EXISTS gemstones_name_trgm_idx ON fresh.gemstones USING gin (name gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS gemstones_slug_trgm_idx ON fresh.gemstones USING gin (slug gin_trgm_ops);
