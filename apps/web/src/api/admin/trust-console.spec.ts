/**
 * apps/web/src/api/admin/trust-console.spec.ts
 *
 * Phase 12 — Stage E wiring tests: seven routes registered + resolvable;
 * RBAC: MIGRATION_ENGINEER holds resolve/approve on conflicts/derived-
 * approvals; TRUST_REVIEWER holds certificates approve; cross-role denials.
 */
import { describe, expect, it } from 'vitest';
import { TRUST_ADMIN_ROUTES, lookupRoute, ALL_ROUTES } from '../routes.js';
import { authorizeAdmin } from './authz.js';

const H = (init: Record<string, string>): Headers => new Headers(init);

describe('trust console route wiring (E12.5/E12.6)', () => {
  it('defines seven endpoints with distinct ids, all resolvable', () => {
    expect(TRUST_ADMIN_ROUTES).toHaveLength(7);
    const ids = new Set(TRUST_ADMIN_ROUTES.map((r) => r.id));
    expect(ids.size).toBe(7);
    for (const r of TRUST_ADMIN_ROUTES) {
      const lookup = lookupRoute(r.method, r.path);
      if (lookup.kind !== 'match') throw new Error(`unresolvable: ${r.method} ${r.path}`);
      expect(lookup.route.id).toBe(r.id);
      expect(ALL_ROUTES.some((x) => x.id === r.id && x.path === r.path)).toBe(true);
    }
  });
});

describe('trust console authorization matrix', () => {
  it('MIGRATION_ENGINEER: import batches list + conflicts resolve + derived approvals', () => {
    const h = H({ 'x-admin-sub': 'm1', 'x-admin-role': 'MIGRATION_ENGINEER' });
    expect(authorizeAdmin(h, { module: 'import_batches', action: 'list', allowRoleHeader: true }).ok).toBe(true);
    expect(authorizeAdmin(h, { module: 'conflicts', action: 'resolve', allowRoleHeader: true }).ok).toBe(true);
    expect(authorizeAdmin(h, { module: 'derived_approvals', action: 'approve', allowRoleHeader: true }).ok).toBe(true);
  });

  it('TRUST_REVIEWER: certificates approve; anomalies resolve', () => {
    const h = H({ 'x-admin-sub': 't1', 'x-admin-role': 'TRUST_REVIEWER' });
    expect(authorizeAdmin(h, { module: 'certificates', action: 'approve', allowRoleHeader: true }).ok).toBe(true);
    expect(authorizeAdmin(h, { module: 'anomalies', action: 'resolve', allowRoleHeader: true }).ok).toBe(true);
  });

  it('cross-role denials: CONTENT_EDITOR cannot approve derived refs or review certificates', () => {
    const h = H({ 'x-admin-sub': 'e1', 'x-admin-role': 'CONTENT_EDITOR' });
    expect(authorizeAdmin(h, { module: 'derived_approvals', action: 'approve', allowRoleHeader: true })).toEqual({ ok: false, status: 403 });
    expect(authorizeAdmin(h, { module: 'certificates', action: 'approve', allowRoleHeader: true })).toEqual({ ok: false, status: 403 });
  });
});
