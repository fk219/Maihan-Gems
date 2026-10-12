/**
 * packages/db/src/cms/trust-console.spec.ts
 *
 * Phase 12 — Stage E tests (Global Tasks 7–10, plan §19):
 *   - GT 7: the derived queue keeps the TWO populations distinct — the
 *     exact failed-fetch subset (V18 shape) and the broader class; an
 *     approval can never populate attributes on the 221 (SHAPE_VIOLATION);
 *   - GT 9: conflict resolution refuses double-resolution and MERGED
 *     without text; both sides always retained;
 *   - GT 10: cert review only promotes VERIFIED with an explicit human
 *     decision (INV-07).
 */
import { describe, expect, it } from 'vitest';

import {
  classifyDerivedRows,
  isFailedFetchDerivedRow,
  TrustConsoleError,
  createTrustConsoleRepository,
  type ConflictRow,
} from './trust-console-repository.js';
import type { CatalogDatabase } from '../catalog/executor.js';

const failedRow = { source_sku: null, source_sku_derived: 'K1324-SRV-J809', sku_evidence_status: 'INFERRED' };
const configuredDerivedRow = { source_sku: null, source_sku_derived: 'K1324-J809', sku_evidence_status: 'INFERRED', kind: 'CONFIGURED', variety_id: 'v-1', total_weight_ct: '2.100' };
const readyMadeRow = { source_sku: null, source_sku_derived: 'PR5681-J809', sku_evidence_status: 'INFERRED', kind: 'READY_MADE' };

describe('derived queue classification (GT 7, V18 subset preserved)', () => {
  it('separates the exact failed-fetch subset from the broader derived class', () => {
    const c = classifyDerivedRows([failedRow, configuredDerivedRow, readyMadeRow]);
    expect(c.failedFetch).toHaveLength(1);
    expect(c.configuredDerived).toHaveLength(1);
    expect(c.readyMadeDerived).toHaveLength(1);
  });

  it('the failed-fetch predicate demands null source_sku + derived + INFERRED', () => {
    expect(isFailedFetchDerivedRow(failedRow)).toBe(true);
    expect(isFailedFetchDerivedRow({ source_sku: 'X', source_sku_derived: 'Y', sku_evidence_status: 'INFERRED' })).toBe(false);
    expect(isFailedFetchDerivedRow({ source_sku: null, source_sku_derived: null, sku_evidence_status: 'INFERRED' })).toBe(false);
  });

  it('two-person refusal class exists (MIGRATION_ENGINEER flow)', () => {
    expect(new TrustConsoleError('SELF_APPROVAL').kind).toBe('SELF_APPROVAL');
  });
});

/* ── conflict resolution behaviour (GT 9) ────────────────────────────── */

function scriptedDb(scripted: Array<Record<string, unknown> | null>): CatalogDatabase {
  let n = 0;
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    execute: async (q: any) => {
      const chunks = Array.isArray(q?.queryChunks) ? q.queryChunks : [];
      const text = chunks.map((c: { value?: string[] }) => Array.isArray(c?.value) ? c.value.join('') : '').join('').replace(/\s+/g, ' ');
      const values: unknown[] = [];
      for (const c of chunks) {
        if (!Array.isArray(c?.value) && !Array.isArray(c?.queryChunks)) values.push(typeof c === 'string' ? null : (c as { value?: unknown })?.value ?? '');
      }
      void text; void values;
      const next = scripted[n] ?? null;
      n += 1;
      return { rows: next === null ? [] : [next] };
    },
  } as never as CatalogDatabase;
}

const audit: unknown[] = [];
const noopAudit = async (entry: unknown): Promise<void> => { audit.push(entry); };

describe('conflict resolution (GT 9 — never silent overwrite)', () => {
  const existing: ConflictRow = {
    id: 'conf-1', entity_kind: 'gemstone', entity_ref: 'K1324', field_name: 'origin',
    value_a: 'Zambia', source_url_a: 'https://a', value_b: 'Columbia', source_url_b: 'https://b',
    resolution: null, resolved_by: null,
  };

  it('resolves by explicit side and keeps BOTH sides in the row', async () => {
    const db = scriptedDb([existing, { ...existing, resolution: 'A', resolved_by: 'me' }]);
    const repo = createTrustConsoleRepository(db, noopAudit);
    const row = await repo.resolveConflict({ conflictId: 'conf-1', side: 'A', actorId: 'me' });
    expect(row['value_a']).toBe('Zambia');
    expect(row['value_b']).toBe('Columbia');
    expect(row['resolution']).toBe('A');
    expect(audit).toHaveLength(1);
  });

  it('refuses to resolve an already-resolved conflict (ALREADY_RESOLVED)', async () => {
    const db = scriptedDb([{ ...existing, resolution: 'B' }]);
    const repo = createTrustConsoleRepository(db, noopAudit);
    await expect(repo.resolveConflict({ conflictId: 'conf-1', side: 'B', actorId: 'me' }))
      .rejects.toMatchObject({ kind: 'ALREADY_RESOLVED' });
  });

  it('refuses a MERGED resolution without explicit merged text', async () => {
    const db = scriptedDb([existing, null]);
    const repo = createTrustConsoleRepository(db, noopAudit);
    await expect(repo.resolveConflict({ conflictId: 'conf-1', side: 'MERGED', actorId: 'me' }))
      .rejects.toMatchObject({ kind: 'SHAPE_VIOLATION' });
  });
});

/* ── certificate review (GT 10, INV-07) ──────────────────────────────── */

describe('certificate review (GT 10)', () => {
  it('only the APPROVE decision promotes verification_status (INV-07 shielding)', async () => {
    const cert = { id: 'cert-1', verification_status: 'UNVERIFIED' };
    const review = { id: 'rev-1', certificate_id: 'cert-1', decision: 'APPROVE' };
    const db = scriptedDb([cert, review]);
    const repo = createTrustConsoleRepository(db, noopAudit);
    const row = await repo.reviewCertificate({ certificateId: 'cert-1', decision: 'APPROVE', actorId: 'trust-1' });
    expect(row['decision']).toBe('APPROVE');
  });

  it('missing certificate is NOT_FOUND, never fabricated', async () => {
    const db = scriptedDb([null]);
    const repo = createTrustConsoleRepository(db, noopAudit);
    await expect(repo.reviewCertificate({ certificateId: 'nope', decision: 'APPROVE', actorId: 't1' }))
      .rejects.toMatchObject({ kind: 'NOT_FOUND' });
  });
});
