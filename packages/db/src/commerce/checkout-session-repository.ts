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
  resolveAuthoritativeShippingMethod,
  RESERVATION_TTL_MINUTES,
  toCents,
} from '@maihan/domain';
import { getCartByToken } from './cart-repository.js';
import { validateDiscount } from './discount-repository.js';
import { reserveStockForCart } from './inventory-reservation.js';

export async function createCheckoutSession(
  db: CatalogDatabase,
  input: CreateCheckoutSessionInput,
): Promise<CheckoutSessionDto> {
  // P1-10: cart read, price check, stock reservation and the session insert
  // commit atomically — a mid-flow failure can no longer orphan reservations,
  // and the session insert cannot race the reservation it documents.
  return db.transaction(async (tx) => {
    const cart = await getCartByToken(tx, input.cart_token);

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

    // Reserve inventory inside the same transaction (conditional upserts +
    // FOR UPDATE locks — see inventory-reservation.ts)
    await reserveStockForCart(tx, sessionId, cart.id, cart.items);

    const reservationExpiresAt = computeReservationExpiry(new Date(), RESERVATION_TTL_MINUTES).toISOString();

    let sessionPricingSnapshot: PricingSnapshotDto = cart.pricing_snapshot;
    let appliedDiscount: { code: string | null; id: string } | undefined = undefined;
    if (input.discount_code && input.discount_code.trim().length > 0) {
      const discountCustomerId: string | undefined =
        input.customer_id ?? (cart.customer_id == null ? undefined : cart.customer_id);
      const discountValidation = await validateDiscount(tx, {
        code: input.discount_code.trim(),
        subtotal: Number(cart.pricing_snapshot.subtotal),
        customer_id: discountCustomerId,
      });
      if (discountValidation.valid) {
        appliedDiscount = {
          code: discountValidation.discount.code,
          id: discountValidation.discount.id,
        };
        sessionPricingSnapshot = {
          ...cart.pricing_snapshot,
          discount_total: discountValidation.discount_amount,
          grand_total: discountValidation.final_subtotal,
          computed_at: new Date().toISOString(),
          // P1-23: the applied-code reference embeds in the session payload
          // so order placement can (a) re-validate, (b) redeem the counter
          // atomically, and (c) stamp orders.pricing_snapshot->'discount'
          // for future per-customer limit reads.
          discount: appliedDiscount,
          // The PricingSnapshotDto contract has no discount field; the extra
          // key lives in the persisted payload only and is stripped before
          // the validated order snapshot is written.
        } as PricingSnapshotDto;
      }
    }

    const session: CheckoutSessionDto = {
      id: sessionId,
      cart_token: cart.cart_token,
      customer_id: input.customer_id ?? cart.customer_id ?? null,
      email: input.email ?? null,
      current_step: 'SHIPPING',
      pricing_snapshot: sessionPricingSnapshot,
      shipping_address: null,
      shipping_method: null,
      payment_intent_id: null,
      reservation_expires_at: reservationExpiresAt,
      created_at: new Date().toISOString(),
      completed_order_id: null,
    };

    await tx.execute(sql`
      INSERT INTO checkout_sessions (
        id,
        cart_token,
        customer_id,
        email,
        current_step,
        payload,
        reservation_expires_at
      ) VALUES (
        ${sessionId},
        ${session.cart_token},
        ${session.customer_id}::uuid,
        ${session.email},
        ${session.current_step},
        ${JSON.stringify(session)}::jsonb,
        ${reservationExpiresAt}::timestamptz
      )
    `);

    return session;
  });
}

export async function getCheckoutSession(
  db: CatalogDatabase,
  sessionId: string,
): Promise<CheckoutSessionDto> {
  const res = await db.execute(sql`
    SELECT payload, state, reservation_expires_at
    FROM checkout_sessions
    WHERE id = ${sessionId}
    LIMIT 1
  `);

  if (res.rows.length === 0) {
    throw new ContractError('NOT_FOUND', `Checkout session ${sessionId} not found.`);
  }

  const row = res.rows[0] as {
    payload: CheckoutSessionDto;
    state: string;
    reservation_expires_at: Date | string | null;
  };

  if (
    row.state === 'CANCELLED' ||
    row.state === 'EXPIRED' ||
    (row.reservation_expires_at !== null && isReservationExpired(row.reservation_expires_at))
  ) {
    throw new ContractError('CHECKOUT_SESSION_EXPIRED', `Checkout session ${sessionId} has expired.`);
  }

  return row.payload;
}

export async function saveCheckoutSession(
  db: CatalogDatabase,
  session: CheckoutSessionDto,
): Promise<CheckoutSessionDto> {
  const res = await db.execute(sql`
    UPDATE checkout_sessions
    SET payload = ${JSON.stringify(session)}::jsonb,
        current_step = ${session.current_step},
        completed_order_id = ${session.completed_order_id ?? null}::uuid,
        state = CASE WHEN ${session.completed_order_id ?? null}::uuid IS NOT NULL THEN 'COMPLETED' ELSE state END,
        updated_at = now()
    WHERE id = ${session.id}
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
  // P1-7 server authority: the client NAMES a shipping method; the server
  // PRICES it. A client-supplied amount is never folded into totals — the
  // approved rate table (@maihan/domain shipping-rules) decides, and an
  // unknown method code is refused (fail-closed).
  const shippingMethod: ShippingMethodDto | null = input.shipping_method
    ? resolveAuthoritativeShippingMethod(input.shipping_method)
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

