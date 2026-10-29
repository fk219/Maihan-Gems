/**
 * F3-commerce — cart, reservations, checkout, orders and payment (fresh-api).
 *
 * Honesty rules:
 * - The payment provider is the DEV TEST INSTRUMENT only: `payOrder` marks a
 *   payment CAPTURED through the `test` provider without moving real money.
 *   Real PSPs (Stripe) are a separate owner-gated increment.
 * - Shipping is 0 with an explicit pending-fulfilment note — no invented rates.
 * - Tax uses the domain engine (packages/domain) — AE/TH/GB assessed,
 *   elsewhere honestly 0 (UNCONFIGURED).
 * - One-of-one inventory: a configured product's gemstone is RESERVED at
 *   checkout and SOLD on payment; reservations guard concurrent checkouts.
 */
import crypto from 'node:crypto';
import type { Db } from './db.js';
import { ConflictError, StateError } from './validation.js';
import { assessTax } from '@maihan/domain';

const num = (v: string | number | null | undefined): number => (v == null ? 0 : Number(v));

export interface CartLine {
  id: number;
  owner_kind: 'product' | 'configuration';
  product_id: number | null;
  configuration_id: number | null;
  product_ref: string;
  product_slug: string;
  product_name: string;
  product_kind: 'READY_MADE' | 'CONFIGURED';
  gemstone_ref: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
  currency: string;
}

export interface CartView {
  token: string;
  status: string;
  currency: string;
  items: CartLine[];
  subtotal: number;
}

function err(message: string, status: number): Error {
  const e = new StateError(message);
  (e as Error & { status?: number }).status = status;
  return e;
}

/** Create (or return) the guest cart for a token. */
export async function getOrCreateCart(client: Db, token: string | undefined): Promise<{ token: string; created: boolean }> {
  if (token) {
    const { rows } = await client.query(`SELECT token FROM fresh.carts WHERE token = $1 AND status = 'ACTIVE'`, [token]);
    if (rows[0]) return { token: String(rows[0].token), created: false };
  }
  const newToken = crypto.randomUUID();
  await client.query(`INSERT INTO fresh.carts (token, status) VALUES ($1,'ACTIVE')`, [newToken]);
  return { token: newToken, created: true };
}

async function loadCartView(client: Db, token: string): Promise<CartView> {
  const { rows } = await client.query(
    `SELECT ci.id, ci.owner_kind, ci.product_id, ci.configuration_id, ci.quantity,
            ci.unit_price::text AS unit_price, ci.currency,
            p.ref AS product_ref, p.slug AS product_slug, p.name AS product_name, p.kind AS product_kind,
            g.ref AS gemstone_ref
     FROM fresh.carts c
     JOIN fresh.cart_items ci ON ci.cart_id = c.id
     LEFT JOIN fresh.products p ON p.id = ci.product_id
     LEFT JOIN fresh.configurations cfg ON cfg.id = ci.configuration_id
     LEFT JOIN fresh.gemstones g ON g.id = COALESCE(p.gemstone_id, cfg.gemstone_id)
     WHERE c.token = $1 AND c.status = 'ACTIVE'
     ORDER BY ci.id`,
    [token],
  );
  const items: CartLine[] = rows.map((r) => ({
    id: Number(r.id),
    owner_kind: r.owner_kind,
    product_id: r.product_id == null ? null : Number(r.product_id),
    configuration_id: r.configuration_id == null ? null : Number(r.configuration_id),
    product_ref: r.product_ref ?? r.product_ref,
    product_slug: r.product_slug ?? '',
    product_name: r.product_name ?? 'Commissioned piece',
    product_kind: (r.product_kind ?? 'CONFIGURED') as CartLine['product_kind'],
    gemstone_ref: r.gemstone_ref == null ? null : String(r.gemstone_ref),
    quantity: Number(r.quantity),
    unit_price: num(r.unit_price),
    line_total: Math.round(num(r.unit_price) * Number(r.quantity) * 100) / 100,
    currency: String(r.currency ?? 'USD'),
  }));
  const subtotal = Math.round(items.reduce((a, i) => a + i.line_total, 0) * 100) / 100;
  return { token, status: 'ACTIVE', currency: items[0]?.currency ?? 'USD', items, subtotal };
}

export async function viewCart(client: Db, token: string): Promise<CartView> {
  return loadCartView(client, token);
}

/** Add a catalogue product (READY_MADE or CONFIGURED) to the cart. */
export async function addProductToCart(client: Db, token: string, productRef: string, quantity: number): Promise<CartView> {
  const { rows } = await client.query(
    `SELECT id, ref, name, kind, price_amount, currency, status FROM fresh.products
     WHERE (ref = $1 OR slug = $1) AND status = 'ACTIVE' LIMIT 1`,
    [productRef],
  );
  const p = rows[0];
  if (!p) throw err(`product '${productRef}' not found or not purchasable`, 404);
  if (p.price_amount == null) throw err(`product '${productRef}' is unpriced (Price on request)`, 409);
  const qty = Math.max(1, Math.min(Number(quantity) || 1, 10));
  // One-of-one compositions: a configured product carries a unique gemstone —
  // quantity is capped at 1 honestly.
  const maxQty = p.kind === 'CONFIGURED' ? 1 : 10;
  const finalQty = Math.min(qty, maxQty);

  const cart = await getOrCreateCart(client, token);
  const cartId = (await client.query(`SELECT id FROM fresh.carts WHERE token = $1`, [cart.token])).rows[0]!.id;

  const existing = await client.query(
    `SELECT id, quantity FROM fresh.cart_items WHERE cart_id = $1 AND product_id = $2`,
    [cartId, p.id],
  );
  if (existing.rows[0]) {
    const newQty = Math.min(Number(existing.rows[0].quantity) + finalQty, maxQty);
    await client.query(`UPDATE fresh.cart_items SET quantity = $2 WHERE id = $1`, [existing.rows[0].id, newQty]);
  } else {
    await client.query(
      `INSERT INTO fresh.cart_items (cart_id, owner_kind, product_id, quantity, unit_price, currency)
       VALUES ($1,'product',$2,$3,$4,$5)`,
      [cartId, p.id, finalQty, p.price_amount, p.currency ?? 'USD'],
    );
  }
  return loadCartView(client, cart.token);
}

export async function updateCartItem(client: Db, token: string, itemId: number, quantity: number): Promise<CartView> {
  if (quantity <= 0) return removeCartItem(client, token, itemId);
  const { rows } = await client.query(
    `UPDATE fresh.cart_items ci SET quantity = $2
     FROM fresh.carts c
     WHERE ci.id = $1 AND ci.cart_id = c.id AND c.token = $3 AND c.status = 'ACTIVE'
     RETURNING ci.id`,
    [itemId, Math.min(quantity, 10), token],
  );
  if (!rows[0]) throw err(`cart item ${itemId} not found`, 404);
  return loadCartView(client, token);
}

export async function removeCartItem(client: Db, token: string, itemId: number): Promise<CartView> {
  const { rowCount } = await client.query(
    `DELETE FROM fresh.cart_items ci
     USING fresh.carts c
     WHERE ci.id = $1 AND ci.cart_id = c.id AND c.token = $2 AND c.status = 'ACTIVE'`,
    [itemId, token],
  );
  if (!rowCount) throw err(`cart item ${itemId} not found`, 404);
  return loadCartView(client, token);
}

/* ------------------------------------------------------------------ checkout */

export interface CheckoutInput {
  email: string;
  shipping_address: Record<string, unknown>;
  billing_address?: Record<string, unknown> | null;
  customer_note?: string | null;
  discount_code?: string | null;
}

function orderNumber(): string {
  const n = crypto.randomInt(1, 1_000_000);
  return `MG-${new Date().toISOString().slice(0, 4)}-${String(n).padStart(6, '0')}`;
}

export interface CheckoutResult {
  order_number: string;
  order_id: number;
  totals: { subtotal: number; discount: number; tax: number; tax_label: string; shipping: number; grand_total: number; currency: string };
  payment_pending: true;
}

export async function checkoutCart(client: Db, token: string, input: CheckoutInput): Promise<CheckoutResult> {
  const cart = await loadCartView(client, token);
  if (!cart.items.length) throw err('cart is empty', 422);

  // Concurrency guard: lock the cart row for the whole placement.
  const locked = await client.query(`SELECT id FROM fresh.carts WHERE token = $1 FOR UPDATE`, [token]);
  if (!locked.rows[0]) throw err('cart not found', 404);

  // One-of-one guard: the same gemstone may not be reserved twice.
  const gemRefs = cart.items.map((i) => i.gemstone_ref).filter(Boolean) as string[];
  for (const gref of gemRefs) {
    const g = await client.query(`SELECT status FROM fresh.gemstones WHERE ref = $1 FOR UPDATE`, [gref]);
    if (!g.rows[0]) throw err(`gemstone ${gref} disappeared`, 409);
    if (g.rows[0].status !== 'ACTIVE' && g.rows[0].status !== 'DRAFT') {
      throw new ConflictError(`gemstone ${gref} is ${g.rows[0].status} — already committed to another order`);
    }
  }

  const subtotal = cart.subtotal;

  // Discount (validated against the discounts table; nothing invented).
  let discount = 0;
  let appliedDiscountId: number | null = null;
  if (input.discount_code) {
    const d = await client.query(
      `SELECT id, kind, value, min_subtotal, starts_at, ends_at, usage_limit, used_count
       FROM fresh.discounts WHERE code = $1 AND active = true FOR UPDATE`,
      [input.discount_code.toUpperCase()],
    );
    const row = d.rows[0];
    if (!row) throw err(`discount '${input.discount_code}' not found or inactive`, 422);
    const now = Date.now();
    if (row.starts_at && new Date(row.starts_at).getTime() > now) throw err('discount not started', 422);
    if (row.ends_at && new Date(row.ends_at).getTime() < now) throw err('discount expired', 422);
    if (row.usage_limit != null && Number(row.used_count) >= Number(row.usage_limit)) throw err('discount exhausted', 422);
    if (row.min_subtotal != null && subtotal < num(row.min_subtotal)) throw err(`discount requires minimum $${num(row.min_subtotal)}`, 422);
    discount = row.kind === 'PERCENT' ? Math.round(subtotal * num(row.value)) / 100 : num(row.value);
    discount = Math.min(discount, subtotal);
    appliedDiscountId = Number(row.id);
  }

  const country = (input.shipping_address as { country?: string })?.country ?? null;
  const taxableCents = BigInt(Math.round((subtotal - discount) * 100));
  const assessment = assessTax(country, taxableCents);
  const tax = num(assessment.taxTotal);
  const shipping = 0; // pending-fulfilment: shipping is settled before dispatch (recorded follow-up)
  const grand = Math.max(0, Math.round((subtotal - discount + tax + shipping) * 100) / 100);

  const number = orderNumber();
  const { rows: orderRows } = await client.query(
    `INSERT INTO fresh.orders (order_number, email, status, currency, subtotal, tax_amount, shipping_amount,
       discount_amount, grand_total, shipping_address, billing_address, customer_note)
     VALUES ($1,$2,'PENDING_PAYMENT',$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11) RETURNING id`,
    [number, input.email, cart.currency, subtotal, tax, shipping, discount, grand,
      JSON.stringify(input.shipping_address), input.billing_address ? JSON.stringify(input.billing_address) : null,
      input.customer_note ?? null],
  );
  const orderId = Number(orderRows[0].id);

  for (const item of cart.items) {
    await client.query(
      `INSERT INTO fresh.order_items (order_id, product_id, configuration_id, description, code_snapshot,
         gemstone_id, setting_id, quantity, unit_price, line_total)
       SELECT $1, ci.product_id, ci.configuration_id, $2, COALESCE(p.ref, cfg.code), COALESCE(p.gemstone_id, cfg.gemstone_id),
         cfg.setting_id, ci.quantity, ci.unit_price, ci.unit_price * ci.quantity
       FROM fresh.cart_items ci
       LEFT JOIN fresh.products p ON p.id = ci.product_id
       LEFT JOIN fresh.configurations cfg ON cfg.id = ci.configuration_id
       WHERE ci.id = $3`,
      [orderId, `${item.product_name} — ${item.product_ref}`, item.id],
    );
  }

  // Reservations + inventory movement
  for (const item of cart.items) {
    if (item.gemstone_ref) {
      await client.query(
        `INSERT INTO fresh.inventory_reservations (owner_kind, owner_id, cart_id, state, expires_at)
         VALUES ('gemstone', (SELECT id FROM fresh.gemstones WHERE ref = $1), (SELECT id FROM fresh.carts WHERE token = $2), 'ACTIVE', now() + interval '24 hours')`,
        [item.gemstone_ref, token],
      );
      await client.query(`UPDATE fresh.gemstones SET status = 'RESERVED' WHERE ref = $1`, [item.gemstone_ref]);
    } else if (item.product_id != null) {
      await client.query(
        `INSERT INTO fresh.inventory_reservations (owner_kind, owner_id, cart_id, state, expires_at)
         VALUES ('product', $1, (SELECT id FROM fresh.carts WHERE token = $2), 'ACTIVE', now() + interval '24 hours')`,
        [item.product_id, token],
      );
    }
    if (appliedDiscountId != null) break; // usage counted once per order below
  }
  if (appliedDiscountId != null) {
    await client.query(`UPDATE fresh.discounts SET used_count = used_count + 1 WHERE id = $1`, [appliedDiscountId]);
  }

  await client.query(
    `INSERT INTO fresh.order_events (order_id, event, payload)
     VALUES ($1, 'CREATED', $2::jsonb)`,
    [orderId, JSON.stringify({ subtotal, discount, tax, shipping, grand, tax_evidence: assessment.evidence })],
  );
  await client.query(`UPDATE fresh.carts SET status = 'CONVERTED' WHERE token = $1`, [token]);

  return {
    order_number: number,
    order_id: orderId,
    totals: { subtotal, discount, tax, tax_label: assessment.evidence, shipping, grand_total: grand, currency: cart.currency },
    payment_pending: true,
  };
}

/** DEV TEST INSTRUMENT ONLY — captures the pending payment and moves inventory. */
export async function payOrder(client: Db, orderNumberStr: string): Promise<{ order_number: string; status: string; payment: { state: string; provider: string } }> {
  const locked = await client.query(`SELECT id, status, currency, grand_total::text AS grand FROM fresh.orders WHERE order_number = $1 FOR UPDATE`, [orderNumberStr]);
  const o = locked.rows[0];
  if (!o) throw err(`order '${orderNumberStr}' not found`, 404);
  if (o.status !== 'PENDING_PAYMENT') throw new ConflictError(`order ${orderNumberStr} is ${o.status}, not payable`);

  const providerRef = `test-${crypto.randomUUID()}`;
  const { rows: payRows } = await client.query(
    `INSERT INTO fresh.payments (order_id, provider, provider_ref, state, amount, currency, captured_at)
     VALUES ($1,'test',$2,'CAPTURED',$3,$4, now()) RETURNING id`,
    [o.id, providerRef, o.grand, o.currency],
  );
  const paymentId = Number(payRows[0].id);

  await client.query(`UPDATE fresh.orders SET status = 'PAID', paid_at = now(), updated_at = now() WHERE id = $1`, [o.id]);
  await client.query(
    `INSERT INTO fresh.order_events (order_id, event, payload) VALUES ($1,'PAID',$2::jsonb)`,
    [o.id, JSON.stringify({ provider: 'test', provider_ref: providerRef })],
  );

  // Inventory: reservations consumed; configured gems SOLD.
  const items = await client.query(
    `SELECT oi.gemstone_id, oi.product_id, oi.quantity FROM fresh.order_items oi WHERE oi.order_id = $1`,
    [o.id],
  );
  for (const item of items.rows) {
    if (item.gemstone_id != null) {
      await client.query(`UPDATE fresh.gemstones SET status = 'SOLD', quantity = 0 WHERE id = $1 AND status = 'RESERVED'`, [item.gemstone_id]);
      await client.query(
        `UPDATE fresh.inventory_reservations SET state = 'CONSUMED' WHERE owner_kind = 'gemstone' AND owner_id = $1 AND state = 'ACTIVE'`,
        [item.gemstone_id],
      );
    }
    if (item.product_id != null) {
      await client.query(
        `UPDATE fresh.inventory_reservations SET state = 'CONSUMED' WHERE owner_kind = 'product' AND owner_id = $1 AND state = 'ACTIVE'`,
        [item.product_id],
      );
    }
  }
  await client.query(`UPDATE fresh.payments SET captured_at = COALESCE(captured_at, now()) WHERE id = $1`, [paymentId]);

  return { order_number: orderNumberStr, status: 'PAID', payment: { state: 'CAPTURED', provider: 'test' } };
}

export async function getOrder(client: Db, orderNumberStr: string) {
  const { rows } = await client.query(
    `SELECT order_number, email, status, currency, subtotal::text AS subtotal, tax_amount::text AS tax,
            shipping_amount::text AS shipping, discount_amount::text AS discount, grand_total::text AS grand_total,
            shipping_address, customer_note, placed_at, paid_at
     FROM fresh.orders WHERE order_number = $1`,
    [orderNumberStr],
  );
  if (!rows[0]) return null;
  const itemRows = await client.query(
    `SELECT description, code_snapshot, quantity, unit_price::text AS unit_price, line_total::text AS line_total
     FROM fresh.order_items WHERE order_id = (SELECT id FROM fresh.orders WHERE order_number = $1) ORDER BY id`,
    [orderNumberStr],
  );
  const events = await client.query(
    `SELECT event, created_at FROM fresh.order_events WHERE order_id = (SELECT id FROM fresh.orders WHERE order_number = $1) ORDER BY created_at`,
    [orderNumberStr],
  );
  return { ...rows[0], items: itemRows.rows, events: events.rows };
}

export async function listOrders(client: Db, limit = 50) {
  const { rows } = await client.query(
    `SELECT order_number, email, status, grand_total::text AS grand_total, currency, placed_at, paid_at
     FROM fresh.orders ORDER BY placed_at DESC LIMIT $1`,
    [Math.min(limit, 200)],
  );
  return rows;
}
