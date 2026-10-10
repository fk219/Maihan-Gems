/**
 * packages/db/src/commerce/checkout-session-repository.ts
 *
 * Phase 6 Task 2 — Checkout session repository with stock reservation and price freeze.
 *
 * Authority:
 * - technical_design/13 COMMERCE ARCHITECTURE §75-80.
 * - technical_design/15 INVENTORY ARCHITECTURE §47-71.
 * - Invariant: Price changes reject with 409 PRICE_CHANGED.
 * - Invariant: Stock reservations are held in Postgres with 30-minute TTL.
 */
import { randomBytes } from 'node:crypto';
import { sql } from 'drizzle-orm';
import type { CatalogDatabase } from '../catalog/executor.js';
import {
  ContractError,
  ShippingAddressDtoSchema,
  ShippingMethodDtoSchema,
  type CheckoutSessionDto,
  type ConfirmCheckpointInput,
  type CreateCheckoutSessionInput,
  type PaymentCheckpointInput,
  type PricingSnapshotDto,
  type ShippingAddressDto,
  type ShippingCheckpointInput,
  type ShippingMethodDto,
} from '@maihan/contracts';
import {
  assertCartNotExpired,
  comparePriceMatch,
  computeReservationExpiry,
  fromCents,
  isReservationExpired,
  RESERVATION_TTL_MINUTES,
  toCents,
} from '@maihan/domain';
import { getCartByToken } from './cart-repository.js';
import { reserveStockForCart } from './inventory-reservation.js';

export async function createCheckoutSession(
  db: CatalogDatabase,
  input: CreateCheckoutSessionInput,
): Promise<CheckoutSessionDto> {
  const cart = await getCartByToken(db, input.cart_token);

  if (!cart.items || cart.items.length === 0) {
    throw new ContractError('UNPROCESSABLE', 'Cannot create checkout session for an empty cart.');
  }

  assertCartNotExpired(cart.expires_at);

  if (input.expected_total !== undefined) {
    const matches = comparePriceMatch(input.expected_total, cart.pricing_snapshot.grand_total);
    if (!matches) {
      throw new ContractError(
        'PRICE_CHANGED',
        'The price of one or more items in your cart has changed.',
        [
          {
            field: 'expected_total',
            expected: input.expected_total,
            authoritative: cart.pricing_snapshot.grand_total,
          },
        ],
      );
    }
  }

  const sessionId = `cs_${randomBytes(24).toString('hex')}`;

  // Reserve inventory in Postgres (atomic pair reservation + lock)
  await reserveStockForCart(db, sessionId, cart.id, cart.items);

  const reservationExpiresAt = computeReservationExpiry(new Date(), RESERVATION_TTL_MINUTES).toISOString();

  const session: CheckoutSessionDto = {
    id: sessionId,
    cart_token: cart.cart_token,
    customer_id: input.customer_id ?? cart.customer_id ?? null,
    email: input.email ?? null,
    current_step: 'SHIPPING',
    pricing_snapshot: cart.pricing_snapshot,
    shipping_address: null,
    shipping_method: null,
    payment_intent_id: null,
    reservation_expires_at: reservationExpiresAt,
    created_at: new Date().toISOString(),
    completed_order_id: null,
  };

  await db.execute(sql`
    INSERT INTO jobs (
      job_key,
      queue,
      job_type,
      payload,
      state,
      run_after
    ) VALUES (
      ${'checkout:session:' + sessionId},
      'checkout_sessions',
      'CHECKOUT_SESSION',
      ${JSON.stringify(session)}::jsonb,
      'QUEUED',
      ${reservationExpiresAt}::timestamptz
    )
  `);

  return session;
}

export async function getCheckoutSession(
  db: CatalogDatabase,
  sessionId: string,
): Promise<CheckoutSessionDto> {
  const res = await db.execute(sql`
    SELECT id, payload, state, run_after
    FROM jobs
    WHERE job_key = ${'checkout:session:' + sessionId}
      AND queue = 'checkout_sessions'
    LIMIT 1
  `);

  if (res.rows.length === 0) {
    throw new ContractError('NOT_FOUND', `Checkout session ${sessionId} not found.`);
  }

  const row = res.rows[0] as {
    payload: CheckoutSessionDto;
    state: string;
    run_after: Date | string;
  };

  if (row.state === 'CANCELLED' || isReservationExpired(row.run_after)) {
    throw new ContractError('CHECKOUT_SESSION_EXPIRED', `Checkout session ${sessionId} has expired.`);
  }

  return row.payload;
}

export async function saveCheckoutSession(
  db: CatalogDatabase,
  session: CheckoutSessionDto,
): Promise<CheckoutSessionDto> {
  const res = await db.execute(sql`
    UPDATE jobs
    SET payload = ${JSON.stringify(session)}::jsonb,
        updated_at = now()
    WHERE job_key = ${'checkout:session:' + session.id}
      AND queue = 'checkout_sessions'
    RETURNING id
  `);

  if (res.rows.length === 0) {
    throw new ContractError('NOT_FOUND', `Checkout session ${session.id} not found.`);
  }

  return session;
}

export async function submitShippingCheckpoint(
  db: CatalogDatabase,
  sessionId: string,
  input: ShippingCheckpointInput,
): Promise<CheckoutSessionDto> {
  const session = await getCheckoutSession(db, sessionId);

  const shippingAddress: ShippingAddressDto = ShippingAddressDtoSchema.parse(input.shipping_address);
  const shippingMethod: ShippingMethodDto | null = input.shipping_method
    ? ShippingMethodDtoSchema.parse(input.shipping_method)
    : session.shipping_method ?? null;

  let updatedSnapshot: PricingSnapshotDto = session.pricing_snapshot;
  if (shippingMethod) {
    const subtotalCents = toCents(session.pricing_snapshot.subtotal);
    const discountCents = toCents(session.pricing_snapshot.discount_total);
    const taxCents = toCents(session.pricing_snapshot.tax_total);
    const shippingCents = toCents(shippingMethod.amount);
    let grandTotalCents = subtotalCents - discountCents + taxCents + shippingCents;
    if (grandTotalCents < 0n) grandTotalCents = 0n;

    updatedSnapshot = {
      ...session.pricing_snapshot,
      shipping_total: fromCents(shippingCents),
      grand_total: fromCents(grandTotalCents),
      computed_at: new Date().toISOString(),
    };
  }

  const updatedSession: CheckoutSessionDto = {
    ...session,
    shipping_address: shippingAddress,
    shipping_method: shippingMethod,
    pricing_snapshot: updatedSnapshot,
    current_step: 'PAYMENT',
  };

  await saveCheckoutSession(db, updatedSession);
  return updatedSession;
}

export async function submitPaymentCheckpoint(
  db: CatalogDatabase,
  sessionId: string,
  _input: PaymentCheckpointInput = {},
): Promise<CheckoutSessionDto> {
  const session = await getCheckoutSession(db, sessionId);

  if (!session.shipping_address) {
    throw new ContractError(
      'UNPROCESSABLE',
      'Cannot proceed to payment checkpoint before shipping address is provided.',
    );
  }

  const paymentIntentId = `pi_${randomBytes(24).toString('hex')}`;
  const updatedSession: CheckoutSessionDto = {
    ...session,
    payment_intent_id: paymentIntentId,
    current_step: 'CONFIRM',
  };

  await saveCheckoutSession(db, updatedSession);
  return updatedSession;
}

export async function submitConfirmCheckpoint(
  db: CatalogDatabase,
  sessionId: string,
  _input: ConfirmCheckpointInput,
): Promise<CheckoutSessionDto> {
  const session = await getCheckoutSession(db, sessionId);

  if (!session.shipping_address) {
    throw new ContractError(
      'UNPROCESSABLE',
      'Shipping address is required before confirmation.',
    );
  }
  if (!session.payment_intent_id) {
    throw new ContractError(
      'UNPROCESSABLE',
      'Payment intent is required before confirmation.',
    );
  }

  return session;
}

