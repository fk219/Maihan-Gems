/**
 * packages/db/src/commerce/inventory-reservation.ts
 *
 * Phase 6 Task 2 — Stock reservation engine and atomic pair locking.
 *
 * Authority:
 * - technical_design/15 INVENTORY ARCHITECTURE §47-71.
 * - Reservations live in Postgres inside the transaction, NOT in Redis.
 * - Pair reservation in earrings is atomic: both stones must be reservable.
 * - 30-minute reservation TTL.
 */
import { sql } from 'drizzle-orm';
import type { CatalogDatabase } from '../catalog/executor.js';
import { ContractError, type CartItemDto } from '@maihan/contracts';
import { RESERVATION_TTL_MINUTES } from '@maihan/domain';

interface ProductInventoryRow {
  product_id: string;
  kind: string;
  jewellery_type: string;
  gemstone_id: string | null;
  gemstone_pair_id: string | null;
}

interface GemstoneLockRow {
  id: string;
  gem_ref: string;
  kind: string;
  availability: boolean;
  state: string;
}

export async function reserveStockForCart(
  db: CatalogDatabase,
  sessionId: string,
  cartId: string,
  items: readonly CartItemDto[],
): Promise<void> {
  for (const item of items) {
    const prodRes = await db.execute(sql`
      SELECT
        p.id AS product_id,
        p.kind::text AS kind,
        p.jewellery_type::text AS jewellery_type,
        p.gemstone_id,
        p.gemstone_pair_id
      FROM products p
      WHERE p.id = ${item.product_id}
      LIMIT 1
    `);

    if (prodRes.rows.length === 0) continue;
    const prod = prodRes.rows[0] as unknown as ProductInventoryRow;

    // Single stone reservation
    if (prod.gemstone_id) {
      const gemRes = await db.execute(sql`
        SELECT
          g.id,
          g.gem_ref,
          g.kind::text AS kind,
          g.availability,
          g.state::text AS state
        FROM gemstones g
        WHERE g.id = ${prod.gemstone_id}
        FOR UPDATE
      `);

      if (gemRes.rows.length === 0) {
        throw new ContractError('OUT_OF_STOCK', 'Gemstone referenced by product does not exist.');
      }
      const stone = gemRes.rows[0] as unknown as GemstoneLockRow;

      if (!stone.availability || stone.state !== 'ACTIVE') {
        throw new ContractError(
          'OUT_OF_STOCK',
          `Gemstone ${stone.gem_ref} is not available for purchase.`,
          [{ field: 'gem_ref', value: stone.gem_ref }],
        );
      }

      // Check active unexpired reservation
      const jobKey = `reservation:gemstone:${stone.id}`;
      const activeJobRes = await db.execute(sql`
        SELECT id, payload
        FROM jobs
        WHERE job_key = ${jobKey}
          AND queue = 'inventory_reservations'
          AND state = 'QUEUED'
          AND run_after > now()
        LIMIT 1
      `);

      if (activeJobRes.rows.length > 0) {
        const existingJob = activeJobRes.rows[0] as { payload?: { sessionId?: string } };
        // If already held by this same session, extend it
        if (existingJob.payload?.sessionId !== sessionId) {
          throw new ContractError(
            'ALREADY_RESERVED',
            `Gemstone ${stone.gem_ref} is currently held under an active reservation.`,
            [{ field: 'gem_ref', value: stone.gem_ref }],
          );
        }
      }

      const payload = JSON.stringify({
        sessionId,
        cartId,
        gemstoneId: stone.id,
        gemRef: stone.gem_ref,
        reservedAt: new Date().toISOString(),
      });

      // Upsert reservation job with 30-minute TTL
      await db.execute(sql`
        INSERT INTO jobs (
          job_key,
          queue,
          job_type,
          payload,
          state,
          run_after
        ) VALUES (
          ${jobKey},
          'inventory_reservations',
          'RELEASE_RESERVATION',
          ${payload}::jsonb,
          'QUEUED',
          now() + (${RESERVATION_TTL_MINUTES} * INTERVAL '1 minute')
        )
        ON CONFLICT (job_key)
        DO UPDATE SET
          payload = EXCLUDED.payload,
          run_after = EXCLUDED.run_after,
          state = 'QUEUED',
          updated_at = now()
      `);
    }

    // Pair reservation (atomic: both stones of pair must be available)
    if (prod.gemstone_pair_id) {
      const pairRes = await db.execute(sql`
        SELECT
          g.id,
          g.gem_ref,
          g.kind::text AS kind,
          g.availability,
          g.state::text AS state
        FROM gemstones g
        WHERE g.id = ${prod.gemstone_pair_id}
        FOR UPDATE
      `);

      if (pairRes.rows.length === 0) {
        throw new ContractError('PAIR_RESERVATION_FAILED', 'Gemstone pair does not exist.');
      }
      const pair = pairRes.rows[0] as unknown as GemstoneLockRow;

      if (!pair.availability || pair.state !== 'ACTIVE') {
        throw new ContractError(
          'PAIR_RESERVATION_FAILED',
          `Atomic pair reservation failed: pair ${pair.gem_ref} is out of stock. Neither stone is reserved.`,
          [{ field: 'gem_ref', value: pair.gem_ref }],
        );
      }

      const jobKey = `reservation:gemstone:${pair.id}`;
      const activeJobRes = await db.execute(sql`
        SELECT id, payload
        FROM jobs
        WHERE job_key = ${jobKey}
          AND queue = 'inventory_reservations'
          AND state = 'QUEUED'
          AND run_after > now()
        LIMIT 1
      `);

      if (activeJobRes.rows.length > 0) {
        const existingJob = activeJobRes.rows[0] as { payload?: { sessionId?: string } };
        if (existingJob.payload?.sessionId !== sessionId) {
          throw new ContractError(
            'PAIR_RESERVATION_FAILED',
            `Atomic pair reservation failed: pair ${pair.gem_ref} is already reserved by another customer. Neither stone is reserved.`,
            [{ field: 'gem_ref', value: pair.gem_ref }],
          );
        }
      }

      const payload = JSON.stringify({
        sessionId,
        cartId,
        gemstoneId: pair.id,
        gemRef: pair.gem_ref,
        isPair: true,
        reservedAt: new Date().toISOString(),
      });

      await db.execute(sql`
        INSERT INTO jobs (
          job_key,
          queue,
          job_type,
          payload,
          state,
          run_after
        ) VALUES (
          ${jobKey},
          'inventory_reservations',
          'RELEASE_RESERVATION',
          ${payload}::jsonb,
          'QUEUED',
          now() + (${RESERVATION_TTL_MINUTES} * INTERVAL '1 minute')
        )
        ON CONFLICT (job_key)
        DO UPDATE SET
          payload = EXCLUDED.payload,
          run_after = EXCLUDED.run_after,
          state = 'QUEUED',
          updated_at = now()
      `);
    }
  }
}

export interface InventoryReleaseResult {
  jobId: string;
  gemstoneId: string;
  gemRef?: string;
  sessionId?: string;
  releasedAt: string;
  reason: 'EXPIRED' | 'SESSION_RELEASED';
}

export async function sweepExpiredReservations(
  db: CatalogDatabase,
): Promise<InventoryReleaseResult[]> {
  const res = await db.execute(sql`
    UPDATE jobs
    SET state = 'SUCCEEDED', updated_at = now()
    WHERE queue = 'inventory_reservations'
      AND state = 'QUEUED'
      AND run_after <= now()
    RETURNING id, payload
  `);

  const released: InventoryReleaseResult[] = [];
  for (const row of res.rows as unknown as Array<{ id: string; payload: any }>) {
    const payload = row.payload ?? {};
    const gemstoneId = payload.gemstoneId;
    const gemRef = payload.gemRef;
    const sessionId = payload.sessionId;
    const nowIso = new Date().toISOString();

    if (gemstoneId) {
      const eventPayloadJson = JSON.stringify({
        sessionId,
        cartId: payload.cartId,
        gemstoneId,
        gemRef,
        isPair: payload.isPair ?? false,
        reason: 'EXPIRED',
        releasedAt: nowIso,
      });

      await db.execute(sql`
        INSERT INTO domain_events (
          event_id,
          event_type,
          aggregate_type,
          aggregate_id,
          payload,
          status
        ) VALUES (
          gen_random_uuid(),
          'InventoryReleased',
          'GEMSTONE',
          ${gemstoneId},
          ${eventPayloadJson}::jsonb,
          'PENDING'
        )
      `);
    }

    released.push({
      jobId: row.id,
      gemstoneId: gemstoneId ?? '',
      gemRef,
      sessionId,
      releasedAt: nowIso,
      reason: 'EXPIRED',
    });
  }

  return released;
}

export async function releaseStockForSession(
  db: CatalogDatabase,
  sessionId: string,
): Promise<number> {
  const res = await db.execute(sql`
    UPDATE jobs
    SET state = 'CANCELLED', updated_at = now()
    WHERE queue = 'inventory_reservations'
      AND state = 'QUEUED'
      AND payload->>'sessionId' = ${sessionId}
    RETURNING id, payload
  `);

  for (const row of res.rows as unknown as Array<{ id: string; payload: any }>) {
    const payload = row.payload ?? {};
    if (payload.gemstoneId) {
      const eventPayloadJson = JSON.stringify({
        sessionId,
        cartId: payload.cartId,
        gemstoneId: payload.gemstoneId,
        gemRef: payload.gemRef,
        isPair: payload.isPair ?? false,
        reason: 'SESSION_RELEASED',
        releasedAt: new Date().toISOString(),
      });

      await db.execute(sql`
        INSERT INTO domain_events (
          event_id,
          event_type,
          aggregate_type,
          aggregate_id,
          payload,
          status
        ) VALUES (
          gen_random_uuid(),
          'InventoryReleased',
          'GEMSTONE',
          ${payload.gemstoneId},
          ${eventPayloadJson}::jsonb,
          'PENDING'
        )
      `);
    }
  }

  return res.rows.length;
}

export async function isGemstoneReserved(
  db: CatalogDatabase,
  gemstoneId: string,
): Promise<boolean> {
  const jobKey = `reservation:gemstone:${gemstoneId}`;
  const res = await db.execute(sql`
    SELECT id
    FROM jobs
    WHERE job_key = ${jobKey}
      AND queue = 'inventory_reservations'
      AND state = 'QUEUED'
      AND run_after > now()
    LIMIT 1
  `);
  return res.rows.length > 0;
}
