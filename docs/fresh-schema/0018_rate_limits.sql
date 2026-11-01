-- FRESH CLEAN SCHEMA — 0018 shared rate-limit windows
-- Multi-instance rate limiting without Redis: atomic upserts per (scope, IP).

BEGIN;

CREATE TABLE IF NOT EXISTS fresh.rate_limits (
  key      text PRIMARY KEY,
  count    integer NOT NULL,
  reset_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS rate_limits_reset_idx ON fresh.rate_limits (reset_at);

COMMIT;
