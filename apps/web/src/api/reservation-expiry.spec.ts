import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createCatalogDatabase,
  createCatalogQueryPort,
  createPool,
  isGemstoneReserved,
  releaseStockForSession,
  reserveStockForCart,
  type CatalogDatabase,
} from '@maihan/db';
import {
  createCatalogQueryService,
  MemoryGenerationStore,
  NullCacheStore,
} from '../modules/catalog/index.js';
import { createCatalogApi, type CatalogApi } from './index.js';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

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

describe('Reservation Expiry & Release (Phase 6 Task 12)', () => {
  let pool: ReturnType<typeof createPool> | undefined;
  let db: CatalogDatabase | undefined;
  let api: CatalogApi | undefined;
  let hasDb = false;
  let sampleProductId: string | undefined;
  let gemstoneId: string | undefined;

  const sessionA = `sess_a_${Date.now()}`;
  const sessionB = `sess_b_${Date.now()}`;

  beforeAll(async () => {
    const url = getDatabaseUrl();
    if (!url) return;
    try {
      pool = createPool(url, { max: 2 });
      db = createCatalogDatabase(pool);
      const port = createCatalogQueryPort(db);
      const service = createCatalogQueryService({
        port,
        store: new NullCacheStore(),
        generations: new MemoryGenerationStore(),
        namespace: 'test',
      });

      api = createCatalogApi({
        service,
        db,
      });

      const client = await pool.connect();
      const res = await client.query(`
        SELECT p.id, p.gemstone_id
        FROM products p
        JOIN gemstones g ON g.id = p.gemstone_id
        WHERE p.state = 'ACTIVE'
          AND g.state = 'ACTIVE'
          AND g.availability = true
        LIMIT 1;
      `);
      if (res.rows.length > 0) {
        sampleProductId = res.rows[0].id;
        gemstoneId = res.rows[0].gemstone_id;
      }
      client.release();
      hasDb = true;
    } catch (err) {
      console.error('Database setup failed for reservation-expiry.spec.ts:', err);
      hasDb = false;
    }
  });

  afterAll(async () => {
    if (pool && hasDb) {
      const client = await pool.connect();
      try {
        if (gemstoneId) {
          await client.query(`DELETE FROM jobs WHERE job_key = $1`, [`reservation:gemstone:${gemstoneId}`]);
          await client.query(`DELETE FROM domain_events WHERE aggregate_id = $1`, [gemstoneId]);
        }
      } catch (e) {
        console.error('Reservation cleanup error:', e);
      } finally {
        client.release();
        await pool.end();
      }
    }
  });

  it('active reservation prevents conflicting reservation and manual release frees it', async () => {
    if (!hasDb || !db || !sampleProductId || !gemstoneId) return;

    const cartItem = {
      id: '00000000-0000-0000-0000-000000000001',
      cart_id: '00000000-0000-0000-0000-000000000002',
      product_id: sampleProductId,
      title: 'Test Gem',
      product_slug: 'test-gem',
      quantity: 1,
      unit_price: '100.00',
      line_total: '100.00',
      options: {},
      added_at: new Date().toISOString(),
    };

    // 1. Session A reserves stock
    await reserveStockForCart(db, sessionA, 'cart_a', [cartItem]);
    expect(await isGemstoneReserved(db, gemstoneId)).toBe(true);

    // 2. Session B fails with ALREADY_RESERVED
    await expect(
      reserveStockForCart(db, sessionB, 'cart_b', [cartItem]),
    ).rejects.toThrow('ALREADY_RESERVED');

    // 3. Release Session A stock
    const releasedCount = await releaseStockForSession(db, sessionA);
    expect(releasedCount).toBeGreaterThan(0);
    expect(await isGemstoneReserved(db, gemstoneId)).toBe(false);

    // 4. Session B can now successfully reserve
    await reserveStockForCart(db, sessionB, 'cart_b', [cartItem]);
    expect(await isGemstoneReserved(db, gemstoneId)).toBe(true);

    // Cleanup session B
    await releaseStockForSession(db, sessionB);
  });

  it('sweeps expired reservations, releases stock and emits InventoryReleased outbox events', async () => {
    if (!hasDb || !db || !api || !pool || !sampleProductId || !gemstoneId) return;

    const cartItem = {
      id: '00000000-0000-0000-0000-000000000001',
      cart_id: '00000000-0000-0000-0000-000000000002',
      product_id: sampleProductId,
      title: 'Test Gem',
      product_slug: 'test-gem',
      quantity: 1,
      unit_price: '100.00',
      line_total: '100.00',
      options: {},
      added_at: new Date().toISOString(),
    };

    // 1. Reserve stock
    await reserveStockForCart(db, sessionA, 'cart_a', [cartItem]);
    expect(await isGemstoneReserved(db, gemstoneId)).toBe(true);

    // 2. Force the reservation job to expire (set run_after in the past)
    const client = await pool.connect();
    await client.query(`
      UPDATE jobs
      SET run_after = now() - INTERVAL '5 minutes'
      WHERE job_key = $1
    `, [`reservation:gemstone:${gemstoneId}`]);
    client.release();

    // 3. Trigger sweeper via API
    const sweepRes = await api(
      new Request('http://localhost/inventory/sweep-expired', { method: 'POST' }),
    );
    expect(sweepRes.status).toBe(200);
    const sweepJson = await sweepRes.json();
    expect(sweepJson.data.count).toBeGreaterThan(0);
    expect(sweepJson.data.released.some((r: any) => r.gemstoneId === gemstoneId)).toBe(true);

    // 4. Gemstone is no longer reserved
    expect(await isGemstoneReserved(db, gemstoneId)).toBe(false);

    // 5. Verify InventoryReleased was emitted to domain_events
    const client2 = await pool.connect();
    const eventRes = await client2.query(`
      SELECT event_type, aggregate_type, aggregate_id, payload
      FROM domain_events
      WHERE aggregate_id = $1 AND event_type = 'InventoryReleased'
      ORDER BY occurred_at DESC
      LIMIT 1
    `, [gemstoneId]);
    client2.release();

    expect(eventRes.rows.length).toBe(1);
    expect(eventRes.rows[0].event_type).toBe('InventoryReleased');
    expect(eventRes.rows[0].payload.reason).toBe('EXPIRED');
  });
});
