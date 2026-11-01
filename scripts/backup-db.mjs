#!/usr/bin/env node
/**
 * Database backup: pg_dump custom format + SHA-256.
 *
 * Local dev (the compose container) uses `docker exec maihan-dev-db pg_dump`.
 * Any other DATABASE_URL requires pg_dump on PATH. Output lands in
 * backups/ (gitignored). Schedule daily on the host/worker; restore with
 * `pg_restore --clean --if-exists -d <db> <file>`.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('FATAL: DATABASE_URL is required');
  process.exit(2);
}

const parsed = new URL(url);
const database = parsed.pathname.replace(/^\//, '') || 'postgres';
const user = decodeURIComponent(parsed.username || 'postgres');
const host = parsed.hostname;
const port = parsed.port || '5432';
const localDocker = (host === '127.0.0.1' || host === 'localhost') && port === '5433';

const dir = process.env.BACKUP_DIR ?? path.join(root, 'backups');
mkdirSync(dir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const file = path.join(dir, `${database}_${stamp}.dump`);

const has = (bin) => spawnSync('sh', ['-c', `command -v ${bin}`], { stdio: 'ignore' }).status === 0;

let dump;
if (localDocker && has('docker')) {
  dump = spawnSync('docker', ['exec', 'maihan-dev-db', 'pg_dump', '-U', user, '-d', database, '-Fc'], { maxBuffer: 1024 * 1024 * 1024 });
} else if (has('pg_dump')) {
  dump = spawnSync('pg_dump', ['-Fc', '-f', file, '--no-owner', '--no-privileges', url], { maxBuffer: 1024 * 1024 * 1024 });
} else {
  console.error('FATAL: pg_dump not found and the database is not the local compose container');
  process.exit(2);
}

if (dump.status !== 0) {
  console.error(String(dump.stderr ?? 'pg_dump failed'));
  process.exit(dump.status ?? 1);
}

if (localDocker && has('docker')) {
  const { writeFileSync } = await import('node:fs');
  writeFileSync(file, dump.stdout);
}

const sha = createHash('sha256').update(readFileSync(file)).digest('hex');
const bytes = statSync(file).size;
console.log(JSON.stringify({ file: path.relative(root, file), bytes, sha256: sha }));
