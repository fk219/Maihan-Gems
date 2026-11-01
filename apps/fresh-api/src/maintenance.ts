/**
 * Scheduled maintenance: release abandoned reservations, cancel unpaid orders
 * before their stock is released to someone else, and prune expired auth /
 * token / outbox / cart rows. Safe to run repeatedly (idempotent by state).
 */
import { pool, withTx, type Db } from './db.js';
import { cancelOrder } from './commerce.js';
import { log } from './logging.js';

export interface MaintenanceReport {
  orders_cancelled: number;
  reservations_expired: number;
  stones_released: number;
  sessions_deleted: number;
  tokens_deleted: number;
  outbox_deleted: number;
  carts_deleted: number;
  rate_limits_deleted: number;
}

const ORDER_EXPIRY_HOURS = Number(process.env['ORDER_EXPIRY_HOURS'] ?? 24);

/** Release ACTIVE reservations past their expiry (cart-only or orphaned). */
export async function expireReservations(client: Db): Promise<{ reservations_expired: number; stones_released: number }> {
  const { rows } = await client.query(
    `UPDATE fresh.inventory_reservations r SET state = 'EXPIRED'
     WHERE r.state = 'ACTIVE' AND r.expires_at < now()
       AND (r.order_id IS NULL OR EXISTS (
         SELECT 1 FROM fresh.orders o WHERE o.id = r.order_id AND o.status <> 'PENDING_PAYMENT'
       ))
     RETURNING r.id, r.owner_kind, r.owner_id, r.previous_status`,
  );
  let stones = 0;
  for (const row of rows) {
    if (row.owner_kind !== 'gemstone') continue;
    const updated = await client.query(
      `UPDATE fresh.gemstones g
       SET status = COALESCE($2::text, 'ACTIVE')::fresh.catalog_status, quantity = 1
       WHERE g.id = $1 AND g.status = 'RESERVED'
         AND NOT EXISTS (
           SELECT 1 FROM fresh.inventory_reservations r2
           WHERE r2.owner_kind = 'gemstone' AND r2.owner_id = g.id AND r2.state = 'ACTIVE'
         )`,
      [row.owner_id, row.previous_status],
    );
    stones += updated.rowCount ?? 0;
  }
  return { reservations_expired: rows.length, stones_released: stones };
}

/** Prune expired sessions, reset/verification tokens, outbox rows, carts. */
export async function cleanupExpired(client: Db): Promise<Omit<MaintenanceReport, 'orders_cancelled' | 'reservations_expired' | 'stones_released'>> {
  const sessions = await client.query(
    `DELETE FROM fresh.auth_sessions
     WHERE expires_at < now() - interval '7 days' OR revoked_at < now() - interval '7 days'`,
  );
  const vendorSessions = await client.query(
    `DELETE FROM fresh.vendor_sessions
     WHERE expires_at < now() - interval '7 days' OR revoked_at < now() - interval '7 days'`,
  );
  const adminSessions = await client.query(
    `DELETE FROM fresh.admin_sessions
     WHERE expires_at < now() - interval '7 days' OR revoked_at < now() - interval '7 days'`,
  );
  const resets = await client.query(
    `DELETE FROM fresh.password_resets
     WHERE expires_at < now() - interval '7 days'
        OR (used_at IS NOT NULL AND used_at < now() - interval '7 days')`,
  );
  const verifications = await client.query(
    `DELETE FROM fresh.email_verifications
     WHERE expires_at < now() - interval '7 days'
        OR (used_at IS NOT NULL AND used_at < now() - interval '7 days')`,
  );
  const outbox = await client.query(
    `DELETE FROM fresh.email_outbox
     WHERE state IN ('SENT','FAILED') AND created_at < now() - interval '30 days'`,
  );
  const carts = await client.query(
    `DELETE FROM fresh.carts WHERE status = 'ACTIVE' AND created_at < now() - interval '7 days'`,
  );
  const rateLimits = await client.query(
    `DELETE FROM fresh.rate_limits WHERE reset_at < now() - interval '1 hour'`,
  );
  return {
    sessions_deleted: (sessions.rowCount ?? 0) + (vendorSessions.rowCount ?? 0) + (adminSessions.rowCount ?? 0),
    tokens_deleted: (resets.rowCount ?? 0) + (verifications.rowCount ?? 0),
    outbox_deleted: outbox.rowCount ?? 0,
    carts_deleted: carts.rowCount ?? 0,
    rate_limits_deleted: rateLimits.rowCount ?? 0,
  };
}

export async function sweepMaintenance(): Promise<MaintenanceReport> {
  // 1) Cancel unpaid orders first: their cancellation releases stock safely.
  let ordersCancelled = 0;
  const overdue = await pool.query(
    `SELECT order_number FROM fresh.orders
     WHERE status = 'PENDING_PAYMENT' AND placed_at < now() - ($1::text || ' hours')::interval
     ORDER BY placed_at LIMIT 100`,
    [ORDER_EXPIRY_HOURS],
  );
  for (const row of overdue.rows) {
    try {
      await withTx((c) => cancelOrder(c, String(row.order_number), 'payment window expired', 'system'));
      ordersCancelled += 1;
    } catch (cause) {
      log('warn', 'maintenance: could not cancel overdue order', {
        order: String(row.order_number),
        message: cause instanceof Error ? cause.message : 'unknown',
      });
    }
  }

  // 2) Release abandoned cart reservations, then 3) prune expired rows.
  const expired = await withTx((c) => expireReservations(c));
  const cleaned = await withTx((c) => cleanupExpired(c));

  return { orders_cancelled: ordersCancelled, ...expired, ...cleaned };
}
