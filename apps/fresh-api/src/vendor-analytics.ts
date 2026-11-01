/**
 * Vendor sales analytics — settled order items attributed through the
 * gemstone or product vendor. Read-only; no fabricated payouts.
 */
import type { AnyClient } from './db.js';

const PAID = `('PAID','IN_FULFILLMENT','FULFILLED','DELIVERED')`;

const num = (value: string | number | null | undefined) => (value == null ? 0 : Number(value));

export async function vendorAnalytics(client: AnyClient, vendorId: number) {
  const attribution = `
    LEFT JOIN fresh.gemstones g ON g.id = oi.gemstone_id
    LEFT JOIN fresh.products prod ON prod.id = oi.product_id
    WHERE COALESCE(g.vendor_id, prod.vendor_id) = $1
      AND o.status IN ${PAID}
  `;

  const [totals, series, topItems, payments] = await Promise.all([
    client.query(
      `SELECT COALESCE(sum(oi.line_total),0)::text AS revenue,
              COALESCE(sum(oi.quantity),0)::int AS units,
              count(DISTINCT o.id)::int AS orders
       FROM fresh.order_items oi
       JOIN fresh.orders o ON o.id = oi.order_id
       ${attribution}`,
      [vendorId],
    ),
    client.query(
      `SELECT to_char(date_trunc('day', o.placed_at), 'YYYY-MM-DD') AS day,
              COALESCE(sum(oi.line_total),0)::text AS revenue,
              COALESCE(sum(oi.quantity),0)::int AS units,
              count(DISTINCT o.id)::int AS orders
       FROM fresh.order_items oi
       JOIN fresh.orders o ON o.id = oi.order_id
       ${attribution}
         AND o.placed_at >= now() - interval '30 days'
       GROUP BY day
       ORDER BY day`,
      [vendorId],
    ),
    client.query(
      `SELECT oi.description AS name, oi.code_snapshot AS ref,
              COALESCE(sum(oi.line_total),0)::text AS revenue,
              COALESCE(sum(oi.quantity),0)::int AS units
       FROM fresh.order_items oi
       JOIN fresh.orders o ON o.id = oi.order_id
       ${attribution}
       GROUP BY oi.description, oi.code_snapshot
       ORDER BY sum(oi.line_total) DESC
       LIMIT 5`,
      [vendorId],
    ),
    client.query(
      `SELECT pay.provider, count(*)::int AS count, COALESCE(sum(pay.amount),0)::text AS amount
       FROM fresh.payments pay
       JOIN fresh.orders o ON o.id = pay.order_id
       WHERE o.status IN ${PAID}
         AND EXISTS (
           SELECT 1
           FROM fresh.order_items oi
           LEFT JOIN fresh.gemstones g ON g.id = oi.gemstone_id
           LEFT JOIN fresh.products prod ON prod.id = oi.product_id
           WHERE oi.order_id = o.id AND COALESCE(g.vendor_id, prod.vendor_id) = $1
         )
       GROUP BY pay.provider
       ORDER BY sum(pay.amount) DESC`,
      [vendorId],
    ),
  ]);

  return {
    totals: {
      revenue: num(totals.rows[0]?.revenue),
      units: Number(totals.rows[0]?.units ?? 0),
      orders: Number(totals.rows[0]?.orders ?? 0),
    },
    series: series.rows.map((row) => ({
      day: String(row.day),
      revenue: num(row.revenue),
      units: Number(row.units ?? 0),
      orders: Number(row.orders ?? 0),
    })),
    top_items: topItems.rows.map((row) => ({
      name: String(row.name),
      ref: String(row.ref),
      revenue: num(row.revenue),
      units: Number(row.units ?? 0),
    })),
    payments: payments.rows.map((row) => ({
      provider: String(row.provider),
      count: Number(row.count ?? 0),
      amount: num(row.amount),
    })),
  };
}
