/**
 * apps/web/src/api/admin/session-authz.ts
 *
 * ADR-027 — the production path for admin authorisation.
 *
 * Resolution order:
 *   1. A live session cookie -> the user's assigned `admin_role`.
 *   2. The trusted-header seam, ONLY when the deployment opts in AND the
 *      process is not a production build.
 *
 * A customer session (role NULL) is never an admin actor, even if it presents
 * a valid cookie: identity class and role are separate checks.
 */
import { hasCapability, type AdminRole } from '@maihan/domain';
import { resolveAdminActor, ActorResolutionError, type AdminActor } from '@maihan/contracts';
import type { AuthzFailure, CapabilityRequest } from './authz.js';
import { resolveSessionUser } from '../auth-handlers.js';
import type { RouteContext } from '../handlers.js';

export interface AdminDeps {
  /** Development only. Never enabled in a production build (test-enforced). */
  readonly allowRoleHeader?: boolean;
  /**
   * Supplied by the composition root from @maihan/config. Defaults to
   * 'production' so an omitted environment fails closed rather than opening
   * the header seam. Application code never reads process.env directly.
   */
  readonly environment?: string;
}

export function roleHeaderAllowed(deps: AdminDeps): boolean {
  if (deps.allowRoleHeader !== true) return false;
  const environment = deps.environment ?? 'production';
  return environment === 'development' || environment === 'test' || environment === 'local';
}

export async function authorizeAdminRequest(
  ctx: Pick<RouteContext, 'db' | 'request'>,
  request: CapabilityRequest,
  deps: AdminDeps = {},
): Promise<AuthzFailure> {
  const session = await resolveSessionUser(ctx);
  if (session !== null) {
    const role = session.admin_role;
    if (role === null) return { ok: false, status: 403 };
    if (!hasCapability(role as AdminRole, request.module, request.action)) {
      return { ok: false, status: 403 };
    }
    const actor: AdminActor = {
      sub: session.user_id,
      displayName: session.display_name,
      role: role as AdminActor['role'],
      sessionId: session.id,
      steppedUpAt: null,
    };
    return { ok: true, actor };
  }

  if (!roleHeaderAllowed(deps)) return { ok: false, status: 401 };

  try {
    const actor = resolveAdminActor(ctx.request?.headers ?? new Headers(), {
      allowRoleHeader: true,
    });
    if (!hasCapability(actor.role, request.module, request.action)) {
      return { ok: false, status: 403 };
    }
    return { ok: true, actor };
  } catch (error) {
    if (error instanceof ActorResolutionError) {
      return { ok: false, status: error.reason === 'MISSING_IDENTITY' ? 401 : 403 };
    }
    throw error;
  }
}
