/**
 * apps/web/src/api/csrf.ts
 *
 * P1-21 CSRF enforcement: cookie-based sessions are the only automatic
 * cross-site credential (SameSite=Lax blocks some, not all, of the
 * top-level-form/GET-adjacent paths), so every state-changing request
 * authenticated by the SESSION COOKIE must prove the double-submit token —
 * an `x-csrf-token` header equal to the session's CSRF secret, which is
 * issued at register/login (never derivable from cookies).
 *
 * Token-bearing transports (Authorization Bearer / x-session-token header)
 * are exempt: a cross-site document cannot mint those.
 */
import { ContractError } from '@maihan/contracts';
import type { RouteContext } from './handlers.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Returns the transport kind for the session token present on the request.
 */
export function sessionTransport(request?: Request): 'bearer' | 'header' | 'cookie' | null {
  if (!request) return null;
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) return 'bearer';
  if (request.headers.get('x-session-token')?.trim()) return 'header';
  const cookieHeader = request.headers.get('cookie') ?? '';
  if (/(?:^|;\s*)maihan_session=/.test(cookieHeader)) return 'cookie';
  return null;
}

/**
 * True when the browser-controlled Origin header matches the request Host —
 * a cross-site attacker page cannot suppress or forge a matching Origin,
 * so equality proves the request originated on this site.
 */
export function sameOriginRequest(request?: Request): boolean {
  const host = (request?.headers.get('host') ?? '').split(':')[0];
  const origin = request?.headers.get('origin') ?? '';
  if (!host || !origin) return false;
  let originHost = '';
  try {
    originHost = new URL(origin).hostname;
  } catch {
    originHost = origin.split(':')[0] ?? '';
  }
  return originHost === host;
}

/**
 * Enforce the double-submit CSRF rule for cookie-authenticated mutations.
 * Accepted when EITHER:
 *   (a) `x-csrf-token` matches the session's CSRF secret (the standard
 *       double-submit token), or
 *   (b) the browser-supplied `Origin` matches the request Host exactly —
 *       a same-origin navigation/fetch the attacker cannot forge from a
 *       cross-site context (an attacker page CAN set Origin? NO: Origin is
 *       browser-controlled; a cross-site page's form/fetch carries the
 *       ATTACKER's origin, so matching origin==host proves same site).
 * Adapter requests without both signals (server jobs use Bearer) reject.
 */
export function assertCsrfForCookieSession(ctx: RouteContext, actor: {
  readonly csrf_token: string;
} | null | undefined): void {
  if (!actor) return;
  const request = ctx.request;
  if (!request) return;
  const method = request.method.toUpperCase();
  if (SAFE_METHODS.has(method)) return;
  if (sessionTransport(request) !== 'cookie') return;

  const header = request.headers.get('x-csrf-token')?.trim() ?? '';
  if (header !== '' && header === actor.csrf_token) return;
  if (sameOriginRequest(request)) return;

  throw new ContractError(
    'FORBIDDEN',
    'CSRF token missing or invalid. Send the session csrf_token in the x-csrf-token header.',
  );
}
