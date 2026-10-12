/**
 * apps/web/src/api/admin/bulk.spec.ts
 *
 * Phase 12 — Stage D tests: route wiring for the three bulk endpoints and
 * authorization (CATALOG_MANAGER holds products:bulk; READ_ONLY_ANALYST and
 * CONTENT_EDITOR are denied).
 */
import { describe, expect, it } from 'vitest';
import { BULK_ADMIN_ROUTES, lookupRoute, ALL_ROUTES } from '../routes.js';
import { authorizeAdmin } from './authz.js';

const H = (init: Record<string, string>): Headers => new Headers(init);

describe('bulk admin route wiring (GT 6/13)', () => {
  it('defines preview/apply/revert and resolves via lookupRoute', () => {
    expect(BULK_ADMIN_ROUTES.map((r) => r.id)).toEqual(['bulkPreviewHandler', 'bulkApplyHandler', 'bulkRevertHandler']);
    for (const r of BULK_ADMIN_ROUTES) {
      const lookup = lookupRoute(r.method, r.path);
      if (lookup.kind !== 'match') throw new Error(`unresolvable: ${r.method} ${r.path}`);
      expect(lookup.route.id).toBe(r.id);
      expect(ALL_ROUTES.some((x) => x.id === r.id && x.path === r.path)).toBe(true);
    }
  });

  it('CATALOG_MANAGER holds products:bulk; CONTENT_EDITOR and READ_ONLY_ANALYST denied', () => {
    expect(authorizeAdmin(H({ 'x-admin-sub': 'c1', 'x-admin-role': 'CATALOG_MANAGER' }), { module: 'products', action: 'bulk', allowRoleHeader: true }).ok).toBe(true);
    expect(authorizeAdmin(H({ 'x-admin-sub': 'e1', 'x-admin-role': 'CONTENT_EDITOR' }), { module: 'products', action: 'bulk', allowRoleHeader: true })).toEqual({ ok: false, status: 403 });
    expect(authorizeAdmin(H({ 'x-admin-sub': 'r1', 'x-admin-role': 'READ_ONLY_ANALYST' }), { module: 'products', action: 'bulk', allowRoleHeader: true })).toEqual({ ok: false, status: 403 });
  });
});
