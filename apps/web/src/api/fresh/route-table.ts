/**
 * apps/web/src/api/fresh/route-table.ts
 *
 * The develop-UI compatibility route table (`/api/fresh/**`).
 *
 * develop's console, vendor portal and storefront helpers call `/api/fresh/*`,
 * which on `develop` was a transparent proxy to its own service at
 * `/api/v1/*` (`apps/web/src/app/api/fresh/[...path]/route.ts` there). This
 * table is the other half of that seam on `main`: the same paths, answered from
 * the locked schema.
 *
 * Scope (docs/FRESH_COMPAT_LAYER.md):
 *   - the operator reads the develop consoles actually call;
 *   - the public variety list;
 *   - honest empty collections for concepts `main` does not model.
 *
 * A develop path that is not listed here answers 404 NOT_FOUND — the same
 * answer develop's proxy gave for an unknown upstream route. It is never a 500
 * and never an invented success.
 */

export type FreshHandlerId =
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
  | 'catalogueVarieties';

export interface FreshRouteDefinition {
  readonly id: FreshHandlerId;
  readonly method: 'GET';
  /** Path template, `/api/fresh` base included. `{name}` captures a segment. */
  readonly path: string;
  /**
   * Whether the route is answered without an actor. Only the taxonomy list is
   * public; everything else gates on a session before any read.
   */
  readonly auth: 'admin' | 'vendor' | 'public';
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
];

export type FreshRouteLookup =
  | { kind: 'match'; route: FreshRouteDefinition; params: Record<string, string> }
  | { kind: 'method-not-allowed'; allowed: string }
  | { kind: 'not-found' };

interface CompiledFreshRoute {
  readonly route: FreshRouteDefinition;
  readonly segments: string[];
}

const COMPILED: readonly CompiledFreshRoute[] = FRESH_ROUTES.map((route) => ({
  route,
  segments: route.path.split('/').filter((segment) => segment.length > 0),
}));

/**
 * Match a method + pathname against the table.
 *
 * The same rule as `src/api/routes.ts`: a path hit with the wrong method is 405
 * (with `Allow`), a path miss is 404. Every route here is GET, so the 405 branch
 * only exists to keep the contract predictable.
 */
export function lookupFreshRoute(method: string, pathname: string): FreshRouteLookup {
  const parts = pathname.split('/').filter((segment) => segment.length > 0);
  let pathMatched = false;

  for (const compiled of COMPILED) {
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
    pathMatched = true;
    if (compiled.route.method !== method.toUpperCase()) continue;
    return { kind: 'match', route: compiled.route, params };
  }

  return pathMatched
    ? { kind: 'method-not-allowed', allowed: 'GET' }
    : { kind: 'not-found' };
}
