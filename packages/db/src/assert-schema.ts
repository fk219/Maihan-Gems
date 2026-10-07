/**
 * packages/db — schema-fidelity assertion (Phase 1 Task 5).
 *
 * INITIAL_IMPLEMENTATION_PLAN.md section 36 task 5:
 *   "Assert schema fidelity in CI: 74 tables, 33 enums, 94 FKs, 591 CHECK,
 *    263 indexes, 9 named invariant constraints, 6 RLS policies with 0
 *    policy-less tables, 2 HNSW indexes, 1 trigger, 1 view, 2 functions."
 * Done when: "Introspection test green against a fresh database."
 *
 * This is a framework-free assertion (ADR-021 remains open; no test framework
 * may be installed). It consumes the SAME introspection as verify-schema.ts
 * (identical counting semantics, guaranteed by the shared module) and compares
 * it against expected-schema.ts, the fidelity mirror of the locked schema.
 *
 * Assertions prefer exact object names/definitions for critical objects and
 * fall back to aggregates only where names are PostgreSQL-generated machinery.
 *
 * Exit 0 and a PASS summary when green; exit 1 and an actionable failure list
 * otherwise. Drift is never tolerated: expected-schema.ts is changed only via
 * an ADR that supersedes or extends Source of Truth section 8.
 */
import pg from 'pg';
import { pathToFileURL } from 'node:url';
import { introspectSchema, type IntrospectionReport } from './introspect.js';
import {
  EXPECTED_COUNTS,
  EXPECTED_ENUMS,
  EXPECTED_EXTENSIONS,
  EXPECTED_FOREIGN_KEYS,
  EXPECTED_FUNCTIONS,
  EXPECTED_HNSW_INDEXES,
  EXPECTED_NAMED_INVARIANTS,
  EXPECTED_RLS_POLICIES,
  EXPECTED_TABLES,
  EXPECTED_TRIGGERS,
  EXPECTED_VECTOR_COLUMNS,
  EXPECTED_VIEWS,
} from './expected-schema.js';

const { Client } = pg;

/**
 * Returns every fidelity failure as an actionable message; empty means green.
 * All checks run — the report is exhaustive, never fail-fast.
 */
export function assertSchemaFidelity(report: IntrospectionReport): string[] {
  const failures: string[] = [];
  const add = (message: string): void => {
    failures.push(message);
  };

  // ---- tables -----------------------------------------------------------------
  const missingTables = EXPECTED_TABLES.filter((t) => !report.tables.includes(t));
  const unexpectedTables = report.tables.filter((t) => !EXPECTED_TABLES.includes(t));
  if (report.tables.length !== EXPECTED_COUNTS.tables) {
    add(`tables: expected ${EXPECTED_COUNTS.tables}, got ${report.tables.length}`);
  }
  for (const t of missingTables) add(`missing table: ${t}`);
  for (const t of unexpectedTables) add(`unexpected table: ${t}`);

  // ---- enums (names AND members: removing one member must fail) ---------------
  const expectedEnumMap = new Map(EXPECTED_ENUMS.map((e) => [e.name, e.members]));
  const actualEnumMap = new Map(report.enum_members.map((e) => [e.name, e.members]));
  if (report.enums.length !== EXPECTED_COUNTS.enums) {
    add(`enums: expected ${EXPECTED_COUNTS.enums}, got ${report.enums.length}`);
  }
  for (const [name, expectedMembers] of expectedEnumMap) {
    const actual = actualEnumMap.get(name);
    if (actual === undefined) {
      add(`missing enum: ${name}`);
      continue;
    }
    const missing = expectedMembers.filter((m) => !actual.includes(m));
    const unexpected = actual.filter((m) => !expectedMembers.includes(m));
    for (const m of missing) add(`enum ${name}: missing member ${m}`);
    for (const m of unexpected) add(`enum ${name}: unexpected member ${m}`);
  }
  for (const name of actualEnumMap.keys()) {
    if (!expectedEnumMap.has(name)) add(`unexpected enum: ${name}`);
  }

  // ---- constraints ------------------------------------------------------------
  if (report.constraints.primary_key !== EXPECTED_COUNTS.primary_key) {
    add(`primary keys: expected ${EXPECTED_COUNTS.primary_key}, got ${report.constraints.primary_key}`);
  }
  if (report.constraints.foreign_key !== EXPECTED_COUNTS.foreign_key) {
    add(`foreign_keys: expected ${EXPECTED_COUNTS.foreign_key}, got ${report.constraints.foreign_key}`);
  }
  if (report.constraints.not_valid_foreign_key !== EXPECTED_COUNTS.not_valid_foreign_key) {
    add(
      `foreign keys NOT VALID: expected ${EXPECTED_COUNTS.not_valid_foreign_key}, got ${report.constraints.not_valid_foreign_key}`,
    );
  }
  const missingFks = EXPECTED_FOREIGN_KEYS.filter((f) => !report.foreign_keys.includes(f));
  const unexpectedFks = report.foreign_keys.filter((f) => !EXPECTED_FOREIGN_KEYS.includes(f));
  for (const f of missingFks) add(`missing foreign key: ${f}`);
  for (const f of unexpectedFks) add(`unexpected foreign key: ${f}`);

  // CHECK class, exactly the established semantics: pg_constraint CHECK
  // entries + NOT NULL column constraints = the documented 591.
  if (report.constraints.check !== EXPECTED_COUNTS.check) {
    add(`CHECK constraints: expected ${EXPECTED_COUNTS.check}, got ${report.constraints.check}`);
  }
  if (report.constraints.not_null_columns !== EXPECTED_COUNTS.not_null_columns) {
    add(`NOT NULL columns: expected ${EXPECTED_COUNTS.not_null_columns}, got ${report.constraints.not_null_columns}`);
  }
  const checkClass = report.constraints.check + report.constraints.not_null_columns;
  if (checkClass !== EXPECTED_COUNTS.check_class_total) {
    add(
      `CHECK-class constraints (CHECK + NOT NULL): expected ${EXPECTED_COUNTS.check_class_total}, got ${checkClass}`,
    );
  }
  if (report.constraints.unique !== EXPECTED_COUNTS.unique) {
    add(`unique constraints: expected ${EXPECTED_COUNTS.unique}, got ${report.constraints.unique}`);
  }

  const missingInvariants = EXPECTED_NAMED_INVARIANTS.filter(
    (name) => !report.named_invariants_present.includes(name),
  );
  for (const name of missingInvariants) add(`missing named invariant constraint: ${name}`);

  // ---- indexes ----------------------------------------------------------------
  if (report.indexes.length !== EXPECTED_COUNTS.indexes) {
    add(`indexes: expected ${EXPECTED_COUNTS.indexes}, got ${report.indexes.length}`);
  }

  // HNSW: exact catalog definitions, not just a count (ADR-018; doc 04).
  if (report.hnsw_indexes.length !== EXPECTED_COUNTS.hnsw) {
    add(`hnsw indexes: expected ${EXPECTED_COUNTS.hnsw}, got ${report.hnsw_indexes.length}`);
  }
  const actualHnswByLabel = new Map(
    report.indexes.filter((i) => i.definition.includes('USING hnsw')).map((i) => [`${i.table}:${i.name}`, i.definition]),
  );
  for (const expected of EXPECTED_HNSW_INDEXES) {
    const label = `${expected.table}:${expected.name}`;
    const actual = actualHnswByLabel.get(label);
    if (actual === undefined) {
      add(`missing hnsw index: ${label}`);
      continue;
    }
    if (actual !== expected.definition) {
      add(`hnsw index ${label}: definition drift\n    expected: ${expected.definition}\n    actual:   ${actual}`);
    }
  }

  // ---- vector columns (ADR-018) ------------------------------------------------
  const missingVectorCols = EXPECTED_VECTOR_COLUMNS.filter((c) => !report.vector_columns.includes(c));
  const unexpectedVectorCols = report.vector_columns.filter((c) => !EXPECTED_VECTOR_COLUMNS.includes(c));
  if (report.vector_columns.length !== EXPECTED_COUNTS.vector_columns) {
    add(`vector columns: expected ${EXPECTED_COUNTS.vector_columns}, got ${report.vector_columns.length}`);
  }
  for (const c of missingVectorCols) add(`missing vector column: ${c}`);
  for (const c of unexpectedVectorCols) add(`unexpected vector column: ${c}`);

  // ---- trigger, functions, view ------------------------------------------------
  if (report.triggers.length !== EXPECTED_COUNTS.triggers) {
    add(`triggers: expected ${EXPECTED_COUNTS.triggers}, got ${report.triggers.length}`);
  }
  const actualTriggers = new Set(report.triggers.map((t) => `${t.table}:${t.name}:${t.function}`));
  for (const t of EXPECTED_TRIGGERS) {
    const label = `${t.table}:${t.name}:${t.function}`;
    if (!actualTriggers.has(label)) add(`missing trigger (or changed function): ${label}`);
  }

  if (report.functions.length !== EXPECTED_COUNTS.functions) {
    add(`functions: expected ${EXPECTED_COUNTS.functions}, got ${report.functions.length}`);
  }
  for (const f of EXPECTED_FUNCTIONS) {
    if (!report.functions.includes(f)) add(`missing function: ${f}`);
  }
  for (const f of report.functions) {
    if (!EXPECTED_FUNCTIONS.includes(f)) add(`unexpected function: ${f}`);
  }

  if (report.views.length !== EXPECTED_COUNTS.views) {
    add(`views: expected ${EXPECTED_COUNTS.views}, got ${report.views.length}`);
  }
  for (const v of EXPECTED_VIEWS) {
    if (!report.views.includes(v)) add(`missing view: ${v}`);
  }
  for (const v of report.views) {
    if (!EXPECTED_VIEWS.includes(v)) add(`unexpected view: ${v}`);
  }

  // ---- RLS --------------------------------------------------------------------
  if (report.rls_enabled_tables.length !== EXPECTED_COUNTS.rls_enabled_tables) {
    add(`rls-enabled tables: expected ${EXPECTED_COUNTS.rls_enabled_tables}, got ${report.rls_enabled_tables.length}`);
  }
  const missingRls = EXPECTED_RLS_POLICIES.filter((p) => !report.rls_enabled_tables.includes(p.table));
  const unexpectedRls = report.rls_enabled_tables.filter(
    (t) => !EXPECTED_RLS_POLICIES.some((p) => p.table === t),
  );
  for (const p of missingRls) add(`table not RLS-enabled: ${p.table}`);
  for (const t of unexpectedRls) add(`unexpectedly RLS-enabled table: ${t}`);

  if (report.rls_policies.length !== EXPECTED_COUNTS.rls_policies) {
    add(`rls policies: expected ${EXPECTED_COUNTS.rls_policies}, got ${report.rls_policies.length}`);
  }
  const actualPolicies = new Set(report.rls_policies.map((p) => `${p.table}:${p.policy}`));
  for (const p of EXPECTED_RLS_POLICIES) {
    const label = `${p.table}:${p.policy}`;
    if (!actualPolicies.has(label)) add(`missing rls policy: ${label}`);
  }
  for (const p of report.rls_policies) {
    const label = `${p.table}:${p.policy}`;
    if (!EXPECTED_RLS_POLICIES.some((e) => `${e.table}:${e.policy}` === label)) {
      add(`unexpected rls policy: ${label}`);
    }
  }
  if (report.rls_tables_without_policy.length !== EXPECTED_COUNTS.rls_tables_without_policy) {
    add(
      `rls-enabled tables without a policy: expected ${EXPECTED_COUNTS.rls_tables_without_policy}, got ${report.rls_tables_without_policy.length}`,
    );
    for (const t of report.rls_tables_without_policy) add(`rls-enabled table without a policy: ${t}`);
  }

  // ---- extensions (names only; versions are platform properties) ---------------
  const actualExtensions = new Set(report.extensions.map((e) => e.name));
  for (const name of EXPECTED_EXTENSIONS) {
    if (!actualExtensions.has(name)) add(`missing extension: ${name}`);
  }

  return failures;
}

function formatReportCounts(report: IntrospectionReport): string {
  return [
    `tables=${report.tables.length}`,
    `enums=${report.enums.length}`,
    `foreign_keys=${report.constraints.foreign_key}`,
    `check_class=${report.constraints.check + report.constraints.not_null_columns}`,
    `indexes=${report.indexes.length}`,
    `hnsw=${report.hnsw_indexes.length}`,
    `triggers=${report.triggers.length}`,
    `functions=${report.functions.length}`,
    `views=${report.views.length}`,
    `rls=${report.rls_enabled_tables.length}/${report.rls_policies.length}`,
  ].join(' ');
}

async function main(): Promise<void> {
  const databaseUrl = process.env['DATABASE_URL'];
  if (!databaseUrl || databaseUrl.length === 0) {
    process.stderr.write('assert-schema: DATABASE_URL is not set\n');
    process.exit(1);
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const report = await introspectSchema(client);
    const failures = assertSchemaFidelity(report);
    if (failures.length > 0) {
      process.stdout.write(`Schema fidelity FAILED on database "${report.current_database}":\n`);
      for (const f of failures) process.stdout.write(`- ${f}\n`);
      process.stdout.write(`introspected: ${formatReportCounts(report)}\n`);
      process.exitCode = 1;
      return;
    }
    process.stdout.write(`Schema fidelity PASS on database "${report.current_database}": ${formatReportCounts(report)}\n`);
  } finally {
    await client.end().catch(() => undefined);
  }
}

const isDirectExecution =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  main().catch((error: unknown) => {
    process.stderr.write(`assert-schema: FAILED: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
