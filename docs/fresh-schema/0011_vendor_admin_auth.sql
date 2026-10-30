-- FRESH CLEAN SCHEMA — 0011 vendor auth + admin users
-- Proper email+password login for vendors; admin user management.

BEGIN;

-- vendor passwords (email+password login; the API key stays for API-to-API)
ALTER TABLE fresh.vendor_onboarding ADD COLUMN IF NOT EXISTS password_hash text;
ALTER TABLE fresh.vendor_onboarding ADD COLUMN IF NOT EXISTS password_set_at timestamptz;
ALTER TABLE fresh.vendors ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

-- vendor sessions (same pattern as auth_sessions)
CREATE TABLE IF NOT EXISTS fresh.vendor_sessions (
  id          bigserial PRIMARY KEY,
  vendor_id   bigint NOT NULL REFERENCES fresh.vendors(id) ON DELETE CASCADE,
  token_hash  text NOT NULL UNIQUE,
  user_agent  text,
  expires_at  timestamptz NOT NULL,
  revoked_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX vendor_sessions_vendor_idx ON fresh.vendor_sessions (vendor_id);

-- admin users (proper credentials instead of env-only token)
CREATE TABLE IF NOT EXISTS fresh.admin_users (
  id            bigserial PRIMARY KEY,
  email         text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  name          text,
  role          text NOT NULL DEFAULT 'ADMIN' CHECK (role IN ('ADMIN','ADMIN_SUPER')),
  last_login_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fresh.admin_sessions (
  id          bigserial PRIMARY KEY,
  admin_id    bigint NOT NULL REFERENCES fresh.admin_users(id) ON DELETE CASCADE,
  token_hash  text NOT NULL UNIQUE,
  expires_at  timestamptz NOT NULL,
  revoked_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- seed the admin user (owner-configured; scrypt hash set at first login-setup)
INSERT INTO fresh.admin_users (email, password_hash, name, role)
VALUES ('admin@maihangems.com', 'PENDING_SETUP', 'Maihan Admin', 'ADMIN_SUPER')
ON CONFLICT (email) DO NOTHING;

COMMIT;
