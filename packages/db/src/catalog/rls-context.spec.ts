/**
 * RLS runtime session proof (M-02 remediation).
 *
 * The 6 RLS policies in 0016_rls.sql key on `current_setting('app.user_subject', ...)`
 * and friends. This suite proves the two runtime seams that apply those
 * settings — `withRlsContext` (drizzle transaction) and `withPoolRlsSession`
 * (raw pool client) — actually set the GUCs inside their work, and that the
 * transaction-local settings are GONE after the boundary (no leakage between
 * requests sharing a pool).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createCatalogDatabase,
  createPool,
  sql,
  withPoolRlsSession,
  withRlsContext,
  type Pool,
} from '../index.js';

const DATABASE_URL = process.env['DATABASE_URL'] ?? '';
let pool: Pool | null = null;
let reachable = false;

beforeAll(async () => {
  if (!DATABASE_URL) return;
  pool = createPool(DATABASE_URL, { max: 1 });
  try {
    await pool.query('SELECT 1');
    reachable = true;
  } catch {
    reachable = false;
  }
});

afterAll(async () => {
  if (pool) await pool.end().catch(() => undefined);
});

describe('RLS session context (runtime seam)', () => {
  it('withRlsContext sets the app.* GUCs inside its transaction and leaves no residue', (ctx) => {
    if (!reachable || !pool) return ctx.skip();
    return theWithRlsContextTest();
  });

  async function theWithRlsContextTest(): Promise<void> {
    const db = createCatalogDatabase(pool!);
    let seenInside: Record<string, string | null> | undefined;
    await withRlsContext(
      db,
      { userSubject: 'usr_rls_test_subject', anonymousSessionId: 'anon_42', isStaff: true },
      async (tx) => {
        const res = await tx.execute(sql`
          SELECT
            current_setting('app.user_subject', true) AS subject,
            current_setting('app.anonymous_session_id', true) AS anon,
            current_setting('app.staff', true) AS staff
        `);
        seenInside = res.rows[0] as Record<string, string | null>;
      },
    );
    expect(seenInside?.['subject']).toBe('usr_rls_test_subject');
    expect(seenInside?.['anon']).toBe('anon_42');
    expect(seenInside?.['staff']).toBe('true');

    // Transaction-local settings are gone once the transaction committed.
    // PG's current_setting(…, missing_ok=TRUE) reports an UNSET setting as
    // the empty string (not SQL NULL).
    const after = await db.execute(sql`
      SELECT current_setting('app.user_subject', true) AS subject
    `);
    expect((after.rows[0] as { subject: string | null }).subject).toBe('');
  }

  it('withPoolRlsSession applies the GUCs and rolls back cleanly on throw', (ctx) => {
    if (!reachable || !pool) return ctx.skip();
    return theWithPoolRlsSessionTest();
  });

  async function theWithPoolRlsSessionTest(): Promise<void> {
    await expect(
      withPoolRlsSession(pool!, { userSubject: 'usr_rls_pool_subject' }, async (client) => {
        const res = await (client as { query: (t: string) => Promise<{ rows: unknown[] }> }).query(
          `SELECT current_setting('app.user_subject', true) AS subject,
                  current_setting('app.staff', true) AS staff`,
        );
        expect((res.rows[0] as { subject: string }).subject).toBe('usr_rls_pool_subject');
        expect((res.rows[0] as { staff: string }).staff).toBe('false');
        throw new Error('force rollback');
      }),
    ).rejects.toThrow('force rollback');

    // The pool is healthy after the rollback (client released, not leaked).
    const probe = await pool!.query('SELECT 1 AS ok');
    expect(probe.rows[0]).toEqual({ ok: 1 });
  }
});
