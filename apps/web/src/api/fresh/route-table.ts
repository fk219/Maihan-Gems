/**
 * apps/web/src/api/fresh/route-table.ts
 *
 * The develop-UI compatibility route table (`/api/fresh/**`).
 *
 * develop's console, vendor portal, storefront, checkout and account call
 * `/api/fresh/*`, which on `develop` was a transparent proxy to its own service
 * at `/api/v1/*`. This table is the other half of that seam on `main`: the same
 * paths, answered from the locked schema.
 *
 * Scope (docs/FRESH_COMPAT_LAYER.md):
 *   - the operator reads the develop consoles call;
 *   - the shopper commerce surface (carts, checkout, orders, leads, newsletter,
 *     catalogue typeahead, concierge);
 *   - the customer account surface (`/auth/**`);
 *   - the public variety list;
 *   - honest empty collections for concepts `main` does not model.
 *
 * A develop path that is not listed here answers 404 NOT_FOUND — the same
 * answer develop's proxy gave for an unknown upstream route. It is never a 500
 * and never an invented success.
 */

export type FreshHandlerId =
  // console / vendor
  | 'adminStats'
  | 'adminInventory'
  | 'adminOrders'
  | 'adminVendors'
  | 'adminAudit'
  | 'adminDiscounts'
  | 'adminLeads'
  | 'adminSubmissions'
  | 'vendorMe'
  | 'vendorInventory'
  | 'vendorAnalytics'
  | 'vendorSubmissions'
  | 'catalogueVarieties'
  // shopper commerce
  | 'cartCurrent'
  | 'cartCreate'
  | 'cartView'
  | 'cartAddItem'
  | 'cartUpdateItem'
  | 'cartRemoveItem'
  | 'cartQuote'
  | 'cartCheckout'
  | 'checkoutStart'
  | 'checkoutSession'
  | 'checkoutAdvance'
  | 'orderList'
  | 'orderDetail'
  | 'orderPay'
  | 'leadCreate'
  | 'viewingRequestCreate'
  | 'leadUnsubscribe'
  | 'newsletterSubscribe'
  | 'catalogueGemstones'
  | 'catalogueSettings'
  | 'concierge'
  // customer account
  | 'authMe'
  | 'authUpdateMe'
  | 'authOrders'
  | 'authFavourites'
  | 'authReplaceFavourites'
  | 'authAddresses'
  | 'authCreateAddress'
  | 'authUpdateAddress'
  | 'authDeleteAddress'
  | 'authDefaultAddress'
  | 'authVerifyEmail'
  | 'authResendVerification'
  | 'authChangePassword'
  | 'authResetPassword'
  // develop's `/api/fresh-auth/*` sign-in family
  | 'freshAuthLogin'
  | 'freshAuthRegister'
  | 'freshAuthRequestReset'
  | 'freshAuthLogout';

export type FreshHttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

/**
 * Who the path implies:
 *   - `admin`     the ADR-027 admin session gate;
 *   - `vendor`    the ADR-026 vendor membership gate;
 *   - `customer`  a live shopper session (401 when absent);
 *   - `public`    no session required;
 *   - `cart`      a cart token is the credential; a cart bound to a customer
 *                 is only readable by that customer (enforced in the handler).
 */
export type FreshRouteAuth = 'admin' | 'vendor' | 'public' | 'customer' | 'cart';

export interface FreshRouteDefinition {
  readonly id: FreshHandlerId;
  readonly method: FreshHttpMethod;
  /** Path template, `/api/fresh` base included. `{name}` captures a segment. */
  readonly path: string;
  readonly auth: FreshRouteAuth;
}

export const FRESH_ROUTES: readonly FreshRouteDefinition[] = [
  // ── admin console (AdminConsoleApp.tsx loadAll / searchInventory) ─────────
  { id: 'adminStats', method: 'GET', path: '/api/fresh/admin/stats', auth: 'admin' },
  { id: 'adminInventory', method: 'GET', path: '/api/fresh/admin/inventory', auth: 'admin' },
  { id: 'adminOrders', method: 'GET', path: '/api/fresh/admin/orders', auth: 'admin' },
  { id: 'adminVendors', method: 'GET', path: '/api/fresh/admin/vendors', auth: 'admin' },
  { id: 'adminAudit', method: 'GET', path: '/api/fresh/admin/audit', auth: 'admin' },
  { id: 'adminDiscounts', method: 'GET', path: '/api/fresh/admin/discounts', auth: 'admin' },
  // Unsupported concepts: honest empty collections, never fabricated rows.
  { id: 'adminLeads', method: 'GET', path: '/api/fresh/admin/leads', auth: 'admin' },
  { id: 'adminSubmissions', method: 'GET', path: '/api/fresh/admin/submissions', auth: 'admin' },

  // ── vendor portal (VendorPortalApp.tsx loadAll) ──────────────────────────
  { id: 'vendorMe', method: 'GET', path: '/api/fresh/vendor/auth/me', auth: 'vendor' },
  { id: 'vendorInventory', method: 'GET', path: '/api/fresh/vendors/{code}/inventory', auth: 'vendor' },
  { id: 'vendorAnalytics', method: 'GET', path: '/api/fresh/vendors/{code}/analytics', auth: 'vendor' },
  { id: 'vendorSubmissions', method: 'GET', path: '/api/fresh/vendors/{code}/submissions', auth: 'vendor' },

  // ── storefront helper (VendorPortalApp variety select) ───────────────────
  { id: 'catalogueVarieties', method: 'GET', path: '/api/fresh/catalogue/varieties', auth: 'public' },

  // ── carts (CheckoutFlow, DyoAcquireButton) ───────────────────────────────
  { id: 'cartCurrent', method: 'GET', path: '/api/fresh/carts', auth: 'customer' },
  { id: 'cartCreate', method: 'POST', path: '/api/fresh/carts', auth: 'public' },
  { id: 'cartView', method: 'GET', path: '/api/fresh/carts/{token}', auth: 'cart' },
  { id: 'cartAddItem', method: 'POST', path: '/api/fresh/carts/{token}/items', auth: 'cart' },
  { id: 'cartUpdateItem', method: 'PATCH', path: '/api/fresh/carts/{token}/items/{itemId}', auth: 'cart' },
  { id: 'cartRemoveItem', method: 'DELETE', path: '/api/fresh/carts/{token}/items/{itemId}', auth: 'cart' },
  { id: 'cartQuote', method: 'GET', path: '/api/fresh/carts/{token}/quote', auth: 'cart' },
  { id: 'cartCheckout', method: 'POST', path: '/api/fresh/carts/{token}/checkout', auth: 'cart' },

  // ── checkout sessions (stock reservation lives here) ─────────────────────
  { id: 'checkoutStart', method: 'POST', path: '/api/fresh/checkout', auth: 'cart' },
  { id: 'checkoutSession', method: 'GET', path: '/api/fresh/checkout/{sessionId}', auth: 'cart' },
  { id: 'checkoutAdvance', method: 'POST', path: '/api/fresh/checkout/{sessionId}/advance', auth: 'cart' },

  // ── orders (customer boundary) ───────────────────────────────────────────
  { id: 'orderList', method: 'GET', path: '/api/fresh/orders', auth: 'customer' },
  { id: 'orderDetail', method: 'GET', path: '/api/fresh/orders/{orderNumber}', auth: 'customer' },
  { id: 'orderPay', method: 'POST', path: '/api/fresh/orders/{orderNumber}/pay', auth: 'customer' },

  // ── leads / newsletter ───────────────────────────────────────────────────
  { id: 'leadCreate', method: 'POST', path: '/api/fresh/leads', auth: 'public' },
  { id: 'viewingRequestCreate', method: 'POST', path: '/api/fresh/viewing-requests', auth: 'public' },
  { id: 'leadUnsubscribe', method: 'POST', path: '/api/fresh/leads/unsubscribe', auth: 'public' },
  { id: 'newsletterSubscribe', method: 'POST', path: '/api/fresh/newsletter', auth: 'public' },

  // ── catalogue typeahead / search ─────────────────────────────────────────
  { id: 'catalogueGemstones', method: 'GET', path: '/api/fresh/catalogue/gemstones', auth: 'public' },
  { id: 'catalogueSettings', method: 'GET', path: '/api/fresh/catalogue/settings', auth: 'public' },

  // ── concierge (tool-gated AI orchestrator; no database writes) ───────────
  { id: 'concierge', method: 'POST', path: '/api/fresh/concierge', auth: 'public' },

  // ── customer account (CustomerAccountApp) ────────────────────────────────
  { id: 'authMe', method: 'GET', path: '/api/fresh/auth/me', auth: 'customer' },
  { id: 'authUpdateMe', method: 'PATCH', path: '/api/fresh/auth/me', auth: 'customer' },
  { id: 'authOrders', method: 'GET', path: '/api/fresh/auth/orders', auth: 'customer' },
  { id: 'authFavourites', method: 'GET', path: '/api/fresh/auth/favourites', auth: 'customer' },
  { id: 'authReplaceFavourites', method: 'PUT', path: '/api/fresh/auth/favourites', auth: 'customer' },
  { id: 'authAddresses', method: 'GET', path: '/api/fresh/auth/addresses', auth: 'customer' },
  { id: 'authCreateAddress', method: 'POST', path: '/api/fresh/auth/addresses', auth: 'customer' },
  { id: 'authUpdateAddress', method: 'PATCH', path: '/api/fresh/auth/addresses/{addressId}', auth: 'customer' },
  { id: 'authDeleteAddress', method: 'DELETE', path: '/api/fresh/auth/addresses/{addressId}', auth: 'customer' },
  {
    id: 'authDefaultAddress',
    method: 'POST',
    path: '/api/fresh/auth/addresses/{addressId}/default',
    auth: 'customer',
  },
  { id: 'authVerifyEmail', method: 'POST', path: '/api/fresh/auth/verify-email', auth: 'public' },
  {
    id: 'authResendVerification',
    method: 'POST',
    path: '/api/fresh/auth/resend-verification',
    auth: 'customer',
  },
  { id: 'authChangePassword', method: 'POST', path: '/api/fresh/auth/change-password', auth: 'customer' },
  { id: 'authResetPassword', method: 'POST', path: '/api/fresh/auth/reset', auth: 'public' },
];

/**
 * develop's own sign-in family lives on a DIFFERENT path (`/api/fresh-auth/*`,
 * not `/api/fresh/*`), so it has its own table and its own Next mount.
 */
export const FRESH_AUTH_ROUTES: readonly FreshRouteDefinition[] = [
  { id: 'freshAuthLogin', method: 'POST', path: '/api/fresh-auth/login', auth: 'public' },
  { id: 'freshAuthRegister', method: 'POST', path: '/api/fresh-auth/register', auth: 'public' },
  { id: 'freshAuthRequestReset', method: 'POST', path: '/api/fresh-auth/request-reset', auth: 'public' },
  { id: 'freshAuthLogout', method: 'POST', path: '/api/fresh-auth/logout', auth: 'public' },
];

export type FreshRouteLookup =
  | { kind: 'match'; route: FreshRouteDefinition; params: Record<string, string> }
  | { kind: 'method-not-allowed'; allowed: string }
  | { kind: 'not-found' };

interface CompiledFreshRoute {
  readonly route: FreshRouteDefinition;
  readonly segments: string[];
}

function compile(routes: readonly FreshRouteDefinition[]): readonly CompiledFreshRoute[] {
  return routes.map((route) => ({
    route,
    segments: route.path.split('/').filter((segment) => segment.length > 0),
  }));
}

const COMPILED: readonly CompiledFreshRoute[] = compile(FRESH_ROUTES);
const COMPILED_AUTH: readonly CompiledFreshRoute[] = compile(FRESH_AUTH_ROUTES);

function lookupIn(
  routes: readonly CompiledFreshRoute[],
  method: string,
  pathname: string,
): FreshRouteLookup {
  const parts = pathname.split('/').filter((segment) => segment.length > 0);
  const allowed = new Set<string>();
  let match: { route: FreshRouteDefinition; params: Record<string, string> } | null = null;

  for (const compiled of routes) {
    if (parts.length !== compiled.segments.length) continue;
    const params: Record<string, string> = {};
    let ok = true;
    for (let index = 0; index < compiled.segments.length; index += 1) {
      const pattern = compiled.segments[index] as string;
      const actual = parts[index] as string;
      if (pattern.startsWith('{') && pattern.endsWith('}')) {
        params[pattern.slice(1, -1)] = decodeURIComponent(actual);
        continue;
      }
      if (pattern !== actual) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    allowed.add(compiled.route.method);
    if (compiled.route.method === method.toUpperCase() && match === null) {
      match = { route: compiled.route, params };
    }
  }

  if (match !== null) return { kind: 'match', route: match.route, params: match.params };
  if (allowed.size > 0) return { kind: 'method-not-allowed', allowed: [...allowed].sort().join(', ') };
  return { kind: 'not-found' };
}

/** Match a method + pathname against the `/api/fresh/**` table. */
export function lookupFreshRoute(method: string, pathname: string): FreshRouteLookup {
  return lookupIn(COMPILED, method, pathname);
}

/** Match a method + pathname against the `/api/fresh-auth/**` table. */
export function lookupFreshAuthRoute(method: string, pathname: string): FreshRouteLookup {
  return lookupIn(COMPILED_AUTH, method, pathname);
}
