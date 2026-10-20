/**
 * packages/db/src/seed/bootstrap-admin.ts
 *
 * Explicit, audited first-admin provisioning.
 *
 * This is intentionally NOT run by any migration or seed. A clean production
 * deployment has no admin account otherwise (registration accepts only
 * CUSTOMER/VENDOR, and the production header seam is disabled).
 *
 * Usage:
 *   MAIHAN_BOOTSTRAP_ADMIN_EMAIL=admin@example.com \
 *   MAIHAN_BOOTSTRAP_ADMIN_PASSWORD='a-long-random-password' \
 *   pnpm --filter @maihan/db run bootstrap:admin
 *
 * Safety:
 *   - requires both env variables;
 *   - refuses a password shorter than 12 characters;
 *   - refuses if the email already has credentials (no silent promotion);
 *   - writes an audit_logs row with the created role;
 *   - idempotent only in the sense that a second run fails safely.
 */
import pg from 'pg';
import { hashPassword } from '../auth/auth-repository.js';

const { Client } = pg;

async function main(): Promise<void> {
  const databaseUrl = process.env['DATABASE_URL']?.trim() ?? '';
  const email = (process.env['MAIHAN_BOOTSTRAP_ADMIN_EMAIL'] ?? '').trim().toLowerCase();
  const password = process.env['MAIHAN_BOOTSTRAP_ADMIN_PASSWORD'] ?? '';

  if (!databaseUrl) throw new Error('DATABASE_URL is required.');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('MAIHAN_BOOTSTRAP_ADMIN_EMAIL must be a valid email address.');
  }
  if (password.length < 12) {
    throw new Error('MAIHAN_BOOTSTRAP_ADMIN_PASSWORD must be at least 12 characters.');
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query<{ id: string }>(
      `SELECT ac.customer_id::text AS id
         FROM auth_credentials ac
        WHERE lower(ac.email::text) = $1
        LIMIT 1`,
      [email],
    );
    if (existing.rows.length > 0) {
      throw new Error('An account already has credentials for this email; refusing to promote silently.');
    }

    const customer = await client.query<{ id: string }>(
      `SELECT id::text AS id FROM customers
        WHERE lower(email::text) = $1 AND deleted_at IS NULL
        LIMIT 1`,
      [email],
    );

    let customerId: string;
    if (customer.rows.length > 0) {
      customerId = customer.rows[0]!.id;
    } else {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO customers (identity_user_id, email, first_name, state)
         VALUES ($1, $2, 'Administrator', 'ACTIVE')
         RETURNING id::text AS id`,
        [`usr_bootstrap_${Date.now().toString(36)}`, email],
      );
      customerId = inserted.rows[0]!.id;
      await client.query(
        `INSERT INTO customer_profiles (customer_id) VALUES ($1::uuid) ON CONFLICT (customer_id) DO NOTHING`,
        [customerId],
      );
    }

    await client.query(
      `INSERT INTO auth_credentials
         (customer_id, email, password_hash, role, failed_attempts, password_changed_at)
       VALUES ($1::uuid, $2, $3, 'ADMIN_SUPER', 0, now())`,
      [customerId, email, hashPassword(password)],
    );

    await client.query(
      `INSERT INTO audit_logs
         (actor_type, actor_id, action, entity_type, entity_id, after_state, reason)
       VALUES ('SYSTEM', NULL, 'ADMIN_BOOTSTRAPPED', 'customer', $1::uuid, $2::jsonb,
               'Explicit first-admin provisioning via bootstrap-admin CLI')`,
      [customerId, JSON.stringify({ email, role: 'ADMIN_SUPER' })],
    );

    await client.query('COMMIT');
    process.stdout.write(`bootstrap-admin: ADMIN_SUPER created for ${email} (${customerId})\n`);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    await client.end().catch(() => undefined);
  }
}

main().catch((error: unknown) => {
  process.stderr.write(
    `bootstrap-admin: FAILED: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});
