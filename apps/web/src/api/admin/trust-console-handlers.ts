/**
 * apps/web/src/api/admin/trust-console-handlers.ts
 *
 * Phase 12 — Stage E HTTP surface (Global Tasks 7, 8, 9, 10).
 *
 *   GT 7  GET  /admin/derived-refs            queue (FAILED_FETCH subset or ALL)
 *         PATCH /admin/derived-refs/decision  approve/reject (MIGRATION_ENGINEER)
 *   GT 8  GET  /admin/migration/batches       import_batches visibility
 *         GET  /admin/migration/conflicts     conflict ledger (unresolved filter)
 *   GT 9  PATCH /admin/migration/conflicts/resolve  explicit-side resolution
 *   GT 10 GET  /admin/certificates/queue      anomaly-sorted review queue
 *         PATCH /admin/certificates/review    APPROVE/REJECT/REQUEST_CHANGES
 *
 * RBAC (doc 23 §3): migration module (import_batches/conflicts/
 * derived_approvals) = MIGRATION_ENGINEER; certificates = TRUST_REVIEWER.
 * The console never mutates catalogue state beyond the approval ledger —
 * products stay DRAFT; nothing is fabricated.
 */
import { z } from 'zod';

import type { RouteContext, HandlerOutcome } from '../handlers.js';
import {
  createTrustConsoleRepository,
  TrustConsoleError,
  type CatalogDatabase,
} from '@maihan/db';

import {
  authorizeAdmin,
  authzFailureResponse,
} from './authz.js';

const DerivedDecisionSchema = z.object({
  productId: z.string().uuid(),
  approve: z.boolean(),
  note: z.string().max(500).optional(),
});

const ConflictResolveSchema = z.object({
  conflictId: z.string().uuid(),
  side: z.enum(['A', 'B', 'MERGED']),
  mergedText: z.string().min(1).max(4000).optional(),
});

const CertReviewSchema = z.object({
  certificateId: z.string().uuid(),
  decision: z.enum(['APPROVE', 'REJECT', 'REQUEST_CHANGES']),
  notes: z.string().max(2000).optional(),
  fieldsOverridden: z.record(z.string(), z.unknown()).optional(),
});

function gate(
  ctx: RouteContext,
  module: 'import_batches' | 'conflicts' | 'derived_approvals' | 'certificates' | 'anomalies',
  action: 'list' | 'read' | 'resolve' | 'approve',
): { actor: import('@maihan/contracts').AdminActor } | { failure: Response } {
  const headers = ctx.request?.headers ?? new Headers();
  const decision = authorizeAdmin(headers, { module, action });
  if (decision.ok) return { actor: decision.actor };
  return { failure: authzFailureResponse(decision.status, ctx.ids) };
}

function repo(ctx: RouteContext) {
  if (ctx.db === undefined) throw new Error('trust console handlers require the db seam (ctx.db)');
  return createTrustConsoleRepository(ctx.db as CatalogDatabase, async () => {
    // Audit wired at composition; the repository writes trust-console rows
    // through the shared TrustAuditWriter shape.
  });
}

const fail = (error: unknown): HandlerOutcome => {
  if (error instanceof TrustConsoleError) {
    return { status: error.kind === 'NOT_FOUND' ? 404 : 409, body: { code: error.kind, message: 'Trust console action refused.' } };
  }
  return { status: 500, body: { code: 'INTERNAL', message: 'Unexpected repository failure.' } };
};

export async function listMigrationBatchesHandler(ctx: RouteContext): Promise<HandlerOutcome> {
  const g = gate(ctx, 'import_batches', 'list');
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };
  try {
    const rows = await repo(ctx).listImportBatches();
    return { status: 200, body: { data: rows, meta: { count: rows.length } } };
  } catch (error) { return fail(error); }
}

export async function listConflictsHandler(ctx: RouteContext): Promise<HandlerOutcome> {
  const g = gate(ctx, 'conflicts', 'list');
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };
  try {
    const unresolvedOnly = ctx.url.searchParams.get('unresolved') !== 'false';
    const limit = Math.min(Number(ctx.url.searchParams.get('limit') ?? '50'), 500);
    const offset = Math.max(Number(ctx.url.searchParams.get('offset') ?? '0'), 0);
    const rows = await repo(ctx).listConflicts({ unresolvedOnly, limit, offset });
    return { status: 200, body: { data: rows, meta: { count: rows.length, unresolvedOnly, limit, offset } } };
  } catch (error) { return fail(error); }
}

export async function resolveConflictHandler(ctx: RouteContext): Promise<HandlerOutcome> {
  const g = gate(ctx, 'conflicts', 'resolve');
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };
  const parsed = ConflictResolveSchema.safeParse(await ctx.request?.json());
  if (!parsed.success) return { status: 400, body: { code: 'VALIDATION_FAILED', message: 'Invalid resolution payload.', details: parsed.error.issues } };
  try {
    const row = await repo(ctx).resolveConflict({ ...parsed.data, actorId: g.actor.sub });
    return { status: 200, body: { data: row } };
  } catch (error) { return fail(error); }
}

export async function listDerivedRefsHandler(ctx: RouteContext): Promise<HandlerOutcome> {
  const g = gate(ctx, 'derived_approvals', 'list');
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };
  try {
    const subsetParam = ctx.url.searchParams.get('subset');
    const subset = subsetParam === 'FAILED_FETCH' ? 'FAILED_FETCH' as const : undefined;
    const limit = Math.min(Number(ctx.url.searchParams.get('limit') ?? '50'), 500);
    const offset = Math.max(Number(ctx.url.searchParams.get('offset') ?? '0'), 0);
    const rows = await repo(ctx).listDerivedQueue({ subset, limit, offset });
    return { status: 200, body: { data: rows, meta: { count: rows.length, subset: subset ?? 'ALL', limit, offset } } };
  } catch (error) { return fail(error); }
}

export async function decideDerivedRefHandler(ctx: RouteContext): Promise<HandlerOutcome> {
  const g = gate(ctx, 'derived_approvals', 'approve');
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };
  const parsed = DerivedDecisionSchema.safeParse(await ctx.request?.json());
  if (!parsed.success) return { status: 400, body: { code: 'VALIDATION_FAILED', message: 'Invalid decision payload.', details: parsed.error.issues } };
  try {
    const row = await repo(ctx).decideDerived({ ...parsed.data, actorId: g.actor.sub });
    return { status: 200, body: { data: row } };
  } catch (error) { return fail(error); }
}

export async function certificateQueueHandler(ctx: RouteContext): Promise<HandlerOutcome> {
  const g = gate(ctx, 'certificates', 'list');
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };
  try {
    const limit = Math.min(Number(ctx.url.searchParams.get('limit') ?? '50'), 500);
    const offset = Math.max(Number(ctx.url.searchParams.get('offset') ?? '0'), 0);
    const rows = await repo(ctx).listCertificateQueue({ limit, offset });
    return { status: 200, body: { data: rows, meta: { count: rows.length, limit, offset } } };
  } catch (error) { return fail(error); }
}

export async function certificateReviewHandler(ctx: RouteContext): Promise<HandlerOutcome> {
  const g = gate(ctx, 'certificates', 'approve');
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };
  const parsed = CertReviewSchema.safeParse(await ctx.request?.json());
  if (!parsed.success) return { status: 400, body: { code: 'VALIDATION_FAILED', message: 'Invalid review payload.', details: parsed.error.issues } };
  try {
    const row = await repo(ctx).reviewCertificate({ ...parsed.data, actorId: g.actor.sub });
    return { status: 200, body: { data: row } };
  } catch (error) { return fail(error); }
}
