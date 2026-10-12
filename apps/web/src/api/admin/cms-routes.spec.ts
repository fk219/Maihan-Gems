/**
 * Phase 12 — Stage B route wiring tests: every CMS admin route defined in
 * the route table resolves through lookupRoute to the exact handler id, so
 * the router and the handler registry (api/index.ts) agree. Authorization
 * behavior (401/403) is covered in authz.spec.ts; here we only prove the
 * ROUTE TABLE is complete and resolvable.
 */
import { describe, expect, it } from 'vitest';
import { CMS_ADMIN_ROUTES, lookupRoute, ALL_ROUTES } from '../routes.js';

describe('CMS admin route table (Phase 12 E12.1/E12.2 wiring)', () => {
  it('defines one route per entry with distinct route ids', () => {
    expect(CMS_ADMIN_ROUTES).toHaveLength(9);
    const ids = new Set(CMS_ADMIN_ROUTES.map((r) => r.id));
    expect(ids.size).toBe(9);
  });

  it('each CMS admin route resolves via lookupRoute with the same method', () => {
    for (const route of CMS_ADMIN_ROUTES) {
      const lookup = lookupRoute(route.method, route.path);
      if (lookup.kind !== 'match') throw new Error(`route not resolvable: ${route.method} ${route.path}`);
      expect(lookup.route.id).toBe(route.id);
    }
  });

  it('is included in the aggregate route table', () => {
    for (const route of CMS_ADMIN_ROUTES) {
      expect(ALL_ROUTES.some((r) => r.id === route.id && r.path === route.path)).toBe(true);
    }
  });
});
