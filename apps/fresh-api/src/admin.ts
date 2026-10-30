/**
 * F4 — admin console data layer (fresh-api).
 * Overview stats, platform-wide inventory management, order details,
 * vendor management, and leads.
 */
import type { AnyClient } from './db.js';
import { StateError } from './validation.js';

const num = (v: string | number | null | undefined): number => (v == null ? 0 : Number(v));

function err(message: string, status: number): Error {
  const e = new StateError(message);
  (e as Error & { status?: number }).status = status;
  return e;
}

/* ------------------------------------------------------------------ stats */

export interface AdminStats {
  gemstones_total: number;
  gemstones_active: number;
  gemstones_draft: number;
  gemstones_sold: number;
  gemstones_reserved: number;
  settings_total: number;
  settings_active: number;
  products_total: number;
  products_active: number;
  products_sold: number;
  orders_total: number;
  orders_pending: number;
  orders_paid: number;
  orders_cancelled: number;
  revenue_total: number;
  revenue_currency: string;
  customers_total: number;
  vendors_total: number;
  vendors_active: number;
  vendors_pending: number;
  submissions_pending: number;
  submissions_total: number;
  configurations_total: number;
  leads_total: number;
  leads_new: number;
  inventory_value: number;
}

export async function adminStats(client: AnyClient): Promise<AdminStats> {
  const [gems, sets, prods, ords, custs, vends, subs, cfgs, leads] = await Promise.all([
    client.query(`SELECT status, count(*)::int AS n, COALESCE(sum(price_amount),0)::text AS val FROM fresh.gemstones GROUP BY status`),
    client.query(`SELECT status, count(*)::int AS n FROM fresh.settings GROUP BY status`),
    client.query(`SELECT status, count(*)::int AS n FROM fresh.products GROUP BY status`),
    client.query(`SELECT status, count(*)::int AS n, COALESCE(sum(grand_total),0)::text AS val FROM fresh.orders GROUP BY status`),
    client.query(`SELECT count(*)::int AS n FROM fresh.customers`),
    client.query(`SELECT v.status, count(*)::int AS n FROM fresh.vendors v GROUP BY v.status`),
    client.query(`SELECT status, count(*)::int AS n FROM fresh.vendor_submissions GROUP BY status`),
    client.query(`SELECT count(*)::int AS n FROM fresh.configurations`),
    client.query(`SELECT status, count(*)::int AS n FROM fresh.leads GROUP BY status`),
  ]);
  const gemMap = Object.fromEntries(gems.rows.map((r) => [r.status, r]));
  const ordMap = Object.fromEntries(ords.rows.map((r) => [r.status, r]));
  const vendMap = Object.fromEntries(vends.rows.map((r) => [r.status, r]));
  const subMap = Object.fromEntries(subs.rows.map((r) => [r.status, r]));
  const leadMap = Object.fromEntries(leads.rows.map((r) => [r.status, r]));

  return {
    gemstones_total: gems.rows.reduce((a, r) => a + Number(r.n), 0),
    gemstones_active: Number(gemMap['ACTIVE']?.n ?? 0),
    gemstones_draft: Number(gemMap['DRAFT']?.n ?? 0),
    gemstones_sold: Number(gemMap['SOLD']?.n ?? 0),
    gemstones_reserved: Number(gemMap['RESERVED']?.n ?? 0),
    settings_total: sets.rows.reduce((a, r) => a + Number(r.n), 0),
    settings_active: Number(sets.rows.find((r) => r.status === 'ACTIVE')?.n ?? 0),
    products_total: prods.rows.reduce((a, r) => a + Number(r.n), 0),
    products_active: Number(prods.rows.find((r) => r.status === 'ACTIVE')?.n ?? 0),
    products_sold: Number(prods.rows.find((r) => r.status === 'SOLD')?.n ?? 0),
    orders_total: ords.rows.reduce((a, r) => a + Number(r.n), 0),
    orders_pending: Number(ordMap['PENDING_PAYMENT']?.n ?? 0),
    orders_paid: Number(ordMap['PAID']?.n ?? 0),
    orders_cancelled: Number(ordMap['CANCELLED']?.n ?? 0),
    revenue_total: num(ordMap['PAID']?.val ?? '0'),
    revenue_currency: 'USD',
    customers_total: Number(custs.rows[0]?.n ?? 0),
    vendors_total: vends.rows.reduce((a, r) => a + Number(r.n), 0),
    vendors_active: Number(vendMap['ACTIVE']?.n ?? 0),
    vendors_pending: Number(vendMap['DRAFT']?.n ?? 0),
    submissions_pending: Number(subMap['SUBMITTED']?.n ?? 0),
    submissions_total: subs.rows.reduce((a, r) => a + Number(r.n), 0),
    configurations_total: Number(cfgs.rows[0]?.n ?? 0),
    leads_total: leads.rows.reduce((a, r) => a + Number(r.n), 0),
    leads_new: Number(leadMap['NEW']?.n ?? 0),
    inventory_value: num(gemMap['ACTIVE']?.val ?? '0'),
  };
}

/* -------------------------------------------------------------- inventory */

export interface AdminInventoryItem {
  ref: string;
  name: string;
  kind: string;
  status: string;
  price_amount: number | null;
  currency: string;
  weight_ct: number | null;
  variety: string;
  origin: string | null;
  origin_type: string;
  vendor_code: string | null;
  vendor_name: string | null;
  table_name: 'gemstones' | 'products';
  primary_image: string | null;
  created_at: string;
}

export async function adminInventory(client: AnyClient, q: { q?: string; status?: string; kind?: string; limit?: number; offset?: number }) {
  const params: unknown[] = [];
  const where: string[] = [`status <> 'ARCHIVED'`];
  if (q.q) { params.push(`%${q.q}%`); where.push(`(name ILIKE $${params.length} OR ref ILIKE $${params.length})`); }
  if (q.status) { params.push(q.status); where.push(`status = $${params.length}`); }
  if (q.kind) { params.push(q.kind); where.push(`kind = $${params.length}`); }
  const limit = Math.min(q.limit ?? 50, 200);
  const offset = q.offset ?? 0;
  params.push(limit, offset);

  const { rows } = await client.query(
    `SELECT * FROM (
      SELECT g.ref, g.name, g.kind::text AS kind, g.status::text AS status,
             g.price_amount::text AS price_amount, g.currency,
             g.weight_ct::text AS weight_ct, v.name AS variety,
             o.name AS origin, g.origin_type::text AS origin_type,
             vend.code AS vendor_code, vend.name AS vendor_name,
             'gemstones' AS table_name, g.created_at::text AS created_at,
             (SELECT url FROM fresh.assets a WHERE a.owner_kind='gemstone' AND a.owner_id=g.id ORDER BY position LIMIT 1) AS primary_image
      FROM fresh.gemstones g
      LEFT JOIN fresh.gemstone_varieties v ON v.id = g.variety_id
      LEFT JOIN fresh.gemstone_origins o ON o.id = g.origin_id
      LEFT JOIN fresh.vendors vend ON vend.id = g.vendor_id
      UNION ALL
      SELECT p.ref, p.name, p.kind::text, p.status::text,
             p.price_amount::text, p.currency,
             NULL AS weight_ct, jt.name AS variety,
             NULL AS origin, 'NATURAL' AS origin_type,
             vend.code AS vendor_code, vend.name AS vendor_name,
             'products' AS table_name, p.created_at::text AS created_at,
             (SELECT url FROM fresh.assets a WHERE a.owner_kind='product' AND a.owner_id=p.id ORDER BY position LIMIT 1) AS primary_image
      FROM fresh.products p
      JOIN fresh.jewellery_types jt ON jt.id = p.jewellery_type_id
      LEFT JOIN fresh.vendors vend ON vend.id = p.vendor_id
     ) inv
     WHERE ${where.join(' AND ')}
     ORDER BY created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return rows.map((r) => ({
    ...r,
    price_amount: r.price_amount == null ? null : num(r.price_amount),
    weight_ct: r.weight_ct == null ? null : num(r.weight_ct),
  })) as AdminInventoryItem[];
}

export async function adminUpdateItemStatus(client: AnyClient, ref: string, newStatus: string): Promise<void> {
  const gem = await client.query(`SELECT 1 FROM fresh.gemstones WHERE ref = $1`, [ref]);
  if (gem.rows[0]) {
    await client.query(`UPDATE fresh.gemstones SET status = $2 WHERE ref = $1`, [ref, newStatus]);
    return;
  }
  const prod = await client.query(`SELECT 1 FROM fresh.products WHERE ref = $1`, [ref]);
  if (prod.rows[0]) {
    await client.query(`UPDATE fresh.products SET status = $2 WHERE ref = $1`, [ref, newStatus]);
    return;
  }
  const set = await client.query(`SELECT 1 FROM fresh.settings WHERE ref = $1`, [ref]);
  if (set.rows[0]) {
    await client.query(`UPDATE fresh.settings SET status = $2 WHERE ref = $1`, [ref, newStatus]);
    return;
  }
  throw err(`item '${ref}' not found`, 404);
}

/* ----------------------------------------------------------------- orders */

export async function adminOrderDetail(client: AnyClient, orderNumber: string) {
  const { rows } = await client.query(
    `SELECT o.*, c.email AS customer_email, c.first_name, c.last_name
     FROM fresh.orders o LEFT JOIN fresh.customers c ON c.id = o.customer_id
     WHERE o.order_number = $1`,
    [orderNumber],
  );
  if (!rows[0]) return null;
  const items = await client.query(`SELECT description, code_snapshot, quantity, unit_price::text AS unit_price, line_total::text AS line_total FROM fresh.order_items WHERE order_id = $1`, [rows[0].id]);
  const payments = await client.query(`SELECT provider, provider_ref, state, amount::text AS amount, currency, created_at::text AS created_at FROM fresh.payments WHERE order_id = $1`, [rows[0].id]);
  const events = await client.query(`SELECT event, payload, created_at::text AS created_at FROM fresh.order_events WHERE order_id = $1 ORDER BY created_at`, [rows[0].id]);
  const { password_hash, ...rest } = rows[0];
  void password_hash;
  return { ...rest, items: items.rows, payments: payments.rows, events: events.rows };
}

/* ---------------------------------------------------------------- vendors */

export async function adminVendorsList(client: AnyClient) {
  const { rows } = await client.query(
    `SELECT v.id, v.code, v.name, v.country, v.status::text AS status, v.last_login_at::text AS last_login,
            vo.legal_name, vo.contact_name, vo.email, vo.status AS onboarding_status,
            (SELECT count(*)::int FROM fresh.gemstones g WHERE g.vendor_id = v.id AND g.status = 'ACTIVE') AS live_gems,
            (SELECT COALESCE(sum(price_amount),0)::text FROM fresh.gemstones g WHERE g.vendor_id = v.id AND g.status = 'ACTIVE') AS inventory_value,
            (SELECT count(*)::int FROM fresh.vendor_submissions vs WHERE vs.vendor_id = v.id) AS total_submissions
     FROM fresh.vendors v
     LEFT JOIN fresh.vendor_onboarding vo ON vo.vendor_id = v.id
     ORDER BY v.code`,
  );
  return rows.map((r) => ({ ...r, inventory_value: num(r.inventory_value) }));
}

/* ------------------------------------------------------------------ leads */

export async function listLeads(client: AnyClient, status?: string) {
  const params: unknown[] = [];
  let where = '';
  if (status) { params.push(status); where = `WHERE status = $1`; }
  const { rows } = await client.query(
    `SELECT id, email, name, source, status, note, created_at::text AS created_at
     FROM fresh.leads ${where} ORDER BY created_at DESC LIMIT 200`,
    params,
  );
  return rows;
}

export async function createLead(client: AnyClient, email: string, name: string | null, source: string): Promise<void> {
  await client.query(
    `INSERT INTO fresh.leads (email, name, source) VALUES ($1,$2,$3)
     ON CONFLICT (lower(email), source) DO NOTHING`,
    [email, name, source],
  );
}

export async function updateLeadStatus(client: AnyClient, leadId: number, status: string): Promise<void> {
  await client.query(`UPDATE fresh.leads SET status = $2 WHERE id = $1`, [leadId, status]);
}
