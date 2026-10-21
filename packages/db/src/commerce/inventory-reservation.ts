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
      const activeRes = await db.execute(sql`
        SELECT session_id
        FROM inventory_reservations
        WHERE gemstone_id = ${stone.id}::uuid
          AND state = 'ACTIVE'
          AND expires_at > now()
        LIMIT 1
      `);

      if (activeRes.rows.length > 0) {
        const existing = activeRes.rows[0] as { session_id: string | null };
        // If already held by this same session, extend it
        if (existing.session_id !== sessionId) {
          throw new ContractError(
            'ALREADY_RESERVED',
            `Gemstone ${stone.gem_ref} is currently held under an active reservation.`,
            [{ field: 'gem_ref', value: stone.gem_ref }],
          );
        }
      }

      // P1-10 theft-proof hold: the upsert may only (re)claim rows owned by
      // THIS session. A competing session's stored row wins the ON CONFLICT
      // — the postcheck proves ownership and surfaces ALREADY_RESERVED
      // instead of silently overwriting the other session's hold.
      await db.execute(sql`
        INSERT INTO inventory_reservations (
          job_key, gemstone_id, session_id, cart_id, expires_at
        ) VALUES (
          ${jobKey},
          ${stone.id}::uuid,
          ${sessionId},
          ${cartId ?? null},
          now() + (${RESERVATION_TTL_MINUTES} * INTERVAL '1 minute')
        )
        ON CONFLICT (job_key)
        DO UPDATE SET
          session_id = EXCLUDED.session_id,
          cart_id = EXCLUDED.cart_id,
          expires_at = EXCLUDED.expires_at,
          state = 'ACTIVE',
          reserved_at = now(),
          released_at = NULL
        WHERE inventory_reservations.session_id = ${sessionId}::text
          OR inventory_reservations.state <> 'ACTIVE'
          OR inventory_reservations.expires_at <= now()
      `);

      const holdRes = await db.execute(sql`
        SELECT session_id FROM inventory_reservations
        WHERE job_key = ${jobKey} AND state = 'ACTIVE' AND expires_at > now()
      `);
      const holdOwner = (holdRes.rows[0] as { session_id: string | null } | undefined)?.session_id ?? null;
      if (holdOwner !== sessionId) {
        throw new ContractError(
          'ALREADY_RESERVED',
          `Gemstone ${stone.gem_ref} is currently held under an active reservation.`,
          [{ field: 'gem_ref', value: stone.gem_ref }],
        );
      }
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
      const activePairRes = await db.execute(sql`
        SELECT session_id
        FROM inventory_reservations
        WHERE gemstone_id = ${pair.id}::uuid
          AND state = 'ACTIVE'
          AND expires_at > now()
        LIMIT 1
      `);

      if (activePairRes.rows.length > 0) {
        const existing = activePairRes.rows[0] as { session_id: string | null };
        if (existing.session_id !== sessionId) {
          throw new ContractError(
            'PAIR_RESERVATION_FAILED',
            `Atomic pair reservation failed: pair ${pair.gem_ref} is already reserved by another customer. Neither stone is reserved.`,
            [{ field: 'gem_ref', value: pair.gem_ref }],
          );
        }
      }

      // P1-10 theft-proof hold (pair path): same ownership rule as singles.
      await db.execute(sql`
        INSERT INTO inventory_reservations (
          job_key, gemstone_id, session_id, cart_id, expires_at
        ) VALUES (
          ${jobKey},
          ${pair.id}::uuid,
          ${sessionId},
          ${cartId ?? null},
          now() + (${RESERVATION_TTL_MINUTES} * INTERVAL '1 minute')
        )
        ON CONFLICT (job_key)
        DO UPDATE SET
          session_id = EXCLUDED.session_id,
          cart_id = EXCLUDED.cart_id,
          expires_at = EXCLUDED.expires_at,
          state = 'ACTIVE',
          reserved_at = now(),
          released_at = NULL
        WHERE inventory_reservations.session_id = ${sessionId}::text
          OR inventory_reservations.state <> 'ACTIVE'
          OR inventory_reservations.expires_at <= now()
      `);

      const pairHoldRes = await db.execute(sql`
        SELECT session_id FROM inventory_reservations
        WHERE job_key = ${jobKey} AND state = 'ACTIVE' AND expires_at > now()
      `);
      const pairOwner = (pairHoldRes.rows[0] as { session_id: string | null } | undefined)?.session_id ?? null;
      if (pairOwner !== sessionId) {
        throw new ContractError(
          'PAIR_RESERVATION_FAILED',
          `Atomic pair reservation failed: pair ${pair.gem_ref} is already reserved by another customer. Neither stone is reserved.`,
          [{ field: 'gem_ref', value: pair.gem_ref }],
        );
      }
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
    UPDATE inventory_reservations r
    SET state = 'EXPIRED', released_at = now()
    FROM gemstones g
    WHERE g.id = r.gemstone_id
      AND r.state = 'ACTIVE'
      AND r.expires_at <= now()
    RETURNING r.id::text AS id, r.gemstone_id::text AS gemstone_id, r.cart_id::text AS cart_id,
              r.session_id, g.gem_ref, g.kind::text AS kind
  `);

  const released: InventoryReleaseResult[] = [];
  for (const row of res.rows as unknown as Array<{
    id: string;
    gemstone_id: string;
    cart_id: string | null;
    session_id: string | null;
    gem_ref: string;
    kind: string;
  }>) {
    const nowIso = new Date().toISOString();

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
        ${row.gemstone_id}::uuid,
        ${JSON.stringify({
          sessionId: row.session_id,
          cartId: row.cart_id,
          gemstoneId: row.gemstone_id,
          gemRef: row.gem_ref,
          isPair: row.kind === 'PAIR',
          reason: 'EXPIRED',
          releasedAt: nowIso,
        })}::jsonb,
        'PENDING'
      )
    `);

    released.push({
      jobId: row.id,
      gemstoneId: row.gemstone_id,
      gemRef: row.gem_ref,
      sessionId: row.session_id ?? undefined,
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
    UPDATE inventory_reservations r
    SET state = 'RELEASED', released_at = now()
    FROM gemstones g
    WHERE g.id = r.gemstone_id
      AND r.state = 'ACTIVE'
      AND r.session_id = ${sessionId}
    RETURNING r.id::text AS id, r.gemstone_id::text AS gemstone_id, r.cart_id::text AS cart_id,
              g.gem_ref, g.kind::text AS kind
  `);

  for (const row of res.rows as unknown as Array<{
    id: string;
    gemstone_id: string;
    cart_id: string | null;
    gem_ref: string;
    kind: string;
  }>) {
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
        ${row.gemstone_id}::uuid,
        ${JSON.stringify({
          sessionId,
          cartId: row.cart_id,
          gemstoneId: row.gemstone_id,
          gemRef: row.gem_ref,
          isPair: row.kind === 'PAIR',
          reason: 'SESSION_RELEASED',
          releasedAt: new Date().toISOString(),
        })}::jsonb,
        'PENDING'
      )
    `);
  }

  return res.rows.length;
}

export async function isGemstoneReserved(
  db: CatalogDatabase,
  gemstoneId: string,
): Promise<boolean> {
  const res = await db.execute(sql`
    SELECT id
    FROM inventory_reservations
    WHERE gemstone_id = ${gemstoneId}::uuid
      AND state = 'ACTIVE'
      AND expires_at > now()
    LIMIT 1
  `);
  return res.rows.length > 0;
}
