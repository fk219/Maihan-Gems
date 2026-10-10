/**
 * packages/db/src/commerce/order-repository.ts
 *
 * Phase 6 Task 4 — Order placement and immutable snapshots repository.
 *
 * Authority:
 * - technical_design/13 COMMERCE ARCHITECTURE §82-96.
 * - Format: MG-YYYY-NNNNNN
 * - Placed orders are immutable: snapshots freeze configuration, gems, documents, and money.
 * - Idempotency-Key guarantees replay returns original order.
 */
import { randomInt } from 'node:crypto';
import { sql } from 'drizzle-orm';
import type { CatalogDatabase } from '../catalog/executor.js';
import {
  ContractError,
  type OrderDto,
  type OrderItemDto,
  type PlaceOrderInput,
} from '@maihan/contracts';
import {
  formatOrderNumber,
  transitionOrder,
  type OrderEvent,
  type OrderState as DomainOrderState,
  type OrderTransitionResult,
} from '@maihan/domain';
import { getCartByToken } from './cart-repository.js';
import { getCheckoutSession, saveCheckoutSession } from './checkout-session-repository.js';

interface RawOrderRow {
  id: string;
  order_number: string;
  customer_id: string | null;
  email: string;
  state: OrderDto['state'];
  currency: string;
  subtotal: string;
  discount_total: string;
  shipping_total: string;
  tax_total: string;
  grand_total: string;
  pricing_snapshot: OrderDto['pricing_snapshot'];
  shipping_address: OrderDto['shipping_address'];
  billing_address: OrderDto['billing_address'];
  customer_note: string | null;
  placed_at: Date | string | null;
  idempotency_key: string | null;
  version: number;
  created_at: Date | string;
}

interface RawOrderItemRow {
  id: string;
  order_id: string;
  product_id: string | null;
  configuration_id: string | null;
  sku_snapshot: string;
  title_snapshot: string;
  configuration_snapshot: Record<string, unknown> | null;
  gem_snapshot: Record<string, unknown>;
  document_snapshot: Record<string, unknown> | null;
  quantity: number;
  unit_price: string;
  line_total: string;
  production_days: number | null;
  state: string;
}

function toIso(dateOrString: Date | string | null | undefined): string | null {
  if (!dateOrString) return null;
  return new Date(dateOrString).toISOString();
}

function mapOrder(row: RawOrderRow, items: OrderItemDto[]): OrderDto {
  return {
    id: row.id,
    order_number: row.order_number,
    customer_id: row.customer_id,
    email: row.email,
    state: row.state,
    currency: row.currency,
    subtotal: Number(row.subtotal).toFixed(2),
    discount_total: Number(row.discount_total).toFixed(2),
    shipping_total: Number(row.shipping_total).toFixed(2),
    tax_total: Number(row.tax_total).toFixed(2),
    grand_total: Number(row.grand_total).toFixed(2),
    pricing_snapshot: row.pricing_snapshot,
    shipping_address: row.shipping_address,
    billing_address: row.billing_address ?? null,
    customer_note: row.customer_note,
    placed_at: toIso(row.placed_at),
    idempotency_key: row.idempotency_key,
    version: row.version,
    created_at: toIso(row.created_at) ?? new Date().toISOString(),
    items,
  };
}

export async function getOrderById(
  db: CatalogDatabase,
  orderId: string,
): Promise<OrderDto> {
  const orderRes = await db.execute(sql`
    SELECT
      id,
      order_number,
      customer_id,
      email,
      state::text AS state,
      currency,
      subtotal::text AS subtotal,
      discount_total::text AS discount_total,
      shipping_total::text AS shipping_total,
      tax_total::text AS tax_total,
      grand_total::text AS grand_total,
      pricing_snapshot,
      shipping_address,
      billing_address,
      customer_note,
      placed_at,
      idempotency_key,
      version,
      created_at
    FROM orders
    WHERE id = ${orderId}
    LIMIT 1
  `);

  if (orderRes.rows.length === 0) {
    throw new ContractError('ORDER_NOT_FOUND', `Order with ID "${orderId}" not found.`);
  }

  const itemsRes = await db.execute(sql`
    SELECT
      id,
      order_id,
      product_id,
      configuration_id,
      sku_snapshot,
      title_snapshot,
      configuration_snapshot,
      gem_snapshot,
      document_snapshot,
      quantity,
      unit_price::text AS unit_price,
      line_total::text AS line_total,
      production_days,
      state
    FROM order_items
    WHERE order_id = ${orderId}
    ORDER BY created_at ASC
  `);

  const rawOrder = orderRes.rows[0] as unknown as RawOrderRow;
  const rawItems = itemsRes.rows as unknown as RawOrderItemRow[];

  const items: OrderItemDto[] = rawItems.map((item) => ({
    id: item.id,
    order_id: item.order_id,
    product_id: item.product_id,
    configuration_id: item.configuration_id,
    sku_snapshot: item.sku_snapshot,
    title_snapshot: item.title_snapshot,
    configuration_snapshot: item.configuration_snapshot,
    gem_snapshot: item.gem_snapshot ?? {},
    document_snapshot: item.document_snapshot,
    quantity: item.quantity,
    unit_price: Number(item.unit_price).toFixed(2),
    line_total: Number(item.line_total).toFixed(2),
    production_days: item.production_days,
    state: item.state,
  }));

  return mapOrder(rawOrder, items);
}

export async function placeOrder(
  db: CatalogDatabase,
  input: PlaceOrderInput,
): Promise<OrderDto> {
  // Idempotency replay check
  if (input.idempotency_key) {
    const existingRes = await db.execute(sql`
      SELECT id FROM orders WHERE idempotency_key = ${input.idempotency_key} LIMIT 1
    `);
    if (existingRes.rows.length > 0) {
      const existingId = (existingRes.rows[0] as { id: string }).id;
      return getOrderById(db, existingId);
    }
  }

  const session = await getCheckoutSession(db, input.checkout_session_id);

  if (session.completed_order_id) {
    return getOrderById(db, session.completed_order_id);
  }

  if (!session.shipping_address) {
    throw new ContractError('UNPROCESSABLE', 'Shipping address is required to place an order.');
  }

  if (!session.payment_intent_id) {
    throw new ContractError('UNPROCESSABLE', 'Payment intent is required to place an order.');
  }

  const cart = await getCartByToken(db, session.cart_token);
  if (!cart.items || cart.items.length === 0) {
    throw new ContractError('UNPROCESSABLE', 'Cannot place an order for an empty cart.');
  }

  const currentYear = new Date().getFullYear();
  // Generate order number in MG-YYYY-NNNNNN structure
  const countRes = await db.execute(sql`
    SELECT count(*)::int AS cnt FROM orders WHERE order_number LIKE ${'MG-' + currentYear + '-%'}
  `);
  const currentCount = Number((countRes.rows[0] as { cnt: number }).cnt ?? 0);
  let orderNumber = formatOrderNumber(currentYear, currentCount + 1);

  // Check collision and increment if necessary
  const collisionRes = await db.execute(sql`
    SELECT id FROM orders WHERE order_number = ${orderNumber} LIMIT 1
  `);
  if (collisionRes.rows.length > 0) {
    orderNumber = formatOrderNumber(currentYear, currentCount + randomInt(10, 1000));
  }

  const billingAddress = input.billing_address ?? session.shipping_address;
  const email = session.email ?? 'guest@maihan.test';

  // Insert into orders
  const insertOrderRes = await db.execute(sql`
    INSERT INTO orders (
      order_number,
      customer_id,
      email,
      state,
      currency,
      subtotal,
      discount_total,
      shipping_total,
      tax_total,
      grand_total,
      pricing_snapshot,
      shipping_address,
      billing_address,
      customer_note,
      placed_at,
      version,
      idempotency_key
    ) VALUES (
      ${orderNumber},
      ${session.customer_id},
      ${email},
      'PENDING_PAYMENT',
      ${session.pricing_snapshot.currency},
      ${session.pricing_snapshot.subtotal}::numeric,
      ${session.pricing_snapshot.discount_total}::numeric,
      ${session.pricing_snapshot.shipping_total}::numeric,
      ${session.pricing_snapshot.tax_total}::numeric,
      ${session.pricing_snapshot.grand_total}::numeric,
      ${JSON.stringify(session.pricing_snapshot)}::jsonb,
      ${JSON.stringify(session.shipping_address)}::jsonb,
      ${JSON.stringify(billingAddress)}::jsonb,
      ${input.customer_note ?? null},
      now(),
      1,
      ${input.idempotency_key}
    )
    RETURNING id
  `);

  const orderId = (insertOrderRes.rows[0] as { id: string }).id;

  // Insert order_items with immutable gemstone, configuration, and document snapshots
  for (const item of cart.items) {
    // Query gemstone specs for stone snapshot
    const gemRes = await db.execute(sql`
      SELECT
        g.id,
        g.gem_ref,
        g.variety,
        g.shape,
        g.carat_weight::text AS carat_weight,
        g.origin,
        g.treatment,
        g.clarity,
        g.colour_description
      FROM products p
      LEFT JOIN gemstones g ON g.id = p.gemstone_id OR g.id = p.gemstone_pair_id
      WHERE p.id = ${item.product_id}
      LIMIT 1
    `);

    const gemSnapshot: Record<string, unknown> =
      gemRes.rows.length > 0 && gemRes.rows[0] ? (gemRes.rows[0] as Record<string, unknown>) : {};

    // Query certificate references for document snapshot
    const certRes = await db.execute(sql`
      SELECT
        c.certificate_number,
        c.lab::text AS lab,
        c.report_type::text AS report_type,
        c.carat_weight::text AS cert_weight
      FROM certificates c
      WHERE c.gemstone_id = ${gemSnapshot['id'] ?? null}
         OR c.product_id = ${item.product_id}
      LIMIT 1
    `);

    const documentSnapshot =
      certRes.rows.length > 0 && certRes.rows[0] ? (certRes.rows[0] as Record<string, unknown>) : null;

    await db.execute(sql`
      INSERT INTO order_items (
        order_id,
        product_id,
        configuration_id,
        sku_snapshot,
        title_snapshot,
        configuration_snapshot,
        gem_snapshot,
        document_snapshot,
        quantity,
        unit_price,
        line_total,
        state
      ) VALUES (
        ${orderId},
        ${item.product_id},
        ${item.configuration_id},
        ${item.product_slug},
        ${item.title},
        ${item.options ? JSON.stringify(item.options) : null}::jsonb,
        ${JSON.stringify(gemSnapshot)}::jsonb,
        ${documentSnapshot ? JSON.stringify(documentSnapshot) : null}::jsonb,
        ${item.quantity},
        ${item.unit_price}::numeric,
        ${item.line_total}::numeric,
        'PENDING'
      )
    `);
  }

  // Append to order_events state timeline
  await db.execute(sql`
    INSERT INTO order_events (
      order_id,
      from_state,
      to_state,
      actor_type,
      actor_id,
      reason,
      metadata
    ) VALUES (
      ${orderId},
      NULL,
      'PENDING_PAYMENT',
      'CUSTOMER',
      ${session.customer_id},
      'Order placed via checkout',
      ${JSON.stringify({ order_number: orderNumber, grand_total: session.pricing_snapshot.grand_total })}::jsonb
    )
  `);

  // Write immutable audit_log row
  await db.execute(sql`
    INSERT INTO audit_logs (
      actor_type,
      actor_id,
      action,
      entity_type,
      entity_id,
      after_state,
      reason
    ) VALUES (
      'CUSTOMER',
      ${session.customer_id},
      'CREATE',
      'orders',
      ${orderId},
      ${JSON.stringify({
        order_number: orderNumber,
        grand_total: session.pricing_snapshot.grand_total,
        state: 'PENDING_PAYMENT',
      })}::jsonb,
      'Order placed'
    )
  `);

  // Convert cart to CONVERTED
  await db.execute(sql`
    UPDATE carts
    SET state = 'CONVERTED',
        converted_order_id = ${orderId},
        updated_at = now()
    WHERE id = ${cart.id}
  `);

  // Complete checkout session
  const completedSession = {
    ...session,
    current_step: 'COMPLETED' as const,
    completed_order_id: orderId,
  };
  await saveCheckoutSession(db, completedSession);

  return getOrderById(db, orderId);
}

export interface OrderEventRow {
  id: string;
  order_id: string;
  from_state: string | null;
  to_state: string;
  actor_type: string;
  actor_id: string | null;
  reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export async function getOrderEvents(
  db: CatalogDatabase,
  orderId: string,
): Promise<OrderEventRow[]> {
  const res = await db.execute(sql`
    SELECT
      id::text AS id,
      order_id,
      from_state::text AS from_state,
      to_state::text AS to_state,
      actor_type,
      actor_id,
      reason,
      metadata,
      created_at
    FROM order_events
    WHERE order_id = ${orderId}
    ORDER BY order_events.id ASC
  `);

  return (res.rows as unknown as any[]).map((r) => ({
    id: r.id,
    order_id: r.order_id,
    from_state: r.from_state,
    to_state: r.to_state,
    actor_type: r.actor_type,
    actor_id: r.actor_id,
    reason: r.reason,
    metadata: r.metadata ?? {},
    created_at: new Date(r.created_at).toISOString(),
  }));
}

export async function transitionOrderState(
  db: CatalogDatabase,
  orderId: string,
  event: OrderEvent,
  actor: { type: string; id?: string },
): Promise<{ order: OrderDto; transition: OrderTransitionResult }> {
  const orderRes = await db.execute(sql`
    SELECT id, state::text AS state, version
    FROM orders
    WHERE id = ${orderId} OR order_number = ${orderId}
    LIMIT 1
  `);

  if (orderRes.rows.length === 0) {
    throw new ContractError('ORDER_NOT_FOUND', `Order "${orderId}" not found.`);
  }

  const rawOrder = orderRes.rows[0] as { id: string; state: DomainOrderState; version: number };
  const transition = transitionOrder(rawOrder.state, event);

  const updateFields: any[] = [
    sql`state = ${transition.nextState}`,
    sql`version = version + 1`,
    sql`updated_at = now()`,
  ];

  if (transition.nextState === 'PAID') {
    updateFields.push(sql`paid_at = now()`);
  } else if (transition.nextState === 'FULFILLED') {
    updateFields.push(sql`fulfilled_at = now()`);
  } else if (transition.nextState === 'CANCELLED') {
    updateFields.push(sql`cancelled_at = now()`);
    updateFields.push(sql`cancel_reason = ${transition.reason}`);
  }

  await db.execute(sql`
    UPDATE orders
    SET ${sql.join(updateFields, sql`, `)}
    WHERE id = ${rawOrder.id}
  `);

  await db.execute(sql`
    INSERT INTO order_events (
      order_id,
      from_state,
      to_state,
      actor_type,
      actor_id,
      reason,
      metadata
    ) VALUES (
      ${rawOrder.id},
      ${rawOrder.state},
      ${transition.nextState},
      ${actor.type},
      ${actor.id ?? null},
      ${transition.reason},
      ${JSON.stringify(event)}::jsonb
    )
  `);

  await db.execute(sql`
    INSERT INTO audit_logs (
      actor_type,
      actor_id,
      action,
      entity_type,
      entity_id,
      before_state,
      after_state,
      reason
    ) VALUES (
      ${actor.type},
      ${actor.id ?? null},
      'STATE_TRANSITION',
      'orders',
      ${rawOrder.id},
      ${JSON.stringify({ state: rawOrder.state })}::jsonb,
      ${JSON.stringify({ state: transition.nextState })}::jsonb,
      ${transition.reason}
    )
  `);

  const updatedOrder = await getOrderById(db, rawOrder.id);
  return { order: updatedOrder, transition };
}
