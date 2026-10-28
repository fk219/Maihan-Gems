/**
 * apps/web/src/api/admin/console-handlers.ts
 *
 * P3-2/P3-5 admin console API: SEO metadata editor, navigation editor,
 * redirect manager and the AI-ops (jobs/dead-letter + ai_interactions tail) views.
 * Every handler goes through the ONE gate (`gateAdmin`) with the module
 * capability from the domain policy, validates with zod, and delegates to
 * the repositories — no SQL in the handler.
 */
import { z } from 'zod';

import type { RouteContext, HandlerOutcome } from '../handlers.js';
import {
  createJobsOpsRepository,
  createSeoNavRepository,
  isRedirectConflict,
  type CatalogDatabase,
} from '@maihan/db';

import { gateAdmin, type BackOfficeHandlerDeps } from './backoffice-handlers.js';

const SeoKindSchema = z.enum(['PRODUCT', 'GEMSTONE', 'PAGE', 'SETTING', 'DYO']);

const SeoUpsertSchema = z.object({
  entityKind: SeoKindSchema,
  entityId: z.string().uuid(),
  title: z.string().max(160).nullable().optional(),
  description: z.string().max(320).nullable().optional(),
  canonicalPath: z.string().max(300).nullable().optional(),
  ogImageUrl: z.string().max(600).nullable().optional(),
  robots: z.string().max(120).nullable().optional(),
  noindex: z.boolean().optional(),
});

const NavigationUpdateSchema = z.object({
  key: z.enum(['header', 'footer', 'mega_menu', 'mobile']),
  locale: z.string().min(2).max(8).default('en'),
  items: z
    .array(
      z.object({
        label: z.string().min(1).max(80),
        href: z.string().min(1).max(200),
        children: z.array(z.object({ label: z.string().min(1).max(80), href: z.string().min(1).max(200) })).max(30).optional(),
        external: z.boolean().optional(),
      }),
    )
    .max(30),
});

const RedirectCreateSchema = z.object({
  fromPath: z.string().regex(/^\/.+/).max(300),
  toPath: z.string().regex(/^\/.+/).max(300),
  statusCode: z.union([z.literal(301), z.literal(302), z.literal(307), z.literal(308)]).default(301),
  reason: z.string().max(300).nullable().optional(),
});

export async function adminSeoListHandler(ctx: RouteContext, deps: BackOfficeHandlerDeps = {}): Promise<HandlerOutcome> {
  const g = await gateAdmin(ctx, { module: 'seo', action: 'read' }, deps);
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };
  const kindParam = ctx.url.searchParams.get('kind');
  const kind = SeoKindSchema.safeParse(kindParam).success ? (kindParam as never) : undefined;
  const repo = createSeoNavRepository(ctx.db as CatalogDatabase);
  const rows = await repo.listSeoMetadata({
    limit: Math.min(Number(ctx.url.searchParams.get('limit') ?? '50'), 200),
    offset: Math.max(Number(ctx.url.searchParams.get('offset') ?? '0'), 0),
    kind,
  });
  return { status: 200, body: { data: rows } };
}

export async function adminSeoUpsertHandler(ctx: RouteContext, deps: BackOfficeHandlerDeps = {}): Promise<HandlerOutcome> {
  const g = await gateAdmin(ctx, { module: 'seo', action: 'write' }, deps);
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };
  const parsed = SeoUpsertSchema.safeParse(await ctx.request?.json());
  if (!parsed.success) {
    return { status: 400, body: { code: 'VALIDATION_FAILED', message: 'Invalid SEO payload.', details: parsed.error.issues } };
  }
  const repo = createSeoNavRepository(ctx.db as CatalogDatabase);
  try {
    const row = await repo.upsertSeoMetadata({
      entityKind: parsed.data.entityKind,
      entityId: parsed.data.entityId,
      title: parsed.data.title ?? null,
      description: parsed.data.description ?? null,
      canonicalPath: parsed.data.canonicalPath ?? null,
      ogImageUrl: parsed.data.ogImageUrl ?? null,
      robots: parsed.data.robots ?? null,
      noindex: parsed.data.noindex,
      actorId: g.actor.sub,
    });
    return { status: 200, body: { data: row } };
  } catch {
    return { status: 400, body: { code: 'VALIDATION_FAILED', message: 'SEO metadata upsert failed.' } };
  }
}

export async function adminNavigationListHandler(ctx: RouteContext, deps: BackOfficeHandlerDeps = {}): Promise<HandlerOutcome> {
  const g = await gateAdmin(ctx, { module: 'navigation', action: 'read' }, deps);
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };
  const repo = createSeoNavRepository(ctx.db as CatalogDatabase);
  const rows = await repo.listNavigations();
  return { status: 200, body: { data: rows } };
}

export async function adminNavigationUpdateHandler(ctx: RouteContext, deps: BackOfficeHandlerDeps = {}): Promise<HandlerOutcome> {
  const g = await gateAdmin(ctx, { module: 'navigation', action: 'write' }, deps);
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };
  const parsed = NavigationUpdateSchema.safeParse(await ctx.request?.json());
  if (!parsed.success) {
    return { status: 400, body: { code: 'VALIDATION_FAILED', message: 'Invalid navigation payload.', details: parsed.error.issues } };
  }
  const repo = createSeoNavRepository(ctx.db as CatalogDatabase);
  try {
    const row = await repo.updateNavigationItems({
      key: parsed.data.key,
      locale: parsed.data.locale,
      items: parsed.data.items,
      actorId: g.actor.sub,
    });
    return { status: 200, body: { data: row } };
  } catch {
    return { status: 400, body: { code: 'VALIDATION_FAILED', message: 'Unknown navigation key/locale.' } };
  }
}

export async function adminRedirectsListHandler(ctx: RouteContext, deps: BackOfficeHandlerDeps = {}): Promise<HandlerOutcome> {
  const g = await gateAdmin(ctx, { module: 'seo', action: 'read' }, deps);
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };
  const repo = createSeoNavRepository(ctx.db as CatalogDatabase);
  const rows = await repo.listRedirects({
    limit: Math.min(Number(ctx.url.searchParams.get('limit') ?? '100'), 500),
    offset: Math.max(Number(ctx.url.searchParams.get('offset') ?? '0'), 0),
  });
  return { status: 200, body: { data: rows } };
}

export async function adminRedirectCreateHandler(ctx: RouteContext, deps: BackOfficeHandlerDeps = {}): Promise<HandlerOutcome> {
  const g = await gateAdmin(ctx, { module: 'seo', action: 'write' }, deps);
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };
  const parsed = RedirectCreateSchema.safeParse(await ctx.request?.json());
  if (!parsed.success) {
    return { status: 400, body: { code: 'VALIDATION_FAILED', message: 'Invalid redirect payload.', details: parsed.error.issues } };
  }
  const repo = createSeoNavRepository(ctx.db as CatalogDatabase);
  try {
    const row = await repo.createRedirect({
      fromPath: parsed.data.fromPath,
      toPath: parsed.data.toPath,
      statusCode: parsed.data.statusCode,
      reason: parsed.data.reason ?? null,
      actorId: g.actor.sub,
    });
    return { status: 201, body: { data: row } };
  } catch (error) {
    if (isRedirectConflict(error)) {
      return { status: 409, body: { code: 'REDIRECT_CONFLICT', message: error.message } };
    }
    return { status: 400, body: { code: 'VALIDATION_FAILED', message: 'Redirect rejected.' } };
  }
}

export async function adminRedirectDeleteHandler(ctx: RouteContext, deps: BackOfficeHandlerDeps = {}): Promise<HandlerOutcome> {
  const g = await gateAdmin(ctx, { module: 'seo', action: 'write' }, deps);
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };
  const repo = createSeoNavRepository(ctx.db as CatalogDatabase);
  try {
    await repo.deleteRedirect({ id: ctx.params['redirectId'] ?? '', actorId: g.actor.sub });
    return { status: 204, body: undefined };
  } catch {
    return { status: 404, body: { code: 'NOT_FOUND', message: 'Redirect not found.' } };
  }
}

export async function adminJobsListHandler(ctx: RouteContext, deps: BackOfficeHandlerDeps = {}): Promise<HandlerOutcome> {
  const g = await gateAdmin(ctx, { module: 'ai_logs', action: 'read' }, deps);
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };
  const repo = createJobsOpsRepository(ctx.db as CatalogDatabase);
  try {
    const rows = await repo.listJobs({
      queue: ctx.url.searchParams.get('queue') ?? undefined,
      state: ctx.url.searchParams.get('state') ?? undefined,
      limit: Math.min(Number(ctx.url.searchParams.get('limit') ?? '50'), 200),
      offset: Math.max(Number(ctx.url.searchParams.get('offset') ?? '0'), 0),
    });
    return { status: 200, body: { data: rows } };
  } catch {
    return { status: 400, body: { code: 'VALIDATION_FAILED', message: 'Invalid jobs filter.' } };
  }
}

export async function adminJobRequeueHandler(ctx: RouteContext, deps: BackOfficeHandlerDeps = {}): Promise<HandlerOutcome> {
  const g = await gateAdmin(ctx, { module: 'ai_logs', action: 'write' }, deps);
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };
  const repo = createJobsOpsRepository(ctx.db as CatalogDatabase);
  try {
    const row = await repo.requeueDeadLetter({ jobId: ctx.params['jobId'] ?? '', actorId: g.actor.sub });
    return { status: 200, body: { data: row } };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'jobs-ops error';
    if (message.includes('not found')) {
      return { status: 404, body: { code: 'NOT_FOUND', message: 'Job not found.' } };
    }
    return { status: 409, body: { code: 'INVALID_TRANSITION', message } };
  }
}

export async function adminAiLogsTailHandler(ctx: RouteContext, deps: BackOfficeHandlerDeps = {}): Promise<HandlerOutcome> {
  const g = await gateAdmin(ctx, { module: 'ai_logs', action: 'read' }, deps);
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };
  const repo = createJobsOpsRepository(ctx.db as CatalogDatabase);
  const rows = await repo.tailAiLogs({ limit: Math.min(Number(ctx.url.searchParams.get('limit') ?? '50'), 200) });
  return { status: 200, body: { data: rows } };
}
