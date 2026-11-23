/**
 * apps/web/src/api/admin/governance-handlers.ts
 *
 * Phase 12 — Global Tasks 7, 8 and 9 (Track C4, C5, C6 API surface).
 *
 * Six endpoints over the data-governance repository:
 *
 *   GET  /api/v1/admin/import-batches
 *   GET  /api/v1/admin/conflicts
 *   POST /api/v1/admin/conflicts/{conflictId}/resolve
 *   GET  /api/v1/admin/derived-identities
 *   POST /api/v1/admin/derived-identities/{productId}/approve
 *   POST /api/v1/admin/derived-identities/{productId}/reject
 *
 * Every handler gates FIRST through the one admin authorization path
 * (ADR-027), then calls exactly ONE repository function. The gate's module is
 * the one doc 23 §3 assigns: `import_batches`, `conflicts` or
 * `derived_approvals`; the action is `list` / `read` for reads and `resolve`
 * / `approve` for decisions.
 *
 * `derived_approvals` grants the decision capability as `approve` only, so
 * both outcomes of the review — approve and reject — gate on `approve`. The
 * refusal is the negative result of the same decision, not a separate write
 * capability that no role holds.
 *
 * Refusals that are not plain 404/422 carry the standard error envelope body
 * with a 409 status: a second conflict resolution and a second review
 * decision are conflicts, not validation failures.
 */
import { z } from 'zod';
import { ContractError } from '@maihan/contracts';
import {
  approveDerivedIdentity,
  GovernanceError,
  listConflicts,
  listDerivedIdentities,
  listImportBatches,
  rejectDerivedIdentity,
  resolveConflict,
  type DerivedIdentityReviewState,
} from '@maihan/db';

import type { HandlerOutcome, RouteContext } from '../handlers.js';
import { authzFailureResponse, type CapabilityRequest } from './authz.js';
import { authorizeAdminRequest, type AdminDeps } from './session-authz.js';

interface Gate {
  readonly actor: import('@maihan/contracts').AdminActor;
}

async function gate(
  ctx: RouteContext,
  request: CapabilityRequest,
  deps: AdminDeps,
): Promise<Gate | { failure: Response }> {
  const decision = await authorizeAdminRequest(ctx, request, deps);
  if (decision.ok) return { actor: decision.actor };
  return { failure: authzFailureResponse(decision.status, ctx.ids) };
}

function requireDb(ctx: RouteContext): import('@maihan/db').CatalogDatabase {
  if (ctx.db === undefined) throw new ContractError('INTERNAL', 'Database seam is not configured.');
  return ctx.db;
}

function readPagination(url: URL): { limit: number; offset: number } {
  const rawLimit = Number(url.searchParams.get('limit') ?? '50');
  const rawOffset = Number(url.searchParams.get('offset') ?? '0');
  return {
    limit: Number.isFinite(rawLimit) ? rawLimit : 50,
    offset: Number.isFinite(rawOffset) ? rawOffset : 0,
  };
}

const uuid = z.string().uuid();

function requireUuid(value: string | undefined, field: string): string {
  if (value === undefined || !uuid.safeParse(value).success) {
    throw new ContractError('VALIDATION_FAILED', `A valid ${field} is required.`);
  }
  return value;
}

async function readOptionalJson(request: Request | undefined): Promise<unknown> {
  if (request === undefined) return {};
  const text = await request.text();
  if (text.trim().length === 0) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

/** The standard envelope shape, returned with a non-2xx status. */
function refusal(
  ctx: RouteContext,
  status: number,
  code: string,
  message: string,
): HandlerOutcome {
  return {
    status,
    body: {
      error: {
        code,
        message,
        requestId: ctx.ids.requestId,
        traceId: ctx.ids.traceId,
      },
    },
  };
}

/**
 * Governance refusals. NOT_FOUND and NOT_A_DERIVED_IDENTITY map to the
 * contract registry; the two single-use refusals are 409 conflicts with their
 * own code because the registry has no "already decided" member and inventing
 * one requires review (contracts/errors.ts).
 */
function mapGovernanceError(ctx: RouteContext, error: unknown): HandlerOutcome {
  if (!(error instanceof GovernanceError)) throw error;
  switch (error.code) {
    case 'NOT_FOUND':
      return refusal(ctx, 404, 'NOT_FOUND', 'The requested row does not exist.');
    case 'CONFLICT_ALREADY_RESOLVED':
      return refusal(
        ctx,
        409,
        'CONFLICT_ALREADY_RESOLVED',
        'This conflict already has a resolution; a decision is single-use and is never overwritten.',
      );
    case 'NOT_A_DERIVED_IDENTITY':
      return refusal(
        ctx,
        422,
        'UNPROCESSABLE',
        'This product does not carry a derived identity (source_sku is set, or source_sku_derived is null).',
      );
    case 'ALREADY_DECIDED':
      return refusal(
        ctx,
        409,
        'ALREADY_DECIDED',
        'This derived identity already has a review decision.',
      );
    case 'INVALID_DECISION':
      return refusal(ctx, 400, 'VALIDATION_FAILED', 'A resolution value or rejection reason is required.');
  }
  throw error;
}

// ─── Import batches ─────────────────────────────────────────────────────────

export async function adminListImportBatchesHandler(
  ctx: RouteContext,
  deps: AdminDeps = {},
): Promise<HandlerOutcome> {
  const g = await gate(ctx, { module: 'import_batches', action: 'list' }, deps);
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };

  const db = requireDb(ctx);
  const { limit, offset } = readPagination(ctx.url);
  const page = await listImportBatches(db, { limit, offset });
  return {
    status: 200,
    body: { data: page.items, meta: { total: page.total, limit: page.limit, offset: page.offset } },
  };
}

// ─── Staging conflicts ──────────────────────────────────────────────────────

export async function adminListConflictsHandler(
  ctx: RouteContext,
  deps: AdminDeps = {},
): Promise<HandlerOutcome> {
  const g = await gate(ctx, { module: 'conflicts', action: 'list' }, deps);
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };

  const db = requireDb(ctx);
  const { limit, offset } = readPagination(ctx.url);

  const rawBatchId = ctx.url.searchParams.get('batchId');
  const batchId = rawBatchId === null ? undefined : requireUuid(rawBatchId, 'batchId');

  const rawResolved = ctx.url.searchParams.get('resolved');
  let resolved: boolean | undefined;
  if (rawResolved === 'true') resolved = true;
  else if (rawResolved === 'false') resolved = false;
  else if (rawResolved !== null) {
    throw new ContractError('VALIDATION_FAILED', 'resolved must be true or false.');
  }

  const page = await listConflicts(db, {
    ...(batchId === undefined ? {} : { batchId }),
    ...(resolved === undefined ? {} : { resolved }),
    limit,
    offset,
  });
  return {
    status: 200,
    body: { data: page.items, meta: { total: page.total, limit: page.limit, offset: page.offset } },
  };
}

const ResolveConflictSchema = z.object({
  resolution: z.string().trim().min(1).max(2000),
  note: z.string().trim().max(1000).optional(),
});

export async function adminResolveConflictHandler(
  ctx: RouteContext,
  deps: AdminDeps = {},
): Promise<HandlerOutcome> {
  const g = await gate(ctx, { module: 'conflicts', action: 'resolve' }, deps);
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };

  const db = requireDb(ctx);
  const conflictId = requireUuid(ctx.params['conflictId'], 'conflict id');
  const parsed = ResolveConflictSchema.safeParse(await readOptionalJson(ctx.request));
  if (!parsed.success) {
    throw new ContractError('VALIDATION_FAILED', 'A resolution value is required.');
  }

  try {
    const row = await resolveConflict(db, {
      conflictId,
      resolution: parsed.data.resolution,
      actorId: g.actor.sub,
      ...(parsed.data.note === undefined ? {} : { note: parsed.data.note }),
      requestId: ctx.ids.requestId,
    });
    return { status: 200, body: { data: row } };
  } catch (error) {
    return mapGovernanceError(ctx, error);
  }
}

// ─── Derived identities ─────────────────────────────────────────────────────

const REVIEW_STATES = ['UNREVIEWED', 'PENDING', 'APPROVED', 'REJECTED'] as const;

export async function adminListDerivedIdentitiesHandler(
  ctx: RouteContext,
  deps: AdminDeps = {},
): Promise<HandlerOutcome> {
  const g = await gate(ctx, { module: 'derived_approvals', action: 'list' }, deps);
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };

  const db = requireDb(ctx);
  const { limit, offset } = readPagination(ctx.url);

  const rawReviewState = ctx.url.searchParams.get('reviewState');
  let reviewState: DerivedIdentityReviewState | undefined;
  if (rawReviewState !== null) {
    if (!(REVIEW_STATES as readonly string[]).includes(rawReviewState)) {
      throw new ContractError('VALIDATION_FAILED', 'reviewState is not a known review state.');
    }
    reviewState = rawReviewState as DerivedIdentityReviewState;
  }

  const page = await listDerivedIdentities(db, {
    ...(reviewState === undefined ? {} : { reviewState }),
    limit,
    offset,
  });
  return {
    status: 200,
    body: { data: page.items, meta: { total: page.total, limit: page.limit, offset: page.offset } },
  };
}

const ApproveSchema = z.object({
  note: z.string().trim().max(1000).optional(),
});

export async function adminApproveDerivedIdentityHandler(
  ctx: RouteContext,
  deps: AdminDeps = {},
): Promise<HandlerOutcome> {
  const g = await gate(ctx, { module: 'derived_approvals', action: 'approve' }, deps);
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };

  const db = requireDb(ctx);
  const productId = requireUuid(ctx.params['productId'], 'product id');
  const parsed = ApproveSchema.safeParse(await readOptionalJson(ctx.request));
  if (!parsed.success) {
    throw new ContractError('VALIDATION_FAILED', 'Invalid approval payload.');
  }

  try {
    const row = await approveDerivedIdentity(db, {
      productId,
      actorId: g.actor.sub,
      ...(parsed.data.note === undefined ? {} : { note: parsed.data.note }),
      requestId: ctx.ids.requestId,
    });
    return { status: 200, body: { data: row } };
  } catch (error) {
    return mapGovernanceError(ctx, error);
  }
}

const RejectSchema = z.object({
  reason: z.string().trim().min(1).max(1000),
});

export async function adminRejectDerivedIdentityHandler(
  ctx: RouteContext,
  deps: AdminDeps = {},
): Promise<HandlerOutcome> {
  const g = await gate(ctx, { module: 'derived_approvals', action: 'approve' }, deps);
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };

  const db = requireDb(ctx);
  const productId = requireUuid(ctx.params['productId'], 'product id');
  const parsed = RejectSchema.safeParse(await readOptionalJson(ctx.request));
  if (!parsed.success) {
    throw new ContractError('VALIDATION_FAILED', 'A rejection reason is required.');
  }

  try {
    const row = await rejectDerivedIdentity(db, {
      productId,
      actorId: g.actor.sub,
      reason: parsed.data.reason,
      requestId: ctx.ids.requestId,
    });
    return { status: 200, body: { data: row } };
  } catch (error) {
    return mapGovernanceError(ctx, error);
  }
}
