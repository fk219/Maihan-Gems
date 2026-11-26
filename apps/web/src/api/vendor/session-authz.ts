/**
 * apps/web/src/api/vendor/session-authz.ts
 *
 * ADR-026 / ADR-027 — the ONE vendor authorisation gate.
 *
 * Identity is the same first-party session the admin console uses. Membership
 * is a `vendor_members` row; a vendor actor exists only while that vendor is
 * APPROVED (`canSell`). PENDING/SUSPENDED/TERMINATED get a 403 whose code says
 * which of the three refusals happened, because "wait for approval", "contact
 * the platform" and "not your row" are different operator actions.
 *
 * The vendor boundary cannot be omitted: `requireVendor` always returns a
 * concrete `vendorId`, every repository function requires it, and the optional
 * `{ vendorId }` argument lets a caller ASSERT an expected owner. A mismatch is
 * a 403 `VENDOR_SCOPE_MISMATCH`, never an empty list pretending success.
 */
import { ContractError } from '@maihan/contracts';
import { canSell, type VendorState } from '@maihan/domain';
import {
  findVendorsForUser,
  type VendorMemberRole,
  type VendorRow,
} from '@maihan/db';
import { resolveSessionUser } from '../auth-handlers.js';
import type { RouteContext } from '../handlers.js';

export interface VendorActor {
  readonly userId: string;
  readonly sessionId: string;
  readonly email: string;
  readonly displayName: string;
  readonly vendorId: string;
  readonly vendor: VendorRow;
  readonly role: VendorMemberRole;
}

export interface VendorMembership {
  readonly vendor: VendorRow;
  readonly role: VendorMemberRole;
}

/**
 * A user may belong to more than one vendor. Pick the most actionable one:
 * an APPROVED membership wins, then PENDING, then SUSPENDED, then TERMINATED,
 * with `findVendorsForUser`'s stable created_at ordering breaking ties.
 *
 * Returning the first membership even when it is not APPROVED is deliberate:
 * the gate must be able to say WHICH state blocked the actor instead of
 * pretending the user has no vendor at all.
 */
const STATE_PREFERENCE: Readonly<Record<VendorState, number>> = Object.freeze({
  APPROVED: 0,
  PENDING: 1,
  SUSPENDED: 2,
  TERMINATED: 3,
});

export async function resolveVendorMembership(
  db: NonNullable<RouteContext['db']>,
  userId: string,
): Promise<VendorMembership | null> {
  const memberships = await findVendorsForUser(db, userId);
  if (memberships.length === 0) return null;
  const ranked = [...memberships].sort(
    (a, b) => STATE_PREFERENCE[a.vendor.state] - STATE_PREFERENCE[b.vendor.state],
  );
  const chosen = ranked[0] as VendorMembership;
  return { vendor: chosen.vendor, role: chosen.role };
}

export interface RequireVendorOptions {
  /**
   * The vendor id the caller believes it is acting on. When supplied it must
   * equal the actor's membership; otherwise the gate refuses. Omit it only for
   * "my own" reads, whose result still carries the actor's concrete vendor id.
   */
  readonly vendorId?: string;
}

/**
 * Resolve and authorise the vendor actor, or throw the documented contract
 * error. Throwing (rather than returning a failure branch) makes it impossible
 * for a handler to keep executing past a denied gate by forgetting a return.
 */
export async function requireVendor(
  ctx: Pick<RouteContext, 'db' | 'request'>,
  options: RequireVendorOptions = {},
): Promise<VendorActor> {
  if (ctx.db === undefined) {
    throw new ContractError('INTERNAL', 'Database seam is not configured.');
  }

  const session = await resolveSessionUser(ctx);
  if (session === null) {
    throw new ContractError('UNAUTHORIZED', 'Sign in to the vendor portal.');
  }

  const membership = await resolveVendorMembership(ctx.db, session.user_id);
  if (membership === null) {
    throw new ContractError(
      'VENDOR_MEMBERSHIP_REQUIRED',
      'This account is not a member of a vendor.',
    );
  }

  const vendor = membership.vendor;
  if (!canSell(vendor.state)) {
    throw new ContractError(
      'VENDOR_NOT_APPROVED',
      `Vendor ${vendor.display_name} is ${vendor.state}; listing stock and reading orders requires approval.`,
      [{ vendorState: vendor.state }],
    );
  }

  if (options.vendorId !== undefined && options.vendorId !== vendor.id) {
    throw new ContractError(
      'VENDOR_SCOPE_MISMATCH',
      'This resource belongs to another vendor.',
    );
  }

  return {
    userId: session.user_id,
    sessionId: session.id,
    email: session.email,
    displayName: session.display_name,
    vendorId: vendor.id,
    vendor,
    role: membership.role,
  };
}
