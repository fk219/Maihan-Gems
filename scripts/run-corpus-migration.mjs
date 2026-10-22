#!/usr/bin/env node
/**
 * scripts/run-corpus-migration.mjs
 *
 * P2-1 launcher — the FULL corpus migration + redirect generation in one
 * command, with the artifact-integrity pre-check up front so a diverged
 * archive is diagnosed in one place (the gate's own refusal is the authority;
 * this wrapper only reports it clearly).
 *
 *   DATABASE_URL=… node scripts/run-corpus-migration.mjs
 *
 * BLOCKED UNTIL (client decision, 2026-10-21):
 *   The `crawler.sqlite` unit diverged from docs/evidence/MANIFEST.md
 *   (wal 0 → 26,157,912 B post-recording). Either restore the pristine unit
 *   or amend the manifest first — the verify-artifacts gate will refuse
 *   otherwise, and rightly so.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const repoRoot = resolve(process.cwd());
const archiveRoot = (() => {
  const override = process.env['NATURALGEMSTONES_ROOT'];
  if (override) return override;
  const shallow = join(repoRoot, 'naturalgemstones');
  if (existsSync(join(shallow, 'reverse_engineered'))) return shallow;
  return join(shallow, 'naturalgemstones');
})();

if (!process.env['DATABASE_URL']) {
  console.error('corpus: DATABASE_URL is required.');
  process.exit(1);
}

const MANIFEST = join(repoRoot, 'docs', 'evidence', 'MANIFEST.md');

/** Verify the whole SQLite unit against the manifest digests BEFORE launching. */
function sqliteUnitIntegrity() {
  const rows = readFileSync(MANIFEST, 'utf8')
    .split('\n')
    .filter((l) => l.includes('`naturalgemstones/crawler.sqlite'));
  const problems = [];
  for (const line of rows) {
    const match = /`naturalgemstones\/(crawler\.sqlite(?:-wal|-shm)?)`.*`([a-f0-9]{64})`/.exec(line);
    if (match === null) continue;
    const file = join(archiveRoot, match[1]);
    const expected = match[2];
    if (!existsSync(file)) {
      problems.push(`MISSING ${match[1]} at ${file}`);
      continue;
    }
    const actual = createHash('sha256').update(readFileSync(file)).digest('hex');
    if (actual !== expected) {
      problems.push(
        `MISMATCH ${match[1]}: expected ${expected.slice(0, 12)}…, actual ${actual.slice(0, 12)}… (size ${statSync(file).size})`,
      );
    }
  }
  if (problems.length > 0) {
    return {
      ok: false,
      detail:
        'the crawler.sqlite unit diverged from the manifest — restore the pristine unit from durable storage, ' +
        'or amend docs/evidence/MANIFEST.md (dated re-record) before running the corpus:\n    ' +
        problems.join('\n    '),
    };
  }
  return { ok: true, detail: 'sqlite unit matches the manifest' };
}

const integrity = sqliteUnitIntegrity();
if (!integrity.ok) {
  console.error(`corpus: REFUSED — ${integrity.detail}`);
  process.exit(2);
}
console.log(`corpus: artifact pre-check OK (${integrity.detail})`);

// 1. The staged migration chain (verify-artifacts → … → verify-gates).
const run = spawnSync(
  process.execPath,
  [join(repoRoot, 'tools/migrate/dist/cli.js'), 'run', '--manifest', MANIFEST, '--archive-root', archiveRoot],
  { stdio: 'inherit', env: process.env },
);
if (run.status !== 0) {
  console.error(`corpus: migration chain exited ${run.status}`);
  process.exit(run.status ?? 1);
}

// 2. The 44,218-row redirect generation + edge module.
const redirects = spawnSync(process.execPath, [join(repoRoot, 'scripts/generate-redirects.mjs')], {
  stdio: 'inherit',
  env: process.env,
});
if (redirects.status !== 0) {
  console.error(`corpus: redirect generation exited ${redirects.status}`);
  process.exit(redirects.status ?? 1);
}

console.log('corpus: migration + redirects COMPLETE. Next: retire fixture-only surfaces, run the V1–V22 gate report.');
