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
  RegisterRequestSchema,
  RequestPasswordResetRequestSchema,
  ResetPasswordRequestSchema,
  VerifyEmailRequestSchema,
  type AuthUser,
} from '@maihan/contracts';
import {
  EMAIL_VERIFICATION_TTL_MS,
  PASSWORD_RESET_TTL_MS,
  generateOpaqueToken,
  generateSessionToken,
  hashOpaqueToken,
  hashSessionToken,
  hashPassword,
  sessionExpiry,
  tokenExpiry,
  validatePasswordPolicy,
  verifyPassword,
  SESSION_COOKIE_NAME,
  SESSION_TTL_MS,
} from '@maihan/domain';
import { isProductionEnvironment } from '@maihan/config';
import {
  consumeResetToken,
  consumeVerificationToken,
  createResetToken,
  createSession,
  createUser,
  createVerificationToken,
  findLiveSessionByTokenHash,
  findUserByEmail,
  markEmailVerified,
  revokeAllSessions,
  revokeSession,
  touchSession,
  updatePasswordHash,
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

/**
 * Read a JSON body, or fail with the documented validation code.
 *
 * `request.json()` is used rather than text+JSON.parse because the pipeline's
 * envelope already owns the error shape; nothing here inspects the raw bytes.
 */
async function readJsonBody(request: Request | undefined): Promise<unknown> {
  if (request === undefined) {
    throw new ContractError('VALIDATION_FAILED', 'A request body is required.');
  }
  try {
    return await request.json();
  } catch {
    throw new ContractError('VALIDATION_FAILED', 'Body must be JSON.');
  }
}

/**
 * The ONLY environment names that may receive a token in a response body.
 *
 * This is an allowlist, not "anything that is not production": `ENVIRONMENT`
 * defaults to `local` when nothing is configured, so a deny-list would fail
 * open on a misconfigured deployment. `staging`, `preview`, `qa` and any
 * unknown name get no token — they can use the CLI.
 */
const DEV_TOKEN_ENVIRONMENTS: ReadonlySet<string> = new Set([
  'local',
  'dev',
  'development',
  'test',
]);

/**
 * Whether a response may carry a token for local development.
 *
 * Fail closed twice: an absent environment never qualifies, and only the four
 * names above do. No email provider exists yet; until one does, this is how a
 * developer completes the flow without the CLI.
 */
function devTokensEnabled(ctx: RouteContext): boolean {
  const environment = ctx.environment?.trim().toLowerCase();
  if (environment === undefined) return false;
  return DEV_TOKEN_ENVIRONMENTS.has(environment) && !isProductionEnvironment(environment);
}

/** CITEXT already ignores case; normalising makes the stored row deterministic. */
function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Postgres unique violation, without importing the driver's error types. */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === '23505'
  );
}

/** A customer is a `users` row with no administrative role. */
const CUSTOMER_ROLE = null;

/** Message shared by every failed redemption, so the response reveals nothing. */
const INVALID_TOKEN_MESSAGE = 'This link is invalid, already used, or has expired.';

const EMAIL_TAKEN_MESSAGE =
  'An account with this email already exists. Sign in, or use “Forgot password” to recover it.';

export async function authLoginHandler(ctx: RouteContext): Promise<HandlerOutcome> {
  if (ctx.db === undefined) throw new ContractError('INTERNAL', 'Database seam is not configured.');
  const request = ctx.request;
  if (request === undefined) {
    throw new ContractError('VALIDATION_FAILED', 'A request body is required.');
  }

  const body = await readJsonBody(request);
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
    ip: request.headers.get('x-client-ip'),
    userAgent: request.headers.get('user-agent'),
  });

  return {
    status: 200,
    body: { user: toAuthUser(user), expiresAt: session.expires_at },
    headers: { 'set-cookie': sessionCookie(token, request) },
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

/**
 * POST /api/v1/auth/register — customer self-registration.
 *
 * A customer is a `users` row with `admin_role = NULL` and
 * `email_verified_at = NULL`. Registration deliberately does NOT open a
 * session: the new account must exercise the verification step, and a session
 * created before it would let an unverified address act as the owner of the
 * mailbox it does not control.
 *
 * Registration necessarily reveals whether an address is already registered
 * (the alternative is a silent no-op that strands the customer). Password
 * reset is the endpoint that must not enumerate, and it does not.
 */
export async function authRegisterHandler(ctx: RouteContext): Promise<HandlerOutcome> {
  if (ctx.db === undefined) throw new ContractError('INTERNAL', 'Database seam is not configured.');

  const body = await readJsonBody(ctx.request);
  // Zod failures become the documented 400 with per-field details, so the form
  // can render the exact rule that failed.
  const input = RegisterRequestSchema.parse(body);

  // Password policy runs BEFORE any row is written or any hash is computed:
  // a rejected password must cost nothing and leave no trace.
  const violation = validatePasswordPolicy(input.password);
  if (violation !== null) {
    throw new ContractError('VALIDATION_FAILED', violation.message, [
      { field: 'password', code: violation.code, message: violation.message },
    ]);
  }

  const email = normaliseEmail(input.email);
  const existing = await findUserByEmail(ctx.db, email);
  if (existing !== null) {
    throw new ContractError('VALIDATION_FAILED', EMAIL_TAKEN_MESSAGE, [
      { field: 'email', code: 'ALREADY_REGISTERED', message: EMAIL_TAKEN_MESSAGE },
    ]);
  }

  let user: UserRow;
  try {
    user = await createUser(ctx.db, {
      email,
      passwordHash: await hashPassword(input.password),
      displayName: input.displayName,
      adminRole: CUSTOMER_ROLE,
    });
  } catch (error) {
    // Two simultaneous registrations for one address: the unique index wins,
    // and the loser gets the same honest message as a sequential duplicate.
    if (isUniqueViolation(error)) {
      throw new ContractError('VALIDATION_FAILED', EMAIL_TAKEN_MESSAGE, [
        { field: 'email', code: 'ALREADY_REGISTERED', message: EMAIL_TAKEN_MESSAGE },
      ]);
    }
    throw error;
  }

  // Only the digest is persisted. The plaintext token lives in this scope and
  // leaves the process either through the (not yet wired) email adapter or as
  // a development-only response field.
  const verificationToken = generateOpaqueToken();
  const expiresAt = tokenExpiry(Date.now(), EMAIL_VERIFICATION_TTL_MS);
  await createVerificationToken(ctx.db, {
    userId: user.id,
    tokenHash: hashOpaqueToken(verificationToken),
    expiresAt,
  });

  return {
    status: 201,
    body: {
      user: toAuthUser(user),
      verification: { required: true, expiresAt },
      ...(devTokensEnabled(ctx) ? { devVerificationToken: verificationToken } : {}),
    },
  };
}

/**
 * POST /api/v1/auth/verify-email — redeem a verification token once.
 *
 * Unknown, used and expired tokens are one answer on purpose: distinguishing
 * them would tell an attacker which guess was close.
 */
export async function authVerifyEmailHandler(ctx: RouteContext): Promise<HandlerOutcome> {
  if (ctx.db === undefined) throw new ContractError('INTERNAL', 'Database seam is not configured.');

  const body = await readJsonBody(ctx.request);
  const input = VerifyEmailRequestSchema.parse(body);

  const consumed = await consumeVerificationToken(ctx.db, hashOpaqueToken(input.token));
  if (consumed === null) throw new ContractError('VALIDATION_FAILED', INVALID_TOKEN_MESSAGE);

  const verified = await markEmailVerified(ctx.db, consumed.user_id);
  if (verified === null) throw new ContractError('VALIDATION_FAILED', INVALID_TOKEN_MESSAGE);

  return {
    status: 200,
    body: { verified: true, emailVerifiedAt: verified.email_verified_at },
  };
}

/**
 * POST /api/v1/auth/request-password-reset — always 200.
 *
 * The response is byte-identical whether the address exists or not, and the
 * token is never returned here even in development (the CLI exists for that).
 * Token material is minted before the lookup so the failure path performs the
 * same CSPRNG work as the success path.
 */
export async function authRequestPasswordResetHandler(
  ctx: RouteContext,
): Promise<HandlerOutcome> {
  if (ctx.db === undefined) throw new ContractError('INTERNAL', 'Database seam is not configured.');

  const body = await readJsonBody(ctx.request);
  const input = RequestPasswordResetRequestSchema.parse(body);
  const email = normaliseEmail(input.email);

  const resetToken = generateOpaqueToken();
  const tokenHash = hashOpaqueToken(resetToken);
  const expiresAt = tokenExpiry(Date.now(), PASSWORD_RESET_TTL_MS);

  const user = await findUserByEmail(ctx.db, email);
  if (user !== null) {
    // A reset for a suspended account is issued and then unusable at login;
    // issuing it anyway keeps the response identical to the active case.
    await createResetToken(ctx.db, { userId: user.id, tokenHash, expiresAt });
  }

  return { status: 200, body: { ok: true } };
}

/**
 * POST /api/v1/auth/reset-password — redeem, rehash, revoke.
 *
 * Order matters:
 *   1. the password policy runs first, so a weak password never burns the
 *      token and the customer can retry with the same link;
 *   2. the token is consumed atomically (single use, expiry in the predicate);
 *   3. every live session is revoked — a reset is the response to a suspected
 *      compromise, so every existing device must be signed out;
 *   4. the caller's own cookie is cleared, because it is now a dead session.
 */
export async function authResetPasswordHandler(ctx: RouteContext): Promise<HandlerOutcome> {
  if (ctx.db === undefined) throw new ContractError('INTERNAL', 'Database seam is not configured.');

  const body = await readJsonBody(ctx.request);
  const input = ResetPasswordRequestSchema.parse(body);

  const violation = validatePasswordPolicy(input.password);
  if (violation !== null) {
    throw new ContractError('VALIDATION_FAILED', violation.message, [
      { field: 'password', code: violation.code, message: violation.message },
    ]);
  }

  const consumed = await consumeResetToken(ctx.db, hashOpaqueToken(input.token));
  if (consumed === null) throw new ContractError('VALIDATION_FAILED', INVALID_TOKEN_MESSAGE);

  const passwordHash = await hashPassword(input.password);
  const updated = await updatePasswordHash(ctx.db, consumed.user_id, passwordHash);
  if (!updated) throw new ContractError('VALIDATION_FAILED', INVALID_TOKEN_MESSAGE);

  await revokeAllSessions(ctx.db, consumed.user_id);

  return {
    status: 200,
    body: { ok: true },
    headers: { 'set-cookie': clearedSessionCookie(ctx.request) },
  };
}

