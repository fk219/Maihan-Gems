/**
 * apps/web/src/api/fresh/handlers.ts
 *
 * The develop-UI compatibility handlers.
 *
 * Each handler does three things: gate, call exactly one read from
 * `packages/db`, and return the shape the develop caller reads. There is no SQL
 * here and no business branching beyond the field mapping the compatibility
 * contract requires (docs/FRESH_COMPAT_LAYER.md §5).
 *
 * Auth rule: the path implies the actor.
 *   - `/admin/**`  -> the ADR-027 admin session gate;
 *   - `/vendors/{code}/**` -> the ADR-026 vendor membership gate, with the
 *     segment resolved to a vendor id so the gate can assert the boundary;
 *   - `/catalogue/varieties` is public reference data (develop served it
 *     without a session).
 *
 * An unauthenticated request is 401 and a role/membership refusal is 403 —
 * never a 500, and never a read before the gate.
 */
import { ContractError } from '@maihan/contracts';
import {
  listActiveVarieties,
  listConsoleAudit,
  listConsoleDiscounts,
  listConsoleInventory,
  listConsoleOrders,
  listConsoleVendors,
  readConsoleStats,
  readVendorAnalytics,
  readVendorInventory,
  resolveVendorSegment,
  PRODUCT_KINDS,
  PRODUCT_STATES,
  type CatalogDatabase,
  type ProductKind,
  type ProductState,
} from '@maihan/db';
import type { AdminModule, AdminAction } from '@maihan/domain';
import type { SearchQuery, SearchResult } from '@maihan/contracts';
import type { CorrelationIds } from '../envelope.js';
import type { HandlerOutcome } from '../handlers.js';
import { authorizeAdminRequest, type AdminDeps } from '../admin/session-authz.js';
import { requireVendor } from '../vendor/session-authz.js';

/**
 * Injectable seams for this surface.
 *
 * `search` is the existing search service (`executeSearch` from `@maihan/db`)
 * in production wiring. It is injectable so the HTTP-contract suite can prove
 * the response shapes without a database or a running search arm.
 */
export interface FreshDeps {
  readonly search?: (db: CatalogDatabase, query: SearchQuery) => Promise<SearchResult>;
}

/**
 * Everything a compatibility handler needs. Deliberately narrower than
 * `RouteContext`: these handlers never touch the catalogue service.
 */
export interface FreshContext {
  readonly db: CatalogDatabase;
  readonly request: Request;
  readonly url: URL;
  readonly ids: CorrelationIds;
  readonly params: Record<string, string>;
  /** Production wiring passes `{ environment }` only, so the header seam stays closed. */
  readonly adminDeps: AdminDeps;
  /** Injected search service; production passes `executeSearch`. */
  readonly deps: FreshDeps;
  /**
   * Runtime environment name (`ENVIRONMENT`). The development-only payment
   * instrument refuses when this is absent or is not one of the four local
   * names, so an unconfigured deployment fails closed.
   */
  readonly environment?: string | undefined;
}

/**
 * Marks a response whose concept `main` does not model.
 *
 * The body is an empty collection in the shape the caller reads. It is NOT the
 * `{ data, meta }` envelope, because develop's caller does `leads.filter(...)`
 * on the body (AdminConsoleApp.tsx:963) and an object would throw. The flag is
 * therefore carried in a header, and the reason is recorded in
 * docs/FRESH_COMPAT_LAYER.md §5.1.
 */
export const UNSUPPORTED_HEADER = 'X-Maihan-Compat-Unsupported';

function unsupported(path: string): HandlerOutcome {
  return {
    status: 200,
    body: [],
    headers: {
      [UNSUPPORTED_HEADER]: 'true',
      'X-Maihan-Compat-Unsupported-Concept': path,
      'Cache-Control': 'private, no-store',
    },
  };
}

async function requireAdminCapability(
  ctx: FreshContext,
  module: AdminModule,
  action: AdminAction,
): Promise<void> {
  const decision = await authorizeAdminRequest(
    { db: ctx.db, request: ctx.request },
    { module, action },
    ctx.adminDeps,
  );
  if (decision.ok) return;
  if (decision.status === 401) {
    throw new ContractError('UNAUTHORIZED', 'Authentication required.');
  }
  throw new ContractError('FORBIDDEN', 'Not permitted.');
}

/**
 * Resolve the vendor actor for a `{code}` path.
 *
 * Order matters:
 *   1. `requireVendor` with no assertion -> 401/403 before ANY vendor lookup,
 *      so an anonymous caller cannot probe which vendor slugs exist;
 *   2. resolve the segment (slug, then case-insensitive slug, then UUID);
 *   3. when the segment is not the actor's preferred membership, re-run the
 *      gate WITH the resolved id so a multi-vendor member still passes and a
 *      non-member gets the documented 403 VENDOR_SCOPE_MISMATCH.
 */
async function requireVendorForCode(ctx: FreshContext): Promise<{ vendorId: string; slug: string }> {
  const first = await requireVendor({ db: ctx.db, request: ctx.request });

  const segment = ctx.params['code'];
  if (segment === undefined || segment.trim().length === 0) {
    throw new ContractError('NOT_FOUND', 'No vendor was named in the path.');
  }

  const resolved = await resolveVendorSegment(ctx.db, segment);
  if (resolved === null) {
    throw new ContractError('NOT_FOUND', 'Unknown vendor.');
  }

  if (resolved.id === first.vendorId) {
    return { vendorId: first.vendorId, slug: first.vendor.slug };
  }

  const asserted = await requireVendor(
    { db: ctx.db, request: ctx.request },
    { vendorId: resolved.id },
  );
  return { vendorId: asserted.vendorId, slug: asserted.vendor.slug };
}

/* --------------------------------------------------------------- pagination */

interface Pagination {
  readonly limit: number;
  readonly offset: number;
}

function pagination(url: URL, defaultLimit: number, max: number): Pagination {
  const rawLimit = Number(url.searchParams.get('limit') ?? String(defaultLimit));
  const rawOffset = Number(url.searchParams.get('offset') ?? '0');
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.trunc(rawLimit), 1), max) : defaultLimit;
  const offset = Number.isFinite(rawOffset) ? Math.max(Math.trunc(rawOffset), 0) : 0;
  return { limit, offset };
}

function optionalEnum<T extends string>(
  raw: string | null,
  allowed: readonly T[],
): T | 'unsupported' | undefined {
  if (raw === null || raw.trim().length === 0) return undefined;
  const upper = raw.trim().toUpperCase();
  if ((allowed as readonly string[]).includes(upper)) return upper as T;
  // The console's status picker still offers states develop had and main's
  // enum does not (SOLD, RESERVED). No row can be in such a state, so the
  // honest answer is an empty page, flagged — not a 400 that breaks the tab.
  return 'unsupported';
}

/* ------------------------------------------------------------------ handlers */

/** GET /api/fresh/admin/stats */
export async function adminStatsHandler(ctx: FreshContext): Promise<HandlerOutcome> {
  await requireAdminCapability(ctx, 'dashboards', 'read');
  const stats = await readConsoleStats(ctx.db);
  return { status: 200, body: stats, headers: { 'Cache-Control': 'private, no-store' } };
}

/** GET /api/fresh/admin/inventory?limit&offset&q&status&kind */
export async function adminInventoryHandler(ctx: FreshContext): Promise<HandlerOutcome> {
  await requireAdminCapability(ctx, 'inventory', 'list');
  const { limit, offset } = pagination(ctx.url, 50, 200);

  const state = optionalEnum<ProductState>(ctx.url.searchParams.get('status'), PRODUCT_STATES);
  const kind = optionalEnum<ProductKind>(ctx.url.searchParams.get('kind'), PRODUCT_KINDS);
  const search = ctx.url.searchParams.get('q') ?? undefined;

  if (state === 'unsupported' || kind === 'unsupported') {
    return {
      status: 200,
      body: {
        items: [],
        meta: {
          total: 0,
          limit,
          offset,
          unsupported_filter: true,
          reason: 'The requested state/kind is not a value of the locked enum, so no row can match.',
        },
      },
      headers: { 'Cache-Control': 'private, no-store' },
    };
  }

  const page = await listConsoleInventory(ctx.db, {
    ...(search === undefined || search.trim().length === 0 ? {} : { search }),
    ...(state === undefined ? {} : { state }),
    ...(kind === undefined ? {} : { kind }),
    limit,
    offset,
  });

  return {
    status: 200,
    body: {
      items: page.items,
      meta: { total: page.total, limit: page.limit, offset: page.offset },
    },
    headers: { 'Cache-Control': 'private, no-store' },
  };
}

/** GET /api/fresh/admin/orders?limit&offset */
export async function adminOrdersHandler(ctx: FreshContext): Promise<HandlerOutcome> {
  await requireAdminCapability(ctx, 'orders', 'list');
  const { limit, offset } = pagination(ctx.url, 50, 500);
  const page = await listConsoleOrders(ctx.db, { limit, offset });
  // A bare array: AdminConsoleApp assigns the body straight to `orders` and
  // calls array methods on it (AdminConsoleApp.tsx:338).
  return { status: 200, body: page.items, headers: { 'Cache-Control': 'private, no-store' } };
}

/**
 * GET /api/fresh/admin/vendors
 *
 * The locked RBAC matrix (doc 23 §3) has no `vendors` module, so this reads
 * through `products/list`: the payload is vendor-owned catalogue aggregates,
 * and inventing a module would be a domain change. Recorded as a gap.
 */
export async function adminVendorsHandler(ctx: FreshContext): Promise<HandlerOutcome> {
  await requireAdminCapability(ctx, 'products', 'list');
  const vendors = await listConsoleVendors(ctx.db);
  return { status: 200, body: vendors, headers: { 'Cache-Control': 'private, no-store' } };
}

/** GET /api/fresh/admin/audit?limit */
export async function adminAuditHandler(ctx: FreshContext): Promise<HandlerOutcome> {
  await requireAdminCapability(ctx, 'dashboards', 'read');
  const { limit } = pagination(ctx.url, 100, 500);
  const rows = await listConsoleAudit(ctx.db, limit);
  return { status: 200, body: rows, headers: { 'Cache-Control': 'private, no-store' } };
}

/**
 * GET /api/fresh/admin/discounts
 *
 * `discounts` is a commerce artifact, so it gates on `orders/list`; there is no
 * `discounts` module in the locked matrix. Read-only: creating or editing a
 * discount is a write and stays with main's own endpoints.
 */
export async function adminDiscountsHandler(ctx: FreshContext): Promise<HandlerOutcome> {
  await requireAdminCapability(ctx, 'orders', 'list');
  const rows = await listConsoleDiscounts(ctx.db);
  return { status: 200, body: rows, headers: { 'Cache-Control': 'private, no-store' } };
}

/** GET /api/fresh/admin/leads — unsupported concept, honest empty collection. */
export async function adminLeadsHandler(ctx: FreshContext): Promise<HandlerOutcome> {
  await requireAdminCapability(ctx, 'dashboards', 'read');
  return unsupported('leads');
}

/** GET /api/fresh/admin/submissions — unsupported concept. */
export async function adminSubmissionsHandler(ctx: FreshContext): Promise<HandlerOutcome> {
  await requireAdminCapability(ctx, 'products', 'list');
  return unsupported('vendor_submissions');
}

/** GET /api/fresh/vendor/auth/me */
export async function vendorMeHandler(ctx: FreshContext): Promise<HandlerOutcome> {
  const actor = await requireVendor({ db: ctx.db, request: ctx.request });
  return {
    status: 200,
    body: {
      code: actor.vendor.slug,
      name: actor.vendor.display_name,
      state: actor.vendor.state,
      country: actor.vendor.country,
      email: actor.vendor.email,
      commission_bps: actor.vendor.commission_bps,
      payout_currency: actor.vendor.payout_currency,
    },
    headers: { 'Cache-Control': 'private, no-store' },
  };
}

/** GET /api/fresh/vendors/{code}/inventory */
export async function vendorInventoryHandler(ctx: FreshContext): Promise<HandlerOutcome> {
  const vendor = await requireVendorForCode(ctx);
  const page = await readVendorInventory(ctx.db, vendor.vendorId);
  return {
    status: 200,
    body: { items: page.items, stats: page.stats },
    headers: { 'Cache-Control': 'private, no-store' },
  };
}

/** GET /api/fresh/vendors/{code}/analytics */
export async function vendorAnalyticsHandler(ctx: FreshContext): Promise<HandlerOutcome> {
  const vendor = await requireVendorForCode(ctx);
  const analytics = await readVendorAnalytics(ctx.db, vendor.vendorId);
  return { status: 200, body: analytics, headers: { 'Cache-Control': 'private, no-store' } };
}

/** GET /api/fresh/vendors/{code}/submissions — unsupported concept. */
export async function vendorSubmissionsHandler(ctx: FreshContext): Promise<HandlerOutcome> {
  await requireVendorForCode(ctx);
  return unsupported('vendor_submissions');
}

/**
 * GET /api/fresh/catalogue/varieties
 *
 * Public in develop (the vendor intake form's variety picker loads it without a
 * session). ACTIVE, non-deleted varieties only. Not part of the catalog cache
 * policy: this layer says `no-store` so it can never mask a stale taxonomy.
 */
export async function catalogueVarietiesHandler(ctx: FreshContext): Promise<HandlerOutcome> {
  const items = await listActiveVarieties(ctx.db);
  return {
    status: 200,
    body: { count: items.length, items },
    headers: { 'Cache-Control': 'private, no-store' },
  };
}
