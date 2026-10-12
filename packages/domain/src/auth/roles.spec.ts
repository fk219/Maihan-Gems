/**
 * packages/domain/src/auth/roles.spec.ts
 *
 * Phase 12 Stage A — policy-matrix tests (doc 23 §13: "Every role against
 * every module matches the scope table").
 */
import { describe, expect, it } from 'vitest';

import {
  ADMIN_MODULES,
  ADMIN_ROLES,
  ROLE_SCOPES,
  type AdminAction,
  hasCapability,
  requiresTwoPersonRule,
} from './roles.js';

describe('the ten-role matrix (doc 23 §3)', () => {
  it('exposes exactly the ten authoritative role names', () => {
    expect(ADMIN_ROLES).toEqual([
      'ADMIN_SUPER',
      'CATALOG_MANAGER',
      'CONTENT_EDITOR',
      'CONTENT_PUBLISHER',
      'COMMERCE_OPERATOR',
      'TRUST_REVIEWER',
      'CONCIERGE_AGENT',
      'AI_OPERATIONS',
      'MIGRATION_ENGINEER',
      'READ_ONLY_ANALYST',
    ]);
  });

  it('defines a scope for every role', () => {
    for (const role of ADMIN_ROLES) {
      expect(ROLE_SCOPES[role], role).toBeDefined();
    }
  });

  it('ADMIN_SUPER is implicit-everything', () => {
    for (const module of ADMIN_MODULES) {
      expect(hasCapability('ADMIN_SUPER', module, 'write'), module).toBe(true);
      expect(hasCapability('ADMIN_SUPER', module, 'approve'), module).toBe(true);
    }
  });

  it('READ_ONLY_ANALYST can only ever read/list dashboards (PII-free by role)', () => {
    for (const module of ADMIN_MODULES) {
      expect(hasCapability('READ_ONLY_ANALYST', module, 'write'), module).toBe(false);
      expect(hasCapability('READ_ONLY_ANALYST', module, 'approve'), module).toBe(false);
      expect(hasCapability('READ_ONLY_ANALYST', module, 'publish'), module).toBe(false);
      if (module !== 'dashboards') {
        expect(hasCapability('READ_ONLY_ANALYST', module, 'read'), module).toBe(false);
      }
    }
    expect(hasCapability('READ_ONLY_ANALYST', 'dashboards', 'read')).toBe(true);
  });

  it('content editing and approval are separated (CONTENT_EDITOR cannot approve)', () => {
    expect(hasCapability('CONTENT_EDITOR', 'content', 'write')).toBe(true);
    expect(hasCapability('CONTENT_EDITOR', 'content', 'approve')).toBe(false);
    expect(hasCapability('CONTENT_PUBLISHER', 'content', 'approve')).toBe(true);
    expect(hasCapability('CONTENT_PUBLISHER', 'content', 'publish')).toBe(true);
  });

  it('trust review is role-separated', () => {
    expect(hasCapability('TRUST_REVIEWER', 'certificates', 'approve')).toBe(true);
    expect(hasCapability('CATALOG_MANAGER', 'certificates', 'approve')).toBe(false);
    expect(hasCapability('CONTENT_PUBLISHER', 'certificates', 'approve')).toBe(false);
  });

  it('AI_OPERATIONS can read but never mutate transactional state', () => {
    expect(hasCapability('AI_OPERATIONS', 'ai_logs', 'read')).toBe(true);
    expect(hasCapability('AI_OPERATIONS', 'orders', 'write')).toBe(false);
    expect(hasCapability('AI_OPERATIONS', 'products', 'write')).toBe(false);
  });

  it('MIGRATION_ENGINEER resolves conflicts and approves derived refs, nothing else', () => {
    expect(hasCapability('MIGRATION_ENGINEER', 'conflicts', 'resolve')).toBe(true);
    expect(hasCapability('MIGRATION_ENGINEER', 'derived_approvals', 'approve')).toBe(true);
    expect(hasCapability('MIGRATION_ENGINEER', 'products', 'write')).toBe(false);
    expect(hasCapability('MIGRATION_ENGINEER', 'content', 'write')).toBe(false);
  });

  it('CONCIERGE_AGENT reads conversations only', () => {
    expect(hasCapability('CONCIERGE_AGENT', 'conversations', 'read')).toBe(true);
    expect(hasCapability('CONCIERGE_AGENT', 'conversations', 'write')).toBe(false);
    expect(hasCapability('CONCIERGE_AGENT', 'certificates', 'approve')).toBe(false);
  });

  it('COMMERCE_OPERATOR handles orders/refunds/inventory, not content', () => {
    expect(hasCapability('COMMERCE_OPERATOR', 'orders', 'read')).toBe(true);
    expect(hasCapability('COMMERCE_OPERATOR', 'refunds', 'approve')).toBe(true);
    expect(hasCapability('COMMERCE_OPERATOR', 'content', 'write')).toBe(false);
  });

  it('the full matrix is exhaustively decidable (no unknown module)', () => {
    for (const role of ADMIN_ROLES) {
      for (const module of ADMIN_MODULES) {
        for (const action of ['read', 'write', 'approve'] as readonly AdminAction[]) {
          expect(hasCapability(role, module, action), `${role}/${module}/${action}`).toBeTypeOf(
            'boolean',
          );
        }
      }
    }
  });
});

describe('the two-person rule (plan task 3)', () => {
  it('applies to trust-bearing modules only', () => {
    expect(requiresTwoPersonRule('content')).toBe(true);
    expect(requiresTwoPersonRule('derived_approvals')).toBe(true);
    expect(requiresTwoPersonRule('certificates')).toBe(true);
    expect(requiresTwoPersonRule('products')).toBe(false);
    expect(requiresTwoPersonRule('navigation')).toBe(false);
  });
});
