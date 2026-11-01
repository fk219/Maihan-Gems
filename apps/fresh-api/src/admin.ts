/**
 * F4 — admin console data layer (fresh-api).
 * Overview stats, platform-wide inventory management, order details,
 * vendor management, and leads.
 */
import { audit, type AnyClient } from './db.js';
import { queueEmail, shippedEmail } from './mail.js';
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
  const fulfilments = await client.query(
    `SELECT id, carrier, tracking_number, state, shipped_at::text AS shipped_at, delivered_at::text AS delivered_at
     FROM fresh.order_fulfillments WHERE order_id = $1 ORDER BY created_at`,
    [rows[0].id],
  );
  const refunds = await client.query(
    `SELECT id, amount::text AS amount, reason, state, created_at::text AS created_at, processed_at::text AS processed_at
     FROM fresh.refunds WHERE order_id = $1 ORDER BY created_at`,
    [rows[0].id],
  );
  const { password_hash, ...rest } = rows[0];
  void password_hash;
  return { ...rest, items: items.rows, payments: payments.rows, events: events.rows, fulfilments: fulfilments.rows, refunds: refunds.rows };
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

export async function createLead(
  client: AnyClient,
  email: string,
  name: string | null,
  source: string,
  note: string | null = null,
): Promise<number | null> {
  const { rows } = await client.query(
    `INSERT INTO fresh.leads (email, name, source, note) VALUES ($1,$2,$3,$4)
     ON CONFLICT (lower(email), source) DO UPDATE SET note = COALESCE(EXCLUDED.note, fresh.leads.note)
     RETURNING id`,
    [email, name, source, note],
  );
  return rows[0] ? Number(rows[0].id) : null;
}

export async function unsubscribeLead(client: AnyClient, email: string): Promise<void> {
  await client.query(
    `UPDATE fresh.leads SET status = 'LOST' WHERE lower(email) = lower($1) AND source = 'newsletter' AND status <> 'LOST'`,
    [email],
  );
}

export async function updateLeadStatus(client: AnyClient, leadId: number, status: string): Promise<void> {
  await client.query(`UPDATE fresh.leads SET status = $2 WHERE id = $1`, [leadId, status]);
}

/* ------------------------------------------------------- order lifecycle */

const ORDER_TRANSITIONS: Record<string, string[]> = {
  PAID: ['IN_FULFILLMENT'],
  IN_FULFILLMENT: ['FULFILLED'],
  FULFILLED: ['DELIVERED'],
};

export async function updateOrderStatus(
  client: AnyClient,
  orderNumber: string,
  next: string,
  actor: string,
): Promise<{ order_number: string; status: string }> {
  const { rows } = await client.query(
    `SELECT id, status FROM fresh.orders WHERE order_number = $1 FOR UPDATE`,
    [orderNumber],
  );
  const order = rows[0];
  if (!order) {
    const e = new StateError(`order '${orderNumber}' not found`);
    (e as Error & { status?: number }).status = 404;
    throw e;
  }
  const from = String(order.status);
  const allowed = ORDER_TRANSITIONS[from] ?? [];
  if (!allowed.includes(next)) {
    throw new StateError(`cannot move order from ${from} to ${next}`);
  }
  await client.query(`UPDATE fresh.orders SET status = $2, updated_at = now() WHERE id = $1`, [order.id, next]);
  if (next === 'DELIVERED') {
    await client.query(
      `UPDATE fresh.order_fulfillments SET state = 'DELIVERED', delivered_at = COALESCE(delivered_at, now()) WHERE order_id = $1`,
      [order.id],
    );
  }
  await client.query(
    `INSERT INTO fresh.order_events (order_id, event, payload) VALUES ($1,$2,$3::jsonb)`,
    [order.id, `STATUS_${next}`, JSON.stringify({ from, to: next, by: actor })],
  );
  await audit(client, `ORDER_${next}`, 'order', Number(order.id), { orderNumber, from, to: next }, actor);
  return { order_number: orderNumber, status: next };
}

export async function addFulfillment(
  client: AnyClient,
  orderNumber: string,
  carrier: string,
  trackingNumber: string,
  actor: string,
): Promise<{ order_number: string; status: string; carrier: string; tracking_number: string }> {
  const { rows } = await client.query(
    `SELECT id, status FROM fresh.orders WHERE order_number = $1 FOR UPDATE`,
    [orderNumber],
  );
  const order = rows[0];
  if (!order) {
    const e = new StateError(`order '${orderNumber}' not found`);
    (e as Error & { status?: number }).status = 404;
    throw e;
  }
  if (!['PAID', 'IN_FULFILLMENT'].includes(String(order.status))) {
    throw new StateError(`order ${orderNumber} is ${order.status}; only paid orders can be fulfilled`);
  }
  await client.query(
    `INSERT INTO fresh.order_fulfillments (order_id, carrier, tracking_number, state, shipped_at)
     VALUES ($1,$2,$3,'SHIPPED', now())`,
    [order.id, carrier, trackingNumber],
  );
  await client.query(`UPDATE fresh.orders SET status = 'IN_FULFILLMENT', updated_at = now() WHERE id = $1`, [order.id]);
  await client.query(
    `INSERT INTO fresh.order_events (order_id, event, payload) VALUES ($1,'SHIPPED',$2::jsonb)`,
    [order.id, JSON.stringify({ carrier, tracking_number: trackingNumber, by: actor })],
  );
  await audit(client, 'ORDER_SHIPPED', 'order', Number(order.id), { orderNumber, carrier, trackingNumber }, actor);
  const who = await client.query(`SELECT email FROM fresh.orders WHERE id = $1`, [order.id]);
  if (who.rows[0]?.email) {
    const mail = shippedEmail(orderNumber, carrier, trackingNumber);
    await queueEmail(client, { to: who.rows[0].email, subject: mail.subject, body: mail.body });
  }
  return { order_number: orderNumber, status: 'IN_FULFILLMENT', carrier, tracking_number: trackingNumber };
}

export async function recordRefund(
  client: AnyClient,
  orderNumber: string,
  amount: number,
  reason: string,
  actor: string,
): Promise<{ id: number; order_number: string; amount: number; state: string }> {
  if (!Number.isFinite(amount) || amount <= 0) throw new StateError('refund amount must be positive');
  const { rows } = await client.query(
    `SELECT id, status, grand_total::text AS grand FROM fresh.orders WHERE order_number = $1 FOR UPDATE`,
    [orderNumber],
  );
  const order = rows[0];
  if (!order) {
    const e = new StateError(`order '${orderNumber}' not found`);
    (e as Error & { status?: number }).status = 404;
    throw e;
  }
  if (!['PAID', 'IN_FULFILLMENT', 'FULFILLED', 'DELIVERED'].includes(String(order.status))) {
    throw new StateError(`order ${orderNumber} is ${order.status}; nothing to refund`);
  }
  const pay = await client.query(
    `SELECT p.id, p.amount::text AS amount FROM fresh.payments p
     WHERE p.order_id = $1 AND p.state IN ('CAPTURED','SETTLED') ORDER BY p.created_at DESC LIMIT 1`,
    [order.id],
  );
  if (!pay.rows[0]) throw new StateError(`order ${orderNumber} has no captured payment`);
  const existing = await client.query(
    `SELECT COALESCE(sum(amount),0)::text AS refunded FROM fresh.refunds WHERE order_id = $1 AND state <> 'FAILED'`,
    [order.id],
  );
  const paid = Number(pay.rows[0].amount);
  const refunded = Number(existing.rows[0].refunded);
  const remaining = Math.round((paid - refunded) * 100) / 100;
  if (amount > remaining) throw new StateError(`refund exceeds remaining refundable amount ${remaining}`);

  // No PSP is configured: the refund is recorded in state PENDING. It is not
  // claimed to be settled; a provider adapter transitions it when wired.
  const { rows: refundRows } = await client.query(
    `INSERT INTO fresh.refunds (payment_id, order_id, amount, reason, state)
     VALUES ($1,$2,$3,$4,'PENDING') RETURNING id`,
    [pay.rows[0].id, order.id, amount, reason],
  );
  await client.query(
    `INSERT INTO fresh.order_events (order_id, event, payload) VALUES ($1,'REFUND_RECORDED',$2::jsonb)`,
    [order.id, JSON.stringify({ amount, reason, by: actor })],
  );
  await audit(client, 'REFUND_RECORDED', 'order', Number(order.id), { orderNumber, amount, reason }, actor);
  return { id: Number(refundRows[0].id), order_number: orderNumber, amount, state: 'PENDING' };
}

/* -------------------------------------------------------------- discounts */

interface DiscountInput {
  code: string;
  kind: 'PERCENT' | 'FIXED';
  value: number;
  min_subtotal?: number | null;
  starts_at?: string | null;
  ends_at?: string | null;
  usage_limit?: number | null;
  active?: boolean;
}

export async function listDiscounts(client: AnyClient) {
  const { rows } = await client.query(
    `SELECT id, code, kind, value::text AS value, min_subtotal::text AS min_subtotal,
            starts_at::text AS starts_at, ends_at::text AS ends_at,
            usage_limit, used_count, active, created_at::text AS created_at
     FROM fresh.discounts ORDER BY created_at DESC`,
  );
  return rows;
}

function validateDiscount(input: DiscountInput): void {
  if (!/^[A-Z0-9][A-Z0-9_-]{1,39}$/.test(input.code)) {
    throw new StateError('code must be 2–40 uppercase letters, digits, - or _');
  }
  if (input.kind === 'PERCENT' && (input.value <= 0 || input.value > 100)) {
    throw new StateError('percentage value must be between 0 and 100');
  }
  if (input.kind === 'FIXED' && input.value <= 0) {
    throw new StateError('fixed discount must be positive');
  }
  if (input.starts_at && input.ends_at && new Date(input.starts_at) >= new Date(input.ends_at)) {
    throw new StateError('starts_at must be before ends_at');
  }
}

export async function createDiscount(client: AnyClient, body: DiscountInput, actor: string) {
  const input = { ...body, code: body.code.trim().toUpperCase() };
  validateDiscount(input);
  const dup = await client.query(`SELECT 1 FROM fresh.discounts WHERE code = $1`, [input.code]);
  if (dup.rowCount) throw new StateError(`discount '${input.code}' already exists`);
  const { rows } = await client.query(
    `INSERT INTO fresh.discounts (code, kind, value, min_subtotal, starts_at, ends_at, usage_limit, active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING id, code, kind, value::text AS value, active`,
    [input.code, input.kind, input.value, input.min_subtotal ?? null, input.starts_at ?? null, input.ends_at ?? null, input.usage_limit ?? null, input.active ?? true],
  );
  await audit(client, 'DISCOUNT_CREATED', 'discount', Number(rows[0].id), rows[0], actor);
  return rows[0];
}

export async function updateDiscount(
  client: AnyClient,
  id: number,
  body: Partial<DiscountInput>,
  actor: string,
) {
  const existing = await client.query(
    `SELECT id, code, kind, value::text AS value, min_subtotal::text AS min_subtotal,
            starts_at::text AS starts_at, ends_at::text AS ends_at, usage_limit, active
     FROM fresh.discounts WHERE id = $1`,
    [id],
  );
  const row = existing.rows[0];
  if (!row) {
    const e = new StateError(`discount ${id} not found`);
    (e as Error & { status?: number }).status = 404;
    throw e;
  }
  const kind = (body.kind ?? row.kind) as 'PERCENT' | 'FIXED';
  const value = body.value != null ? Number(body.value) : Number(row.value);
  const code = (body.code ?? row.code).trim().toUpperCase();
  const merged = {
    code,
    kind,
    value,
    starts_at: body.starts_at !== undefined ? body.starts_at : row.starts_at,
    ends_at: body.ends_at !== undefined ? body.ends_at : row.ends_at,
    min_subtotal: body.min_subtotal !== undefined ? body.min_subtotal : (row.min_subtotal == null ? null : Number(row.min_subtotal)),
    usage_limit: body.usage_limit !== undefined ? body.usage_limit : row.usage_limit,
    active: body.active !== undefined ? body.active : Boolean(row.active),
  };
  validateDiscount(merged as DiscountInput);
  if (code !== row.code) {
    const dup = await client.query(`SELECT 1 FROM fresh.discounts WHERE code = $1 AND id <> $2`, [code, id]);
    if (dup.rowCount) throw new StateError(`discount '${code}' already exists`);
  }
  const { rows } = await client.query(
    `UPDATE fresh.discounts
     SET code = $2, kind = $3, value = $4, starts_at = $5, ends_at = $6,
         min_subtotal = $7, usage_limit = $8, active = $9
     WHERE id = $1
     RETURNING id, code, kind, value::text AS value, min_subtotal::text AS min_subtotal,
               starts_at::text AS starts_at, ends_at::text AS ends_at, active, usage_limit, used_count`,
    [id, merged.code, merged.kind, merged.value, merged.starts_at ?? null, merged.ends_at ?? null,
      merged.min_subtotal ?? null, merged.usage_limit ?? null, merged.active],
  );
  await audit(client, 'DISCOUNT_UPDATED', 'discount', id, body, actor);
  return rows[0];
}

/* ----------------------------------------------------------------- audit */

export async function listAudit(client: AnyClient, limit = 100) {
  const { rows } = await client.query(
    `SELECT id, actor_kind, action, entity_kind, entity_id, after, created_at::text AS created_at
     FROM fresh.audit_log ORDER BY created_at DESC LIMIT $1`,
    [Math.min(limit, 500)],
  );
  return rows;
}
