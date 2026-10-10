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
  type CheckoutSessionDto,
  type CreateCheckoutSessionInput,
} from '@maihan/contracts';
import {
  assertCartNotExpired,
  comparePriceMatch,
  computeReservationExpiry,
  isReservationExpired,
  RESERVATION_TTL_MINUTES,
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
