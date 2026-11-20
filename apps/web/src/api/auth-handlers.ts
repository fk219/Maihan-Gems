/**
 * apps/web/src/api/auth-handlers.ts
 *
 * ADR-027 — login, logout and "who am I".
 *
 * Security properties:
 *   - The password is never echoed, logged or included in an error.
 *   - A missing user still performs a full scrypt verification against a
 *     throwaway hash, so response timing does not reveal whether the email
 *     exists.
 *   - The session token exists only in the response cookie. The body carries
 *     the user projection and the expiry, never the token.
 *   - The cookie is HttpOnly, SameSite=Lax, Path=/, and Secure whenever the
 *     request arrived over HTTPS. `Secure` is decided from the request URL, not
 *     from a process global, so a proxied TLS deployment gets it for free.
 */
import { ContractError } from '@maihan/contracts';
import {
  LoginRequestSchema,
  type AuthUser,
} from '@maihan/contracts';
import {
  generateSessionToken,
  hashSessionToken,
  hashPassword,
  sessionExpiry,
  verifyPassword,
  SESSION_COOKIE_NAME,
  SESSION_TTL_MS,
} from '@maihan/domain';
import {
  createSession,
  findLiveSessionByTokenHash,
  findUserByEmail,
  revokeSession,
  touchSession,
  type SessionUserRow,
  type UserRow,
} from '@maihan/db';
import type { HandlerOutcome, RouteContext } from './handlers.js';

/** A well-formed hash used only to equalise timing for unknown emails. */
let decoyHash: Promise<string> | null = null;
function getDecoyHash(): Promise<string> {
  decoyHash ??= hashPassword('maihan-decoy-not-a-real-password');
  return decoyHash;
}

export function parseCookies(header: string | null): Record<string, string> {
  if (header === null || header.length === 0) return {};
  const out: Record<string, string> = {};
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index <= 0) continue;
    const name = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (name.length > 0) out[name] = decodeURIComponent(value);
  }
  return out;
}

function isSecure(request: Request | undefined): boolean {
  if (request === undefined) return true; // fail closed
  try {
    return new URL(request.url).protocol === 'https:';
  } catch {
    return true;
  }
}

export function sessionCookie(token: string, request: Request | undefined): string {
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  const secure = isSecure(request) ? '; Secure' : '';
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function clearedSessionCookie(request: Request | undefined): string {
  const secure = isSecure(request) ? '; Secure' : '';
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export function toAuthUser(row: UserRow | SessionUserRow): AuthUser {
  const session = row as SessionUserRow;
  const id = typeof session.user_id === 'string' ? session.user_id : (row as UserRow).id;
  return {
    id,
    email: row.email,
    displayName: row.display_name,
    role: row.admin_role,
    emailVerified: row.email_verified_at !== null,
  };
}

/** Resolve the live session for a request, or null. */
export async function resolveSessionUser(
  ctx: Pick<RouteContext, 'db' | 'request'>,
): Promise<SessionUserRow | null> {
  if (ctx.db === undefined || ctx.request === undefined) return null;
  const token = parseCookies(ctx.request.headers.get('cookie'))[SESSION_COOKIE_NAME];
  if (token === undefined || token.length === 0) return null;
  const row = await findLiveSessionByTokenHash(ctx.db, hashSessionToken(token));
  if (row === null) return null;
  await touchSession(ctx.db, row.id);
  return row;
}

export async function authLoginHandler(ctx: RouteContext): Promise<HandlerOutcome> {
  if (ctx.db === undefined) throw new ContractError('INTERNAL', 'Database seam is not configured.');
  if (ctx.request === undefined) throw new ContractError('VALIDATION_FAILED', 'A request body is required.');

  let body: unknown;
  try {
    body = await ctx.request.json();
  } catch {
    throw new ContractError('VALIDATION_FAILED', 'Body must be JSON.');
  }
  const parsed = LoginRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new ContractError('VALIDATION_FAILED', 'Email and password are required.');
  }

  const user = await findUserByEmail(ctx.db, parsed.data.email);
  if (user === null) {
    await verifyPassword(parsed.data.password, await getDecoyHash()).catch(() => false);
    throw new ContractError('UNAUTHORIZED', 'Invalid email or password.');
  }
  const ok = await verifyPassword(parsed.data.password, user.password_hash);
  if (!ok) throw new ContractError('UNAUTHORIZED', 'Invalid email or password.');
  if (user.state !== 'ACTIVE') throw new ContractError('FORBIDDEN', 'This account is suspended.');

  const token = generateSessionToken();
  const expiresAt = sessionExpiry(Date.now());
  const session = await createSession(ctx.db, {
    userId: user.id,
    tokenHash: hashSessionToken(token),
    expiresAt,
    ip: ctx.request.headers.get('x-client-ip'),
    userAgent: ctx.request.headers.get('user-agent'),
  });

  return {
    status: 200,
    body: { user: toAuthUser(user), expiresAt: session.expires_at },
    headers: { 'set-cookie': sessionCookie(token, ctx.request) },
  };
}

export async function authLogoutHandler(ctx: RouteContext): Promise<HandlerOutcome> {
  const user = await resolveSessionUser(ctx);
  if (ctx.db !== undefined && user !== null) await revokeSession(ctx.db, user.id);
  return {
    status: 200,
    body: { ok: true },
    headers: { 'set-cookie': clearedSessionCookie(ctx.request) },
  };
}

export async function authMeHandler(ctx: RouteContext): Promise<HandlerOutcome> {
  const user = await resolveSessionUser(ctx);
  if (user === null) throw new ContractError('UNAUTHORIZED', 'Not authenticated.');
  return { status: 200, body: { user: toAuthUser(user) } };
}
