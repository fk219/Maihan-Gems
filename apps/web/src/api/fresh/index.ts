/**
 * apps/web/src/api/fresh/index.ts
 *
 * The develop-UI compatibility surfaces as TWO framework-free handlers:
 *
 *     createFreshCompatApi(options)      -> /api/fresh/**
 *     createFreshAuthCompatApi(options)  -> /api/fresh-auth/**
 *
 * Same pipeline shape as the catalogue API (`src/api/index.ts`):
 *   1. correlation ids;
 *   2. route lookup (404 NOT_FOUND / 405 METHOD_NOT_ALLOWED with Allow);
 *   3. handler (gate -> one repository/application service -> serialize);
 *   4. the shared error envelope (so a refusal is 401/403 in the documented
 *      shape, and an unexpected failure is 500 INTERNAL with no leak).
 *
 * `/api/fresh-auth/**` is a separate Next mount because its first path segment
 * is `fresh-auth`, not `fresh`. It answers only develop's four sign-in paths;
 * every one of them delegates to main's existing auth handlers, so there is
 * one session model (ADR-027) and no second login implementation.
 *
 * Deliberately NOT wired here: the rate-limit gate and the catalogue cache
 * headers. See docs/FRESH_COMPAT_LAYER.md section 5.6/5.7.
 */
import { ContractError } from '@maihan/contracts';
import type { CatalogDatabase } from '@maihan/db';
import { errorResponse, newRequestId, newTraceId, successResponse, type CorrelationIds } from '../envelope.js';
import type { HandlerOutcome } from '../handlers.js';
import type { AdminDeps } from '../admin/session-authz.js';
import {
  lookupFreshAuthRoute,
  lookupFreshRoute,
  type FreshHandlerId,
  type FreshRouteLookup,
} from './route-table.js';
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
  type FreshDeps,
} from './handlers.js';
import {
  cartAddItemHandler,
  cartCheckoutHandler,
  cartCreateHandler,
  cartCurrentHandler,
  cartQuoteHandler,
  cartRemoveItemHandler,
  cartUpdateItemHandler,
  cartViewHandler,
  catalogueGemstonesHandler,
  catalogueSettingsHandler,
  checkoutAdvanceHandler,
  checkoutSessionHandler,
  checkoutStartHandler,
  conciergeHandler,
  leadCreateHandler,
  leadUnsubscribeHandler,
  newsletterSubscribeHandler,
  orderDetailHandler,
  orderListHandler,
  orderPayHandler,
  viewingRequestCreateHandler,
} from './shopper-handlers.js';
import {
  authAddressesHandler,
  authChangePasswordHandler,
  authCreateAddressHandler,
  authDefaultAddressHandler,
  authDeleteAddressHandler,
  authFavouritesHandler,
  authMeHandler,
  authOrdersHandler,
  authReplaceFavouritesHandler,
  authResendVerificationHandler,
  authResetHandler,
  authUpdateAddressHandler,
  authUpdateMeHandler,
  authVerifyEmailHandlerCompat,
  freshAuthLoginHandler,
  freshAuthLogoutHandler,
  freshAuthRegisterHandler,
  freshAuthRequestResetHandler,
} from './account-handlers.js';

export {
  FRESH_ROUTES,
  FRESH_AUTH_ROUTES,
  lookupFreshRoute,
  lookupFreshAuthRoute,
  type FreshHandlerId,
  type FreshRouteDefinition,
  type FreshHttpMethod,
  type FreshRouteAuth,
} from './route-table.js';
export { UNSUPPORTED_HEADER, type FreshContext, type FreshDeps } from './handlers.js';

const HANDLERS: Record<FreshHandlerId, (ctx: FreshContext) => Promise<HandlerOutcome>> = {
  // console / vendor
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
  // shopper commerce
  cartCurrent: cartCurrentHandler,
  cartCreate: cartCreateHandler,
  cartView: cartViewHandler,
  cartAddItem: cartAddItemHandler,
  cartUpdateItem: cartUpdateItemHandler,
  cartRemoveItem: cartRemoveItemHandler,
  cartQuote: cartQuoteHandler,
  cartCheckout: cartCheckoutHandler,
  checkoutStart: checkoutStartHandler,
  checkoutSession: checkoutSessionHandler,
  checkoutAdvance: checkoutAdvanceHandler,
  orderList: orderListHandler,
  orderDetail: orderDetailHandler,
  orderPay: orderPayHandler,
  leadCreate: leadCreateHandler,
  viewingRequestCreate: viewingRequestCreateHandler,
  leadUnsubscribe: leadUnsubscribeHandler,
  newsletterSubscribe: newsletterSubscribeHandler,
  catalogueGemstones: catalogueGemstonesHandler,
  catalogueSettings: catalogueSettingsHandler,
  concierge: conciergeHandler,
  // customer account
  authMe: authMeHandler,
  authUpdateMe: authUpdateMeHandler,
  authOrders: authOrdersHandler,
  authFavourites: authFavouritesHandler,
  authReplaceFavourites: authReplaceFavouritesHandler,
  authAddresses: authAddressesHandler,
  authCreateAddress: authCreateAddressHandler,
  authUpdateAddress: authUpdateAddressHandler,
  authDeleteAddress: authDeleteAddressHandler,
  authDefaultAddress: authDefaultAddressHandler,
  authVerifyEmail: authVerifyEmailHandlerCompat,
  authResendVerification: authResendVerificationHandler,
  authChangePassword: authChangePasswordHandler,
  authResetPassword: authResetHandler,
  // develop sign-in family
  freshAuthLogin: freshAuthLoginHandler,
  freshAuthRegister: freshAuthRegisterHandler,
  freshAuthRequestReset: freshAuthRequestResetHandler,
  freshAuthLogout: freshAuthLogoutHandler,
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
  /** Search seam; production passes `executeSearch` (the default). */
  readonly deps?: FreshDeps;
  /**
   * Runtime environment name. The development-only payment instrument refuses
   * when this is absent or unknown.
   */
  readonly environment?: string | undefined;
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

type Lookup = (method: string, pathname: string) => FreshRouteLookup;

function createApi(lookup: Lookup, options: FreshCompatApiOptions): FreshCompatApi {
  return async function handle(request: Request): Promise<Response> {
    const ids = resolveIds(options);

    let url: URL;
    try {
      url = new URL(request.url);
    } catch {
      return errorResponse(new ContractError('VALIDATION_FAILED', 'Malformed request URL.'), ids);
    }

    const matched = lookup(request.method, url.pathname);
    if (matched.kind === 'not-found') {
      return errorResponse(
        new ContractError('NOT_FOUND', 'No compatibility route matches this path.'),
        ids,
      );
    }
    if (matched.kind === 'method-not-allowed') {
      return errorResponse(
        new ContractError('METHOD_NOT_ALLOWED', 'That method is not supported on this path.'),
        ids,
        { Allow: matched.allowed },
      );
    }

    const handler = HANDLERS[matched.route.id];
    const ctx: FreshContext = {
      db: options.db,
      request,
      url,
      ids,
      params: matched.params,
      adminDeps: options.adminDeps ?? {},
      deps: options.deps ?? {},
      environment: options.environment,
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

/** The `/api/fresh/**` handler. */
export function createFreshCompatApi(options: FreshCompatApiOptions): FreshCompatApi {
  return createApi(lookupFreshRoute, options);
}

/** The `/api/fresh-auth/**` handler (develop's four sign-in paths). */
export function createFreshAuthCompatApi(options: FreshCompatApiOptions): FreshCompatApi {
  return createApi(lookupFreshAuthRoute, options);
}
