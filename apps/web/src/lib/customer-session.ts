/**
 * apps/web/src/lib/customer-session.ts
 *
 * The server-component side of customer identity.
 *
 * `admin-session.ts` answers "is this an administrative actor?"; this module
 * answers "is this a signed-in person?" and is what `/account` renders behind.
 * Both read the same HttpOnly cookie and the same repository predicate, so
 * there is one session model with two access paths (ADR-027).
 *
 * Returns null on any of: no cookie, dead session, expired session, suspended
 * user, or a database that is not configured. A null result is a redirect to
 * sign-in, never an exception: the storefront shell must still render.
 */
import 'server-only';
import { cookies } from 'next/headers';
import { findLiveSessionByTokenHash } from '@maihan/db';
import { hashSessionToken, SESSION_COOKIE_NAME } from '@maihan/domain';
import { getServerDb } from '../api/next-adapter.js';

export interface CustomerSession {
  readonly userId: string;
  readonly sessionId: string;
  readonly email: string;
  readonly displayName: string;
  readonly emailVerified: boolean;
  /** NULL for a customer; a role name when an administrative actor visits. */
  readonly adminRole: string | null;
}

export async function getCustomerSession(): Promise<CustomerSession | null> {
  let token: string | undefined;
  try {
    const jar = await cookies();
    token = jar.get(SESSION_COOKIE_NAME)?.value;
  } catch {
    return null;
  }
  if (token === undefined || token.length === 0) return null;

  try {
    const db = await getServerDb();
    const row = await findLiveSessionByTokenHash(db, hashSessionToken(token));
    if (row === null) return null;
    return {
      userId: row.user_id,
      sessionId: row.id,
      email: row.email,
      displayName: row.display_name,
      emailVerified: row.email_verified_at !== null,
      adminRole: row.admin_role,
    };
  } catch {
    // Database unavailable: unauthenticated, not a crashed route.
    return null;
  }
}
