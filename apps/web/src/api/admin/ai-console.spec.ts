/**
 * apps/web/src/api/admin/ai-console.spec.ts — route wiring + RBAC (GT 11).
 */
import { describe, expect, it } from 'vitest';
import { AI_CONSOLE_ROUTES, lookupRoute, ALL_ROUTES } from '../routes.js';
import { authorizeAdmin } from './authz.js';

const H = (init: Record<string, string>): Headers => new Headers(init);

describe('AI console route wiring (E12.7)', () => {
  it('defines four read endpoints, all resolvable and aggregated', () => {
    expect(AI_CONSOLE_ROUTES.map((r) => r.method)).toEqual(['GET', 'GET', 'GET', 'GET']);
    for (const r of AI_CONSOLE_ROUTES) {
      const lookup = lookupRoute(r.method, r.path);
      if (lookup.kind !== 'match') throw new Error(`unresolvable: ${r.path}`);
      expect(lookup.route.id).toBe(r.id);
      expect(ALL_ROUTES.some((x) => x.id === r.id && x.path === r.path)).toBe(true);
    }
  });
});

describe('AI console authorization', () => {
  it('AI_OPERATIONS lists conversations/ai_logs/evaluations', () => {
    const h = H({ 'x-admin-sub': 'ai1', 'x-admin-role': 'AI_OPERATIONS' });
    for (const module of ['conversations', 'ai_logs', 'evaluation_runs'] as const) {
      expect(authorizeAdmin(h, { module, action: 'list', allowRoleHeader: true }).ok).toBe(true);
    }
  });

  it('CONCIERGE_AGENT may list conversations; READ_ONLY_ANALYST only dashboards', () => {
    expect(authorizeAdmin(H({ 'x-admin-sub': 'c1', 'x-admin-role': 'CONCIERGE_AGENT' }), { module: 'conversations', action: 'list', allowRoleHeader: true }).ok).toBe(true);
    expect(authorizeAdmin(H({ 'x-admin-sub': 'r1', 'x-admin-role': 'READ_ONLY_ANALYST' }), { module: 'ai_logs', action: 'list', allowRoleHeader: true })).toEqual({ ok: false, status: 403 });
  });
});
