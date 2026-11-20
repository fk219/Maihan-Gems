/**
 * apps/web/src/cli/create-admin.ts
 *
 * ADR-027 — bootstrap the first administrative actor.
 *
 * There is deliberately no HTTP endpoint that creates the first admin: that
 * would be an unauthenticated privilege-escalation surface. The first actor is
 * created out of band, from the environment, once.
 *
 *   ADMIN_SEED_EMAIL=... ADMIN_SEED_PASSWORD=... pnpm --filter @maihan/web run create-admin
 *
 * Idempotent: an existing email is reported and left unchanged.
 */
import { loadRuntimeConfig } from '@maihan/config';
import { hashPassword } from '@maihan/domain';
import {
  createCatalogDatabase,
  createPool,
  createUser,
  findUserByEmail,
  type AdminRoleName,
} from '@maihan/db';

const ROLES = new Set<string>([
  'ADMIN_SUPER',
  'CATALOG_MANAGER',
  'CONTENT_EDITOR',
  'CONTENT_PUBLISHER',
  'COMMERCE_OPERATOR',
  'TRUST_REVIEWER',
  'CONCIERGE_AGENT',
  'AI_OPERATIONS',
  'MIGRATION_ENGINEER',
  'READ_ONLY_ANALYST',
]);

async function main(): Promise<void> {
  const config = loadRuntimeConfig();
  const email = config.adminSeedEmail;
  const password = config.adminSeedPassword;
  const role = (process.argv[2] ?? 'ADMIN_SUPER').toUpperCase();

  if (email === null || password === null) {
    process.stderr.write(
      'create-admin: ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD are required in the environment.\n',
    );
    process.exitCode = 1;
    return;
  }
  if (!ROLES.has(role)) {
    process.stderr.write(`create-admin: unknown role ${role}\n`);
    process.exitCode = 1;
    return;
  }
  if (password.length < 12) {
    process.stderr.write('create-admin: password must be at least 12 characters.\n');
    process.exitCode = 1;
    return;
  }

  const pool = createPool(config.databaseUrl);
  try {
    const db = createCatalogDatabase(pool);
    const existing = await findUserByEmail(db, email);
    if (existing !== null) {
      process.stdout.write(`create-admin: ${email} already exists (id ${existing.id}); no change.\n`);
      return;
    }
    const user = await createUser(db, {
      email,
      passwordHash: await hashPassword(password),
      displayName: email,
      adminRole: role as AdminRoleName,
    });
    process.stdout.write(`create-admin: created ${user.email} as ${role} (id ${user.id}).\n`);
  } finally {
    await pool.end();
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'unknown error';
  process.stderr.write(`create-admin: ${message}\n`);
  process.exitCode = 1;
});
