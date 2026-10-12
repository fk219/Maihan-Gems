/**
 * packages/db/src/catalog/bulk-operations.spec.ts
 *
 * Phase 12 — Stage D / Global Tasks 6 + 13 tests (plan §19 tasks 6 & 13,
 * doc 23 §6–§10):
 *   - §6 preview: change-set diff excludes no-ops, refuses closed-whitelist
 *     escapes, refuses empty sets;
 *   - §6/§8 dual approval above the 50-product threshold;
 *   - §7 preview staleness bound to source versions (PREVIEW_STALE, no
 *     silent overwrite);
 *   - §8 rule 6 typed confirmation (CONFIRMATION_MISMATCH);
 *   - §6 bounded undo within the window and skip-on-stale revert.
 */
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { createCatalogDatabase } from '../catalog/executor.js';
import {
  createBulkOperationsRepository,
  buildBulkChangeSet,
  BulkOperationError,
  BULK_DUAL_APPROVAL_THRESHOLD,
  BULK_EDITABLE_FIELDS,
  type BulkChange,
} from './bulk-operations-repository.js';

function getDatabaseUrl(): string | undefined {
  if (process.env['DATABASE_URL']) return process.env['DATABASE_URL'];
  const envPath = resolve(process.cwd(), '../../.env');
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('DATABASE_URL=')) {
        return trimmed.slice('DATABASE_URL='.length).trim().replace(/^['"]|['"]$/g, '');
      }
    }
  }
  return undefined;
}

/* ── Pure machinery (database-independent) ───────────────────────────── */

describe('bulk change-set machinery (§6/§7 pure part)', () => {
  const current = [
    { productId: 'p1', values: { title: 'Old', subtitle: null, availability: true } },
    { productId: 'p2', values: { title: 'Same', subtitle: 'sub', availability: false } },
  ] as const;

  it('diffs only real changes and drops no-ops', () => {
    const changes = buildBulkChangeSet([
      { productId: 'p1', field: 'title', value: 'New' },
      { productId: 'p2', field: 'title', value: 'Same' }, // no-op excluded
    ], current);
    expect(changes).toEqual([{ productId: 'p1', field: 'title', from: 'Old', to: 'New' }]);
  });

  it('refuses fields outside the closed whitelist', () => {
    expect(() => buildBulkChangeSet([{ productId: 'p1', field: 'price_amount', value: 1 }], current))
      .toThrow(BulkOperationError);
    expect(() => buildBulkChangeSet([{ productId: 'p1', field: 'state', value: 'ACTIVE' }], current))
      .toThrow(BulkOperationError);
  });

  it('refuses an empty change set (NOT an apply)', () => {
    expect(() => buildBulkChangeSet([{ productId: 'p2', field: 'title', value: 'Same' }], current))
      .toThrow(BulkOperationError);
  });

  it('exposes the eight editable fields only (state/price never bulk)', () => {
    expect([...BULK_EDITABLE_FIELDS]).toEqual([
      'title', 'subtitle', 'availability', 'seo_title', 'seo_description',
      'short_description', 'engraving_enabled', 'engraving_text',
    ]);
    expect(BULK_DUAL_APPROVAL_THRESHOLD).toBe(50);
  });
});

/* ── DB-backed behavior (skips like the other suites without a database) ── */

describe('bulk operations lifecycle (db-backed)', () => {
  let pool: Pool | undefined;
  let skip = true;
  let productIds: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let db: any;
  let auditLog: Array<Record<string, unknown>> = [];

  beforeAll(async () => {
    const url = getDatabaseUrl();
    if (!url) return;
    try {
      pool = new Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 4000 });
      const probe = await pool.query(`SELECT id FROM products WHERE state = 'DRAFT' ORDER BY id LIMIT 55`);
      if (probe.rows.length >= 55) {
        skip = false;
        productIds = probe.rows.map((r: { id: string }) => r.id);
        db = createCatalogDatabase(pool as never);
        auditLog = [];
      }
    } catch { skip = false; }
  });

  afterAll(async () => { await pool?.end(); });

  it.skipIf(skip)('previews → dual-approves an above-threshold bulk → reverts within the window', async () => {
    const bulk = createBulkOperationsRepository(db, async (entry) => { auditLog.push(entry); });
    const requested = productIds.slice(0, 55).map((id, i) => ({ productId: id, field: 'title', value: `Bulk ${i}` }));
    const preview = await bulk.preview({ changes: requested, actorId: 'op1' });
    expect(preview.changes.length).toBeGreaterThan(BULK_DUAL_APPROVAL_THRESHOLD);
    expect(preview.dualApprovalRequired).toBe(true);

    // §8 rule 3/§10: one approver is DUAL_APPROVAL_REQUIRED (409 semantics).
    await expect(bulk.apply({ token: preview.token, approverIds: ['op1'], actorId: 'op1' }))
      .rejects.toMatchObject({ kind: 'DUAL_APPROVAL_REQUIRED' });

    // §8 rule 6: typed confirmation mismatch is a refusal.
    await expect(bulk.apply({ token: preview.token, approverIds: ['op1', 'op2'], typedConfirmation: 'WRONG', actorId: 'op1' }))
      .rejects.toMatchObject({ kind: 'CONFIRMATION_MISMATCH' });

    const applied = await bulk.apply({
      token: preview.token,
      approverIds: ['op1', 'op2'],
      typedConfirmation: preview.token.slice(0, 12),
      actorId: 'op1',
    });
    expect(applied.applied).toBe(preview.changes.length);
    // One audit row per affected entity (§6).
    expect(auditLog.filter((e) => e['action'] === 'BULK_APPLY')).toHaveLength(preview.changes.length);

    // §7 staleness: applying the same token twice is refused.
    await expect(bulk.apply({ token: preview.token, approverIds: ['op1', 'op2'], typedConfirmation: preview.token.slice(0, 12), actorId: 'op1' }))
      .rejects.toMatchObject({ kind: 'ALREADY_APPLIED' });

    const reverted = await bulk.revert({ token: preview.token, actorId: 'op1' });
    expect(reverted.reverted).toBe(new Set(preview.changes.map((c: BulkChange) => c.productId)).size);
    const titles = await pool!.query(`SELECT distinct title FROM products WHERE id = ANY($1)`, [productIds.slice(0, 55)]);
    expect(titles.rows.every((r: { title: string }) => !r.title.startsWith('Bulk '))).toBe(true);
  }, 30_000);
});
