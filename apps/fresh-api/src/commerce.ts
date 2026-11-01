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
import { queueEmail, orderEmail, paymentEmail, cancelledEmail } from './mail.js';
import { audit } from './db.js';
import { newToken, hashKey } from './auth.js';

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
    `SELECT p.id, p.ref, p.name, p.kind, p.price_amount, p.currency, p.status, p.quantity,
            g.status AS gem_status
     FROM fresh.products p
     LEFT JOIN fresh.gemstones g ON g.id = p.gemstone_id
     WHERE (p.ref = $1 OR p.slug = $1) AND p.status = 'ACTIVE' LIMIT 1`,
    [productRef],
  );
  const p = rows[0];
  if (!p) throw err(`product '${productRef}' not found or not purchasable`, 404);
  if (p.price_amount == null) throw err(`product '${productRef}' is unpriced (Price on request)`, 409);
  const qty = Math.max(1, Math.min(Number(quantity) || 1, 10));
  // One-of-one compositions: a configured product carries a unique gemstone —
  // quantity is capped at 1 honestly. Ready-made pieces are capped by stock.
  if (p.kind === 'READY_MADE' && Number(p.quantity) <= 0) {
    throw err(`'${p.name}' is out of stock`, 409);
  }
  const maxQty = p.kind === 'CONFIGURED' ? 1 : Math.max(1, Math.min(10, Number(p.quantity)));
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
  const item = await client.query(
    `SELECT ci.product_id, p.kind::text AS kind, p.quantity
     FROM fresh.cart_items ci
     JOIN fresh.carts c ON c.id = ci.cart_id
     LEFT JOIN fresh.products p ON p.id = ci.product_id
     WHERE ci.id = $1 AND c.token = $2 AND c.status = 'ACTIVE'`,
    [itemId, token],
  );
  if (!item.rows[0]) throw err(`cart item ${itemId} not found`, 404);
  const row = item.rows[0];
  let max = 10;
  if (row.product_id != null) {
    const stock = row.kind === 'CONFIGURED' ? 1 : Number(row.quantity);
    if (stock <= 0) throw err('item is out of stock', 409);
    max = Math.max(1, Math.min(10, stock));
  }
  const { rows } = await client.query(
    `UPDATE fresh.cart_items SET quantity = $2 WHERE id = $1 RETURNING id`,
    [itemId, Math.min(quantity, max)],
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
  access_token: string;
  totals: { subtotal: number; discount: number; tax: number; tax_label: string; shipping: number; grand_total: number; currency: string };
  payment_pending: true;
}

export async function quoteCart(
  client: Db,
  token: string,
  input: { country?: string | null; discount_code?: string | null },
) {
  const cart = await loadCartView(client, token);
  if (!cart.items.length) throw err('cart is empty', 422);
  const subtotal = cart.subtotal;
  let discount = 0;
  if (input.discount_code) {
    const d = await client.query(
      `SELECT kind, value, min_subtotal, starts_at, ends_at, usage_limit, used_count
       FROM fresh.discounts WHERE code = $1 AND active = true`,
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
  }
  const assessment = assessTax(input.country ?? null, BigInt(Math.round((subtotal - discount) * 100)));
  const tax = num(assessment.taxTotal);
  const taxLabel = 'label' in assessment ? assessment.label : 'UNCONFIGURED';
  const shipping = 0;
  const grand = Math.max(0, Math.round((subtotal - discount + tax + shipping) * 100) / 100);
  return {
    subtotal,
    discount,
    tax,
    tax_label: taxLabel,
    shipping,
    grand_total: grand,
    currency: cart.currency,
  };
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
  const taxLabel = 'label' in assessment ? assessment.label : 'UNCONFIGURED';
  const shipping = 0; // pending-fulfilment: shipping is settled before dispatch (recorded follow-up)
  const grand = Math.max(0, Math.round((subtotal - discount + tax + shipping) * 100) / 100);

  const number = orderNumber();
  const access = newToken();
  const { rows: orderRows } = await client.query(
    `INSERT INTO fresh.orders (order_number, email, status, currency, subtotal, tax_amount, shipping_amount,
       discount_amount, grand_total, shipping_address, billing_address, customer_note, access_token_hash)
     VALUES ($1,$2,'PENDING_PAYMENT',$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11,$12) RETURNING id`,
    [number, input.email, cart.currency, subtotal, tax, shipping, discount, grand,
      JSON.stringify(input.shipping_address), input.billing_address ? JSON.stringify(input.billing_address) : null,
      input.customer_note ?? null, access.hash],
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

  // Reservations + inventory movement (locked; no double-sell, stock guarded)
  for (const item of cart.items) {
    if (item.gemstone_ref) {
      const locked = await client.query(
        `SELECT id, status FROM fresh.gemstones WHERE ref = $1 FOR UPDATE`,
        [item.gemstone_ref],
      );
      const gem = locked.rows[0];
      if (!gem) throw err(`stone '${item.gemstone_ref}' not found`, 404);
      if (['RESERVED', 'SOLD', 'ARCHIVED'].includes(String(gem.status))) {
        throw new ConflictError(`stone '${item.gemstone_ref}' is no longer available`);
      }
      await client.query(`UPDATE fresh.gemstones SET status = 'RESERVED' WHERE id = $1`, [gem.id]);
      await client.query(
        `INSERT INTO fresh.inventory_reservations (owner_kind, owner_id, cart_id, state, expires_at, previous_status, order_id)
         VALUES ('gemstone', $1, (SELECT id FROM fresh.carts WHERE token = $2), 'ACTIVE', now() + interval '24 hours', $3, $4)`,
        [gem.id, token, gem.status, orderId],
      );
    } else if (item.product_id != null) {
      const dec = await client.query(
        `UPDATE fresh.products SET quantity = quantity - $2 WHERE id = $1 AND quantity >= $2 RETURNING id`,
        [item.product_id, item.quantity],
      );
      if (!dec.rows[0]) throw new ConflictError(`'${item.product_name}' is out of stock`);
      await client.query(
        `INSERT INTO fresh.inventory_reservations (owner_kind, owner_id, cart_id, state, expires_at, order_id)
         VALUES ('product', $1, (SELECT id FROM fresh.carts WHERE token = $2), 'ACTIVE', now() + interval '24 hours', $3)`,
        [item.product_id, token, orderId],
      );
    }
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

  const mail = orderEmail(number, String(grand), cart.currency, access.raw);
  await queueEmail(client, { to: input.email, subject: mail.subject, body: mail.body });

  return {
    order_number: number,
    order_id: orderId,
    access_token: access.raw,
    totals: { subtotal, discount, tax, tax_label: taxLabel, shipping, grand_total: grand, currency: cart.currency },
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

  const who = await client.query(`SELECT email, currency FROM fresh.orders WHERE id = $1`, [o.id]);
  const mail = paymentEmail(orderNumberStr, String(o.grand), String(who.rows[0]?.currency ?? 'USD'));
  await queueEmail(client, { to: who.rows[0]?.email ?? '', subject: mail.subject, body: mail.body });

  return { order_number: orderNumberStr, status: 'PAID', payment: { state: 'CAPTURED', provider: 'test' } };
}

export async function getOrder(client: Db, orderNumberStr: string) {
  const { rows } = await client.query(
    `SELECT order_number, customer_id, email, status, currency, subtotal::text AS subtotal, tax_amount::text AS tax,
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

/** Public/customer read: requires the checkout access token or the owning session. */
export async function getOrderAuthorized(
  client: Db,
  orderNumberStr: string,
  opts: { token?: string | null; customer?: { id: number; email: string } | null },
): Promise<ReturnType<typeof getOrder> extends Promise<infer T> ? T : never | null> {
  const order = await getOrder(client, orderNumberStr);
  if (!order) return null;
  if (opts.token) {
    const { rows } = await client.query(
      `SELECT access_token_hash FROM fresh.orders WHERE order_number = $1`,
      [orderNumberStr],
    );
    const stored = rows[0]?.access_token_hash as string | null;
    if (stored && stored === hashKey(opts.token)) return order;
  }
  if (opts.customer) {
    const sameId = order.customer_id != null && Number(order.customer_id) === opts.customer.id;
    const sameEmail = String(order.email).toLowerCase() === opts.customer.email.toLowerCase();
    if (sameId || sameEmail) return order;
  }
  return null;
}

export async function listOrders(client: Db, limit = 50, offset = 0) {
  const { rows } = await client.query(
    `SELECT o.order_number, o.email, o.status, o.grand_total::text AS grand_total, o.currency, o.placed_at, o.paid_at,
            (SELECT p.provider FROM fresh.payments p WHERE p.order_id = o.id ORDER BY p.created_at DESC LIMIT 1) AS payment_provider
     FROM fresh.orders o ORDER BY o.placed_at DESC LIMIT $1 OFFSET $2`,
    [Math.min(limit, 200), Math.max(offset, 0)],
  );
  return rows;
}


/**
 * Cancel an order before fulfilment: releases stone reservations, restores
 * sold stones to the vault, and (when paid) records a PENDING refund for the
 * remaining captured amount. No provider settlement is claimed.
 */
export async function cancelOrder(
  client: Db,
  orderNumberStr: string,
  reason: string,
  actor: string,
): Promise<{ order_number: string; status: string; refunded: number | null }> {
  const locked = await client.query(
    `SELECT id, status, currency FROM fresh.orders WHERE order_number = $1 FOR UPDATE`,
    [orderNumberStr],
  );
  const order = locked.rows[0];
  if (!order) throw err(`order '${orderNumberStr}' not found`, 404);
  if (!['PENDING_PAYMENT', 'PAID'].includes(String(order.status))) {
    throw err(`order ${orderNumberStr} is ${order.status}; only unpaid or paid-but-unshipped orders can be cancelled`, 409);
  }

  let refunded: number | null = null;
  if (String(order.status) === 'PAID') {
    const pay = await client.query(
      `SELECT id, amount::text AS amount FROM fresh.payments WHERE order_id = $1 AND state IN ('CAPTURED','SETTLED') ORDER BY created_at DESC LIMIT 1`,
      [order.id],
    );
    if (pay.rows[0]) {
      const existing = await client.query(
        `SELECT COALESCE(sum(amount),0)::text AS refunded FROM fresh.refunds WHERE order_id = $1 AND state <> 'FAILED'`,
        [order.id],
      );
      const amount = Math.round((Number(pay.rows[0].amount) - Number(existing.rows[0].refunded)) * 100) / 100;
      if (amount > 0) {
        await client.query(
          `INSERT INTO fresh.refunds (payment_id, order_id, amount, reason, state) VALUES ($1,$2,$3,$4,'PENDING')`,
          [pay.rows[0].id, order.id, amount, `order cancelled: ${reason}`],
        );
        await client.query(
          `INSERT INTO fresh.order_events (order_id, event, payload) VALUES ($1,'REFUND_RECORDED',$2::jsonb)`,
          [order.id, JSON.stringify({ amount, reason: 'order cancelled', by: actor })],
        );
        refunded = amount;
      }
    }
  }

  await client.query(
    `UPDATE fresh.inventory_reservations SET state = 'RELEASED'
     WHERE order_id = $1 AND state IN ('ACTIVE','CONSUMED')`,
    [order.id],
  );
  const items = await client.query(
    `SELECT gemstone_id, product_id, quantity FROM fresh.order_items WHERE order_id = $1`,
    [order.id],
  );
  for (const item of items.rows) {
    if (item.gemstone_id != null) {
      await client.query(
        `UPDATE fresh.gemstones g
         SET status = COALESCE(
               (SELECT r.previous_status FROM fresh.inventory_reservations r
                WHERE r.owner_kind = 'gemstone' AND r.owner_id = g.id AND r.previous_status IS NOT NULL
                ORDER BY r.created_at DESC LIMIT 1),
               'ACTIVE'
             )::fresh.catalog_status,
             quantity = 1
         WHERE g.id = $1 AND g.status IN ('RESERVED','SOLD')
           AND NOT EXISTS (
             SELECT 1 FROM fresh.inventory_reservations r2
             WHERE r2.owner_kind = 'gemstone' AND r2.owner_id = g.id AND r2.state = 'ACTIVE'
           )`,
        [item.gemstone_id],
      );

    }
    if (item.product_id != null) {
      await client.query(
        `UPDATE fresh.products SET quantity = quantity + $2 WHERE id = $1`,
        [item.product_id, item.quantity],
      );
    }
  }

  await client.query(
    `UPDATE fresh.orders SET status = 'CANCELLED', cancelled_at = now(), updated_at = now() WHERE id = $1`,
    [order.id],
  );
  await client.query(
    `INSERT INTO fresh.order_events (order_id, event, payload) VALUES ($1,'CANCELLED',$2::jsonb)`,
    [order.id, JSON.stringify({ reason, by: actor, refunded })],
  );
  await audit(client, 'ORDER_CANCELLED', 'order', Number(order.id), { orderNumber: orderNumberStr, reason, refunded }, actor);
  const who = await client.query(`SELECT email FROM fresh.orders WHERE id = $1`, [order.id]);
  if (who.rows[0]?.email) {
    const mail = cancelledEmail(orderNumberStr, refunded, String(order.currency));
    await queueEmail(client, { to: who.rows[0].email, subject: mail.subject, body: mail.body });
  }
  return { order_number: orderNumberStr, status: 'CANCELLED', refunded };
}
