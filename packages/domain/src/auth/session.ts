/**
 * packages/domain/src/auth/session.ts
 *
 * ADR-027 — opaque session tokens.
 *
 * A token is 256 bits of CSPRNG output, base64url-encoded. Only its SHA-256
 * hash is persisted, so a database read never yields a usable credential.
 * Hashing is unsalted on purpose: the input is already high-entropy, and an
 * unsalted digest allows the lookup index that makes every request cheap.
 *
 * Email-verification tokens and password-reset tokens are the same primitive
 * with a shorter life. They live here so there is exactly one token format,
 * one digest and one expiry rule in the codebase.
 */
import { createHash, randomBytes } from 'node:crypto';

export const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
export const SESSION_IDLE_TTL_MS = 60 * 60 * 1000; // 1 hour
export const SESSION_COOKIE_NAME = 'maihan_session';

/** A verification link is clicked within a day or it is reissued. */
export const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
/** Password reset is deliberately shorter: it is the higher-value token. */
export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

/** 256 bits of CSPRNG output, base64url. Never derived from user input. */
export function generateOpaqueToken(): string {
  return randomBytes(32).toString('base64url');
}

/** SHA-256 hex. The only form of a token that is ever stored or logged. */
export function hashOpaqueToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function generateSessionToken(): string {
  return generateOpaqueToken();
}

export function hashSessionToken(token: string): string {
  return hashOpaqueToken(token);
}

export function sessionExpiry(nowMs: number): string {
  return new Date(nowMs + SESSION_TTL_MS).toISOString();
}

/** Absolute expiry for a token of any lifetime. Callers own the clock. */
export function tokenExpiry(nowMs: number, ttlMs: number): string {
  return new Date(nowMs + ttlMs).toISOString();
}
