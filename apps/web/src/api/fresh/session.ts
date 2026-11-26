/**
 * apps/web/src/api/fresh/session.ts
 *
 * Shopper identity for the compatibility surface.
 *
 * ADR-027 is the only session model: the `maihan_session` HttpOnly cookie,
 * hashed at rest in `sessions`, resolved through the same predicate the rest of
 * the app uses. This module adds no second cookie, no second token and no
 * second auth table.
 *
 * Two deliberate differences from the catalogue API's `resolveSessionUser`:
 *   - it does NOT `touchSession` on every read, so a GET on this surface issues
 *     no write of its own (the shopper repositories do their own bookkeeping);
 *   - it resolves the commerce `customers` row, because carts and orders are
 *     bound to `customers.id`, not to `users.id`.
 */
import { ContractError } from '@maihan/contracts';
import {
  ensureCustomerForIdentity,
  findLiveSessionByTokenHash,
  type CompatCustomerRow,
} from '@maihan/db';
import { hashSessionToken, SESSION_COOKIE_NAME } from '@maihan/domain';
import { parseCookies } from '../auth-handlers.js';
import type { FreshContext, FreshDeps } from './handlers.js';

export interface ShopperSession {
  readonly userId: string;
  readonly email: string;
  readonly displayName: string;
  readonly emailVerified: boolean;
  /** The real verification timestamp, or null. */
  readonly emailVerifiedAt: string | null;
  readonly adminRole: string | null;
}

export interface ShopperActor {
  readonly session: ShopperSession;
  readonly customer: CompatCustomerRow;
}

type SessionContext = Pick<FreshContext, 'db' | 'request'>;

/** Resolve the live session, or null. Never throws for an absent cookie. */
export async function resolveShopperSession(ctx: SessionContext): Promise<ShopperSession | null> {
  const token = parseCookies(ctx.request.headers.get('cookie'))[SESSION_COOKIE_NAME];
  if (token === undefined || token.length === 0) return null;
  const row = await findLiveSessionByTokenHash(ctx.db, hashSessionToken(token));
  if (row === null) return null;
  return {
    userId: row.user_id,
    email: row.email,
    displayName: row.display_name,
    emailVerified: row.email_verified_at !== null,
    emailVerifiedAt: row.email_verified_at,
    adminRole: row.admin_role,
  };
}

/** 401 when there is no live session. */
export async function requireShopperSession(ctx: SessionContext): Promise<ShopperSession> {
  const session = await resolveShopperSession(ctx);
  if (session === null) {
    throw new ContractError('UNAUTHORIZED', 'Sign in to continue.');
  }
  return session;
}

/**
 * The idempotent provisioning step: a `users` identity gets its commerce
 * `customers` row. Called only where a cart/order/account projection needs the
 * customer id; it creates no commerce state and no session.
 */
export async function ensureShopperActor(ctx: SessionContext): Promise<ShopperActor> {
  const session = await requireShopperSession(ctx);
  const customer = await ensureCustomerForIdentity(ctx.db, {
    userId: session.userId,
    email: session.email,
  });
  return { session, customer };
}

/** Resolve the actor, or null when anonymous. Used for cart-ownership checks. */
export async function resolveShopperActor(ctx: SessionContext): Promise<ShopperActor | null> {
  const session = await resolveShopperSession(ctx);
  if (session === null) return null;
  const customer = await ensureCustomerForIdentity(ctx.db, {
    userId: session.userId,
    email: session.email,
  });
  return { session, customer };
}

/**
 * The environments that may use the development payment instrument.
 *
 * An allowlist, not "anything but production": `ENVIRONMENT` defaults to
 * `local` elsewhere in the app, so a deny-list would fail open on a
 * misconfigured deployment. Unknown or absent values are refused.
 */
const DEV_ENVIRONMENTS: ReadonlySet<string> = new Set(['local', 'dev', 'development', 'test']);

export function isDevelopmentEnvironment(environment: string | undefined): boolean {
  if (environment === undefined) return false;
  return DEV_ENVIRONMENTS.has(environment.trim().toLowerCase());
}

/** Read a JSON object body, or fail with the documented validation code. */
export async function readJsonObject(
  ctx: Pick<FreshContext, 'request'>,
  options: { readonly required?: boolean } = {},
): Promise<Record<string, unknown>> {
  let text: string;
  try {
    text = await ctx.request.text();
  } catch {
    throw new ContractError('VALIDATION_FAILED', 'The request body could not be read.');
  }
  if (text.trim().length === 0) {
    if (options.required === false) return {};
    throw new ContractError('VALIDATION_FAILED', 'A JSON body is required.');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ContractError('VALIDATION_FAILED', 'Body must be JSON.');
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new ContractError('VALIDATION_FAILED', 'Body must be a JSON object.');
  }
  return parsed as Record<string, unknown>;
}

export function requireString(
  body: Record<string, unknown>,
  field: string,
  options: { readonly max?: number } = {},
): string {
  const raw = body[field];
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    throw new ContractError('VALIDATION_FAILED', `${field} is required.`, [
      { field, code: 'REQUIRED', message: `${field} is required.` },
    ]);
  }
  const value = raw.trim();
  if (options.max !== undefined && value.length > options.max) {
    throw new ContractError('VALIDATION_FAILED', `${field} is too long.`, [
      { field, code: 'TOO_LONG', message: `${field} must be at most ${options.max} characters.` },
    ]);
  }
  return value;
}

export function optionalString(
  body: Record<string, unknown>,
  field: string,
  options: { readonly max?: number } = {},
): string | undefined {
  const raw = body[field];
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== 'string') {
    throw new ContractError('VALIDATION_FAILED', `${field} must be a string.`, [
      { field, code: 'INVALID_TYPE', message: `${field} must be a string.` },
    ]);
  }
  const value = raw.trim();
  if (value.length === 0) return undefined;
  if (options.max !== undefined && value.length > options.max) {
    throw new ContractError('VALIDATION_FAILED', `${field} is too long.`, [
      { field, code: 'TOO_LONG', message: `${field} must be at most ${options.max} characters.` },
    ]);
  }
  return value;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function requireEmail(body: Record<string, unknown>, field = 'email'): string {
  const value = requireString(body, field, { max: 320 });
  if (!EMAIL_PATTERN.test(value)) {
    throw new ContractError('VALIDATION_FAILED', 'A valid email address is required.', [
      { field, code: 'INVALID_EMAIL', message: 'A valid email address is required.' },
    ]);
  }
  return value.toLowerCase();
}

export function optionalPositiveInt(
  body: Record<string, unknown>,
  field: string,
  fallback: number,
): number {
  const raw = body[field];
  if (raw === undefined || raw === null) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 1) {
    throw new ContractError('VALIDATION_FAILED', `${field} must be a positive integer.`, [
      { field, code: 'INVALID_VALUE', message: `${field} must be a positive integer.` },
    ]);
  }
  return Math.trunc(value);
}

/** The default search seam when production wiring is used. */
export function resolveSearch(deps: FreshDeps): FreshDeps['search'] {
  return deps.search;
}
