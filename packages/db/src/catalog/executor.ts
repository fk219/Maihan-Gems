/**
 * packages/db/src/catalog/executor.ts
 *
 * The catalogue read executor.
 *
 * technical_design/04 rule: repositories run inside an ambient transaction
 * supplied by the caller — for READS no transaction is opened anywhere; the
 * executor is a plain Drizzle `NodePgDatabase` over a caller-provided pool.
 *
 * SQL text is composed EXCLUSIVELY through Drizzle's `sql` template
 * (`packages/db` owns queries, technical_design/03): every dynamic value is
 * a parameter, never an interpolated string. The only raw fragments are
 * fixed identifiers/enum literals taken from closed whitelists in this
 * package (sort columns, directions) — never from caller input.
 *
 * Rows never leave this package raw; mappers in this folder turn them into
 * contract-validated DTOs.
 */
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';

export type CatalogDatabase = NodePgDatabase<Record<string, never>>;

export function createCatalogDatabase(pool: Pool): CatalogDatabase {
  return drizzle(pool) as unknown as CatalogDatabase;
}

export interface RlsSessionContext {
  readonly userSubject?: string | null;
  readonly anonymousSessionId?: string | null;
  readonly isStaff?: boolean;
}

/**
 * Executes a callback inside a PostgreSQL transaction with RLS session settings
 * (`app.user_subject`, `app.anonymous_session_id`, `app.staff`) applied via
 * `set_config(..., true)` (transaction-local, doc 04 & doc 09).
 *
 * Graceful degradation: when the executor does not expose a `transaction`
 * (unit-test mocks) or `execute` (raw mocks), the callback runs directly so
 * only real database executors pay the transaction boundary.
 */
export async function withRlsContext<T>(
  db: CatalogDatabase,
  ctx: RlsSessionContext,
  work: (tx: CatalogDatabase) => Promise<T>,
): Promise<T> {
  const maybeTx = (
    db as unknown as {
      transaction?: <R>(fn: (tx: CatalogDatabase) => Promise<R>) => Promise<R>;
      execute?: unknown;
    }
  ).transaction;
  const hasExecute = typeof (db as unknown as { execute?: unknown }).execute === 'function';

  if (typeof maybeTx !== 'function' || !hasExecute) {
    return work(db);
  }

  const applyAndRun = async (executor: CatalogDatabase): Promise<T> => {
    const userSub = ctx.userSubject ?? '';
    const anonSess = ctx.anonymousSessionId ?? '';
    const staffFlag = ctx.isStaff ? 'true' : 'false';
    await executor.execute(sql`
      SELECT
        set_config('app.user_subject', ${userSub}, true),
        set_config('app.anonymous_session_id', ${anonSess}, true),
        set_config('app.staff', ${staffFlag}, true)
    `);
    return work(executor);
  };

  return (await maybeTx.call(db, applyAndRun)) as T;
}

type PoolLike = {
  connect: () => Promise<{
    query: (text: string, values?: unknown[]) => Promise<unknown>;
    release: () => void;
  }>;
};

/**
 * Pool-level RLS session: checks a client out of the pool, opens a
 * transaction, applies the RLS session settings transaction-locally, runs
 * `work(client)`, and commits (or rolls back on throw). Used by seams whose
 * repositories speak the raw `client.query` protocol (e.g. the AI repos).
 *
 * Graceful degradation: a mock pool without `connect` runs the callback
 * directly, so handler unit tests with fake databases are unaffected.
 */
export async function withPoolRlsSession<T>(
  pool: PoolLike,
  ctx: RlsSessionContext,
  work: (client: unknown) => Promise<T>,
): Promise<T> {
  if (typeof pool.connect !== 'function') {
    return work(pool);
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const userSub = ctx.userSubject ?? '';
    const anonSess = ctx.anonymousSessionId ?? '';
    const staffFlag = ctx.isStaff ? 'true' : 'false';
    await client.query(
      `SELECT set_config('app.user_subject', $1, true),
              set_config('app.anonymous_session_id', $2, true),
              set_config('app.staff', $3, true)`,
      [userSub, anonSess, staffFlag],
    );
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // rollback of an already-failed transaction may itself fail; the
      // client is released below regardless.
    }
    throw error;
  } finally {
    client.release();
  }
}

export { sql };
