/**
 * packages/db — PostgreSQL catalog introspection (Phase 1 Tasks 4 and 5).
 *
 * The single source of introspection semantics for this package:
 *   - verify-schema.ts prints the report as JSON (machine-comparable).
 *   - assert-schema.ts asserts the report against expected-schema.ts.
 *
 * Two consumers, one set of queries: the "591 CHECK" counting semantics
 * (pg_constraint CHECK entries plus pg_attribute NOT NULL columns) are defined
 * HERE and nowhere else, exactly as established in Task 4.
 *
 * Read-only. Never prints connection material.
 */
import type pg from 'pg';

/** The 9 named invariant constraints (AGENTS.md section 7; doc 04). */
export const NAMED_INVARIANTS = [
  'gemstones_kind_ck',
  'gemstones_pair_weight_ck',
  'products_composition_ck',
  'products_no_pair_on_non_earrings_ck',
  'products_earrings_need_pair_ck',
  'dyo_one_stone_ck',
  'dyo_pair_is_earrings_ck',
  'certificates_subject_ck',
  'dyo_configurations_customer_fk',
] as const;

export interface IntrospectionReport {
  postgres_version_short: string;
  current_database: string;
  current_schema: string;
  extensions: { name: string; version: string }[];
  tables: string[];
  enums: { name: string; member_count: number }[];
  enum_members: { name: string; members: string[] }[];
  constraints: {
    primary_key: number;
    foreign_key: number;
    unique: number;
    check: number;
    not_null_columns: number;
    not_valid_foreign_key: number;
  };
  foreign_keys: string[];
  named_invariants_present: string[];
  named_invariants_missing: string[];
  indexes: { name: string; table: string; definition: string }[];
  hnsw_indexes: string[];
  vector_columns: string[];
  triggers: { table: string; name: string; function: string }[];
  functions: string[];
  views: string[];
  rls_enabled_tables: string[];
  rls_policies: { table: string; policy: string }[];
  rls_tables_without_policy: string[];
}

/** Introspects the public schema of the database the client is connected to. */
export async function introspectSchema(client: pg.Client): Promise<IntrospectionReport> {
  const report: IntrospectionReport = {
    postgres_version_short: '',
    current_database: '',
    current_schema: '',
    extensions: [],
    tables: [],
    enums: [],
    enum_members: [],
    constraints: { primary_key: 0, foreign_key: 0, unique: 0, check: 0, not_null_columns: 0, not_valid_foreign_key: 0 },
    foreign_keys: [],
    named_invariants_present: [],
    named_invariants_missing: [],
    indexes: [],
    hnsw_indexes: [],
    vector_columns: [],
    triggers: [],
    functions: [],
    views: [],
    rls_enabled_tables: [],
    rls_policies: [],
    rls_tables_without_policy: [],
  };

  const identity = await client.query<{ version: string; db: string; schema: string }>(
    'SELECT version() AS version, current_database() AS db, current_schema() AS schema',
  );
  const id = identity.rows[0];
  if (!id) throw new Error('identity probe returned no rows');
  report.postgres_version_short = id.version.split(' ').slice(0, 2).join(' ');
  report.current_database = id.db;
  report.current_schema = id.schema;

  report.extensions = (
    await client.query<{ name: string; version: string }>(
      'SELECT extname AS name, extversion AS version FROM pg_extension ORDER BY extname',
    )
  ).rows;

  report.tables = (
    await client.query<{ name: string }>(
      `SELECT tablename AS name FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
    )
  ).rows.map((r) => r.name);

  // Enum membership is captured alongside the count so drift can name the
  // missing or unexpected member, not just the changed count. The label is
  // cast to text because pg_enum.enumlabel is type `name` and node-postgres
  // does not parse name[] (OID 1003) — without the cast the client receives
  // the raw array literal string.
  const enumRows = await client.query<{ name: string; members: string[] }>(
    `SELECT t.typname AS name,
            array_agg(e.enumlabel::text ORDER BY e.enumsortorder) AS members
     FROM pg_type t
     JOIN pg_enum e ON e.enumtypid = t.oid
     JOIN pg_namespace n ON n.oid = t.typnamespace
     WHERE n.nspname = 'public'
     GROUP BY t.typname ORDER BY t.typname`,
  );
  report.enums = enumRows.rows.map((r) => ({ name: r.name, member_count: r.members.length }));
  report.enum_members = enumRows.rows.map((r) => ({ name: r.name, members: [...r.members] }));

  const counts = await client.query<{ kind: string; count: string; not_valid: string }>(
    `SELECT c.contype::text AS kind,
            count(*)::text AS count,
            count(*) FILTER (WHERE c.contype = 'f' AND c.convalidated = false)::text AS not_valid
     FROM pg_constraint c
     JOIN pg_class rel ON rel.oid = c.conrelid
     JOIN pg_namespace n ON n.oid = rel.relnamespace
     WHERE n.nspname = 'public'
     GROUP BY c.contype`,
  );
  for (const row of counts.rows) {
    if (row.kind === 'p') report.constraints.primary_key = Number(row.count);
    if (row.kind === 'f') {
      report.constraints.foreign_key = Number(row.count);
      report.constraints.not_valid_foreign_key = Number(row.not_valid);
    }
    if (row.kind === 'u') report.constraints.unique = Number(row.count);
    if (row.kind === 'c') report.constraints.check = Number(row.count);
  }

  // The architecture's "591 CHECK" figure reconciles as CHECK constraints
  // plus NOT NULL column constraints: 28 + 563 = 591 on this DDL (PG16 keeps
  // NOT NULL in pg_attribute, not pg_constraint). Reported separately so the
  // schema-fidelity assertion can check both classes explicitly.
  report.constraints.not_null_columns = Number(
    (
      await client.query<{ count: string }>(
        `SELECT count(*)::text AS count
         FROM pg_attribute a
         JOIN pg_class c ON c.oid = a.attrelid
         JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public' AND c.relkind = 'r'
           AND a.attnum > 0 AND NOT a.attisdropped AND a.attnotnull`,
      )
    ).rows[0]?.count ?? 0,
  );

  report.foreign_keys = (
    await client.query<{ name: string }>(
      `SELECT c.conname AS name
       FROM pg_constraint c
       JOIN pg_class rel ON rel.oid = c.conrelid
       JOIN pg_namespace n ON n.oid = rel.relnamespace
       WHERE n.nspname = 'public' AND c.contype = 'f'
       ORDER BY c.conname`,
    )
  ).rows.map((r) => r.name);

  const present = await client.query<{ name: string }>(
    `SELECT c.conname AS name
     FROM pg_constraint c
     JOIN pg_class rel ON rel.oid = c.conrelid
     JOIN pg_namespace n ON n.oid = rel.relnamespace
     WHERE n.nspname = 'public' AND c.conname = ANY($1::text[])
     ORDER BY c.conname`,
    [NAMED_INVARIANTS as unknown as string[]],
  );
  report.named_invariants_present = present.rows.map((r) => r.name);
  report.named_invariants_missing = NAMED_INVARIANTS.filter(
    (name) => !report.named_invariants_present.includes(name),
  );

  const indexes = await client.query<{ name: string; table: string; definition: string }>(
    `SELECT indexname AS name, tablename AS table, indexdef AS definition
     FROM pg_indexes WHERE schemaname = 'public' ORDER BY indexname`,
  );
  report.indexes = indexes.rows;
  report.hnsw_indexes = indexes.rows
    .filter((r) => r.definition.includes('USING hnsw'))
    .map((r) => `${r.table}:${r.name}`);

  report.vector_columns = (
    await client.query<{ label: string }>(
      `SELECT rel.relname || '.' || att.attname AS label
       FROM pg_attribute att
       JOIN pg_class rel ON rel.oid = att.attrelid
       JOIN pg_namespace n ON n.oid = rel.relnamespace
       JOIN pg_type t ON t.oid = att.atttypid
       WHERE n.nspname = 'public' AND t.typname = 'vector' AND att.attisdropped = false
         AND rel.relkind = 'r'
       ORDER BY 1`,
    )
  ).rows.map((r) => r.label);

  report.triggers = (
    await client.query<{ table: string; name: string; function: string }>(
      `SELECT rel.relname AS table, trg.tgname AS name, pr.proname AS function
       FROM pg_trigger trg
       JOIN pg_class rel ON rel.oid = trg.tgrelid
       JOIN pg_namespace n ON n.oid = rel.relnamespace
       JOIN pg_proc pr ON pr.oid = trg.tgfoid
       WHERE n.nspname = 'public' AND NOT trg.tgisinternal
       ORDER BY rel.relname, trg.tgname`,
    )
  ).rows;

  // User functions only: extensions installed into the public schema expose
  // hundreds of support functions through information_schema. The locked
  // schema declares exactly 2 user functions (gemstones_search_document_fn,
  // match_knowledge_chunks).
  report.functions = (
    await client.query<{ name: string }>(
      `SELECT p.proname AS name
       FROM pg_proc p
       JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'public'
         AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')
       ORDER BY p.proname`,
    )
  ).rows.map((r) => r.name);

  report.views = (
    await client.query<{ name: string }>(
      `SELECT c.relname AS name
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relkind IN ('v','m')
         AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = c.oid AND d.deptype = 'e')
       ORDER BY 1`,
    )
  ).rows.map((r) => r.name);

  report.rls_enabled_tables = (
    await client.query<{ name: string }>(
      `SELECT rel.relname AS name
       FROM pg_class rel
       JOIN pg_namespace n ON n.oid = rel.relnamespace
       WHERE n.nspname = 'public' AND rel.relkind = 'r' AND rel.relrowsecurity = true
       ORDER BY rel.relname`,
    )
  ).rows.map((r) => r.name);

  report.rls_policies = (
    await client.query<{ table: string; policy: string }>(
      `SELECT pol.polrelid::regclass::text AS table, pol.polname AS policy
       FROM pg_policy pol
       JOIN pg_class rel ON rel.oid = pol.polrelid
       JOIN pg_namespace n ON n.oid = rel.relnamespace
       WHERE n.nspname = 'public'
       ORDER BY 1, 2`,
    )
  ).rows;

  report.rls_tables_without_policy = report.rls_enabled_tables.filter(
    (table) => !report.rls_policies.some((p) => `"${table}"` === p.table || p.table.endsWith(`.${table}`) || p.table === table),
  );

  return report;
}
