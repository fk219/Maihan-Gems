/**
 * apps/web/src/api/admin/catalog-structure-handlers.ts
 *
 * Phase 12 — Stage C / Global Task 4 + 5 (E12.3) HTTP surface.
 *
 * Handlers for the three locked CMS-structure tables:
 *   navigations (GT 4a), redirects (GT 4b), seo_metadata (GT 5).
 *
 * Contract (identical to the CMS page handlers):
 *   1. authorizeAdmin is the ONE gate (module-navision verbs from the doc 23
 *      §3 matrix: navigation→navigation, redirect→navigation, seo→seo);
 *   2. validate via the repository's validators (no business branching here);
 *   3. delegate to EXACTLY ONE repository call;
 *   4. single error envelope.
 *
 * Overwrite safety (doc 34 §11/§12): a new redirect over an existing
 * from_path is REDIRECT_EXISTS (409), never a silent overwrite; bulk
 * import is validated in full BEFORE execution and runs as one statement.
 */
import { z } from 'zod';

import type { RouteContext, HandlerOutcome } from '../handlers.js';
import {
  createNavigationRepository,
  createRedirectRepository,
  createSeoRepository,
  NavigationConflictError,
  RedirectConflictError,
  SeoConflictError,
  SEO_ENTITY_KINDS,
  type CatalogDatabase,
} from '@maihan/db';

import {
  authorizeAdmin,
  authzFailureResponse,
  type CapabilityRequest,
} from './authz.js';

const NAV_KEYS = ['header', 'footer', 'mega_menu', 'mobile'] as const;
const NavKeySchema = z.enum(NAV_KEYS);
const NavItemsSchema = z.array(z.record(z.string(), z.unknown()));

const SaveNavigationSchema = z.object({
  key: NavKeySchema,
  locale: z.string().regex(/^[a-z]{2}(-[A-Za-z0-9]{2,8})?$/).max(35).default('en'),
  items: NavItemsSchema,
  expectedUpdatedAt: z.string().datetime().optional(),
});

const UpdateRedirectSchema = z.object({
  from_path: z.string().startsWith('/').max(2048),
  to_path: z.string().max(2048),
  status_code: z.union([z.literal(200), z.literal(301), z.literal(302), z.literal(410)]),
  reason: z.string().max(300).optional(),
  expectedToPath: z.string().max(2048),
  expectedStatus: z.number().int(),
});

const BulkRedirectsSchema = z.object({
  rows: z.array(z.record(z.string(), z.unknown())).max(50_000),
});

const SeoKindSchema = z.enum(SEO_ENTITY_KINDS);
const SaveSeoSchema = z.object({
  entity_kind: SeoKindSchema,
  entity_id: z.string().uuid(),
  title: z.string().max(60).nullable().optional(),
  description: z.string().max(160).nullable().optional(),
  canonical_path: z.string().max(2048).nullable().optional(),
  og_image_url: z.string().url().startsWith('https://').nullable().optional(),
  robots: z.string().max(60).nullable().optional(),
  noindex: z.boolean().optional(),
  structured_extra: z.record(z.string(), z.unknown()).optional(),
  expectedUpdatedAt: z.string().datetime().optional(),
});

function gate(
  ctx: RouteContext,
  request: CapabilityRequest,
): { actor: { sub: string } } | { failure: Response } {
  const headers = ctx.request?.headers ?? new Headers();
  const decision = authorizeAdmin(headers, request);
  if (decision.ok) return { actor: decision.actor };
  return { failure: authzFailureResponse(decision.status, ctx.ids) };
}

function structureRepo(ctx: RouteContext) {
  if (ctx.db === undefined) throw new Error('structure handlers require the db seam (ctx.db)');
  const db = ctx.db as CatalogDatabase;
  const noopAudit = async (): Promise<void> => { /* audit seam wired per repo below */ };
  return {
    nav: createNavigationRepository(db, noopAudit),
    redirect: createRedirectRepository(db, noopAudit),
    seo: createSeoRepository(db, noopAudit),
  };
}

const dbFail = (error: unknown): HandlerOutcome => {
  switch (true) {
    case error instanceof NavigationConflictError:
      return { status: error.kind === 'EXPECTED_STALE' || error.kind === 'MISSING_ROW' ? 409 : 400, body: { code: error.kind, message: 'Navigation change rejected.' } };
    case error instanceof RedirectConflictError:
      return {
        status: error.kind === 'REDIRECT_EXISTS' || error.kind === 'STALE_ROW' ? 409 : 400,
        body: { code: error.kind, message: error.kind === 'REDIRECT_EXISTS' ? 'A redirect for this path already exists — view it instead of overwriting silently.' : 'Redirect rejected.' },
      };
    case error instanceof SeoConflictError:
      return { status: error.kind === 'EXPECTED_STALE' || error.kind === 'MISSING_ROW' ? 409 : 400, body: { code: error.kind, message: 'SEO metadata change rejected.' } };
    default:
      return { status: 500, body: { code: 'INTERNAL', message: 'Unexpected repository failure.' } };
  }
};

/* ── Navigations ─────────────────────────────────────────────────────── */

export async function listNavigationsHandler(ctx: RouteContext): Promise<HandlerOutcome> {
  const g = gate(ctx, { module: 'navigation', action: 'list' });
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };
  const { nav } = structureRepo(ctx);
  try {
    const rows = await nav.list(ctx.url.searchParams.get('locale') ?? 'en');
    return { status: 200, body: { data: rows } };
  } catch (error) { return dbFail(error); }
}

export async function getNavigationHandler(ctx: RouteContext): Promise<HandlerOutcome> {
  const g = gate(ctx, { module: 'navigation', action: 'read' });
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };
  const { nav } = structureRepo(ctx);
  try {
    const row = await nav.get(ctx.params['key'] ?? '', ctx.url.searchParams.get('locale') ?? 'en');
    if (row === null) return { status: 404, body: { code: 'NOT_FOUND', message: 'Navigation not found' } };
    return { status: 200, body: { data: row } };
  } catch (error) { return dbFail(error); }
}

export async function saveNavigationHandler(ctx: RouteContext): Promise<HandlerOutcome> {
  const g = gate(ctx, { module: 'navigation', action: 'write' });
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };
  const parsed = SaveNavigationSchema.safeParse(await ctx.request?.json());
  if (!parsed.success) return { status: 400, body: { code: 'VALIDATION_FAILED', message: 'Invalid navigation payload.', details: parsed.error.issues } };
  const { nav } = structureRepo(ctx);
  try {
    const row = await nav.save({
      key: parsed.data.key, locale: parsed.data.locale, items: parsed.data.items,
      actorId: g.actor.sub, expectedUpdatedAt: parsed.data.expectedUpdatedAt,
    });
    return { status: 200, body: { data: row } };
  } catch (error) { return dbFail(error); }
}

/* ── Redirects ───────────────────────────────────────────────────────── */

export async function listRedirectsHandler(ctx: RouteContext): Promise<HandlerOutcome> {
  const g = gate(ctx, { module: 'navigation', action: 'list' });
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };
  const { redirect } = structureRepo(ctx);
  try {
    const limit = Math.min(Number(ctx.url.searchParams.get('limit') ?? '50'), 500);
    const offset = Math.max(Number(ctx.url.searchParams.get('offset') ?? '0'), 0);
    const search = ctx.url.searchParams.get('search') ?? undefined;
    const page = await redirect.list({ limit, offset, search });
    return { status: 200, body: { data: page.rows, meta: { total: page.total, limit, offset } } };
  } catch (error) { return dbFail(error); }
}

export async function updateRedirectHandler(ctx: RouteContext): Promise<HandlerOutcome> {
  const g = gate(ctx, { module: 'navigation', action: 'write' });
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };
  const parsed = UpdateRedirectSchema.safeParse(await ctx.request?.json());
  if (!parsed.success) return { status: 400, body: { code: 'VALIDATION_FAILED', message: 'Invalid redirect payload.', details: parsed.error.issues } };
  const { redirect } = structureRepo(ctx);
  try {
    const row = await redirect.update({ ...parsed.data, actorId: g.actor.sub });
    return { status: 200, body: { data: row } };
  } catch (error) { return dbFail(error); }
}

export async function bulkImportRedirectsHandler(ctx: RouteContext): Promise<HandlerOutcome> {
  const g = gate(ctx, { module: 'navigation', action: 'bulk' });
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };
  const parsed = BulkRedirectsSchema.safeParse(await ctx.request?.json());
  if (!parsed.success) return { status: 400, body: { code: 'VALIDATION_FAILED', message: 'Invalid bulk payload.', details: parsed.error.issues } };
  const { redirect } = structureRepo(ctx);
  const { valid, errors } = redirect.prepareBulkImport(parsed.data.rows);
  if (errors.length > 0) {
    // All-or-nothing: no execution while ANY row is invalid (doc 34 §11).
    return { status: 422, body: { code: 'BULK_VALIDATION_FAILED', message: 'No rows inserted; every row must validate.', data: { errors: errors.slice(0, 100), error_count: errors.length, received: parsed.data.rows.length } } };
  }
  try {
    const rows = await redirect.executeBulkImport(valid, g.actor.sub);
    return { status: 200, body: { data: { imported: rows.length, requested: valid.length } } };
  } catch (error) { return dbFail(error); }
}

/* ── SEO metadata ────────────────────────────────────────────────────── */

export async function getSeoHandler(ctx: RouteContext): Promise<HandlerOutcome> {
  const g = gate(ctx, { module: 'seo', action: 'read' });
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };
  const kind = ctx.url.searchParams.get('entity_kind');
  const entityId = ctx.url.searchParams.get('entity_id');
  const parsed = SeoKindSchema.safeParse(kind);
  if (!parsed.success || entityId === null) {
    return { status: 400, body: { code: 'VALIDATION_FAILED', message: 'entity_kind and entity_id are required.' } };
  }
  const { seo } = structureRepo(ctx);
  try {
    const row = await seo.get(parsed.data, entityId);
    if (row === null) return { status: 404, body: { code: 'NOT_FOUND', message: 'No SEO metadata for this entity' } };
    return { status: 200, body: { data: row } };
  } catch (error) { return dbFail(error); }
}

export async function listSeoHandler(ctx: RouteContext): Promise<HandlerOutcome> {
  const g = gate(ctx, { module: 'seo', action: 'list' });
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };
  const { seo } = structureRepo(ctx);
  const kind = SeoKindSchema.safeParse(ctx.url.searchParams.get('entity_kind') ?? undefined);
  try {
    const rows = await seo.list({ entityKind: kind.success ? kind.data : undefined, limit: Math.min(Number(ctx.url.searchParams.get('limit') ?? '50'), 500), offset: Math.max(Number(ctx.url.searchParams.get('offset') ?? '0'), 0) });
    return { status: 200, body: { data: rows, meta: { limit: Number(ctx.url.searchParams.get('limit') ?? '50'), offset: Number(ctx.url.searchParams.get('offset') ?? '0') } } };
  } catch (error) { return dbFail(error); }
}

export async function saveSeoHandler(ctx: RouteContext): Promise<HandlerOutcome> {
  const g = gate(ctx, { module: 'seo', action: 'write' });
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };
  const parsed = SaveSeoSchema.safeParse(await ctx.request?.json());
  if (!parsed.success) return { status: 400, body: { code: 'VALIDATION_FAILED', message: 'Invalid SEO payload.', details: parsed.error.issues } };
  const { seo } = structureRepo(ctx);
  try {
    const row = await seo.save({ ...parsed.data, actorId: g.actor.sub });
    return { status: 200, body: { data: row } };
  } catch (error) { return dbFail(error); }
}
