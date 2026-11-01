-- FRESH CLEAN SCHEMA — 0020 admin two-factor authentication (TOTP)
-- Secrets are stored for the DB admin path only; the env fallback remains
-- dev-only and bypasses 2FA by design.

BEGIN;

ALTER TABLE fresh.admin_users ADD COLUMN IF NOT EXISTS totp_secret text;
ALTER TABLE fresh.admin_users ADD COLUMN IF NOT EXISTS totp_enabled boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS fresh.admin_2fa_challenges (
  id         bigserial PRIMARY KEY,
  admin_id   bigint NOT NULL REFERENCES fresh.admin_users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_2fa_challenges_admin_idx ON fresh.admin_2fa_challenges (admin_id);

COMMIT;
