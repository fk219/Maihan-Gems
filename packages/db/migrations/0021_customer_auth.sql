-- 0021_customer_auth
-- Customer identity: email verification for the `users` row created at
-- registration (admin_role NULL, email_verified_at NULL).
--
-- Expand-only: one new table, no change to any locked table and no change to
-- `users` or `sessions`. Password reset deliberately reuses the existing
-- `password_reset_tokens` table from 0019, so reset and verification share one
-- discipline instead of two near-identical ones.
--
-- Both token tables store a SHA-256 digest only. The plaintext token exists in
-- the response of the issuing operation and nowhere else, so a database read
-- yields no usable credential (same rule as `sessions.token_hash`).
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- SHA-256 hex of the opaque token. UNIQUE also supplies the lookup index:
  -- verification resolves a token by hash, never by user.
  token_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ
);

-- The operator tool and the "latest outstanding token" diagnostic read by
-- user, newest first; this index serves both without scanning the table.
CREATE INDEX IF NOT EXISTS email_verification_tokens_user_idx
  ON email_verification_tokens (user_id, created_at DESC);

-- Single-use consumption filters on the unused set only; a partial index keeps
-- the predicate cheap as used rows accumulate.
CREATE INDEX IF NOT EXISTS email_verification_tokens_unused_idx
  ON email_verification_tokens (expires_at)
  WHERE used_at IS NULL;
