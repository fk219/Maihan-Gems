/**
 * apps/web/src/lib/admin-session.ts
 *
 * ADR-027 — the server-component side of admin identity.
 *
 * A server component cannot read a request header the way a route handler can,
 * so it reads the same HttpOnly cookie through `next/headers` and applies the
 * same repository predicate. There is one session model, two access paths.
 *
 * Returns null on any of: no cookie, dead session, suspended user, or a user
 * with no administrative role. A customer session is never an admin session.
 */
import 'server-only';
import { cookies } from 'next/headers';
import { findLiveSessionByTokenHash } from '@maihan/db';
import { hashSessionToken, SESSION_COOKIE_NAME, type AdminRole } from '@maihan/domain';
import { getServerDb } from '../api/next-adapter.js';

export interface AdminSession {
  readonly userId: string;
  readonly sessionId: string;
  readonly email: string;
  readonly displayName: string;
  readonly role: AdminRole;
}

export async function getAdminSession(): Promise<AdminSession | null> {
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
    if (row === null || row.admin_role === null) return null;
    return {
      userId: row.user_id,
      sessionId: row.id,
      email: row.email,
      displayName: row.display_name,
      role: row.admin_role as AdminRole,
    };
  } catch {
    // Database unavailable: treat as unauthenticated rather than crashing the
    // route. The login page explains the situation honestly.
    return null;
  }
}
