/**
 * packages/db/src/identity/customer-auth-repository.ts
 *
 * ADR-027 — customer identity lifecycle: email verification and password reset.
 *
 * Three rules, enforced in SQL rather than in calling code:
 *
 *   1. **The token is never stored, returned or selected.** Callers hand this
 *      module a SHA-256 digest; the plaintext exists only in the response that
 *      issued it. No function here returns a token or a hash.
 *   2. **Consumption is a single atomic statement.** `UPDATE … SET used_at =
 *      now() WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
 *      RETURNING user_id` is the whole check. Two concurrent clicks race on
 *      the row lock: exactly one gets a row, the other gets null. There is no
 *      read-then-write window to lose.
 *   3. **Expiry and single-use are predicates, not flags.** An expired or
 *      already-used token cannot be redeemed even if a caller forgets a check.
 *
 * Verification and reset are the same shape but different tables:
 * `email_verification_tokens` (0021) and `password_reset_tokens` (0019, reused
 * rather than duplicated). One repository so the two can never drift.
 *
 * SQL is composed through Drizzle's `sql` template: every value is a
 * parameter, never interpolated text.
 */
import { sql } from 'drizzle-orm';
import type { CatalogDatabase } from '../catalog/executor.js';

/** Parameters shared by both token tables. `expiresAt` is caller-owned. */
export interface IssueTokenParams {
  readonly userId: string;
  /** SHA-256 hex of the opaque token (`hashOpaqueToken`). */
  readonly tokenHash: string;
  /** ISO-8601 timestamp. Callers own the clock (domain rule: no now() there). */
  readonly expiresAt: string;
}

export interface IssuedTokenRow extends Record<string, unknown> {
  id: string;
  expires_at: string;
}

/** The user a consumed token belonged to. Never the token, never the hash. */
export interface ConsumedTokenRow extends Record<string, unknown> {
  user_id: string;
}

/**
 * Issue an email-verification token. Multiple outstanding tokens are allowed
 * (a customer who asks for a second link is not punished); redeeming any one
 * of them is what marks the address verified.
 */
export async function createVerificationToken(
  db: CatalogDatabase,
  params: IssueTokenParams,
): Promise<IssuedTokenRow> {
  const r = await db.execute<IssuedTokenRow>(sql`
    INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
    VALUES (${params.userId}, ${params.tokenHash}, ${params.expiresAt}::timestamptz)
    RETURNING id, expires_at
  `);
  const row = r.rows[0];
  if (row === undefined) throw new Error('IDENTITY: verification token insert returned no row');
  return row;
}

/**
 * Redeem an email-verification token exactly once.
 *
 * Returns the owning user id, or null when the token is unknown, already
 * used, or expired — three cases the caller must treat identically, because
 * distinguishing them would tell an attacker which guess was close.
 */
export async function consumeVerificationToken(
  db: CatalogDatabase,
  tokenHash: string,
): Promise<ConsumedTokenRow | null> {
  const r = await db.execute<ConsumedTokenRow>(sql`
    UPDATE email_verification_tokens
    SET used_at = now()
    WHERE token_hash = ${tokenHash}
      AND used_at IS NULL
      AND expires_at > now()
    RETURNING user_id
  `);
  return r.rows[0] ?? null;
}

/** Issue a password-reset token (same discipline, shorter life). */
export async function createResetToken(
  db: CatalogDatabase,
  params: IssueTokenParams,
): Promise<IssuedTokenRow> {
  const r = await db.execute<IssuedTokenRow>(sql`
    INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
    VALUES (${params.userId}, ${params.tokenHash}, ${params.expiresAt}::timestamptz)
    RETURNING id, expires_at
  `);
  const row = r.rows[0];
  if (row === undefined) throw new Error('IDENTITY: reset token insert returned no row');
  return row;
}

/** Redeem a password-reset token exactly once. Same null semantics. */
export async function consumeResetToken(
  db: CatalogDatabase,
  tokenHash: string,
): Promise<ConsumedTokenRow | null> {
  const r = await db.execute<ConsumedTokenRow>(sql`
    UPDATE password_reset_tokens
    SET used_at = now()
    WHERE token_hash = ${tokenHash}
      AND used_at IS NULL
      AND expires_at > now()
    RETURNING user_id
  `);
  return r.rows[0] ?? null;
}

export interface VerifiedEmailRow extends Record<string, unknown> {
  email_verified_at: string;
}

/**
 * Mark an address verified. Idempotent by construction: `COALESCE` keeps the
 * FIRST verification time, so a second click never rewrites history. Returns
 * null when the user no longer exists.
 */
export async function markEmailVerified(
  db: CatalogDatabase,
  userId: string,
): Promise<VerifiedEmailRow | null> {
  const r = await db.execute<VerifiedEmailRow>(sql`
    UPDATE users
    SET email_verified_at = COALESCE(email_verified_at, now()),
        updated_at = now()
    WHERE id = ${userId}
    RETURNING email_verified_at
  `);
  return r.rows[0] ?? null;
}

/**
 * Replace a password hash. Returns true when a row changed, false when the
 * user is gone — the caller decides whether that is a failure.
 *
 * Revoking sessions is deliberately NOT done here: it is a second table and a
 * second decision, so the application service owns the pair (doc 03: one
 * transaction per command, opened above the repository).
 */
export async function updatePasswordHash(
  db: CatalogDatabase,
  userId: string,
  passwordHash: string,
): Promise<boolean> {
  const r = await db.execute<{ id: string }>(sql`
    UPDATE users
    SET password_hash = ${passwordHash}, updated_at = now()
    WHERE id = ${userId}
    RETURNING id
  `);
  return r.rows[0] !== undefined;
}
