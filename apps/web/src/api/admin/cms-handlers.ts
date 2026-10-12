/**
 * apps/web/src/api/admin/cms-handlers.ts
 *
 * Phase 12 — Stage B / Global Task B3 (E12.1/E12.2 API surface).
 *
 * Admin page handlers. Every entry:
 *
 *   1. resolves the actor + capability through authorizeAdmin (the ONE gate),
 *   2. validates the request payload against the CMS block registry,
 *   3. delegates to the CmsRepository (locking workflow rules live there),
 *   4. returns the single error envelope.
 *
 * Role mapping (doc 23 §3): content read/write is CONTENT_EDITOR and up;
 * approve/publish is CONTENT_PUBLisher and up (CONTENT_EDITOR cannot
 * approve or publish — the separation of duties, plan §19 task 2-3).
 */
import { z } from 'zod';

import type { RouteContext, HandlerOutcome } from '../handlers.js';
import { parsePageBlocks, CONTENT_BLOCK_TYPES, type ContentBlockType } from '@maihan/contracts';
import type { CmsRepository } from '@maihan/db';

import {
  authorizeAdmin,
  authzFailureResponse,
  type CapabilityRequest,
} from './authz.js';
import { createCmsRepository } from '@maihan/db';
import type { CatalogDatabase } from '@maihan/db';

const PAGE_KINDS = ['STATIC', 'EDUCATION', 'BLOG', 'POLICY', 'LANDING', 'SHOWROOM'] as const;
const PageKindSchema = z.enum(PAGE_KINDS);

const CreatePageSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120),
  title: z.string().min(1).max(160),
  pageKind: PageKindSchema,
  blocks: z.array(z.record(z.string(), z.unknown())).max(120),
});

const UpdateBlocksSchema = z.object({
  blocks: z.array(z.record(z.string(), z.unknown())).max(120),
  rawMarkdown: z.string().max(200_000).nullable().optional(),
  expectedVersion: z.number().int().positive(),
  note: z.string().max(500).optional(),
});

const DecideSchema = z.object({
  approve: z.boolean(),
  note: z.string().max(500).optional(),
});

export interface CmsHandlerDeps {
  /** Dev/dev-fidelity deployments may enable the role-header seam. */
  allowRoleHeader?: boolean;
}

/** Authorise or return the failure Response (401/403 with envelope). */
function gate(
  ctx: RouteContext,
  request: CapabilityRequest,
  deps: CmsHandlerDeps = {},
): { actor: import('@maihan/contracts').AdminActor } | { failure: Response } {
  const headers = ctx.request?.headers ?? new Headers();
  const decision = authorizeAdmin(headers, { ...request, allowRoleHeader: deps.allowRoleHeader });
  if (decision.ok) return { actor: decision.actor };
  return { failure: authzFailureResponse(decision.status, ctx.ids) };
}

/** Resolve the CMS repository from the context database (composition root). */
function cmsRepo(ctx: RouteContext): CmsRepository {
  if (ctx.db === undefined) {
    throw new Error('CMS handlers require the db seam (ctx.db)');
  }
  return createCmsRepository(ctx.db as CatalogDatabase, async (entry) => {
    // Audit rows are written by the DB layer's audit seam (one trail). This
    // adapter is where a composition root would attach span/metric hooks;
    // the row itself never bypasses the repository's SQL.
    void entry;
  });
}

export async function adminCreatePageHandler(ctx: RouteContext, deps: CmsHandlerDeps = {}): Promise<HandlerOutcome> {
  const g = gate(ctx, { module: 'content', action: 'write', allowRoleHeader: deps.allowRoleHeader }, deps);
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };
  const parsed = CreatePageSchema.safeParse(await ctx.request?.json());
  if (!parsed.success) {
    return { status: 400, body: { code: 'VALIDATION_FAILED', message: 'Invalid page payload.', details: parsed.error.issues } };
  }
  try {
    parsePageBlocks(parsed.data.blocks); // registry validation on every write (doc 22 §6.1)
  } catch (error) {
    return { status: 400, body: { code: 'VALIDATION_FAILED', message: error instanceof Error ? error.message : 'Invalid blocks' } };
  }
  const repo = cmsRepo(ctx);
  const page = await repo.createPage({
    slug: parsed.data.slug,
    title: parsed.data.title,
    pageKind: parsed.data.pageKind,
    blocks: parsed.data.blocks,
    actorId: g.actor.sub,
  });
  return { status: 201, body: { data: page } };
}

export async function adminListPagesHandler(ctx: RouteContext, deps: CmsHandlerDeps = {}): Promise<HandlerOutcome> {
  const g = gate(ctx, { module: 'content', action: 'list', allowRoleHeader: deps.allowRoleHeader }, deps);
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };
  const repo = cmsRepo(ctx);
  const stateParam = ctx.url.searchParams.get('state');
  const valid: Array<'DRAFT' | 'IN_REVIEW' | 'PUBLISHED' | 'ARCHIVED'> = ['DRAFT', 'IN_REVIEW', 'PUBLISHED', 'ARCHIVED'];
  const state = valid.includes(stateParam as never) ? (stateParam as 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED' | 'ARCHIVED') : undefined;
  const limit = Math.min(Number(ctx.url.searchParams.get('limit') ?? '50'), 200);
  const offset = Math.max(Number(ctx.url.searchParams.get('offset') ?? '0'), 0);
  const pages = await repo.listPages({ state, limit, offset });
  return { status: 200, body: { data: pages, meta: { limit, offset } } };
}

export async function adminGetPageHandler(ctx: RouteContext, deps: CmsHandlerDeps = {}): Promise<HandlerOutcome> {
  const g = gate(ctx, { module: 'content', action: 'read', allowRoleHeader: deps.allowRoleHeader }, deps);
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };
  const repo = cmsRepo(ctx);
  const pageId = ctx.params['pageId'] ?? '';
  const page = await repo.getPage(pageId);
  if (page === null) return { status: 404, body: { code: 'NOT_FOUND', message: 'Page not found' } };
  const revisions = await repo.listRevisions(pageId);
  return { status: 200, body: { data: { ...page, revisions } } };
}

export async function adminUpdateBlocksHandler(ctx: RouteContext, deps: CmsHandlerDeps = {}): Promise<HandlerOutcome> {
  const g = gate(ctx, { module: 'content', action: 'write', allowRoleHeader: deps.allowRoleHeader }, deps);
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };
  const parsed = UpdateBlocksSchema.safeParse(await ctx.request?.json());
  const pageId = ctx.params['pageId'] ?? '';
  if (!parsed.success) {
    return { status: 400, body: { code: 'VALIDATION_FAILED', message: 'Invalid payload.', details: parsed.error.issues } };
  }
  try {
    parsePageBlocks(parsed.data.blocks);
  } catch (error) {
    return { status: 400, body: { code: 'VALIDATION_FAILED', message: error instanceof Error ? error.message : 'Invalid blocks' } };
  }
  const repo = cmsRepo(ctx);
  try {
    const { page, revision } = await repo.updateBlocks({
      pageId,
      blocks: parsed.data.blocks,
      rawMarkdown: parsed.data.rawMarkdown ?? null,
      expectedVersion: parsed.data.expectedVersion,
      editorId: g.actor.sub,
      note: parsed.data.note,
    });
    return { status: 200, body: { data: { page, revision } } };
  } catch (error) {
    if (error instanceof Error && error.message.includes('VERSION_CONFLICT')) {
      return { status: 409, body: { code: 'VERSION_CONFLICT', message: 'The page changed since your edit; refresh and reapply.' } };
    }
    return { status: 404, body: { code: 'NOT_FOUND', message: 'Page not found' } };
  }
}

export async function adminSubmitForReviewHandler(ctx: RouteContext, deps: CmsHandlerDeps = {}): Promise<HandlerOutcome> {
  const g = gate(ctx, { module: 'content', action: 'write', allowRoleHeader: deps.allowRoleHeader }, deps);
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };
  const repo = cmsRepo(ctx);
  const revisionId = ctx.params['revisionId'] ?? '';
  try {
    const revision = await repo.submitForReview({ revisionId, editorId: g.actor.sub });
    return { status: 200, body: { data: revision } };
  } catch (error) {
    return { status: 409, body: { code: 'INVALID_TRANSITION', message: 'The revision cannot move to review.' } };
  }
}

export async function adminDecideRevisionHandler(ctx: RouteContext, deps: CmsHandlerDeps = {}): Promise<HandlerOutcome> {
  // Approval action: CONTENT_PUBLISHER and up only (doc 23 §3 scope).
  const g = gate(ctx, { module: 'content', action: 'approve', allowRoleHeader: deps.allowRoleHeader }, deps);
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };
  const parsed = DecideSchema.safeParse(await ctx.request?.json());
  if (!parsed.success) {
    return { status: 400, body: { code: 'VALIDATION_FAILED', message: 'Invalid decision payload.' } };
  }
  const repo = cmsRepo(ctx);
  const revisionId = ctx.params['revisionId'] ?? '';
  try {
    const revision = await repo.decideRevision({
      revisionId,
      approverId: g.actor.sub,
      approve: parsed.data.approve,
      note: parsed.data.note,
    });
    return { status: 200, body: { data: revision } };
  } catch (error) {
    if (error instanceof Error && error.message.includes('SELF_APPROVAL')) {
      return { status: 409, body: { code: 'TWO_PERSON_RULE', message: 'A trust-bearing page requires a second approver.' } };
    }
    return { status: 409, body: { code: 'INVALID_TRANSITION', message: 'The revision is not awaiting a decision.' } };
  }
}

export async function adminPublishPageHandler(ctx: RouteContext, deps: CmsHandlerDeps = {}): Promise<HandlerOutcome> {
  const g = gate(ctx, { module: 'content', action: 'publish', allowRoleHeader: deps.allowRoleHeader }, deps);
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };
  const repo = cmsRepo(ctx);
  const pageId = ctx.params['pageId'] ?? '';
  try {
    const page = await repo.publishApproved({ pageId, actorId: g.actor.sub });
    return { status: 200, body: { data: page } };
  } catch (error) {
    void error;
    return { status: 409, body: { code: 'INVALID_TRANSITION', message: 'Publishing requires an approved head revision.' } };
  }
}

export async function adminArchivePageHandler(ctx: RouteContext, deps: CmsHandlerDeps = {}): Promise<HandlerOutcome> {
  const g = gate(ctx, { module: 'content', action: 'write', allowRoleHeader: deps.allowRoleHeader }, deps);
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };
  const repo = cmsRepo(ctx);
  try {
    const archivePageId = ctx.params['pageId'] ?? '';
    const page = await repo.archive({ pageId: archivePageId, actorId: g.actor.sub, reason: 'Archived via admin console' });
    return { status: 200, body: { data: page } };
  } catch (error) {
    return { status: 409, body: { code: 'INVALID_TRANSITION', message: 'Only published pages can be archived.' } };
  }
}

export { CONTENT_BLOCK_TYPES, type ContentBlockType };
