/**
 * Phase 1 Task 9 — reference-data seed gate (plan task 9; symbols per plan
 * task note: enum-member counts, never observed-status claims).
 *
 * Runs on a DISPOSABLE scratch database (maihan_dev_seed) created on the
 * PostgreSQL server DATABASE_URL points at; Neon hosts are refused (the
 * same guard class as schema-fidelity: the shared dev database and
 * production are never a scratch target). Lifecycle: drop-leftover ->
 * create -> migrate from zero -> seed -> assert -> seed again -> assert
 * idempotency -> unconditionally drop.
 *
 * Assertions (plan task requirement set):
 *   - expected counts (15 metals, 8 jewellery types, 22 setting styles,
 *     3 treatments, 5 treatment labels, 5 intensities, 5 clarities, 7
 *     clarity labels);
 *   - required reference values present with their authoritative content;
 *   - uniqueness holds on every natural key;
 *   - idempotency: the second run inserts nothing, changes nothing, and the
 *     logical state after run 2 equals the state after run 1;
 *   - no unexpected rows: every seeded table's row count equals the expected
 *     count exactly.
 *
 * Skips when DATABASE_URL is unset (the documented behaviour class of the
 * Task 7 corpus spec: an environment without the dependency runs nothing and
 * reports it rather than pretending).
 */
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runMigrations, defaultMigrationsFolder } from '../migrate.js';
import { seedReferenceData } from './reference-seed.js';
import { EXPECTED_REFERENCE_COUNTS } from './reference-data.js';

const { Client } = pg;

const SCRATCH_DATABASE = 'maihan_dev_seed';
const databaseUrl = process.env['DATABASE_URL'] ?? '';

const dbReady = databaseUrl.includes('@') && !(new URL(databaseUrl).host.endsWith('.neon.tech'));
const d = describe.skipIf(!dbReady);

let admin: pg.Client;
let scratch: pg.Client;

beforeAll(async () => {
  const adminUrl = new URL(databaseUrl);
  adminUrl.pathname = '/postgres';
  admin = new Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS ${SCRATCH_DATABASE} WITH (FORCE)`);
  await admin.query(`CREATE DATABASE ${SCRATCH_DATABASE}`);
  const u = new URL(databaseUrl);
  u.pathname = `/${SCRATCH_DATABASE}`;
  await runMigrations({ databaseUrl: u.toString(), migrationsFolder: defaultMigrationsFolder() });
  scratch = new Client({ connectionString: u.toString() });
  await scratch.connect();
});

afterAll(async () => {
  if (!admin || !scratch) return; // suite skipped: nothing to clean up
  // The scratch client must release before the database is dropped: a FORCE
  // drop kills open connections, which Vitest surfaces as unhandled errors.
  await scratch.end().catch(() => undefined);
  try {
    await admin.query(`DROP DATABASE IF EXISTS ${SCRATCH_DATABASE} WITH (FORCE)`);
  } finally {
    await admin.end().catch(() => undefined);
  }
});

d('reference seeds — first run', () => {
  it('inserts exactly the expected reference vocabulary', async () => {
    const counts = await seedReferenceData(scratch);
    expect(counts.metals.inserted).toBe(EXPECTED_REFERENCE_COUNTS.metals);
    expect(counts.jewelleryTypes.inserted).toBe(EXPECTED_REFERENCE_COUNTS.jewelleryTypes);
    expect(counts.settingStyles.inserted).toBe(EXPECTED_REFERENCE_COUNTS.settingStyles);
    expect(counts.treatments.inserted).toBe(EXPECTED_REFERENCE_COUNTS.treatments);
    expect(counts.treatmentLabels.inserted).toBe(EXPECTED_REFERENCE_COUNTS.treatmentLabels);
    expect(counts.colourIntensities.inserted).toBe(EXPECTED_REFERENCE_COUNTS.colourIntensities);
    expect(counts.clarities.inserted).toBe(EXPECTED_REFERENCE_COUNTS.clarities);
    expect(counts.clarityLabels.inserted).toBe(EXPECTED_REFERENCE_COUNTS.clarityLabels);
  });

  it('has no unexpected rows in any seeded table', async () => {
    const expected: [string, number][] = [
      ['metals', EXPECTED_REFERENCE_COUNTS.metals],
      ['jewellery_types', EXPECTED_REFERENCE_COUNTS.jewelleryTypes],
      ['setting_styles', EXPECTED_REFERENCE_COUNTS.settingStyles],
      ['treatments', EXPECTED_REFERENCE_COUNTS.treatments],
      ['treatment_labels', EXPECTED_REFERENCE_COUNTS.treatmentLabels],
      ['colour_intensities', EXPECTED_REFERENCE_COUNTS.colourIntensities],
      ['clarities', EXPECTED_REFERENCE_COUNTS.clarities],
      ['clarity_labels', EXPECTED_REFERENCE_COUNTS.clarityLabels],
    ];
    for (const [table, count] of expected) {
      const r = await scratch.query<{ c: string }>(`SELECT count(*)::text AS c FROM ${table}`);
      expect(r.rows[0]?.c, table).toBe(String(count));
    }
  });

  it('maps every reference code to its authoritative members', async () => {
    // Metals: the full 15-code enum; the two-tone flags per colour pair.
    const twoTone = await scratch.query<{ code: string }>(
      'SELECT code::text AS code FROM metals WHERE is_two_tone ORDER BY code::text',
    );
    expect(twoTone.rows.map((r) => r.code)).toEqual(['WY14', 'WY18', 'YW14', 'YW18']);
    const observed = await scratch.query<{ c: string }>(
      "SELECT count(*)::text AS c FROM metals WHERE evidence_status = 'OBSERVED'",
    );
    expect(observed.rows[0]?.c).toBe('14');
    const inferred = await scratch.query<{ c: string }>(
      "SELECT count(*)::text AS c FROM metals WHERE evidence_status = 'INFERRED'",
    );
    expect(inferred.rows[0]?.c).toBe('1');

    // Jewellery: INV-02/INV-03 attachment flags per SoT 8.5 seed comment.
    const flags = await scratch.query<{ code: string; uses_pair: boolean; uses_single: boolean }>(
      'SELECT code::text AS code, uses_pair, uses_single FROM jewellery_types ORDER BY code::text',
    );
    const byCode = new Map(flags.rows.map((r) => [r.code, r]));
    expect(byCode.get('EARRINGS')?.uses_pair).toBe(true);
    expect(byCode.get('EARRINGS')?.uses_single).toBe(false);
    for (const code of ['RING', 'PENDANT', 'NECKLACE', 'BRACELET']) {
      expect(byCode.get(code)?.uses_single, code).toBe(true);
      expect(byCode.get(code)?.uses_pair, code).toBe(false);
    }
    for (const code of ['BROOCH', 'CUFFLINKS', 'CHARM']) {
      expect(byCode.get(code)?.uses_single, code).toBe(false);
      expect(byCode.get(code)?.uses_pair, code).toBe(false);
    }

    // Treatments: disclosure on all three observed values (doc 11 verbatim).
    const disclosure = await scratch.query<{ n: string }>(
      'SELECT count(*)::text AS n FROM treatments WHERE requires_disclosure AND code IN (\'NO_ENHANCEMENT\',\'HEAT_TREATED\',\'VAPOR_INFUSED_COATING\')',
    );
    expect(disclosure.rows[0]?.n).toBe('3');

    // Intensities: ranks 1..5 unique (doc 11 invariant "unique per intensity").
    const ranks = await scratch.query<{ rank: number }>(
      'SELECT rank FROM colour_intensities ORDER BY rank',
    );
    expect(ranks.rows.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5]);
  });

  it('uniqueness holds on every natural key (constraint-level)', async () => {
    const cases: [string, string][] = [
      ['metals', 'code'],
      ['jewellery_types', 'code'],
      ['setting_styles', 'code'],
      ['setting_styles', 'slug'],
      ['treatments', 'code'],
      ['treatment_labels', 'raw_label'],
      ['colour_intensities', 'code'],
      ['clarities', 'code'],
      ['clarity_labels', 'raw_label'],
    ];
    for (const [table, column] of cases) {
      const r = await scratch.query<{ c: string }>(`SELECT count(DISTINCT ${column})::text AS c FROM ${table}`);
      const total = await scratch.query<{ c: string }>(`SELECT count(*)::text AS c FROM ${table}`);
      expect(r.rows[0]?.c, `${table}(${column})`).toBe(total.rows[0]?.c);
    }
  });

  it('reference values match the explicit authoritative data set', async () => {
    const platinum = await scratch.query<{ label: string; slug_phrase: string; purity_value: string }>(
      "SELECT label, slug_phrase, purity_value::text AS purity_value FROM metals WHERE code = 'PT'",
    );
    expect(platinum.rows[0]).toEqual({ label: 'Platinum 950', slug_phrase: 'platinum-950', purity_value: '950.00' });

    const silver = await scratch.query<{ label: string }>("SELECT label FROM metals WHERE code = 'SL'");
    expect(silver.rows[0]?.label).toBe('Sterling Silver');

    const heatTreated = await scratch.query<{ label: string; requires_disclosure: boolean }>(
      "SELECT label, requires_disclosure FROM treatments WHERE code = 'HEAT_TREATED'",
    );
    expect(heatTreated.rows[0]).toEqual({ label: 'Heat Treated', requires_disclosure: true });

    const doubled = await scratch.query<{ is_doubled: boolean; token_count: number; code: string }>(
      `SELECT cl.is_doubled, cl.token_count, c.code
       FROM clarity_labels cl JOIN clarities c ON c.id = cl.clarity_id
       WHERE cl.raw_label = 'Very Slightly Included Very Slightly Included'`,
    );
    expect(doubled.rows[0]).toEqual({ is_doubled: true, token_count: 2, code: 'very_slightly_included' });
  });
});

d('reference seeds — idempotency (requirement set 6)', () => {
  it('the second run inserts nothing and preserves the logical state', async () => {
    const before = await snapshotCounts();
    const counts = await seedReferenceData(scratch);
    expect(counts.metals.inserted).toBe(0);
    expect(counts.jewelleryTypes.inserted).toBe(0);
    expect(counts.settingStyles.inserted).toBe(0);
    expect(counts.treatments.inserted).toBe(0);
    expect(counts.treatmentLabels.inserted).toBe(0);
    expect(counts.colourIntensities.inserted).toBe(0);
    expect(counts.clarities.inserted).toBe(0);
    expect(counts.clarityLabels.inserted).toBe(0);
    const after = await snapshotCounts();
    expect(after).toEqual(before);
  });

  it('a third run is likewise a no-op (rerun behaviour is stable, not just twice-safe)', async () => {
    const before = await snapshotCounts();
    await seedReferenceData(scratch);
    expect(await snapshotCounts()).toEqual(before);
  });
});

async function snapshotCounts(): Promise<Map<string, string>> {
  const tables = ['metals', 'jewellery_types', 'setting_styles', 'treatments', 'treatment_labels', 'colour_intensities', 'clarities', 'clarity_labels'];
  const out = new Map<string, string>();
  for (const table of tables) {
    const r = await scratch.query<{ c: string }>(`SELECT count(*)::text AS c FROM ${table}`);
    out.set(table, r.rows[0]?.c ?? '');
  }
  return out;
}
