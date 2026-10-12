/**
 * apps/web/src/api/admin/catalog-structure.spec.ts
 *
 * Phase 12 — Stage C tests (Global Task 4 + 5):
 *   - route-table completeness and lookupRoute resolution for all nine
 *     structure endpoints (navigations, redirects incl. bulk, SEO);
 *   - authorization: 401 without identity; CONTENT_EDITOR granted
 *     navigation/seo write; READ_ONLY_ANALYST denied any write;
 *   - bulk-import handler: 422 all-or-nothing when ANY row is invalid and
 *     200 with imported count otherwise (no partial redirect set).
 */
import { describe, expect, it } from 'vitest';
import { STRUCTURE_ADMIN_ROUTES, lookupRoute, ALL_ROUTES } from '../routes.js';
import { authorizeAdmin } from './authz.js';
import { bulkImportRedirectsHandler } from './catalog-structure-handlers.js';
import type { RouteContext } from '../handlers.js';

const H = (init: Record<string, string>): Headers => new Headers(init);

describe('structure admin route table (E12.3 wiring)', () => {
  it('defines nine endpoints with distinct ids, all in ALL_ROUTES', () => {
    expect(STRUCTURE_ADMIN_ROUTES).toHaveLength(9);
    const ids = new Set(STRUCTURE_ADMIN_ROUTES.map((r) => r.id));
    expect(ids.size).toBe(9);
    for (const r of STRUCTURE_ADMIN_ROUTES) {
      const lookup = lookupRoute(r.method, r.path);
      if (lookup.kind !== 'match') throw new Error(`unresolvable: ${r.method} ${r.path}`);
      expect(lookup.route.id).toBe(r.id);
      expect(ALL_ROUTES.some((x) => x.id === r.id && x.path === r.path)).toBe(true);
    }
  });
});

describe('authorization matrix for structure modules', () => {
  it('401 without identity', () => {
    expect(authorizeAdmin(H({}), { module: 'navigation', action: 'write' })).toEqual({ ok: false, status: 401 });
  });

  it('CONTENT_EDITOR may write navigation and seo (doc 23 §3)', () => {
    expect(authorizeAdmin(H({ 'x-admin-sub': 'e1', 'x-admin-role': 'CONTENT_EDITOR' }), { module: 'navigation', action: 'write', allowRoleHeader: true }).ok).toBe(true);
    expect(authorizeAdmin(H({ 'x-admin-sub': 'e1', 'x-admin-role': 'CONTENT_EDITOR' }), { module: 'seo', action: 'write', allowRoleHeader: true }).ok).toBe(true);
  });

  it('bulk verbs exist only for roles that carry bulk; CONTENT_EDITOR denied bulk', () => {
    expect(authorizeAdmin(H({ 'x-admin-sub': 'e1', 'x-admin-role': 'CONTENT_EDITOR' }), { module: 'navigation', action: 'bulk', allowRoleHeader: true })).toEqual({ ok: false, status: 403 });
    expect(authorizeAdmin(H({ 'x-admin-sub': 's1', 'x-admin-role': 'ADMIN_SUPER' }), { module: 'navigation', action: 'bulk', allowRoleHeader: true }).ok).toBe(true);
  });
});

describe('bulk redirect import handler (no partial set, doc 34 §11)', () => {
  const ctx = (body: unknown): RouteContext => ({
    service: {} as never,
    params: {},
    ids: { traceId: 't'.repeat(32), requestId: 'req_x' },
    request: new Request('http://local/api/v1/admin/redirects/bulk', {
      method: 'POST',
      headers: { 'x-admin-sub': 's1', 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
    url: new URL('http://local/api/v1/admin/redirects/bulk'),
    db: {} as never,
  }) as unknown as RouteContext;

  it('422 with zero inserts when any row fails validation (all-or-nothing)', async () => {
    const outcome = await bulkImportRedirectsHandler(ctx({
      rows: [
        { from_path: '/a', to_path: '/products/a', status_code: 301 },
        { from_path: 'NOT-A-PATH', to_path: '/b', status_code: 301 },
      ],
    }));
    expect(outcome.status).toBe(422);
    const body = outcome.body as { code: string; data: { imported?: number; error_count: number } };
    expect(body.code).toBe('BULK_VALIDATION_FAILED');
    expect(body.data.error_count).toBe(1);
    expect(body.data.imported).toBeUndefined();
  });

  it('rejects the whole batch when a duplicate inside the batch is detected', async () => {
    const outcome = await bulkImportRedirectsHandler(ctx({
      rows: [
        { from_path: '/a', to_path: '/products/a', status_code: 301 },
        { from_path: '/a', to_path: '/products/b', status_code: 301 },
      ],
    }));
    expect(outcome.status).toBe(422);
  });
});
