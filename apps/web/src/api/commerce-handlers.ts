/**
 * apps/web/src/api/commerce-handlers.ts
 *
 * Route handlers for Phase 6 Cart & Commerce surfaces:
 *   - POST /carts & POST /api/v1/carts
 *   - GET /carts/{cartToken} & GET /api/v1/carts/{cartToken}
 *   - POST /carts/{cartToken}/items & POST /api/v1/carts/{cartToken}/items
 *   - PATCH /carts/{cartToken}/items/{itemId} & PATCH /api/v1/carts/{cartToken}/items/{itemId}
 *   - DELETE /carts/{cartToken}/items/{itemId} & DELETE /api/v1/carts/{cartToken}/items/{itemId}
 *   - POST /carts/{cartToken}/merge & POST /api/v1/carts/{cartToken}/merge
 */
import {
  AddToCartInputSchema,
  ConfirmCheckpointInputSchema,
  ContractError,
  CreateCartInputSchema,
  CreateCheckoutSessionInputSchema,
  MergeCartInputSchema,
  PaymentCheckpointInputSchema,
  PlaceOrderInputSchema,
  ShippingCheckpointInputSchema,
  UpdateCartItemInputSchema,
} from '@maihan/contracts';
import {
  addItemToCart,
  createCart,
  createCheckoutSession,
  createPaymentRecord,
  getCartByToken,
  getCheckoutSession,
  getOrderById,
  getOrderEvents,
  mergeGuestCart,
  placeOrder,
  recordWebhookReceipt,
  reconcilePaymentWebhook,
  removeCartItem,
  submitConfirmCheckpoint,
  submitPaymentCheckpoint,
  submitShippingCheckpoint,
  sweepExpiredReservations,
  transitionOrderState,
  updateCartItemQuantity,
  withRlsContext,
  type CatalogDatabase,
} from '@maihan/db';
import { TestPaymentProvider } from '../integrations/payment/test-payment-provider.js';
import {
  createPaymentProvider,
  StripePaymentProvider,
} from '../integrations/payment/stripe-payment-provider.js';
import { ADMIN_ROLES } from '@maihan/domain';
import { extractSessionToken, resolveRequestActor } from './auth-handlers.js';
import { isDevSeamEnabled } from '@maihan/config';
import type { RouteHandler, RouteContext } from './handlers.js';
import { requireIdentifier } from './query.js';

async function assertOrderOwnership(
  ctx: RouteContext,
  orderCustomerId: string | null | undefined,
  actionDesc: string,
  requireAuthInProd = true,
): Promise<{ actorId?: string; actorType: string }> {
  const sessionToken = extractSessionToken(ctx.request);
  const actor = sessionToken ? await resolveRequestActor(ctx) : null;
  if (sessionToken && !actor) {
    throw new ContractError('UNAUTHORIZED', 'Invalid or expired session token.');
  }
  if (actor && (ADMIN_ROLES as readonly string[]).includes(actor.role)) {
    return { actorId: actor.customer_id, actorType: 'ADMIN' };
  }
  if (actor && actor.role === 'VENDOR') {
    throw new ContractError('FORBIDDEN', `Vendors cannot ${actionDesc} via customer order endpoints.`);
  }
  const headerCustomerId = ctx.request?.headers.get('x-customer-id')?.trim() || null;
  if (actor && headerCustomerId && headerCustomerId !== actor.customer_id) {
    throw new ContractError('FORBIDDEN', `You do not have permission to ${actionDesc}.`);
  }
  const effectiveCustomerId = actor?.customer_id ?? headerCustomerId;
  if (orderCustomerId) {
    if (effectiveCustomerId && effectiveCustomerId !== orderCustomerId) {
      throw new ContractError('FORBIDDEN', `You do not have permission to ${actionDesc}.`);
    }
    // R1-1 fail-closed: auth required unless an explicit dev seam opts out.
    if (!effectiveCustomerId && requireAuthInProd && !isDevSeamEnabled()) {
      throw new ContractError('UNAUTHORIZED', `Authentication required to ${actionDesc}.`);
    }
  }
  return { actorId: effectiveCustomerId ?? undefined, actorType: 'CUSTOMER' };
}

function getDb(ctx: RouteContext): CatalogDatabase {
  if (ctx.db) return ctx.db;
  const svc = ctx.service as unknown as { port?: { db?: CatalogDatabase } };
  if (svc.port?.db) return svc.port.db;
  throw new ContractError('INTERNAL', 'Database connection not available for commerce operations.');
}

async function parseBody(request?: Request): Promise<unknown> {
  if (!request) return {};
  try {
    const text = await request.text();
    if (text.trim().length === 0) return {};
    return JSON.parse(text);
  } catch {
    throw new ContractError('VALIDATION_FAILED', 'Malformed JSON in request body.');
  }
}

export const COMMERCE_HANDLERS: Record<string, RouteHandler> = {
  async createCart(ctx) {
    const db = getDb(ctx);
    const body = await parseBody(ctx.request);
    const input = CreateCartInputSchema.parse(body);
    const cart = await createCart(db, input);
    return {
      status: 201,
      body: { data: cart },
    };
  },

  async getCart(ctx) {
    const db = getDb(ctx);
    const cartToken = requireIdentifier(ctx.params['cartToken'], 'cartToken');
    const cart = await getCartByToken(db, cartToken);
    return {
      status: 200,
      body: { data: cart },
    };
  },

  async addCartItem(ctx) {
    const db = getDb(ctx);
    const cartToken = requireIdentifier(ctx.params['cartToken'], 'cartToken');
    const body = await parseBody(ctx.request);
    const input = AddToCartInputSchema.parse(body);
    const cart = await addItemToCart(db, cartToken, input);
    return {
      status: 200,
      body: { data: cart },
    };
  },

  async updateCartItem(ctx) {
    const db = getDb(ctx);
    const cartToken = requireIdentifier(ctx.params['cartToken'], 'cartToken');
    const itemId = requireIdentifier(ctx.params['itemId'], 'itemId');
    const body = await parseBody(ctx.request);
    const input = UpdateCartItemInputSchema.parse(body);
    const cart = await updateCartItemQuantity(db, cartToken, itemId, input);
    return {
      status: 200,
      body: { data: cart },
    };
  },

  async removeCartItem(ctx) {
    const db = getDb(ctx);
    const cartToken = requireIdentifier(ctx.params['cartToken'], 'cartToken');
    const itemId = requireIdentifier(ctx.params['itemId'], 'itemId');
    const cart = await removeCartItem(db, cartToken, itemId);
    return {
      status: 200,
      body: { data: cart },
    };
  },

  async mergeCart(ctx) {
    const db = getDb(ctx);
    const cartToken = requireIdentifier(ctx.params['cartToken'], 'cartToken');
    const body = await parseBody(ctx.request);
    const input = MergeCartInputSchema.parse(body);
    const cart = await mergeGuestCart(db, cartToken, input.guest_cart_token);
    return {
      status: 200,
      body: { data: cart },
    };
  },

  async createCheckoutSession(ctx) {
    const db = getDb(ctx);
    const actor = await resolveRequestActor(ctx);
    const body = await parseBody(ctx.request);
    const input = CreateCheckoutSessionInputSchema.parse(body);
    const session = await createCheckoutSession(db, {
      ...input,
      customer_id: input.customer_id ?? actor?.customer_id,
      email: input.email ?? actor?.email,
    });
    return {
      status: 201,
      body: { data: session },
    };
  },

  async getCheckoutSession(ctx) {
    const db = getDb(ctx);
    const sessionId = requireIdentifier(ctx.params['sessionId'], 'sessionId');
    const session = await getCheckoutSession(db, sessionId);
    return {
      status: 200,
      body: { data: session },
    };
  },

  async submitShipping(ctx) {
    const db = getDb(ctx);
    const sessionId = requireIdentifier(ctx.params['sessionId'], 'sessionId');
    const body = await parseBody(ctx.request);
    const input = ShippingCheckpointInputSchema.parse(body);
    const session = await submitShippingCheckpoint(db, sessionId, input);
    return {
      status: 200,
      body: { data: session },
    };
  },

  async submitPayment(ctx) {
    const db = getDb(ctx);
    const sessionId = requireIdentifier(ctx.params['sessionId'], 'sessionId');
    const body = await parseBody(ctx.request);
    const input = PaymentCheckpointInputSchema.parse(body);
    const session = await submitPaymentCheckpoint(db, sessionId, input);
    return {
      status: 200,
      body: { data: session },
    };
  },

  async submitConfirm(ctx) {
    const db = getDb(ctx);
    const sessionId = requireIdentifier(ctx.params['sessionId'], 'sessionId');
    const body = await parseBody(ctx.request);
    const input = ConfirmCheckpointInputSchema.parse(body);
    const session = await submitConfirmCheckpoint(db, sessionId, input);
    return {
      status: 200,
      body: { data: session },
    };
  },

  async placeOrder(ctx) {
    const db = getDb(ctx);
    const body = await parseBody(ctx.request);
    const input = PlaceOrderInputSchema.parse(body);
    // Resolve the provider BEFORE placing the order. Production with no live
    // provider must fail closed without committing an unpayable order.
    const provider = createPaymentProvider();
    const order = await placeOrder(db, input);

    // Live payment intent (M-04): with a real PSP configured the placement
    // immediately creates an AUTHORIZED payment record, so the webhook that
    // follows reconciles against it. Without keys the Test adapter answers
    // and the flow is unchanged — the payment lands at webhook time.
    let payment: Record<string, unknown> | null = null;
    if (provider.providerName === 'STRIPE') {
      try {
        const authorized = await provider.authorize({
          order_id: order.id,
          order_number: order.order_number,
          amount: order.grand_total,
          currency: order.currency,
          method_type: 'CARD',
          idempotency_key: `pi:${order.id}`,
        });
        await createPaymentRecord(db, {
          order_id: order.id,
          provider: provider.providerName,
          provider_payment_id: authorized.provider_payment_id,
          amount: order.grand_total,
          currency: order.currency,
          state: 'AUTHORIZED',
          method_type: 'CARD',
          idempotency_key: `pay:${order.id}`,
        });
        payment = {
          provider: authorized.provider,
          provider_payment_id: authorized.provider_payment_id,
          state: 'AUTHORIZED',
        };
      } catch (cause) {
        payment = {
          provider: provider.providerName,
          state: 'FAILED',
          message: cause instanceof Error ? cause.message : 'Payment authorization failed.',
        };
      }
    }

    return {
      status: 201,
      body: { data: payment ? { ...order, payment } : order },
    };
  },

  async getOrder(ctx) {
    const db = getDb(ctx);
    const orderId = requireIdentifier(ctx.params['orderId'], 'orderId');
    // RLS defence-in-depth (doc 09): when the caller is an authenticated
    // customer the read runs inside an RLS session carrying their identity
    // subject, so the orders_own policy bites for non-bypass app roles.
    const sessionToken = extractSessionToken(ctx.request);
    const actor = sessionToken ? await resolveRequestActor(ctx) : null;
    const isCustomer = actor?.role === 'CUSTOMER';
    const order = isCustomer
      ? await withRlsContext(
          db,
          { userSubject: actor.identity_user_id ?? '' },
          (tx) => getOrderById(tx as unknown as CatalogDatabase, orderId),
        )
      : await getOrderById(db, orderId);
    await assertOrderOwnership(ctx, order.customer_id, 'access another customer’s order');
    return {
      status: 200,
      body: { data: order },
    };
  },

  async getOrderTimeline(ctx) {
    const db = getDb(ctx);
    const orderId = requireIdentifier(ctx.params['orderId'], 'orderId');
    const order = await getOrderById(db, orderId);
    await assertOrderOwnership(ctx, order.customer_id, 'access another customer’s order timeline');
    const events = await getOrderEvents(db, orderId);
    return {
      status: 200,
      body: { data: events },
    };
  },

  async cancelOrder(ctx) {
    const db = getDb(ctx);
    const orderId = requireIdentifier(ctx.params['orderId'], 'orderId');
    const existing = await getOrderById(db, orderId);
    const resolved = await assertOrderOwnership(ctx, existing.customer_id, 'cancel another customer’s order');
    const body = await parseBody(ctx.request);
    const reason = typeof (body as Record<string, unknown>)?.['reason'] === 'string'
      ? String((body as Record<string, unknown>)['reason'])
      : 'Cancelled by customer';
    const result = await transitionOrderState(
      db,
      orderId,
      { type: 'CANCEL_REQUESTED', reason, actor: 'CUSTOMER' },
      { type: resolved.actorType, id: resolved.actorId },
    );
    return {
      status: 200,
      body: { data: result.order },
    };
  },

  async handlePaymentWebhook(ctx) {
    const db = getDb(ctx);
    const providerParam = (ctx.params['provider'] ?? 'TEST').toUpperCase();
    if (process.env['MAIHAN_ENV'] === 'production' && providerParam === 'TEST') {
      throw new ContractError('UNAUTHORIZED', 'The test payment provider is disabled in production.');
    }
    const providerAdapter =
      providerParam === 'STRIPE'
        ? new StripePaymentProvider()
        : providerParam === 'TEST'
          ? new TestPaymentProvider()
          : createPaymentProvider();

    const rawBody = ctx.request ? await ctx.request.text() : '';
    const headers: Record<string, string> = {};
    if (ctx.request) {
      ctx.request.headers.forEach((val, key) => {
        headers[key.toLowerCase()] = val;
      });
    }

    const verified = providerAdapter.verifyWebhook({ rawBody, headers });

    // Validate timestamp drift within 5 minutes
    if (verified.isValid && verified.timestamp) {
      const eventTime = new Date(verified.timestamp).getTime();
      const driftSeconds = Math.abs(Date.now() - eventTime) / 1000;
      if (driftSeconds > 300) {
        throw new ContractError(
          'UNAUTHORIZED',
          `Webhook timestamp drift ${Math.round(driftSeconds)}s exceeds 300s tolerance window.`,
        );
      }
    }

    if (!verified.isValid) {
      throw new ContractError(
        'UNAUTHORIZED',
        verified.signatureError ?? 'Webhook HMAC signature verification failed.',
      );
    }

    const receipt = await recordWebhookReceipt(db, {
      provider: providerParam,
      external_event_id: verified.externalEventId,
      signature_valid: true,
      event_type: verified.eventType,
      payload: verified.rawPayload,
    });

    if (receipt.isDuplicate && receipt.processedAt !== null) {
      return {
        status: 200,
        body: { status: 'duplicate', message: 'Webhook event already processed.' },
      };
    }

    const reconciliation = await reconcilePaymentWebhook(db, verified);

    return {
      status: 200,
      body: {
        status: reconciliation.reconciled ? 'processed' : 'unreconciled',
        order_id: reconciliation.orderId,
        error: reconciliation.error,
      },
    };
  },

  async sweepInventoryReservations(ctx) {
    const db = getDb(ctx);
    const released = await sweepExpiredReservations(db);
    return {
      status: 200,
      body: { data: { count: released.length, released } },
    };
  },
};

