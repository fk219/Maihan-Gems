/**
 * packages/db/src/identity/identity-repository.ts
 *
 * ADR-027 — session-backed identity.
 *
 * Two rules dominate this file:
 *   1. The session token is never stored or returned. Callers pass a SHA-256
 *      hash; a database leak therefore yields no usable session.
 *   2. A session is valid only when it is unrevoked and unexpired. Both checks
 *      live in the SQL predicate, not in calling code, so no caller can forget
 *      one.
 *
 * All SQL is composed through Drizzle's `sql` template: every value is a
 * parameter, never interpolated text.
 */
import { sql } from 'drizzle-orm';
import type { CatalogDatabase } from '../catalog/executor.js';

export type AdminRoleName =
  | 'ADMIN_SUPER'
  | 'CATALOG_MANAGER'
  | 'CONTENT_EDITOR'
  | 'CONTENT_PUBLISHER'
  | 'COMMERCE_OPERATOR'
  | 'TRUST_REVIEWER'
  | 'CONCIERGE_AGENT'
  | 'AI_OPERATIONS'
  | 'MIGRATION_ENGINEER'
  | 'READ_ONLY_ANALYST';

export interface UserRow extends Record<string, unknown> {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  admin_role: AdminRoleName | null;
  state: 'ACTIVE' | 'SUSPENDED';
  email_verified_at: string | null;
}

export interface SessionUserRow extends Record<string, unknown> {
  id: string;
  user_id: string;
  expires_at: string;
  email: string;
  display_name: string;
  admin_role: AdminRoleName | null;
  state: 'ACTIVE' | 'SUSPENDED';
  email_verified_at: string | null;
}

export interface CreateUserParams {
  readonly email: string;
  readonly passwordHash: string;
  readonly displayName: string;
  readonly adminRole?: AdminRoleName | null;
}

export interface CreateSessionParams {
  readonly userId: string;
  readonly tokenHash: string;
  /** ISO-8601 timestamp. Callers own the clock (domain rule: no now() inside). */
  readonly expiresAt: string;
  readonly ip?: string | null;
  readonly userAgent?: string | null;
}

export async function findUserByEmail(
  db: CatalogDatabase,
  email: string,
): Promise<UserRow | null> {
  const r = await db.execute<UserRow>(sql`
    SELECT id, email, password_hash, display_name, admin_role, state, email_verified_at
    FROM users
    WHERE email = ${email}
  `);
  return r.rows[0] ?? null;
}

export async function findUserById(db: CatalogDatabase, id: string): Promise<UserRow | null> {
  const r = await db.execute<UserRow>(sql`
    SELECT id, email, password_hash, display_name, admin_role, state, email_verified_at
    FROM users
    WHERE id = ${id}
  `);
  return r.rows[0] ?? null;
}

export async function createUser(
  db: CatalogDatabase,
  params: CreateUserParams,
): Promise<UserRow> {
  const r = await db.execute<UserRow>(sql`
    INSERT INTO users (email, password_hash, display_name, admin_role)
    VALUES (${params.email}, ${params.passwordHash}, ${params.displayName},
            ${params.adminRole ?? null})
    RETURNING id, email, password_hash, display_name, admin_role, state, email_verified_at
  `);
  const row = r.rows[0];
  if (row === undefined) throw new Error('IDENTITY: user insert returned no row');
  return row;
}

export async function createSession(
  db: CatalogDatabase,
  params: CreateSessionParams,
): Promise<{ id: string; expires_at: string }> {
  const r = await db.execute<{ id: string; expires_at: string }>(sql`
    INSERT INTO sessions (user_id, token_hash, expires_at, ip, user_agent)
    VALUES (${params.userId}, ${params.tokenHash}, ${params.expiresAt}::timestamptz,
            ${params.ip ?? null}, ${params.userAgent ?? null})
    RETURNING id, expires_at
  `);
  const row = r.rows[0];
  if (row === undefined) throw new Error('IDENTITY: session insert returned no row');
  return row;
}

/**
 * Resolve a live session by token hash. The predicate enforces three things at
 * once: the session exists, it is not revoked, and it has not expired.
 */
export async function findLiveSessionByTokenHash(
  db: CatalogDatabase,
  tokenHash: string,
): Promise<SessionUserRow | null> {
  const r = await db.execute<SessionUserRow>(sql`
    SELECT s.id, s.user_id, s.expires_at,
           u.email, u.display_name, u.admin_role, u.state, u.email_verified_at
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ${tokenHash}
      AND s.revoked_at IS NULL
      AND s.expires_at > now()
  `);
  const row = r.rows[0];
  if (row === undefined) return null;
  // A suspended user keeps no live session. Enforced here so every caller,
  // including the admin gate, inherits it.
  if (row.state !== 'ACTIVE') return null;
  return row;
}

export async function touchSession(db: CatalogDatabase, sessionId: string): Promise<void> {
  await db.execute(sql`
    UPDATE sessions SET last_seen_at = now() WHERE id = ${sessionId}
  `);
}

export async function revokeSession(db: CatalogDatabase, sessionId: string): Promise<void> {
  await db.execute(sql`
    UPDATE sessions SET revoked_at = now()
    WHERE id = ${sessionId} AND revoked_at IS NULL
  `);
}

export async function revokeAllSessions(db: CatalogDatabase, userId: string): Promise<void> {
  await db.execute(sql`
    UPDATE sessions SET revoked_at = now()
    WHERE user_id = ${userId} AND revoked_at IS NULL
  `);
}
