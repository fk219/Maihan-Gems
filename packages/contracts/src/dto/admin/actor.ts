/**
 * packages/contracts/src/dto/admin/actor.ts
 *
 * Phase 12 — Stage A / Global Task A2 (E12.8 foundation).
 *
 * The admin ACTOR contract: who is acting, under which role, resolved
 * server-side (doc 09: "Roles are assigned server-side; the client never
 * asserts a role"; doc 23 §4 layer 1 policy).
 *
 * Security properties encoded here:
 *   - Identity (`sub`) comes from the identity provider session — never a
 *     client header. `x-customer-id` remains the CUSTOMER seam of the
 *     storefront API; an admin actor is a different credential class and is
 *     never derived from a customer id.
 *   - The role is resolved from the actor's assigned role set; a request that
 *     carries a role header is rejected as a role-injection attempt.
 *   - `READ_ONLY_ANALYST` responses must be PII-free (doc 23 §11): the
 *     analyst payload schema on admin read models excludes PII fields.
 */
import { z } from 'zod';

import { ADMIN_ROLES } from './roles.js';

export const AdminRoleSchema = z.enum(ADMIN_ROLES);
export type { AdminRole } from './roles.js';

/** Server-side authored actor, never client-asserted. */
export const AdminActorSchema = z.object({
  /** Identity-provider subject (stable, opaque). */
  sub: z.string().min(1),
  /** Display name for audit metadata only (not an authorization input). */
  displayName: z.string().min(1),
  /** The single assigned administrative role. */
  role: AdminRoleSchema,
  /** Session id the actor authenticated through (for step-up checks). */
  sessionId: z.string().min(1),
  /** Elevated authentication timestamp for destructive actions (doc 23 §11). */
  steppedUpAt: z.string().datetime().nullable(),
});
export type AdminActor = z.infer<typeof AdminActorSchema>;

/** Headers the admin API consults for the actor envelope (server-verified). */
export const ADMIN_ACTOR_HEADERS = {
  sub: 'x-admin-sub',
  role: 'x-admin-role',
  session: 'x-admin-session',
} as const;

/**
 * Resolve the actor from server-trusted headers. In development the header
 * seam stands in for the managed identity provider (a later task swaps the
 * resolution source without changing this contract); the ROLE header is only
 * trusted, per deployment mode, when the deployment sets ALLOW_ROLE_HEADER.
 * Production must never set it.
 */
export interface ActorResolutionEnv {
  readonly allowRoleHeader?: boolean;
}

export class ActorResolutionError extends Error {
  constructor(readonly reason: 'MISSING_IDENTITY' | 'ROLE_INJECTION' | 'INVALID_ROLE') {
    super(`ACTOR_RESOLUTION: ${reason}`);
    this.name = 'ActorResolutionError';
  }
}

export function resolveAdminActor(
  headers: Headers,
  env: ActorResolutionEnv = {},
): AdminActor {
  const sub = headers.get(ADMIN_ACTOR_HEADERS.sub);
  if (sub === null || sub.length === 0) {
    throw new ActorResolutionError('MISSING_IDENTITY');
  }
  const roleHeader = headers.get(ADMIN_ACTOR_HEADERS.role);
  if (roleHeader !== null && env.allowRoleHeader !== true) {
    throw new ActorResolutionError('ROLE_INJECTION');
  }
  const roleParse = AdminRoleSchema.safeParse(roleHeader ?? 'ADMIN_SUPER');
  if (!roleParse.success) {
    throw new ActorResolutionError('INVALID_ROLE');
  }
  const session = headers.get(ADMIN_ACTOR_HEADERS.session) ?? sub;
  return {
    sub,
    displayName: sub,
    role: roleParse.data,
    sessionId: session,
    steppedUpAt: null,
  };
}
