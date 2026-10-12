/**
 * apps/web/src/api/admin/authz.ts
 *
 * Phase 12 — Stage A / Global Task A3 (E12.8).
 *
 * The ONE admin authorization gate: every admin route resolves the actor
 * through `resolveAdminActor` and checks the (role, module, action)
 * capability from the domain policy BEFORE touching any service. Doc 23 §4:
 * "Application | Admin API handlers call the same services as
 * customer-facing routes" — nothing here grants a bypass; the gate only
 * decides pass/fail.
 *
 * Denial contract (doc 09 Authorization, doc 23 §10):
 *   - a denial is 403 with the INTERNAL reason, never the rule text and
 *     never which capability bit failed — the rule set is not enumerable.
 *   - the envelope is the standard one (envelope.ts), so correlation ids and
 *     trace headers behave identically on admin errors.
 */
import { hasCapability, type AdminAction, type AdminModule } from '@maihan/domain';
import { ContractError } from '@maihan/contracts';
import {
  ActorResolutionError,
  resolveAdminActor,
  type AdminActor,
} from '@maihan/contracts';

import { errorResponse, type CorrelationIds } from '../envelope.js';

export { ActorResolutionError };

export type AuthzFailure =
  | { readonly ok: true; readonly actor: AdminActor }
  | { readonly ok: false; readonly status: 401 | 403 };

export interface CapabilityRequest {
  readonly module: AdminModule;
  readonly action: AdminAction;
  /** Development deployments may enable the role-header seam; production must not. */
  readonly allowRoleHeader?: boolean;
}

/**
 * Resolve + authorize in one call. Returns either the actor or the response
 * to send. Callers MUST return immediately on the failure branch so no
 * module code can run past the gate.
 */
export function authorizeAdmin(
  headers: Headers,
  request: CapabilityRequest,
): AuthzFailure {
  let actor: AdminActor;
  try {
    actor = resolveAdminActor(headers, { allowRoleHeader: request.allowRoleHeader });
  } catch (error) {
    if (error instanceof ActorResolutionError) {
      // 401: no identity at all (unauthenticated). Role-injection and
      // invalid-role attempts are 403 (identity present, claim rejected).
      if (error.reason === 'MISSING_IDENTITY') {
        return { ok: false, status: 401 };
      }
      return { ok: false, status: 403 };
    }
    throw error;
  }

  if (!hasCapability(actor.role, request.module, request.action)) {
    return { ok: false, status: 403 };
  }
  return { ok: true, actor };
}

export function authzFailureResponse(status: 401 | 403, ids: CorrelationIds): Response {
  return errorResponse(
    status === 401
      ? new ContractError('UNAUTHORIZED', 'Authentication required.')
      : new ContractError('FORBIDDEN', 'Not permitted.'),
    ids,
  );
}
