/**
 * packages/db/src/auth/auth-repository.spec.ts
 *
 * Live-Postgres regressions for the P1-5 identity hygiene rule: one-time
 * tokens (email verification / password reset) may travel only in the QUEUED
 * email job payload and in the dev-seam sandbox response — they must NEVER
 * be embedded in the in-app notifications that the account notifications API
 * exposes.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createCatalogDatabase } from '../catalog/executor.js';
import {
  registerAccount,
  recordNotification,
  listCustomerNotifications,
} from './auth-repository.js';

function getDatabaseUrl(): string | undefined {
  if (process.env['DATABASE_URL']) return process.env['DATABASE_URL'];
  const envPath = resolve(process.cwd(), '../../.env');
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('DATABASE_URL=')) {
        return trimmed.slice('DATABASE_URL='.length).trim().replace(/^['"]|['"]$/g, '');
      }
    }
  }
  return undefined;
}

describe('auth token hygiene (live database, DB-gated)', () => {
  let pool: Pool | undefined;
  let db: ReturnType<typeof createCatalogDatabase> | undefined;
  let hasDb = false;
  let customerId: string | undefined;
  let verificationToken = '';
  let customerEmail = '';

  beforeAll(async () => {
    const url = getDatabaseUrl();
    if (!url) return;
    try {
      pool = new Pool({ connectionString: url, max: 2, connectionTimeoutMillis: 5000 });
      await pool.query('SELECT 1');
      hasDb = true;
    } catch {
      hasDb = false;
      return;
    }
    db = createCatalogDatabase(pool);
    const suffix = Date.now().toString(36);
    customerEmail = `hygiene-${suffix}@example.test`;
    const result = await registerAccount(db, {
      email: customerEmail,
      password: 'C0rrect-Horse-Battery',
      first_name: 'Hygiene',
      last_name: 'Test',
      role: 'CUSTOMER',
    });
    customerId = result.actor.customer_id;
    verificationToken = result.verification_token;
  });

  afterAll(async () => {
    if (pool && customerId) {
      try {
        await pool.query('DELETE FROM customers WHERE id = $1', [customerId]);
      } catch {
        // tolerated: cleanup failures don't fail the run
      }
    }
    if (pool) await pool.end().catch(() => {});
  });

  it('stores no raw token inside in-app notifications after registration', async () => {
    if (!hasDb || !db || !customerId || !verificationToken) return;
    const items = await listCustomerNotifications(db, customerId);
    expect(items.length).toBeGreaterThanOrEqual(1);
    for (const item of items) {
      const serialized = JSON.stringify(item);
      expect(serialized).not.toContain(verificationToken);
      expect(serialized).not.toContain('?token=');
    }
  });

  it('routes the raw token only into the queued email payload', async () => {
    if (!hasDb || !db || !pool || !customerId || !verificationToken) return;
    const res = await pool.query(
      `SELECT payload FROM jobs WHERE job_type = 'notify.email' AND payload->>'text' LIKE $1 ORDER BY created_at DESC LIMIT 1`,
      [`%Verify your email with token: ${verificationToken}%`],
    );
    expect(res.rowCount).toBeGreaterThanOrEqual(1);
    const payload = res.rows[0]!.payload as { text: string };
    expect(payload.text).toContain(verificationToken);
  });

  it('recordNotification honours the email-only body override', async () => {
    if (!hasDb || !db || !customerId) return;
    const fakeToken = 'EMAIL_ONLY_TOKEN_7d1f9';
    await recordNotification(db, {
      customer_id: customerId,
      email: customerEmail,
      kind: 'PASSWORD_RESET',
      subject: 'hygiene test email-only override',
      body: 'In-app copy without the secret.',
      email_body: `Token in email only: ${fakeToken}`,
      metadata: { reset_cta: '/account/reset-password' },
      dedupe_key: `hygiene-email-only:${Date.now()}`,
    });
    const items = await listCustomerNotifications(db, customerId);
    const mine = items.find((item) => item.subject === 'hygiene test email-only override');
    expect(mine).toBeDefined();
    expect(mine!.body).toContain('In-app copy without the secret.');
    expect(mine!.body).not.toContain(fakeToken);
  });
});
