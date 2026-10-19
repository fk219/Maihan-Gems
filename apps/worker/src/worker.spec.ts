/**
 * Worker integration tests — DB-gated: they SKIP (never fail) when no
 * PostgreSQL is reachable, per the repo testing discipline.
 */
import { describe, it, expect } from 'vitest';
import { sql } from '@maihan/db';

import { createCatalogDatabase } from './dispatch/catalog-db.js';
import { dispatchOutbox } from './dispatch/outbox.js';
import { processOperationalJobs } from './dispatch/jobs-runner.js';
import { runSweeps } from './schedules/sweeps.js';

const DATABASE_URL = process.env['DATABASE_URL'] ?? '';
let pool: import('@maihan/db').Pool | null = null;
let dbReachable = false;

if (DATABASE_URL) {
  const { createPool } = await import('@maihan/db');
  pool = createPool(DATABASE_URL);
  try {
    await pool.query('SELECT 1');
    dbReachable = true;
  } catch {
    dbReachable = false;
  }
}

describe.skipIf(!dbReachable)('worker dispatch + sweeps (live database)', () => {
  it('dispatches PENDING outbox events exactly once (idempotent replay)', async () => {
    const db = createCatalogDatabase(pool!);
    await db.execute(sql`
      INSERT INTO domain_events (event_id, event_type, aggregate_type, aggregate_id, payload)
      VALUES (gen_random_uuid(), 'worker.spec.test', 'PRODUCT', gen_random_uuid(), '{"test": true}'::jsonb)
    `);
    const first = await dispatchOutbox(db, 'worker.spec');
    expect(first.published).toBeGreaterThanOrEqual(1);
    // Replay: no PENDING rows remain, so a second dispatch publishes nothing new.
    const second = await dispatchOutbox(db, 'worker.spec');
    expect(second.published).toBe(0);
  });

  it('runs every sweep twice with a stable, idempotent outcome', async () => {
    const db = createCatalogDatabase(pool!);
    const first = await runSweeps(db);
    const second = await runSweeps(db);
    expect(first.length).toBe(4);
    for (const sweep of second) {
      expect(sweep.changed).toBe(0);
    }
  });

  it('routes ProductStateChanged outbox events into operational queues and processes them to SUCCEEDED', async () => {
    const db = createCatalogDatabase(pool!);
    await db.execute(sql`
      INSERT INTO domain_events (event_id, event_type, aggregate_type, aggregate_id, payload)
      VALUES (gen_random_uuid(), 'ProductStateChanged', 'product', gen_random_uuid(), '{"action": "PUBLISH"}'::jsonb)
    `);
    const dispatchRes = await dispatchOutbox(db, 'worker.spec');
    expect(dispatchRes.published).toBeGreaterThanOrEqual(1);

    const jobRes = await processOperationalJobs(db, 'worker.spec');
    expect(jobRes.succeeded).toBeGreaterThanOrEqual(1);
    expect(jobRes.deadLettered).toBe(0);
  });
});
