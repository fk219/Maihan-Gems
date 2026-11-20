-- 0019_identity
-- ADR-027 — admin and vendor identity is session-based; the trusted-header
-- seam is development-only.
--
-- Expand-only: new tables, no change to any locked table. Customer identity is
-- the same `users` row (admin_role NULL). The ten role values mirror
-- packages/domain/src/auth/roles.ts exactly; a role-list change is a migration,
-- not an application deploy, because authorisation must fail closed.
CREATE TABLE IF NOT EXISTS users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email             CITEXT NOT NULL UNIQUE,
  password_hash     TEXT NOT NULL,
  display_name      TEXT NOT NULL,
  -- NULL = customer. Non-null = administrative actor with exactly one role.
  admin_role        TEXT
    CHECK (admin_role IS NULL OR admin_role IN (
      'ADMIN_SUPER','CATALOG_MANAGER','CONTENT_EDITOR','CONTENT_PUBLISHER',
      'COMMERCE_OPERATOR','TRUST_REVIEWER','CONCIERGE_AGENT','AI_OPERATIONS',
      'MIGRATION_ENGINEER','READ_ONLY_ANALYST')),
  state             TEXT NOT NULL DEFAULT 'ACTIVE'
    CHECK (state IN ('ACTIVE','SUSPENDED')),
  email_verified_at TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS users_admin_role_idx ON users (admin_role)
  WHERE admin_role IS NOT NULL;

CREATE TABLE IF NOT EXISTS sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- SHA-256 of the opaque token. The token itself is never stored.
  token_hash   TEXT NOT NULL UNIQUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL,
  revoked_at   TIMESTAMPTZ,
  ip           TEXT,
  user_agent   TEXT
);

CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id);
CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions (expires_at)
  WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS password_reset_tokens_user_idx
  ON password_reset_tokens (user_id);
