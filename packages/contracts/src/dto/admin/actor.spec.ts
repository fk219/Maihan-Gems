import { describe, expect, it } from 'vitest';

import {
  ActorResolutionError,
  ADMIN_ROLES,
  ADMIN_MODULES,
  ADMIN_ACTIONS,
  resolveAdminActor,
} from '../../index.js';

const H = (init: Record<string, string>): Headers => new Headers(init);

describe('admin actor resolution (doc 09 identity rules)', () => {
  it('requires an identity subject', () => {
    expect(() => resolveAdminActor(H({}))).toThrow(ActorResolutionError);
    try {
      resolveAdminActor(H({}));
      expect.unreachable();
    } catch (e) {
      expect((e as ActorResolutionError).reason).toBe('MISSING_IDENTITY');
    }
  });

  it('rejects client-asserted roles unless the deployment explicitly opts in', () => {
    expect(() =>
      resolveAdminActor(H({ 'x-admin-sub': 'u1', 'x-admin-role': 'TRUST_REVIEWER' })),
    ).toThrow(ActorResolutionError);
    try {
      resolveAdminActor(H({ 'x-admin-sub': 'u1', 'x-admin-role': 'TRUST_REVIEWER' }));
      expect.unreachable();
    } catch (e) {
      expect((e as ActorResolutionError).reason).toBe('ROLE_INJECTION');
    }
  });

  it('resolves with the development role seam only when opted in', () => {
    const actor = resolveAdminActor(
      H({ 'x-admin-sub': 'gemmo-1', 'x-admin-role': 'TRUST_REVIEWER' }),
      { allowRoleHeader: true },
    );
    expect(actor.role).toBe('TRUST_REVIEWER');
    expect(actor.sub).toBe('gemmo-1');
  });

  it('rejects a role outside the ten authoritative names', () => {
    try {
      resolveAdminActor(H({ 'x-admin-sub': 'u1', 'x-admin-role': 'SUPER_HACKER' }), {
        allowRoleHeader: true,
      });
      expect.unreachable();
    } catch (e) {
      expect((e as ActorResolutionError).reason).toBe('INVALID_ROLE');
    }
  });

  it('identifiers, modules and actions cover the authoritative sets', () => {
    expect(ADMIN_ROLES).toHaveLength(10);
    expect(ADMIN_MODULES.length).toBeGreaterThan(10);
    expect(ADMIN_ACTIONS.length).toBeGreaterThan(5);
  });
});
