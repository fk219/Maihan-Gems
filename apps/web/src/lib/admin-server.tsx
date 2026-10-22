/**
 * apps/web/src/lib/admin-server.tsx
 *
 * Server seam for the admin console.
 *
 * Resolves the admin actor from EITHER a verified session cookie
 * (`maihan_session` carrying one of the 10 authoritative `ADMIN_ROLES`)
 * OR the server-trusted `x-admin-*` header seam, then checks `hasCapability`
 * from `@maihan/domain`. Unauthorized visitors fail CLOSED to the gate screen.
 */
import 'server-only';
import Link from 'next/link';
import { headers } from 'next/headers';
import { ADMIN_ROLES, hasCapability, type AdminAction, type AdminModule, type AdminRole } from '@maihan/domain';
import { isFailClosedMode } from '@maihan/config';
import type { AdminActor } from '@maihan/contracts';
import { authorizeAdmin } from '../api/admin/authz.js';
import { getAuthenticatedSessionActor } from './account-server.js';

export type AdminAccess =
  | { readonly ok: true; readonly actor: AdminActor }
  | { readonly ok: false; readonly status: 401 | 403; readonly environment: 'development' | 'locked' };

export async function requireAdminAccess(
  module: AdminModule,
  action: AdminAction,
): Promise<AdminAccess> {
  // 1. Check authenticated session cookie first
  const sessionActor = await getAuthenticatedSessionActor();
  if (sessionActor) {
    if (!(ADMIN_ROLES as readonly string[]).includes(sessionActor.role)) {
      return {
        ok: false,
        status: 403,
        environment: isFailClosedMode() ? 'locked' : 'development',
      };
    }
    const adminRole = sessionActor.role as AdminRole;
    if (!hasCapability(adminRole, module, action)) {
      return {
        ok: false,
        status: 403,
        environment: isFailClosedMode() ? 'locked' : 'development',
      };
    }
    return {
      ok: true,
      actor: {
        sub: sessionActor.email,
        displayName:
          [sessionActor.first_name, sessionActor.last_name].filter(Boolean).join(' ') ||
          sessionActor.email,
        role: adminRole,
        sessionId: sessionActor.customer_id,
        steppedUpAt: null,
      },
    };
  }

  // R1-1 fail-closed: without an explicit developer seam, never fall back to
  // unverified x-admin-* headers. Absence of MAIHAN_ENV now means locked.
  if (isFailClosedMode()) {
    return { ok: false, status: 401, environment: 'locked' };
  }

  // 2. Fallback to gateway header seam (non-production / tests only)
  const headerList = await headers();
  const forwarded = new Headers();
  headerList.forEach((value, name) => forwarded.append(name, value));
  const allowRoleHeader = process.env['ALLOW_ROLE_HEADER'] === '1';
  const decision = authorizeAdmin(forwarded, { module, action, allowRoleHeader });
  if (decision.ok) return { ok: true, actor: decision.actor };
  return {
    ok: false,
    status: decision.status,
    environment: 'development',
  };
}

export interface AdminGateProps {
  readonly status: 401 | 403;
}

export function AdminGateScreen({ status }: AdminGateProps) {
  const message =
    status === 401
      ? 'The admin console renders only for an authenticated operator session.'
      : 'Your account role does not hold the required administrative capability.';
  return (
    <div className="admin-gate" role="alert">
      <span className="admin-eyebrow">Maihan Gems · Back Office</span>
      <h1>{status === 401 ? 'Operator Authentication Required' : 'Not Permitted (403)'}</h1>
      <p>{message}</p>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1.5rem' }}>
        <Link href="/account/sign-in" className="lx-btn lx-btn--solid">
          Sign in as Operator
        </Link>
        <Link href="/" className="lx-btn lx-btn--ghost">
          Return to Storefront
        </Link>
      </div>
    </div>
  );
}
