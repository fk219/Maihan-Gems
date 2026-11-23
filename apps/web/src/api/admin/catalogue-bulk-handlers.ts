/**
 * apps/web/src/api/admin/catalogue-bulk-handlers.ts
 *
 * Phase 12 — Global Tasks 6 and 13 (Track C1 API surface).
 *
 * Three endpoints over the catalogue bulk repository:
 *
 *   POST /api/v1/admin/catalogue/bulk/prices
 *   POST /api/v1/admin/catalogue/bulk/state
 *   POST /api/v1/admin/catalogue/bulk/{operationId}/undo
 *
 * Every handler gates FIRST through the one admin authorization path
 * (ADR-027) and then calls exactly ONE repository function. The gate's module
 * is `products` (doc 23 §3):
 *
 *   - `bulk` for the two apply/preview endpoints (CATALOG_MANAGER holds it);
 *   - `approve` for undo, because reversing an applied multi-row mutation is
 *     an approval-grade action, not an ordinary edit.
 *
 * The preview is the same endpoint with `dryRun: true`: the repository runs
 * the same read and the same planner and writes nothing, so the console
 * cannot preview one change set and apply another.
 *
 * Refusals that are not plain validation errors carry the standard error
 * envelope with a 409 status: an expired window, a second undo and an
 * intervening edit are conflicts, not bad input.
 */
import { z } from 'zod';
import { ContractError } from '@maihan/contracts';
import {
  BULK_MAX_PRODUCTS,
  BulkOperationError,
  bulkSetState,
  bulkUpdatePrices,
  undoBulkOperation,
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
 * Bulk refusals. The three 409s are non-registry codes with their own member
 * because the closed registry has no "window expired" / "already undone" /
 * "row changed" member and inventing one there requires review — the same
 * precedent the governance handlers set for ALREADY_DECIDED.
 */
function mapBulkError(ctx: RouteContext, error: unknown): HandlerOutcome {
  if (!(error instanceof BulkOperationError)) throw error;
  switch (error.code) {
    case 'TOO_MANY_PRODUCTS':
      return refusal(
        ctx,
        400,
        'VALIDATION_FAILED',
        `A bulk operation is capped at ${BULK_MAX_PRODUCTS} products; split the selection and try again.`,
      );
    case 'EMPTY_SELECTION':
      return refusal(ctx, 400, 'VALIDATION_FAILED', 'At least one product id is required.');
    case 'INVALID_VALUE':
      return refusal(ctx, 400, 'VALIDATION_FAILED', 'The bulk value is outside the accepted range.');
    case 'REASON_REQUIRED':
      return refusal(ctx, 400, 'VALIDATION_FAILED', 'A reason is required for every bulk operation.');
    case 'NOT_FOUND':
      return refusal(ctx, 404, 'NOT_FOUND', 'The bulk operation does not exist.');
    case 'NOT_A_BULK_OPERATION':
      return refusal(ctx, 422, 'UNPROCESSABLE', 'The referenced audit row is not a bulk operation.');
    case 'UNDO_WINDOW_EXPIRED':
      return refusal(
        ctx,
        409,
        'UNDO_WINDOW_EXPIRED',
        'The undo window for this operation has closed.',
      );
    case 'ALREADY_UNDONE':
      return refusal(
        ctx,
        409,
        'ALREADY_UNDONE',
        'This bulk operation was already undone; the undo is single-use.',
      );
    case 'ROW_CHANGED_SINCE':
      return refusal(
        ctx,
        409,
        'ROW_CHANGED_SINCE',
        'At least one affected product changed after the bulk operation, so nothing was reversed.',
      );
    case 'NOTHING_TO_UNDO':
      return refusal(
        ctx,
        409,
        'NOTHING_TO_UNDO',
        'This bulk operation changed no rows, so there is nothing to reverse.',
      );
  }
}

// ─── Prices ────────────────────────────────────────────────────────────────

const BulkPriceBody = z.object({
  productIds: z.array(uuid).min(1),
  mode: z.enum(['SET', 'ADJUST_PERCENT']),
  value: z.number().finite(),
  reason: z.string().trim().min(1).max(1000),
  dryRun: z.boolean().optional(),
});

export async function adminBulkPricesHandler(
  ctx: RouteContext,
  deps: AdminDeps = {},
): Promise<HandlerOutcome> {
  const g = await gate(ctx, { module: 'products', action: 'bulk' }, deps);
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };

  const db = requireDb(ctx);
  const parsed = BulkPriceBody.safeParse(await readOptionalJson(ctx.request));
  if (!parsed.success) {
    throw new ContractError('VALIDATION_FAILED', 'Invalid bulk price payload.');
  }

  try {
    const result = await bulkUpdatePrices(db, {
      productIds: parsed.data.productIds,
      mode: parsed.data.mode,
      value: parsed.data.value,
      actorId: g.actor.sub,
      reason: parsed.data.reason,
      dryRun: parsed.data.dryRun === true,
      requestId: ctx.ids.requestId,
    });
    return { status: 200, body: { data: result } };
  } catch (error) {
    return mapBulkError(ctx, error);
  }
}

// ─── State ─────────────────────────────────────────────────────────────────

const BulkStateBody = z.object({
  productIds: z.array(uuid).min(1),
  to: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']),
  reason: z.string().trim().min(1).max(1000),
  dryRun: z.boolean().optional(),
});

export async function adminBulkStateHandler(
  ctx: RouteContext,
  deps: AdminDeps = {},
): Promise<HandlerOutcome> {
  const g = await gate(ctx, { module: 'products', action: 'bulk' }, deps);
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };

  const db = requireDb(ctx);
  const parsed = BulkStateBody.safeParse(await readOptionalJson(ctx.request));
  if (!parsed.success) {
    throw new ContractError('VALIDATION_FAILED', 'Invalid bulk state payload.');
  }

  try {
    const result = await bulkSetState(db, {
      productIds: parsed.data.productIds,
      to: parsed.data.to,
      actorId: g.actor.sub,
      reason: parsed.data.reason,
      dryRun: parsed.data.dryRun === true,
      requestId: ctx.ids.requestId,
    });
    return { status: 200, body: { data: result } };
  } catch (error) {
    return mapBulkError(ctx, error);
  }
}

// ─── Undo ──────────────────────────────────────────────────────────────────

const UndoBody = z.object({
  reason: z.string().trim().max(1000).optional(),
});

export async function adminUndoBulkOperationHandler(
  ctx: RouteContext,
  deps: AdminDeps = {},
): Promise<HandlerOutcome> {
  const g = await gate(ctx, { module: 'products', action: 'approve' }, deps);
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };

  const db = requireDb(ctx);
  const operationId = requireUuid(ctx.params['operationId'], 'operation id');
  const parsed = UndoBody.safeParse(await readOptionalJson(ctx.request));
  if (!parsed.success) {
    throw new ContractError('VALIDATION_FAILED', 'Invalid undo payload.');
  }

  try {
    const result = await undoBulkOperation(db, {
      operationId,
      actorId: g.actor.sub,
      ...(parsed.data.reason === undefined ? {} : { reason: parsed.data.reason }),
      requestId: ctx.ids.requestId,
    });
    return { status: 200, body: { data: result } };
  } catch (error) {
    return mapBulkError(ctx, error);
  }
}
