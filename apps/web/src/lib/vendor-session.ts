/**
 * apps/web/src/lib/vendor-session.ts
 *
 * ADR-026 / ADR-027 — the server-component side of vendor identity.
 *
 * A server component cannot read the request the way a route handler can, so
 * it reads the same HttpOnly session cookie through `next/headers`, then the
 * same `vendor_members` predicate the API gate uses. There is one session
 * model and one membership rule, two access paths.
 *
 * Returns null on any of: no cookie, dead session, suspended user, or a user
 * with no vendor membership. A session whose vendor is PENDING/SUSPENDED is
 * returned WITH its state so the portal can explain the block; it is never
 * treated as authorised (`canSell` is checked by every page before a read).
 */
import 'server-only';
import { cookies } from 'next/headers';
import { findLiveSessionByTokenHash } from '@maihan/db';
import type { VendorMemberRole, VendorRow } from '@maihan/db';
import { hashSessionToken, SESSION_COOKIE_NAME } from '@maihan/domain';
import { getServerDb } from '../api/next-adapter.js';
import { resolveVendorMembership } from '../api/vendor/session-authz.js';

export interface VendorSession {
  readonly userId: string;
  readonly sessionId: string;
  readonly email: string;
  readonly displayName: string;
  readonly vendor: VendorRow;
  readonly role: VendorMemberRole;
}

export async function getVendorSession(): Promise<VendorSession | null> {
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
    const membership = await resolveVendorMembership(db, row.user_id);
    if (membership === null) return null;
    return {
      userId: row.user_id,
      sessionId: row.id,
      email: row.email,
      displayName: row.display_name,
      vendor: membership.vendor,
      role: membership.role,
    };
  } catch {
    // Database unavailable: treat as unauthenticated rather than crashing the
    // route. The login page explains the situation honestly.
    return null;
  }
}
