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

export const ALL_ROUTES: readonly RouteDefinition[] = [
  ...CATALOG_ROUTES,
  ...SEARCH_ROUTES,
  ...COMMERCE_ROUTES,
  ...ACCOUNT_ROUTES,
  ...FAVORITES_ROUTES,
  ...ADDON_ROUTES,
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
