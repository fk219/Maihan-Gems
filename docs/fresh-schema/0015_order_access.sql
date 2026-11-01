-- FRESH CLEAN SCHEMA — 0015 order access tokens
-- Public order lookup requires the token issued at checkout (or the owning
-- customer session). Existing orders have no token and are customer/admin-only.

BEGIN;

ALTER TABLE fresh.orders ADD COLUMN IF NOT EXISTS access_token_hash text;
CREATE INDEX IF NOT EXISTS orders_access_token_idx ON fresh.orders (access_token_hash) WHERE access_token_hash IS NOT NULL;

COMMIT;
