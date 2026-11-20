/**
 * packages/domain/src/auth/session.ts
 *
 * ADR-027 — opaque session tokens.
 *
 * A token is 256 bits of CSPRNG output, base64url-encoded. Only its SHA-256
 * hash is persisted, so a database read never yields a usable credential.
 * Hashing is unsalted on purpose: the input is already high-entropy, and an
 * unsalted digest allows the lookup index that makes every request cheap.
 */
import { createHash, randomBytes } from 'node:crypto';

export const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
export const SESSION_IDLE_TTL_MS = 60 * 60 * 1000; // 1 hour
export const SESSION_COOKIE_NAME = 'maihan_session';

export function generateSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function sessionExpiry(nowMs: number): string {
  return new Date(nowMs + SESSION_TTL_MS).toISOString();
}
