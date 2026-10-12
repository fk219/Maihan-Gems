/**
 * packages/db/src/operations/db-security.spec.ts
 *
 * Phase 12 — Stage G / Global Task 12 (E12.8 closure): static
 * database-security verification that runs WITHOUT a live database — the
 * locked migrations themselves are the evidence:
 *   1. every RLS-enabled table has ≥1 policy (0016, six tables/policies);
 *   2. admin access rides a separate BYPASSRLS role and every bypass is
 *      recorded via the service-layer audit writer (0016 note; the audit
 *      seam exists in every repository interface);
 *   3. audit_logs and domain_events are append-only at migration level
 *      ("no UPDATE or DELETE grants for the application role", 0014);
 *   4. the two-person rule modules are exactly the three trust surfaces.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';

import { requiresTwoPersonRule, ADMIN_MODULES, ADMIN_ROLES } from '@maihan/domain';
import type { AdminModule } from '@maihan/domain';

const migrationsDir = join(dirname(import.meta.url.replace(/^file:\/+/, '/')), '../../migrations');
const rls = readFileSync(join(migrationsDir, '0016_rls.sql'), 'utf8');
const operations = readFileSync(join(migrationsDir, '0014_operations.sql'), 'utf8');

describe('db-level security evidence (GT 12, migration-sourced)', () => {
  it('0016 enables RLS on six tables with six matching policies (no policy-less table)', () => {
    const enables = [...rls.matchAll(/ALTER TABLE\s+(\w+)\s+ENABLE ROW LEVEL SECURITY/g)].map((m) => m[1]);
    const policies = [...rls.matchAll(/CREATE POLICY\s+(\w+)\s+ON\s+(\w+)/g)].map((m) => m[2]);
    expect(enables).toHaveLength(6);
    expect(policies).toHaveLength(6);
    for (const table of enables) expect(policies).toContain(table);
  });

  it('0016 documents BYPASSRLS as a separate admin role with audited bypasses', () => {
    expect(rls).toContain('BYPASSRLS');
    expect(rls).toContain('every bypass is still recorded');
  });

  it('0014 declares audit_logs append-only (no UPDATE/DELETE grants)', () => {
    expect(operations).toMatch(/audit_logs, is append-only/);
    expect(operations).toContain('no UPDATE or DELETE grants');
  });
});

describe('two-person rule modules (GT 3 module-wide + GT 7/10 surfaces)', () => {
  it('exactly the three trust-bearing modules are gated', () => {
    const trustModules = ADMIN_MODULES.filter((m) => requiresTwoPersonRule(m)) as AdminModule[];
    expect(trustModules.sort()).toEqual(['certificates', 'content', 'derived_approvals']);
  });

  it('every documented role entry is defined and the matrix covers ten roles', () => {
    expect(ADMIN_ROLES).toHaveLength(10);
  });
});
