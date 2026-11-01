#!/usr/bin/env node
/**
 * Restore drill: load the newest backup into a scratch database, verify the
 * core counts, then drop it. Never touches the live database.
 *
 *   pnpm run db:restore-drill [path-to-dump]
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = process.env.BACKUP_DIR ?? path.join(root, 'backups');
const explicit = process.argv[2];
const latest = readdirSync(dir)
  .filter((f) => f.endsWith('.dump'))
  .map((f) => path.join(dir, f))
  .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0];
const dump = explicit ? path.resolve(explicit) : (latest ?? '');

if (!dump || !statSync(dump, { throwIfNoEntry: false })) {
  console.error(`FATAL: no dump found in ${dir}`);
  process.exit(2);
}

const container = process.env.DB_CONTAINER ?? 'maihan-dev-db';
const scratch = 'maihan_restore_drill';
const psql = (...args) => {
  const res = spawnSync('docker', ['exec', container, 'psql', '-U', 'postgres', ...args], { encoding: 'utf8' });
  if (res.status !== 0) throw new Error(res.stderr || 'psql failed');
  return res.stdout.trim();
};

console.log(`drill: restoring ${path.relative(root, dump)} into ${scratch}`);
psql('-d', 'postgres', '-c', `DROP DATABASE IF EXISTS ${scratch}`);
psql('-d', 'postgres', '-c', `CREATE DATABASE ${scratch}`);

const restored = spawnSync(
  'docker',
  ['exec', '-i', container, 'pg_restore', '-U', 'postgres', '-d', scratch, '--no-owner', '--no-privileges'],
  { input: readFileSync(dump), encoding: 'utf8' },
);
if (restored.status !== 0) {
  console.error(restored.stderr);
  psql('-d', 'postgres', '-c', `DROP DATABASE IF EXISTS ${scratch}`);
  process.exit(restored.status ?? 1);
}

const counts = psql('-d', scratch, '-tAc', `
  SELECT json_build_object(
    'tables', (SELECT count(*) FROM pg_tables WHERE schemaname = 'fresh'),
    'migrations', (SELECT count(*) FROM fresh.schema_migrations),
    'gemstones', (SELECT count(*) FROM fresh.gemstones),
    'settings', (SELECT count(*) FROM fresh.settings),
    'products', (SELECT count(*) FROM fresh.products),
    'orders', (SELECT count(*) FROM fresh.orders)
  )::text
`);

const parsed = JSON.parse(counts);
const ok = parsed.tables >= 50 && parsed.migrations >= 1 && parsed.gemstones > 0 && parsed.settings > 0;
psql('-d', 'postgres', '-c', `DROP DATABASE IF EXISTS ${scratch}`);
console.log(JSON.stringify({ ok, ...parsed }, null, 2));
if (!ok) process.exit(1);
