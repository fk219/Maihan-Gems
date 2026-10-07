/**
 * Task 10 — the runner gates on DISPOSABLE FIXTURES: a temp "repo root"
 * with a fixture manifest and a temp archive COPY. The REAL source archive
 * is never touched by these tests (AGENTS.md section 5): the fixture
 * artifacts are fresh temp bytes with manifest-verified digests.
 *
 * Mandatory gates proven here:
 *   1. HASH MISMATCH — a fixture artifact whose bytes disagree with the
 *      manifest digest makes the runner REFUSE: the error identifies the
 *      artifact, the expected and actual digests are distinguishable, no
 *      stage is marked complete, and the durable rows carry the failure.
 *   2. RESUME — an interrupted (FAILED) stage reruns to completion while
 *      already-completed stages stay complete; downstream stages never
 *      execute prematurely when an upstream verification fails.
 *   3. IDEMPOTENCY — a full rerun is a skip-based no-op; the implemented
 *      stages (migrate-schema, seed-reference) are themselves idempotent,
 *      so the logical database state never drifts.
 *
 * The suite skips when DATABASE_URL is unset (documented environment
 * pattern, like the Task 7 corpus gate) and runs on a DISPOSABLE scratch
 * database (maihan_dev_migrate) that is always dropped.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ArtifactVerificationError, parseManifest, verifyArtifact } from './manifest.js';
import { runStages } from './run.js';
import { STAGES } from './stages.js';
import { MigrationState } from './state.js';
import { runMigrations, defaultMigrationsFolder } from '@maihan/db';

const { Client } = pg;

const SCRATCH_DATABASE = 'maihan_dev_migrate';
const databaseUrl = process.env['DATABASE_URL'] ?? '';
const dbReady = databaseUrl.includes('@') && !(new URL(databaseUrl).host.endsWith('.neon.tech'));
const d = describe.skipIf(!dbReady);

interface Fixture {
  readonly repoRoot: string;      // holds docs/evidence/MANIFEST.md (the fixture manifest)
  readonly archiveRoot: string;   // holds fixture artifacts under naturalgemstones/
  readonly manifestPath: string;
}

function createFixture(): Fixture {
  const tmp = mkdtempSync(path.join(tmpdir(), 'maihan-migrate-'));
  const repoRoot = path.join(tmp, 'repo-root');
  const archiveRoot = path.join(tmp, 'disposable-archive');
  mkdirSync(path.join(repoRoot, 'docs', 'evidence'), { recursive: true });
  mkdirSync(path.join(archiveRoot, 'naturalgemstones', 'fixtures'), { recursive: true });

  const artifacts = [
    // Every artifact the implemented chain consumes gets a small fixture row;
    // the REAL corpus-count gates hold only in corpus mode (real manifest).
    { no: '1', name: 'fixture-alpha.jsonl', bytes: 'alpha content A\n'.repeat(64) },
    { no: '2', name: 'fixture-beta.jsonl', bytes: JSON.stringify({ ok: true }) + '\n' },
    {
      no: '3',
      name: 'urls.jsonl',
      bytes: [
        JSON.stringify({ url: 'https://naturalgemstones.com/cart', classification: 'cart', crawl: { http_status: null } }),
        JSON.stringify({ url: 'https://naturalgemstones.com/garnet', classification: 'variety_index', crawl: { http_status: null } }),
      ].join('\n') + '\n',
    },
    {
      no: '4',
      name: 'specifications.jsonl',
      bytes: JSON.stringify({ page_url: 'https://naturalgemstones.com/design-your-own/review/x', field_key: 'weight', field_value: '1.28 Ct.' }) + '\n',
    },
    {
      no: '5',
      name: 'products.jsonl',
      bytes: JSON.stringify({ url: 'https://naturalgemstones.com/design-your-own/review/x', sku: 'JS1016W14-K1324', name: 'Test Ring 1.28Ct.Tw.' }) + '\n',
    },
    {
      no: '6',
      name: 'taxonomy.json',
      bytes: JSON.stringify({ fields: {}, notes: 'fixture', evidence_status: 'EXTRACTED' }),
    },
  ];
  // An ABSOLUTE archiveRoot replaces the 'naturalgemstones' marker segment
  // entirely: artifactAbsolutePath maps actualPath onto archiveRoot/<rest>.
  mkdirSync(path.join(archiveRoot, 'fixtures'), { recursive: true });
  for (const a of artifacts) {
    writeFileSync(path.join(archiveRoot, 'fixtures', a.name), a.bytes);
  }
  const rows = artifacts.map((a) => {
    const actualPath = `naturalgemstones/fixtures/${a.name}`;
    const digest = createHash('sha256').update(a.bytes).digest('hex');
    return `| ${a.no} | \`${a.name}\` | \`${actualPath}\` | ${Buffer.byteLength(a.bytes)} | \`${digest}\` | A — fixture row | fixture reason | fixture loss |`;
  });
  writeFileSync(
    path.join(repoRoot, 'docs', 'evidence', 'MANIFEST.md'),
    ['# fixture manifest', '', ...rows].join('\n'),
  );
  return { repoRoot, archiveRoot, manifestPath: path.join(repoRoot, 'docs', 'evidence', 'MANIFEST.md') };
}

let fixture: Fixture;
let admin: pg.Client;
let scratch: pg.Client;

beforeAll(async () => {
  fixture = createFixture();
  const adminUrl = new URL(databaseUrl);
  adminUrl.pathname = '/postgres';
  admin = new Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS ${SCRATCH_DATABASE} WITH (FORCE)`);
  await admin.query(`CREATE DATABASE ${SCRATCH_DATABASE}`);
  const u = new URL(databaseUrl);
  u.pathname = `/${SCRATCH_DATABASE}`;
  const scratchDatabaseUrl = u.toString();
  await runMigrations({ databaseUrl: scratchDatabaseUrl, migrationsFolder: defaultMigrationsFolder() });
  scratch = new Client({ connectionString: scratchDatabaseUrl });
  await scratch.connect();
});

afterAll(async () => {
  if (!admin || !scratch) return;
  await scratch.end().catch(() => undefined);
  try {
    await admin.query(`DROP DATABASE IF EXISTS ${SCRATCH_DATABASE} WITH (FORCE)`);
  } finally {
    await admin.end().catch(() => undefined);
  }
  if (fixture) rmSync(path.dirname(fixture.repoRoot), { recursive: true, force: true });
});

d('durable state bootstrap', () => {
  it('the chain starts with no durable state rows', async () => {
    expect(existsSync(fixture.manifestPath)).toBe(true);
    const rows = await listStageRows();
    expect(rows.filter((r) => r.key.startsWith('stage:'))).toHaveLength(0);
  });
});

d('hash-mismatch refusal (mandatory gate 1)', () => {
  it('a tampered artifact REFUSES the run, and no stage is marked complete', async () => {
    // Tamper the ARCHIVE COPY (never the real archive): rewrite fixture-alpha.
    const tamperedPath = path.join(fixture.archiveRoot, 'fixtures', 'fixture-alpha.jsonl');
    writeFileSync(tamperedPath, 'TAMPERED CONTENT — hashes no longer match the manifest\n');

    let failure: unknown;
    try {
      await runStages({ databaseUrl: scratchConnectionString(), repoRoot: fixture.repoRoot, manifestPath: fixture.manifestPath, archiveRoot: fixture.archiveRoot, minManifestArtifacts: 2, stopAfterStageId: 'verify-artifacts' });
    } catch (e) {
      failure = e;
    }
    expect(failure).toBeInstanceOf(ArtifactVerificationError);
    const err = failure as ArtifactVerificationError;
    expect(err.artifact).toBe('fixture-alpha.jsonl');
    expect(err.stage).toBe('verify-artifacts');
    expect(err.actualSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(err.expectedSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(err.expectedSha256).not.toBe(err.actualSha256);
    expect(err.message).toContain('expected sha256');

    // No stage is falsely marked complete: verify-artifacts FAILED, and no
    // downstream stage ever started.
    const rows = await listStageRows();
    const va = rows.find((r) => r.key === 'stage:verify-artifacts');
    expect(va?.status).toBe('FAILED');
    expect(va?.notes).toContain('fixture-alpha.jsonl');
    expect(rows.some((r) => r.key === 'stage:migrate-schema' && r.status === 'SUCCEEDED')).toBe(false);
    expect(rows.some((r) => r.key === 'stage:seed-reference')).toBe(false);

    // Restore the fixture bytes for the later scenarios.
    writeFileSync(tamperedPath, 'alpha content A\n'.repeat(64));
  });

  it('a MISSING artifact refuses with its own reason class', async () => {
    const missingPath = path.join(fixture.archiveRoot, 'fixtures', 'fixture-beta.jsonl');
    rmSync(missingPath);
    try {
      await runStages({ databaseUrl: scratchConnectionString(), repoRoot: fixture.repoRoot, manifestPath: fixture.manifestPath, archiveRoot: fixture.archiveRoot, minManifestArtifacts: 2, stopAfterStageId: 'verify-artifacts' });
      expect.unreachable('the run must refuse on a missing artifact');
    } catch (e) {
      expect(e).toBeInstanceOf(ArtifactVerificationError);
      expect((e as ArtifactVerificationError).message).toContain('the artifact is absent');
    }
    // Reset the durable row for the resume scenario.
    const state = await MigrationState.connect(scratchConnectionString());
    await state.markFailed({ stageKey: 'stage:verify-artifacts', reason: 'reset before resume scenario' });
    await state.end();
    writeFileSync(missingPath, `${JSON.stringify({ ok: true })}\n`);
  });
});

d('resume (mandatory gate 2)', () => {
  it('runs the full chain; completed stages stay complete and skipped stages never rework', async () => {
    // Full chain once: verify-artifacts + migrate-schema + seed-reference +
    // every stage implemented at this point (Phase 2 grows the chain).
    const expected = (await import('./stages.js')).STAGES.filter((s) => s.implemented).map((s) => [s.id, 'RAN'] as const);
    const outcomes = await runStages({ databaseUrl: scratchConnectionString(), repoRoot: fixture.repoRoot, manifestPath: fixture.manifestPath, archiveRoot: fixture.archiveRoot, minManifestArtifacts: 2 });
    expect(outcomes.map((o) => [o.id, o.action])).toEqual(expected);
    expect(await stageStatus('verify-artifacts')).toBe('SUCCEEDED');
    expect(await stageStatus('migrate-schema')).toBe('SUCCEEDED');
    expect(await stageStatus('seed-reference')).toBe('SUCCEEDED');
  });

  it('a simulated interruption at seed-reference resumes to completion without duplicate work', async () => {
    // Simulate an interruption: the seed stage reports FAILED mid-run. Its
    // durable note is overwritten on retry; no data was half-written.
    const seedCountsBefore = await referenceCounts();
    await simulateFailed('stage:seed-reference', 'simulated interruption before completion');

    // Downstream of the failure point there is nothing (seed-reference is
    // followed by later Phase 2 stages only); the completed upstream stages
    // must remain SUCCEEDED and SKIP.
    const impl = (await import('./stages.js')).STAGES.filter((s) => s.implemented);
    const expectedActions = impl.map((s) => [s.id, s.id === 'seed-reference' ? 'RAN' : 'SKIPPED'] as const);
    const outcomes = await runStages({ databaseUrl: scratchConnectionString(), repoRoot: fixture.repoRoot, manifestPath: fixture.manifestPath, archiveRoot: fixture.archiveRoot, minManifestArtifacts: 2 });
    expect(outcomes.map((o) => [o.id, o.action])).toEqual(expectedActions);
    expect(await stageStatus('seed-reference')).toBe('SUCCEEDED');
    // Idempotent rework: the seed did not duplicate rows.
    expect(await referenceCounts()).toEqual(seedCountsBefore);
  });

});

d('idempotency (mandatory gate 3)', () => {
  it('a full rerun is a pure skip; no duplicate reference data, no schema drift', async () => {
    const before = await snapshot();
    const outcomes = await runStages({ databaseUrl: scratchConnectionString(), repoRoot: fixture.repoRoot, manifestPath: fixture.manifestPath, archiveRoot: fixture.archiveRoot, minManifestArtifacts: 2 });
    expect(outcomes.every((o) => o.action === 'SKIPPED')).toBe(true);
    expect(await snapshot()).toEqual(before);
  });
});

  it('downstream stages do not execute when an upstream verification fails again', async () => {
    // Fail verify-artifacts durably (as if interrupted mid-verification).
    await simulateFailed('stage:verify-artifacts', 'simulated interruption during verification');
    // Now tamper the archive COPY so the retry REFUSES.
    const tamperedPath = path.join(fixture.archiveRoot, 'fixtures', 'fixture-alpha.jsonl');
    writeFileSync(tamperedPath, 'tampered again\n');
    try {
      await runStages({ databaseUrl: scratchConnectionString(), repoRoot: fixture.repoRoot, manifestPath: fixture.manifestPath, archiveRoot: fixture.archiveRoot, minManifestArtifacts: 2, stopAfterStageId: 'verify-artifacts' });
      expect.unreachable('must refuse');
    } catch (e) {
      expect(e).toBeInstanceOf(ArtifactVerificationError);
    }
    // No dependent stage got marked RUNNING/SUCCEEDED by this retry.
    const rows = await listStageRows();
    const migrations = rows.find((r) => r.key === 'stage:migrate-schema');
    expect(migrations?.status).toBe('SUCCEEDED'); // from the earlier full run
    // Restore.
    writeFileSync(tamperedPath, 'alpha content A\n'.repeat(64));
  });

d('not-implemented stage refusal', () => {
  it('a declared future stage refuses to execute and marks itself FAILED', async () => {
    // Phase 2 implements stages incrementally: target the FIRST stage that is
    // still declared-but-not-implemented (currently parse-slugs; becomes
    // nothing once the whole Phase 2 chain is implemented — the test skips).
    const pending = STAGES.find((s) => !s.implemented);
    if (pending === undefined) return; // whole chain implemented
    try {
      await runStages({ databaseUrl: scratchConnectionString(), repoRoot: fixture.repoRoot, manifestPath: fixture.manifestPath, archiveRoot: fixture.archiveRoot, minManifestArtifacts: 2, onlyStageIds: [pending.id] });
      expect.unreachable('must refuse');
    } catch (e) {
      expect(e instanceof Error).toBe(true);
      expect((e as Error).message).toContain('declared but not implemented');
      expect((e as Error).message).toContain(pending.id);
    }
    expect(await stageStatus(pending.id)).toBe('FAILED');
  });
});

d('fixture-level artifact verification primitives', () => {
  it('verifyArtifact proves the fixture digest pathway matches', () => {
    const manifest = parseManifest(fixture.manifestPath, { minArtifacts: 2 });
    const alpha = manifest.artifacts.find((a) => a.artifact === 'fixture-alpha.jsonl');
    expect(alpha).toBeDefined();
    const verified = verifyArtifact({ artifact: alpha as never, archiveRoot: fixture.archiveRoot, repoRoot: fixture.repoRoot, stage: 'test' });
    expect(verified.sha256).toBe(alpha?.sha256);
  });
});

// ----------------------------------------------------------------------------

function scratchConnectionString(): string {
  const u = new URL(databaseUrl);
  u.pathname = `/${SCRATCH_DATABASE}`;
  return u.toString();
}

async function listStageRows(): Promise<{ key: string; status: string; notes: string | null }[]> {
  const r = await scratch.query<{ key: string; status: string; notes: string | null }>(
    'SELECT batch_key AS key, status::text AS status, notes FROM import_batches ORDER BY created_at',
  );
  return [...r.rows];
}

async function stageStatus(stage: string): Promise<string | undefined> {
  const rows = await listStageRows();
  return rows.find((r) => r.key === `stage:${stage}`)?.status;
}

async function simulateFailed(stageKey: string, reason: string): Promise<void> {
  await scratch.query(
    `UPDATE import_batches SET status = 'FAILED', notes = $2, finished_at = now() WHERE batch_key = $1`,
    [stageKey, reason],
  );
}

async function referenceCounts(): Promise<Record<string, number>> {
  const tables = ['metals', 'jewellery_types', 'setting_styles', 'treatments', 'treatment_labels', 'colour_intensities', 'clarities', 'clarity_labels'];
  const counts: Record<string, number> = {};
  for (const table of tables) {
    const r = await scratch.query<{ c: string }>(`SELECT count(*)::text AS c FROM ${table}`);
    counts[table] = Number(r.rows[0]?.c ?? '0');
  }
  return counts;
}

async function snapshot(): Promise<Record<string, string>> {
  const tables = ['metals', 'jewellery_types', 'setting_styles', 'treatments', 'treatment_labels', 'colour_intensities', 'clarities', 'clarity_labels', 'staging_source_pages', 'import_batches'];
  const out: Record<string, string> = {};
  for (const table of tables) {
    const r = await scratch.query<{ h: string }>(`SELECT md5(string_agg(mSort, ',' ORDER BY mSort)) AS h FROM (SELECT (to_jsonb(t)::text) AS mSort FROM ${table} t) s`);
    out[table] = r.rows[0]?.h ?? '';
  }
  return out;
}
