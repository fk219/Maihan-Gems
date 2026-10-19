#!/usr/bin/env node
/**
 * scripts/generate-redirects.mjs
 *
 * Deploy-time generator for apps/web/src/lib/redirects-rows.generated.ts
 * (technical_design/34 §6-7). Reads the materialised `redirects` table from
 * the migrated database and rewrites the generated module with the real rows,
 * so the edge proxy holds the full 44,218-URL mapping in memory without a
 * per-request database read.
 *
 * Run against a MIGRATED database (the corpus stage `cms-redirects` populates
 * the table):
 *
 *   node scripts/generate-redirects.mjs
 *
 * Refuses to write an empty module when the table has no rows — the committed
 * placeholder stays in place and the deploy fails loudly instead of silently
 * shipping a parity hole.
 */
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(
  join(fileURLToPath(dirname(import.meta.url)), '..', 'packages', 'db', 'package.json'),
);
const { createPool } = require('@maihan/db');

const databaseUrl = process.env['DATABASE_URL'];
if (!databaseUrl) {
  console.error('generate-redirects: DATABASE_URL is required.');
  process.exit(1);
}

const pool = createPool(databaseUrl, { max: 2 });
try {
  const res = await pool.query(
    'SELECT from_path::text AS from_path, to_path::text AS to_path, status_code AS status_code FROM redirects ORDER BY from_path',
  );
  const rows = res.rows;
  if (rows.length === 0) {
    console.error(
      'generate-redirects: the redirects table has 0 rows — run the corpus migration (cms-redirects stage) first; refusing to overwrite the placeholder with an empty module.',
    );
    process.exit(1);
  }

  const body = `/**
 * apps/web/src/lib/redirects-rows.generated.ts
 *
 * GENERATED at deploy time by scripts/generate-redirects.mjs from the
 * materialised \`redirects\` table (RedirectRow shape). DO NOT EDIT BY HAND.
 * ${rows.length} rows generated from DATABASE_URL at ${new Date().toISOString()}.
 */
import type { RedirectRow } from './redirects.js';

export const GENERATED_REDIRECT_ROWS: readonly RedirectRow[] = Object.freeze([
${rows
  .map(
    (r) =>
      `  { from_path: ${JSON.stringify(r.from_path)}, to_path: ${JSON.stringify(
        r.to_path ?? '',
      )}, status_code: ${Number(r.status_code) || 301} },`,
  )
  .join('\n')}
]);
`;
  const target = join(
    fileURLToPath(dirname(import.meta.url)),
    '..',
    'apps',
    'web',
    'src',
    'lib',
    'redirects-rows.generated.ts',
  );
  writeFileSync(target, body);
  console.log(`generate-redirects: wrote ${rows.length} rows to ${target}`);
} finally {
  await pool.end().catch(() => undefined);
}
