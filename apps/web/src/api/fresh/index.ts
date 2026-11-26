/**
 * apps/web/src/api/fresh/index.ts
 *
 * The `/api/fresh/**` compatibility surface as ONE framework-free handler:
 *
 *     (request: Request) => Promise<Response>
 *
 * Same pipeline shape as the catalogue API (`src/api/index.ts`):
 *   1. correlation ids;
 *   2. route lookup (404 NOT_FOUND / 405 METHOD_NOT_ALLOWED);
 *   3. handler (gate -> one repository read -> serialize);
 *   4. the shared error envelope (so a refusal is 401/403 in the documented
 *      shape, and an unexpected failure is 500 INTERNAL with no leak).
 *
 * Deliberately NOT wired here: the rate-limit gate and the catalogue cache
 * headers. The surface is authenticated except the variety list, and it must
 * never be served from the storefront cache. Recorded in
 * docs/FRESH_COMPAT_LAYER.md §6.
 */
import { ContractError } from '@maihan/contracts';
import type { CatalogDatabase } from '@maihan/db';
import { errorResponse, newRequestId, newTraceId, successResponse, type CorrelationIds } from '../envelope.js';
import type { HandlerOutcome } from '../handlers.js';
import type { AdminDeps } from '../admin/session-authz.js';
import { lookupFreshRoute, type FreshHandlerId } from './route-table.js';
import {
  adminAuditHandler,
  adminDiscountsHandler,
  adminInventoryHandler,
  adminLeadsHandler,
  adminOrdersHandler,
  adminStatsHandler,
  adminSubmissionsHandler,
  adminVendorsHandler,
  catalogueVarietiesHandler,
  vendorAnalyticsHandler,
  vendorInventoryHandler,
  vendorMeHandler,
  vendorSubmissionsHandler,
  type FreshContext,
} from './handlers.js';

export { FRESH_ROUTES, lookupFreshRoute, type FreshHandlerId, type FreshRouteDefinition } from './route-table.js';
export { UNSUPPORTED_HEADER, type FreshContext } from './handlers.js';

const HANDLERS: Record<FreshHandlerId, (ctx: FreshContext) => Promise<HandlerOutcome>> = {
  adminStats: adminStatsHandler,
  adminInventory: adminInventoryHandler,
  adminOrders: adminOrdersHandler,
  adminVendors: adminVendorsHandler,
  adminAudit: adminAuditHandler,
  adminDiscounts: adminDiscountsHandler,
  adminLeads: adminLeadsHandler,
  adminSubmissions: adminSubmissionsHandler,
  vendorMe: vendorMeHandler,
  vendorInventory: vendorInventoryHandler,
  vendorAnalytics: vendorAnalyticsHandler,
  vendorSubmissions: vendorSubmissionsHandler,
  catalogueVarieties: catalogueVarietiesHandler,
};

export interface FreshCompatApiOptions {
  readonly db: CatalogDatabase;
  /**
   * Passed to the admin gate. Production wiring passes `{ environment }` only:
   * `allowRoleHeader` stays undefined, so the trusted-header seam is closed.
   */
  readonly adminDeps?: AdminDeps;
  /** Injected in tests for deterministic correlation ids. */
  readonly ids?: Partial<CorrelationIds> | (() => CorrelationIds);
}

export type FreshCompatApi = (request: Request) => Promise<Response>;

function resolveIds(options: FreshCompatApiOptions): CorrelationIds {
  const spec = options.ids;
  if (typeof spec === 'function') return spec();
  return {
    traceId: spec?.traceId ?? newTraceId(),
    requestId: spec?.requestId ?? newRequestId(),
  };
}

export function createFreshCompatApi(options: FreshCompatApiOptions): FreshCompatApi {
  return async function handle(request: Request): Promise<Response> {
    const ids = resolveIds(options);

    let url: URL;
    try {
      url = new URL(request.url);
    } catch {
      return errorResponse(new ContractError('VALIDATION_FAILED', 'Malformed request URL.'), ids);
    }

    const lookup = lookupFreshRoute(request.method, url.pathname);
    if (lookup.kind === 'not-found') {
      return errorResponse(
        new ContractError('NOT_FOUND', 'No compatibility route matches this path.'),
        ids,
      );
    }
    if (lookup.kind === 'method-not-allowed') {
      return errorResponse(
        new ContractError('METHOD_NOT_ALLOWED', 'Compatibility endpoints accept GET only.'),
        ids,
        { Allow: lookup.allowed },
      );
    }

    const handler = HANDLERS[lookup.route.id];
    const ctx: FreshContext = {
      db: options.db,
      request,
      url,
      ids,
      params: lookup.params,
      adminDeps: options.adminDeps ?? {},
    };

    let outcome: HandlerOutcome;
    try {
      outcome = await handler(ctx);
    } catch (error) {
      return errorResponse(error, ids);
    }

    return successResponse(outcome.body, outcome.status, ids, {
      'Cache-Control': 'private, no-store',
      ...(outcome.headers ?? {}),
    });
  };
}
