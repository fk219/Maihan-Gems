/**
 * apps/web/src/api/routes.ts
 *
 * Task 8 — the Phase 3 catalogue route table.
 *
 * Scope authority: plan Phase 3 outputs (`/api/v1/products`, `/products/{slug}`,
 * `/gemstones/{gemRef}`, `/settings`, `/settings/{sku}`, `/taxonomy/*`) and
 * SoT 11.2 / technical_design/06 "Catalog reads". The endpoint catalog
 * (paths, ids, request/response schemas) lives in `@maihan/contracts`
 * (`CATALOG_ENDPOINTS`) so OpenAPI and the router read ONE definition; this
 * module only adds the HTTP-runtime concern — which cache surface each
 * endpoint reads through. The parity spec proves every catalog entry has a
 * handler and vice versa, so a documented endpoint cannot lack an
 * implementation (and an undocumented one cannot exist).
 *
 * Every route is GET and PUBLIC (doc 06 route table): the visibility that
 * drives cache policy is read from the surface policy, never assumed.
 */
import { CATALOG_ENDPOINTS } from '@maihan/contracts';
import type { CatalogSurfaceName } from '../modules/catalog/index.js';

export type RouteHandlerId = string;

export interface RouteDefinition {
  readonly id: RouteHandlerId;
  readonly method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  /** OpenAPI path template, `/api/v1` base included. */
  readonly path: string;
  /** Cache surface (Task 6 policy: scope, TTL, visibility). */
  readonly surface?: CatalogSurfaceName;
}

/** Endpoint id -> cache surface. Checked by the parity spec (no holes). */
const SURFACE_BY_ENDPOINT: Record<string, CatalogSurfaceName> = {
  listProducts: 'productsList',
  productDetail: 'productDetail',
  gemstoneDetail: 'gemstoneDetail',
  listSettings: 'settingsList',
  settingVariant: 'settingVariant',
  settingDesign: 'settingDesign',
  taxonomyVarieties: 'taxonomy',
  taxonomyColours: 'taxonomy',
  taxonomyOrigins: 'taxonomy',
  taxonomyMetals: 'taxonomy',
  taxonomyFacets: 'taxonomy',
};

export const CATALOG_ROUTES: readonly RouteDefinition[] = CATALOG_ENDPOINTS.map((endpoint) => ({
  id: endpoint.id,
  method: 'GET',
  path: endpoint.path,
  surface: SURFACE_BY_ENDPOINT[endpoint.id] as CatalogSurfaceName,
}));

export const SEARCH_ROUTES: readonly RouteDefinition[] = [
  { id: 'search', method: 'POST', path: '/api/v1/search', surface: 'search' },
  { id: 'search', method: 'POST', path: '/search', surface: 'search' },
  { id: 'searchSuggest', method: 'GET', path: '/api/v1/search/suggest', surface: 'searchSuggest' },
  { id: 'searchSuggest', method: 'GET', path: '/search/suggest', surface: 'searchSuggest' },
  { id: 'similarGemstones', method: 'GET', path: '/api/v1/search/similar-gemstones/{gemRef}', surface: 'similarGemstones' },
  { id: 'similarGemstones', method: 'GET', path: '/search/similar-gemstones/{gemRef}', surface: 'similarGemstones' },
];

export const COMMERCE_ROUTES: readonly RouteDefinition[] = [
  { id: 'createCart', method: 'POST', path: '/api/v1/carts' },
  { id: 'createCart', method: 'POST', path: '/carts' },
  { id: 'getCart', method: 'GET', path: '/api/v1/carts/{cartToken}' },
  { id: 'getCart', method: 'GET', path: '/carts/{cartToken}' },
  { id: 'addCartItem', method: 'POST', path: '/api/v1/carts/{cartToken}/items' },
  { id: 'addCartItem', method: 'POST', path: '/carts/{cartToken}/items' },
  { id: 'updateCartItem', method: 'PATCH', path: '/api/v1/carts/{cartToken}/items/{itemId}' },
  { id: 'updateCartItem', method: 'PATCH', path: '/carts/{cartToken}/items/{itemId}' },
  { id: 'removeCartItem', method: 'DELETE', path: '/api/v1/carts/{cartToken}/items/{itemId}' },
  { id: 'removeCartItem', method: 'DELETE', path: '/carts/{cartToken}/items/{itemId}' },
  { id: 'mergeCart', method: 'POST', path: '/api/v1/carts/{cartToken}/merge' },
  { id: 'mergeCart', method: 'POST', path: '/carts/{cartToken}/merge' },
  { id: 'createCheckoutSession', method: 'POST', path: '/api/v1/checkout/sessions' },
  { id: 'createCheckoutSession', method: 'POST', path: '/checkout/sessions' },
  { id: 'getCheckoutSession', method: 'GET', path: '/api/v1/checkout/sessions/{sessionId}' },
  { id: 'getCheckoutSession', method: 'GET', path: '/checkout/sessions/{sessionId}' },
  { id: 'submitShipping', method: 'POST', path: '/api/v1/checkout/sessions/{sessionId}/shipping' },
  { id: 'submitShipping', method: 'POST', path: '/checkout/sessions/{sessionId}/shipping' },
  { id: 'submitPayment', method: 'POST', path: '/api/v1/checkout/sessions/{sessionId}/payment' },
  { id: 'submitPayment', method: 'POST', path: '/checkout/sessions/{sessionId}/payment' },
  { id: 'submitConfirm', method: 'POST', path: '/api/v1/checkout/sessions/{sessionId}/confirm' },
  { id: 'submitConfirm', method: 'POST', path: '/checkout/sessions/{sessionId}/confirm' },
  { id: 'placeOrder', method: 'POST', path: '/api/v1/orders' },
  { id: 'placeOrder', method: 'POST', path: '/orders' },
  { id: 'getOrder', method: 'GET', path: '/api/v1/orders/{orderId}' },
  { id: 'getOrder', method: 'GET', path: '/orders/{orderId}' },
  { id: 'handlePaymentWebhook', method: 'POST', path: '/api/v1/webhooks/payments/{provider}' },
  { id: 'handlePaymentWebhook', method: 'POST', path: '/webhooks/payments/{provider}' },
  { id: 'sweepInventoryReservations', method: 'POST', path: '/api/v1/inventory/sweep-expired' },
  { id: 'sweepInventoryReservations', method: 'POST', path: '/inventory/sweep-expired' },
  { id: 'getOrderTimeline', method: 'GET', path: '/api/v1/orders/{orderId}/events' },
  { id: 'getOrderTimeline', method: 'GET', path: '/orders/{orderId}/events' },
  { id: 'getOrderTimeline', method: 'GET', path: '/api/v1/orders/{orderId}/timeline' },
  { id: 'getOrderTimeline', method: 'GET', path: '/orders/{orderId}/timeline' },
  { id: 'cancelOrder', method: 'POST', path: '/api/v1/orders/{orderId}/cancel' },
  { id: 'cancelOrder', method: 'POST', path: '/orders/{orderId}/cancel' },
];

export const ACCOUNT_ROUTES: readonly RouteDefinition[] = [
  { id: 'getProfile', method: 'GET', path: '/api/v1/account/profile' },
  { id: 'getProfile', method: 'GET', path: '/account/profile' },
  { id: 'updateProfile', method: 'PATCH', path: '/api/v1/account/profile' },
  { id: 'updateProfile', method: 'PATCH', path: '/account/profile' },
  { id: 'getAddresses', method: 'GET', path: '/api/v1/account/addresses' },
  { id: 'getAddresses', method: 'GET', path: '/account/addresses' },
  { id: 'createAddress', method: 'POST', path: '/api/v1/account/addresses' },
  { id: 'createAddress', method: 'POST', path: '/account/addresses' },
  { id: 'updateAddress', method: 'PATCH', path: '/api/v1/account/addresses/{addressId}' },
  { id: 'updateAddress', method: 'PATCH', path: '/account/addresses/{addressId}' },
  { id: 'deleteAddress', method: 'DELETE', path: '/api/v1/account/addresses/{addressId}' },
  { id: 'deleteAddress', method: 'DELETE', path: '/account/addresses/{addressId}' },
  { id: 'getOrders', method: 'GET', path: '/api/v1/account/orders' },
  { id: 'getOrders', method: 'GET', path: '/account/orders' },
  { id: 'getCustomerOrderDetail', method: 'GET', path: '/api/v1/account/orders/{orderId}' },
  { id: 'getCustomerOrderDetail', method: 'GET', path: '/account/orders/{orderId}' },
];

export const FAVORITES_ROUTES: readonly RouteDefinition[] = [
  { id: 'getFavorites', method: 'GET', path: '/api/v1/favorites' },
  { id: 'getFavorites', method: 'GET', path: '/favorites' },
  { id: 'addFavorite', method: 'POST', path: '/api/v1/favorites' },
  { id: 'addFavorite', method: 'POST', path: '/favorites' },
  { id: 'removeFavorite', method: 'DELETE', path: '/api/v1/favorites/{productId}' },
  { id: 'removeFavorite', method: 'DELETE', path: '/favorites/{productId}' },
  { id: 'getCompare', method: 'GET', path: '/api/v1/compare' },
  { id: 'getCompare', method: 'GET', path: '/compare' },
  { id: 'getCompare', method: 'GET', path: '/compare-list' },
];

export const ADDON_ROUTES: readonly RouteDefinition[] = [
  { id: 'listAddons', method: 'GET', path: '/api/v1/addons' },
  { id: 'listAddons', method: 'GET', path: '/addons' },
  { id: 'getAddon', method: 'GET', path: '/api/v1/addons/{addonId}' },
  { id: 'getAddon', method: 'GET', path: '/addons/{addonId}' },
  { id: 'attachAddon', method: 'POST', path: '/api/v1/orders/{orderId}/addons' },
  { id: 'attachAddon', method: 'POST', path: '/orders/{orderId}/addons' },
];

export const DISCOUNT_ROUTES: readonly RouteDefinition[] = [
  { id: 'validateDiscountEndpoint', method: 'POST', path: '/api/v1/discounts/validate' },
  { id: 'validateDiscountEndpoint', method: 'POST', path: '/discounts/validate' },
  { id: 'getDiscountEndpoint', method: 'GET', path: '/api/v1/discounts/{code}' },
  { id: 'getDiscountEndpoint', method: 'GET', path: '/discounts/{code}' },
];

export const REFUND_ROUTES: readonly RouteDefinition[] = [
  { id: 'requestRefundHandler', method: 'POST', path: '/api/v1/orders/{orderId}/refunds' },
  { id: 'requestRefundHandler', method: 'POST', path: '/orders/{orderId}/refunds' },
  { id: 'listOrderRefundsHandler', method: 'GET', path: '/api/v1/orders/{orderId}/refunds' },
  { id: 'listOrderRefundsHandler', method: 'GET', path: '/orders/{orderId}/refunds' },
  { id: 'approveRefundHandler', method: 'POST', path: '/api/v1/refunds/{refundId}/approve' },
  { id: 'approveRefundHandler', method: 'POST', path: '/refunds/{refundId}/approve' },
  { id: 'rejectRefundHandler', method: 'POST', path: '/api/v1/refunds/{refundId}/reject' },
  { id: 'rejectRefundHandler', method: 'POST', path: '/refunds/{refundId}/reject' },
  { id: 'executeRefundHandler', method: 'POST', path: '/api/v1/refunds/{refundId}/execute' },
  { id: 'executeRefundHandler', method: 'POST', path: '/refunds/{refundId}/execute' },
];

export const DYO_ROUTES: readonly RouteDefinition[] = [
  { id: 'createDyoConfigurationHandler', method: 'POST', path: '/api/v1/dyo/configurations' },
  { id: 'createDyoConfigurationHandler', method: 'POST', path: '/dyo/configurations' },
  { id: 'getDyoConfigurationHandler', method: 'GET', path: '/api/v1/dyo/configurations/{shortCode}' },
  { id: 'getDyoConfigurationHandler', method: 'GET', path: '/dyo/configurations/{shortCode}' },
  { id: 'validateDyoConfigurationHandler', method: 'POST', path: '/api/v1/dyo/configurations/{shortCode}/validate' },
  { id: 'validateDyoConfigurationHandler', method: 'POST', path: '/dyo/configurations/{shortCode}/validate' },
  { id: 'quoteDyoConfigurationHandler', method: 'POST', path: '/api/v1/dyo/configurations/{shortCode}/quote' },
  { id: 'quoteDyoConfigurationHandler', method: 'POST', path: '/dyo/configurations/{shortCode}/quote' },
  { id: 'getCompatibleSettingsHandler', method: 'GET', path: '/api/v1/dyo/configurations/{shortCode}/compatible-settings' },
  { id: 'getCompatibleSettingsHandler', method: 'GET', path: '/dyo/configurations/{shortCode}/compatible-settings' },
  { id: 'addDyoToCartHandler', method: 'POST', path: '/api/v1/dyo/configurations/{shortCode}/add-to-cart' },
  { id: 'addDyoToCartHandler', method: 'POST', path: '/dyo/configurations/{shortCode}/add-to-cart' },
];

export const CERTIFICATE_ROUTES: readonly RouteDefinition[] = [
  { id: 'createCertificateHandler', method: 'POST', path: '/api/v1/certificates' },
  { id: 'createCertificateHandler', method: 'POST', path: '/certificates' },
  { id: 'getCertificateHandler', method: 'GET', path: '/api/v1/certificates/{certificateId}' },
  { id: 'getCertificateHandler', method: 'GET', path: '/certificates/{certificateId}' },
  { id: 'processOcrRunHandler', method: 'POST', path: '/api/v1/certificates/{certificateId}/ocr' },
  { id: 'processOcrRunHandler', method: 'POST', path: '/certificates/{certificateId}/ocr' },
  { id: 'reviewCertificateHandler', method: 'POST', path: '/api/v1/certificates/{certificateId}/review' },
  { id: 'reviewCertificateHandler', method: 'POST', path: '/certificates/{certificateId}/review' },
  { id: 'getPublicGemstoneCertificatesHandler', method: 'GET', path: '/api/v1/gemstones/{gemRef}/certificates/public' },
  { id: 'getPublicGemstoneCertificatesHandler', method: 'GET', path: '/gemstones/{gemRef}/certificates/public' },
];

export const AI_ROUTES: readonly RouteDefinition[] = [
  { id: 'aiChatHandler', method: 'POST', path: '/api/v1/ai/chat' },
  { id: 'aiChatHandler', method: 'POST', path: '/ai/chat' },
  { id: 'aiHandoffHandler', method: 'POST', path: '/api/v1/ai/handoff' },
  { id: 'aiHandoffHandler', method: 'POST', path: '/ai/handoff' },
  { id: 'aiGetConversationHandler', method: 'GET', path: '/api/v1/ai/conversations/{conversationKey}' },
  { id: 'aiGetConversationHandler', method: 'GET', path: '/ai/conversations/{conversationKey}' },
];

export const WHATSAPP_ROUTES: readonly RouteDefinition[] = [
  { id: 'whatsappVerificationHandler', method: 'GET', path: '/api/v1/webhooks/whatsapp' },
  { id: 'whatsappVerificationHandler', method: 'GET', path: '/webhooks/whatsapp' },
  { id: 'whatsappWebhookHandler', method: 'POST', path: '/api/v1/webhooks/whatsapp' },
  { id: 'whatsappWebhookHandler', method: 'POST', path: '/webhooks/whatsapp' },
  { id: 'whatsappSendTemplateHandler', method: 'POST', path: '/api/v1/whatsapp/send-template' },
  { id: 'whatsappSendTemplateHandler', method: 'POST', path: '/whatsapp/send-template' },
];

export const WEBAR_ROUTES: readonly RouteDefinition[] = [
  { id: 'getWebarAssetHandler', method: 'GET', path: '/api/v1/webar/{assetId}' },
  { id: 'getWebarAssetHandler', method: 'GET', path: '/webar/{assetId}' },
  { id: 'createArHandoffHandler', method: 'POST', path: '/api/v1/ar/handoff' },
  { id: 'createArHandoffHandler', method: 'POST', path: '/ar/handoff' },
  { id: 'redeemArHandoffHandler', method: 'GET', path: '/api/v1/ar/handoff/{token}' },
  { id: 'redeemArHandoffHandler', method: 'GET', path: '/ar/handoff/{token}' },
];

export const HEALTH_ROUTES: readonly RouteDefinition[] = [
  { id: 'healthLiveHandler', method: 'GET', path: '/api/v1/health/live' },
  { id: 'healthLiveHandler', method: 'GET', path: '/health/live' },
  { id: 'healthReadyHandler', method: 'GET', path: '/api/v1/health/ready' },
  { id: 'healthReadyHandler', method: 'GET', path: '/health/ready' },
  { id: 'metricsHandler', method: 'GET', path: '/api/v1/health/metrics' },
  { id: 'metricsHandler', method: 'GET', path: '/metrics' },
];

export const AUTH_ROUTES: readonly RouteDefinition[] = [
  { id: 'registerHandler', method: 'POST', path: '/api/v1/auth/register' },
  { id: 'registerHandler', method: 'POST', path: '/auth/register' },
  { id: 'loginHandler', method: 'POST', path: '/api/v1/auth/login' },
  { id: 'loginHandler', method: 'POST', path: '/auth/login' },
  { id: 'logoutHandler', method: 'POST', path: '/api/v1/auth/logout' },
  { id: 'logoutHandler', method: 'POST', path: '/auth/logout' },
  { id: 'sessionHandler', method: 'GET', path: '/api/v1/auth/session' },
  { id: 'sessionHandler', method: 'GET', path: '/auth/session' },
  { id: 'verifyEmailHandler', method: 'POST', path: '/api/v1/auth/verify-email' },
  { id: 'verifyEmailHandler', method: 'POST', path: '/auth/verify-email' },
  { id: 'forgotPasswordHandler', method: 'POST', path: '/api/v1/auth/forgot-password' },
  { id: 'forgotPasswordHandler', method: 'POST', path: '/auth/forgot-password' },
  { id: 'resetPasswordHandler', method: 'POST', path: '/api/v1/auth/reset-password' },
  { id: 'resetPasswordHandler', method: 'POST', path: '/auth/reset-password' },
  { id: 'listNotificationsHandler', method: 'GET', path: '/api/v1/account/notifications' },
  { id: 'listNotificationsHandler', method: 'GET', path: '/account/notifications' },
];

export const VENDOR_ROUTES: readonly RouteDefinition[] = [
  { id: 'getVendorDashboardHandler', method: 'GET', path: '/api/v1/vendor/dashboard' },
  { id: 'getVendorDashboardHandler', method: 'GET', path: '/vendor/dashboard' },
  { id: 'getVendorProfileHandler', method: 'GET', path: '/api/v1/vendor/profile' },
  { id: 'getVendorProfileHandler', method: 'GET', path: '/vendor/profile' },
  { id: 'updateVendorProfileHandler', method: 'PATCH', path: '/api/v1/vendor/profile' },
  { id: 'updateVendorProfileHandler', method: 'PATCH', path: '/vendor/profile' },
  { id: 'listVendorProductsHandler', method: 'GET', path: '/api/v1/vendor/products' },
  { id: 'listVendorProductsHandler', method: 'GET', path: '/vendor/products' },
  { id: 'createVendorProductHandler', method: 'POST', path: '/api/v1/vendor/products' },
  { id: 'createVendorProductHandler', method: 'POST', path: '/vendor/products' },
  { id: 'updateVendorProductHandler', method: 'PATCH', path: '/api/v1/vendor/products/{productId}' },
  { id: 'updateVendorProductHandler', method: 'PATCH', path: '/vendor/products/{productId}' },
  { id: 'submitVendorProductHandler', method: 'POST', path: '/api/v1/vendor/products/{productId}/submit' },
  { id: 'submitVendorProductHandler', method: 'POST', path: '/vendor/products/{productId}/submit' },
  { id: 'listVendorOrdersHandler', method: 'GET', path: '/api/v1/vendor/orders' },
  { id: 'listVendorOrdersHandler', method: 'GET', path: '/vendor/orders' },
  { id: 'updateVendorFulfillmentHandler', method: 'POST', path: '/api/v1/vendor/orders/{orderId}/items/{itemId}/fulfill' },
  { id: 'updateVendorFulfillmentHandler', method: 'POST', path: '/vendor/orders/{orderId}/items/{itemId}/fulfill' },
];

export const ADMIN_ROUTES: readonly RouteDefinition[] = [
  { id: 'adminCreatePageHandler', method: 'POST', path: '/api/v1/admin/cms/pages' },
  { id: 'adminListPagesHandler', method: 'GET', path: '/api/v1/admin/cms/pages' },
  { id: 'adminGetPageHandler', method: 'GET', path: '/api/v1/admin/cms/pages/{pageId}' },
  { id: 'adminUpdateBlocksHandler', method: 'PATCH', path: '/api/v1/admin/cms/pages/{pageId}/blocks' },
  { id: 'adminSubmitForReviewHandler', method: 'POST', path: '/api/v1/admin/cms/revisions/{revisionId}/submit-review' },
  { id: 'adminDecideRevisionHandler', method: 'POST', path: '/api/v1/admin/cms/revisions/{revisionId}/decide' },
  { id: 'adminPublishPageHandler', method: 'POST', path: '/api/v1/admin/cms/pages/{pageId}/publish' },
  { id: 'adminArchivePageHandler', method: 'POST', path: '/api/v1/admin/cms/pages/{pageId}/archive' },
  { id: 'adminDashboardSummaryHandler', method: 'GET', path: '/api/v1/admin/dashboards/summary' },
  { id: 'adminProductsListHandler', method: 'GET', path: '/api/v1/admin/products' },
  { id: 'adminModerateProductHandler', method: 'POST', path: '/api/v1/admin/products/{productId}/moderate' },
  { id: 'adminVendorsListHandler', method: 'GET', path: '/api/v1/admin/vendors' },
  { id: 'adminModerateVendorHandler', method: 'POST', path: '/api/v1/admin/vendors/{vendorId}/moderate' },
  { id: 'adminOrdersListHandler', method: 'GET', path: '/api/v1/admin/orders' },
  { id: 'adminRefundsListHandler', method: 'GET', path: '/api/v1/admin/refunds' },
  { id: 'adminDiscountsListHandler', method: 'GET', path: '/api/v1/admin/discounts' },
  { id: 'adminCreateDiscountHandler', method: 'POST', path: '/api/v1/admin/discounts' },
  { id: 'adminCustomersListHandler', method: 'GET', path: '/api/v1/admin/customers' },
  { id: 'adminCustomersListHandler', method: 'GET', path: '/api/v1/admin/users' },
  { id: 'adminAssignRoleHandler', method: 'POST', path: '/api/v1/admin/users/{userId}/role' },
  { id: 'adminAuditLogsListHandler', method: 'GET', path: '/api/v1/admin/audit-logs' },
  { id: 'adminCmsPagesListHandler', method: 'GET', path: '/api/v1/admin/content/pages' },
  { id: 'adminCertificatesListHandler', method: 'GET', path: '/api/v1/admin/certificates' },
  { id: 'adminMigrationOverviewHandler', method: 'GET', path: '/api/v1/admin/migration' },
  { id: 'adminDecideDerivedRefHandler', method: 'POST', path: '/api/v1/admin/derived-refs/{id}/approve' },
  { id: 'adminOperationsOverviewHandler', method: 'GET', path: '/api/v1/admin/operations' },
];

export const ALL_ROUTES: readonly RouteDefinition[] = [
  ...CATALOG_ROUTES,
  ...SEARCH_ROUTES,
  ...COMMERCE_ROUTES,
  ...AUTH_ROUTES,
  ...ACCOUNT_ROUTES,
  ...FAVORITES_ROUTES,
  ...ADDON_ROUTES,
  ...DISCOUNT_ROUTES,
  ...REFUND_ROUTES,
  ...DYO_ROUTES,
  ...CERTIFICATE_ROUTES,
  ...AI_ROUTES,
  ...WHATSAPP_ROUTES,
  ...WEBAR_ROUTES,
  ...VENDOR_ROUTES,
  ...ADMIN_ROUTES,
  ...HEALTH_ROUTES,
];

export type RouteLookup =
  | { kind: 'match'; route: RouteDefinition; params: Record<string, string> }
  | { kind: 'method-not-allowed'; allowed: string }
  | { kind: 'not-found' };

interface CompiledRoute {
  route: RouteDefinition;
  segments: string[];
  paramNames: string[];
}

const COMPILED: CompiledRoute[] = ALL_ROUTES.map((route) => {
  const segments = route.path.split('/').filter((s) => s.length > 0);
  const paramNames = segments
    .filter((s) => s.startsWith('{') && s.endsWith('}'))
    .map((s) => s.slice(1, -1));
  return { route, segments, paramNames };
});

/**
 * Match a method + pathname against the table.
 * - path miss                -> not-found (404)
 * - path hit, method miss    -> method-not-allowed (405, `Allow` header populated)
 * - both hit                 -> match with captured path params
 */
export function lookupRoute(method: string, pathname: string): RouteLookup {
  const parts = pathname.split('/').filter((s) => s.length > 0);
  let pathMatched = false;
  const allowedMethods = new Set<string>();

  for (const compiled of COMPILED) {
    if (parts.length !== compiled.segments.length) continue;
    const params: Record<string, string> = {};
    let ok = true;
    for (let i = 0; i < compiled.segments.length; i += 1) {
      const pattern = compiled.segments[i] as string;
      const actual = parts[i] as string;
      if (pattern.startsWith('{') && pattern.endsWith('}')) {
        const name = compiled.paramNames.find((n) => `{${n}}` === pattern) as string;
        params[name] = decodeURIComponent(actual);
        continue;
      }
      if (pattern !== actual) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    pathMatched = true;
    allowedMethods.add(compiled.route.method);
    if (compiled.route.method !== method.toUpperCase()) continue;
    return { kind: 'match', route: compiled.route, params };
  }

  const allowedStr = Array.from(allowedMethods).sort().join(', ');
  return pathMatched ? { kind: 'method-not-allowed', allowed: allowedStr || 'GET' } : { kind: 'not-found' };
}
