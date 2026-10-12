import { describe, expect, it } from 'vitest';

import { authorizeAdmin, authzFailureResponse } from './authz.js';
import { buildAuditRow, redactForAudit } from './audit.js';

const IDS = { traceId: 't'.repeat(32), requestId: 'req_test' };
const H = (init: Record<string, string>): Headers => new Headers(init);

describe('authorizeAdmin', () => {
  it('401 when no identity header is present', () => {
    const decision = authorizeAdmin(H({}), { module: 'content', action: 'read' });
    expect(decision).toEqual({ ok: false, status: 401 });
  });

  it('403 on role injection attempt (identity present, seam disabled)', () => {
    const decision = authorizeAdmin(
      H({ 'x-admin-sub': 'u1', 'x-admin-role': 'ADMIN_SUPER' }),
      { module: 'content', action: 'read' },
    );
    expect(decision).toEqual({ ok: false, status: 403 });
  });

  it('resolves the dev role seam when the deployment opts in and grants capability', () => {
    const decision = authorizeAdmin(
      H({ 'x-admin-sub': 'ed1', 'x-admin-role': 'CONTENT_EDITOR' }),
      { module: 'content', action: 'write', allowRoleHeader: true },
    );
    expect(decision.ok).toBe(true);
    if (decision.ok) expect(decision.actor.role).toBe('CONTENT_EDITOR');
  });

  it('denies out-of-scope capabilities with 403', () => {
    const decision = authorizeAdmin(
      H({ 'x-admin-sub': 'ed1', 'x-admin-role': 'CONTENT_EDITOR' }),
      { module: 'content', action: 'approve', allowRoleHeader: true },
    );
    expect(decision).toEqual({ ok: false, status: 403 });
  });

  it('denies READ_ONLY_ANALYST any write anywhere', () => {
    for (const module of ['content', 'products', 'certificates'] as const) {
      const decision = authorizeAdmin(
        H({ 'x-admin-sub': 'an1', 'x-admin-role': 'READ_ONLY_ANALYST' }),
        { module, action: 'write', allowRoleHeader: true },
      );
      expect(decision).toEqual({ ok: false, status: 403 });
    }
  });

  it('maps failures to the standard envelope codes', () => {
    const r401 = authzFailureResponse(401, IDS);
    const r403 = authzFailureResponse(403, IDS);
    expect(r401.status).toBe(401);
    expect(r403.status).toBe(403);
  });
});

describe('audit redaction (doc 09 PII)', () => {
  it('redacts secret/PII keys before any write', () => {
    const row = buildAuditRow({
      actorSub: 'admin-1',
      actorRole: 'ADMIN_SUPER',
      action: 'write',
      resourceType: 'product',
      resourceId: 'p1',
      before: { title: 'Emerald ring', email: 'x@y.z', api_key: 'sk-123' },
      after: { title: 'Emerald ring (edited)', api_key: 'sk-456' },
      traceId: IDS.traceId,
      requestId: IDS.requestId,
    });
    expect(row.before).toEqual({ title: 'Emerald ring', email: '[REDACTED]', api_key: '[REDACTED]' });
    expect(row.after).toEqual({ title: 'Emerald ring (edited)', api_key: '[REDACTED]' });
    expect(row.actor).toBe('ADMIN_SUPER:admin-1');
  });

  it('redactForAudit passes null through', () => {
    expect(redactForAudit(null)).toBeNull();
  });
});
