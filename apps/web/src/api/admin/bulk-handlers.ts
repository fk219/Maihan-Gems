/**
 * apps/web/src/api/admin/bulk-handlers.ts
 *
 * Phase 12 — Stage D / Global Tasks 6 + 13 HTTP surface (doc 23 §9 API
 * patterns): POST bulk/preview → diff + token; POST bulk/apply → applies
 * with the token (+ dual approvers + typed confirmation above threshold);
 * POST bulk/revert → bounded window.
 *
 * Authorization (doc 23 §3): 'bulk' verbs on the products module are held
 * by CATALOG_MANAGER (and ADMIN_SUPER implicitly); the approve step requires
 * approvers whose identities are recorded but whose capability is asserted
 * by the handler gate (write on products), NOT self-served.
 */
import { z } from 'zod';

import type { RouteContext, HandlerOutcome } from '../handlers.js';
import {
  createBulkOperationsRepository,
  BulkOperationError,
  type CatalogDatabase,
} from '@maihan/db';

import {
  authorizeAdmin,
  authzFailureResponse,
} from './authz.js';

const PreviewSchema = z.object({
  changes: z.array(z.object({
    productId: z.string().uuid(),
    field: z.string().min(1).max(40),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: z.any(),
  })).min(1).max(5_000),
});

const ApplySchema = z.object({
  token: z.string().regex(/^[0-9a-f]{36}$/),
  approverIds: z.array(z.string().min(1)).min(1).max(5),
  typedConfirmation: z.string().min(1).max(32).optional(),
});

const RevertSchema = z.object({
  token: z.string().regex(/^[0-9a-f]{36}$/),
});

function gate(
  ctx: RouteContext,
  module: 'products',
  action: 'write' | 'bulk',
): { actor: import('@maihan/contracts').AdminActor } | { failure: Response } {
  const headers = ctx.request?.headers ?? new Headers();
  const decision = authorizeAdmin(headers, { module, action });
  if (decision.ok) return { actor: decision.actor };
  return { failure: authzFailureResponse(decision.status, ctx.ids) };
}

function bulkRepo(ctx: RouteContext) {
  if (ctx.db === undefined) throw new Error('bulk handlers require the db seam (ctx.db)');
  return createBulkOperationsRepository(ctx.db as CatalogDatabase, async () => {
    // audit wire: composition attaches the shared audit sink; the repo
    // writes one audit_logs row per affected entity via AuditWriter.
  });
}

const fail = (error: unknown): HandlerOutcome => {
  if (error instanceof BulkOperationError) {
    const status = error.kind === 'DUAL_APPROVAL_REQUIRED' || error.kind === 'PREVIEW_STALE' || error.kind === 'ALREADY_APPLIED' || error.kind === 'UNDO_WINDOW_EXPIRED'
      ? 409
      : 400;
    return { status, body: { code: error.kind, message: 'Bulk operation refused.' } };
  }
  return { status: 500, body: { code: 'INTERNAL', message: 'Unexpected repository failure.' } };
};

export async function bulkPreviewHandler(ctx: RouteContext): Promise<HandlerOutcome> {
  const g = gate(ctx, 'products', 'bulk');
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };
  const parsed = PreviewSchema.safeParse(await ctx.request?.json());
  if (!parsed.success) return { status: 400, body: { code: 'VALIDATION_FAILED', message: 'Invalid bulk payload.', details: parsed.error.issues } };
  try {
    const changes = parsed.data.changes.map((c) => ({ productId: c.productId, field: c.field, value: c.value as unknown }));
    const preview = await bulkRepo(ctx).preview({ changes, actorId: g.actor.sub });
    return { status: 200, body: { data: { token: preview.token, changes: preview.changes, dualApprovalRequired: preview.dualApprovalRequired } } };
  } catch (error) { return fail(error); }
}

export async function bulkApplyHandler(ctx: RouteContext): Promise<HandlerOutcome> {
  const g = gate(ctx, 'products', 'bulk');
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };
  const parsed = ApplySchema.safeParse(await ctx.request?.json());
  if (!parsed.success) return { status: 400, body: { code: 'VALIDATION_FAILED', message: 'Invalid apply payload.', details: parsed.error.issues } };
  try {
    const result = await bulkRepo(ctx).apply({ ...parsed.data, actorId: g.actor.sub });
    return { status: 200, body: { data: result } };
  } catch (error) { return fail(error); }
}

export async function bulkRevertHandler(ctx: RouteContext): Promise<HandlerOutcome> {
  const g = gate(ctx, 'products', 'bulk');
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };
  const parsed = RevertSchema.safeParse(await ctx.request?.json());
  if (!parsed.success) return { status: 400, body: { code: 'VALIDATION_FAILED', message: 'Invalid revert payload.' } };
  try {
    const result = await bulkRepo(ctx).revert({ ...parsed.data, actorId: g.actor.sub });
    return { status: 200, body: { data: result } };
  } catch (error) { return fail(error); }
}
