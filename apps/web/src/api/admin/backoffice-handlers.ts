/**
 * apps/web/src/api/admin/backoffice-handlers.ts
 *
 * Phase 12 Stage B & Full Ecommerce Admin API Handlers:
 * - Dashboard executive summary
 * - Product moderation (approve, reject, publish, unpublish, archive)
 * - Vendor onboarding & moderation (approve, suspend, reactivate, reject)
 * - Order & refund oversight
 * - Discounts & promotions management
 * - Customer & staff role management (ADMIN_SUPER only for role assignment)
 * - Audit log review
 */
import { z } from 'zod';
import { ADMIN_ROLES, hasCapability, type AdminRole } from '@maihan/domain';
import { ContractError, type AdminActor } from '@maihan/contracts';
import {
  assignAccountRole,
  createBackOfficeDiscount,
  decideDerivedReference,
  getBackOfficeMigrationOverview,
  getBackOfficeOperationsOverview,
  getCatalogueSummary,
  listAccountsForAdmin,
  listBackOfficeAuditLogs,
  listBackOfficeCertificates,
  listBackOfficeDiscounts,
  listBackOfficeOrders,
  listBackOfficeRefunds,
  listCatalogueProducts,
  listCmsPages,
  listVendorsForAdmin,
  moderateProductByAdmin,
  moderateVendor,
  type AccountRole,
  type CatalogDatabase,
} from '@maihan/db';
import { extractSessionToken, resolveRequestActor } from '../auth-handlers.js';
import type { HandlerOutcome, RouteContext } from '../handlers.js';
import { requireIdentifier } from '../query.js';
import { authorizeAdmin, authzFailureResponse, type CapabilityRequest } from './authz.js';

export interface BackOfficeHandlerDeps {
  allowRoleHeader?: boolean;
}

const ModerateProductSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT', 'PUBLISH', 'UNPUBLISH', 'ARCHIVE']),
  reason: z.string().max(500).optional(),
});

const ModerateVendorSchema = z.object({
  action: z.enum(['APPROVE', 'SUSPEND', 'REACTIVATE', 'REJECT']),
  reason: z.string().max(500).optional(),
});

const CreateDiscountSchema = z.object({
  code: z.string().min(3).max(40),
  name: z.string().min(2).max(120),
  type: z.enum(['PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING']),
  value: z.number().positive().optional(),
  min_subtotal: z.number().nonnegative().optional(),
  max_redemptions: z.number().int().positive().optional(),
});

const AssignRoleSchema = z.object({
  role: z.string().min(2).max(60),
  reason: z.string().max(500).optional(),
});

function getDb(ctx: RouteContext): CatalogDatabase {
  if (ctx.db) return ctx.db;
  const svc = ctx.service as unknown as { port?: { db?: CatalogDatabase } };
  if (svc.port?.db) return svc.port.db;
  throw new ContractError('INTERNAL', 'Back-office handlers require the db seam (ctx.db).');
}

async function parseBody(request?: Request): Promise<unknown> {
  if (!request) return {};
  try {
    const text = await request.text();
    if (text.trim().length === 0) return {};
    return JSON.parse(text);
  } catch {
    throw new ContractError('VALIDATION_FAILED', 'Malformed JSON in request body.');
  }
}

export async function gateAdmin(
  ctx: RouteContext,
  request: CapabilityRequest,
  deps: BackOfficeHandlerDeps = {},
): Promise<{ actor: AdminActor } | { failure: Response }> {
  // 1. Check authenticated session first if a session token is present
  const sessionToken = extractSessionToken(ctx.request);
  if (sessionToken) {
    const sessionActor = await resolveRequestActor(ctx);
    if (!sessionActor) {
      return { failure: authzFailureResponse(401, ctx.ids) };
    }
    if (!(ADMIN_ROLES as readonly string[]).includes(sessionActor.role)) {
      return { failure: authzFailureResponse(403, ctx.ids) };
    }
    // Verify CSRF token if supplied on state-changing requests
    const method = (ctx.request?.method ?? 'GET').toUpperCase();
    if (method !== 'GET' && method !== 'HEAD') {
      const csrfHeader = ctx.request?.headers.get('x-csrf-token')?.trim();
      if (csrfHeader !== undefined && csrfHeader !== '' && csrfHeader !== sessionActor.csrf_token) {
        return { failure: authzFailureResponse(403, ctx.ids) };
      }
    }
    const adminRole = sessionActor.role as AdminRole;
    if (!hasCapability(adminRole, request.module, request.action)) {
      return { failure: authzFailureResponse(403, ctx.ids) };
    }
    return {
      actor: {
        sub: sessionActor.email,
        displayName: [sessionActor.first_name, sessionActor.last_name].filter(Boolean).join(' ') || sessionActor.email,
        role: adminRole,
        sessionId: sessionActor.customer_id,
        steppedUpAt: null,
      },
    };
  }

  // In production, never fall back to unverified x-admin-* request headers
  if (process.env['MAIHAN_ENV'] === 'production') {
    return { failure: authzFailureResponse(401, ctx.ids) };
  }

  // 2. Fallback to header-based admin actor resolution (used by non-prod admin gateway / specs)
  const headers = ctx.request?.headers ?? new Headers();
  const allowRoleHeader = deps.allowRoleHeader ?? process.env['ALLOW_ROLE_HEADER'] === '1';
  const decision = authorizeAdmin(headers, { ...request, allowRoleHeader });
  if (decision.ok) return { actor: decision.actor };
  return { failure: authzFailureResponse(decision.status, ctx.ids) };
}

export async function adminDashboardSummaryHandler(
  ctx: RouteContext,
  deps: BackOfficeHandlerDeps = {},
): Promise<HandlerOutcome> {
  const g = await gateAdmin(ctx, { module: 'dashboards', action: 'read' }, deps);
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };
  const summary = await getCatalogueSummary(getDb(ctx));
  return { status: 200, body: { data: summary } };
}

export async function adminProductsListHandler(
  ctx: RouteContext,
  deps: BackOfficeHandlerDeps = {},
): Promise<HandlerOutcome> {
  const g = await gateAdmin(ctx, { module: 'products', action: 'list' }, deps);
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };
  const rows = await listCatalogueProducts(getDb(ctx), 100);
  return { status: 200, body: { data: rows, meta: { limit: 100, count: rows.length } } };
}

export async function adminModerateProductHandler(
  ctx: RouteContext,
  deps: BackOfficeHandlerDeps = {},
): Promise<HandlerOutcome> {
  const g = await gateAdmin(ctx, { module: 'products', action: 'write' }, deps);
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };
  const productId = requireIdentifier(ctx.params['productId'], 'productId');
  const body = await parseBody(ctx.request);
  const input = ModerateProductSchema.parse(body);
  const updated = await moderateProductByAdmin(getDb(ctx), {
    productId,
    action: input.action,
    reason: input.reason,
    actorSub: g.actor.sub,
    actorRole: g.actor.role,
  });
  return { status: 200, body: { data: updated } };
}

export async function adminVendorsListHandler(
  ctx: RouteContext,
  deps: BackOfficeHandlerDeps = {},
): Promise<HandlerOutcome> {
  const g = await gateAdmin(ctx, { module: 'products', action: 'list' }, deps);
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };
  const rows = await listVendorsForAdmin(getDb(ctx));
  return { status: 200, body: { data: rows, meta: { count: rows.length } } };
}

export async function adminModerateVendorHandler(
  ctx: RouteContext,
  deps: BackOfficeHandlerDeps = {},
): Promise<HandlerOutcome> {
  const g = await gateAdmin(ctx, { module: 'products', action: 'write' }, deps);
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };
  const vendorId = requireIdentifier(ctx.params['vendorId'], 'vendorId');
  const body = await parseBody(ctx.request);
  const input = ModerateVendorSchema.parse(body);
  const updated = await moderateVendor(getDb(ctx), {
    vendorId,
    action: input.action,
    reason: input.reason,
    actorSub: g.actor.sub,
    actorRole: g.actor.role,
  });
  return { status: 200, body: { data: updated } };
}

export async function adminOrdersListHandler(
  ctx: RouteContext,
  deps: BackOfficeHandlerDeps = {},
): Promise<HandlerOutcome> {
  const g = await gateAdmin(ctx, { module: 'orders', action: 'list' }, deps);
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };
  const rows = await listBackOfficeOrders(getDb(ctx), 100);
  return { status: 200, body: { data: rows, meta: { limit: 100, count: rows.length } } };
}

export async function adminRefundsListHandler(
  ctx: RouteContext,
  deps: BackOfficeHandlerDeps = {},
): Promise<HandlerOutcome> {
  const g = await gateAdmin(ctx, { module: 'refunds', action: 'list' }, deps);
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };
  const rows = await listBackOfficeRefunds(getDb(ctx), 100);
  return { status: 200, body: { data: rows, meta: { limit: 100, count: rows.length } } };
}

export async function adminDiscountsListHandler(
  ctx: RouteContext,
  deps: BackOfficeHandlerDeps = {},
): Promise<HandlerOutcome> {
  const g = await gateAdmin(ctx, { module: 'orders', action: 'list' }, deps);
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };
  const rows = await listBackOfficeDiscounts(getDb(ctx), 100);
  return { status: 200, body: { data: rows, meta: { limit: 100, count: rows.length } } };
}

export async function adminCreateDiscountHandler(
  ctx: RouteContext,
  deps: BackOfficeHandlerDeps = {},
): Promise<HandlerOutcome> {
  const g = await gateAdmin(ctx, { module: 'inventory', action: 'write' }, deps);
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };
  const body = await parseBody(ctx.request);
  const input = CreateDiscountSchema.parse(body);
  const created = await createBackOfficeDiscount(getDb(ctx), {
    ...input,
    actorSub: g.actor.sub,
  });
  return { status: 201, body: { data: created } };
}

export async function adminCustomersListHandler(
  ctx: RouteContext,
  deps: BackOfficeHandlerDeps = {},
): Promise<HandlerOutcome> {
  const g = await gateAdmin(ctx, { module: 'orders', action: 'list' }, deps);
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };
  const rows = await listAccountsForAdmin(getDb(ctx), 100);
  // technical_design/23 §3 & §8 rule 7: READ_ONLY_ANALYST responses never include PII
  const sanitized =
    g.actor.role === 'READ_ONLY_ANALYST'
      ? rows.map((r) => ({
          ...r,
          email: '[REDACTED]',
          first_name: null,
          last_name: null,
        }))
      : rows;
  return { status: 200, body: { data: sanitized, meta: { limit: 100, count: sanitized.length } } };
}

export async function adminAssignRoleHandler(
  ctx: RouteContext,
  deps: BackOfficeHandlerDeps = {},
): Promise<HandlerOutcome> {
  const g = await gateAdmin(ctx, { module: 'dashboards', action: 'write' }, deps);
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };
  const userId = requireIdentifier(ctx.params['userId'], 'userId');
  const body = await parseBody(ctx.request);
  const input = AssignRoleSchema.parse(body);
  const updated = await assignAccountRole(getDb(ctx), {
    targetCustomerId: userId,
    newRole: input.role as AccountRole,
    actorSub: g.actor.sub,
    actorRole: g.actor.role,
    reason: input.reason,
  });
  return { status: 200, body: { data: updated } };
}

export async function adminAuditLogsListHandler(
  ctx: RouteContext,
  deps: BackOfficeHandlerDeps = {},
): Promise<HandlerOutcome> {
  const g = await gateAdmin(ctx, { module: 'dashboards', action: 'read' }, deps);
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };
  const requested = Number(ctx.url.searchParams.get('limit') ?? '100');
  const limit = Number.isFinite(requested) ? Math.min(Math.max(Math.trunc(requested), 1), 500) : 100;
  const rows = await listBackOfficeAuditLogs(getDb(ctx), limit);
  return { status: 200, body: { data: rows, meta: { limit, count: rows.length } } };
}

export async function adminCmsPagesListHandler(
  ctx: RouteContext,
  deps: BackOfficeHandlerDeps = {},
): Promise<HandlerOutcome> {
  const g = await gateAdmin(ctx, { module: 'content', action: 'list' }, deps);
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };
  const rows = await listCmsPages(getDb(ctx), 100);
  return { status: 200, body: { data: rows, meta: { limit: 100, count: rows.length } } };
}

export async function adminCertificatesListHandler(
  ctx: RouteContext,
  deps: BackOfficeHandlerDeps = {},
): Promise<HandlerOutcome> {
  const g = await gateAdmin(ctx, { module: 'certificates', action: 'list' }, deps);
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };
  const rows = await listBackOfficeCertificates(getDb(ctx), 100);
  return { status: 200, body: { data: rows, meta: { limit: 100, count: rows.length } } };
}

export async function adminMigrationOverviewHandler(
  ctx: RouteContext,
  deps: BackOfficeHandlerDeps = {},
): Promise<HandlerOutcome> {
  const g = await gateAdmin(ctx, { module: 'import_batches', action: 'read' }, deps);
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };
  const overview = await getBackOfficeMigrationOverview(getDb(ctx));
  return { status: 200, body: { data: overview } };
}

const DecideDerivedRefSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT']).default('APPROVE'),
  reason: z.string().max(500).optional(),
});

export async function adminDecideDerivedRefHandler(
  ctx: RouteContext,
  deps: BackOfficeHandlerDeps = {},
): Promise<HandlerOutcome> {
  const g = await gateAdmin(ctx, { module: 'derived_approvals', action: 'approve' }, deps);
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };
  const productId = requireIdentifier(ctx.params['id'], 'id');
  const body = await parseBody(ctx.request);
  const input = DecideDerivedRefSchema.parse(body);
  const updated = await decideDerivedReference(getDb(ctx), {
    productId,
    decision: input.decision,
    actorSub: g.actor.sub,
    actorRole: g.actor.role,
    reason: input.reason,
  });
  return { status: 200, body: { data: updated } };
}

export async function adminOperationsOverviewHandler(
  ctx: RouteContext,
  deps: BackOfficeHandlerDeps = {},
): Promise<HandlerOutcome> {
  const g = await gateAdmin(ctx, { module: 'dashboards', action: 'read' }, deps);
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };
  const overview = await getBackOfficeOperationsOverview(getDb(ctx));
  return { status: 200, body: { data: overview } };
}
