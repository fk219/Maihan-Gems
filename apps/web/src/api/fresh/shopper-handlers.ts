/**
 * apps/web/src/api/fresh/shopper-handlers.ts
 *
 * The shopper-facing `/api/fresh/**` handlers: carts, checkout, orders, leads,
 * newsletter, catalogue typeahead and the concierge.
 *
 * Every handler follows the same order:
 *   1. resolve the actor (session -> `customers`) when the route needs one;
 *   2. authorise BEFORE the repository read (a cart bound to a customer is not
 *      readable by an anonymous caller, and an order is never readable outside
 *      its `customer_id`);
 *   3. call exactly one repository/application service;
 *   4. return the shape the develop caller reads.
 *
 * There is no SQL in this file. The two writes reach the database only through
 * `packages/db` application functions, and the concierge reaches it only
 * through tool services (AGENTS.md section 8: the model never writes).
 */
import { randomUUID } from 'node:crypto';

import { ContractError, ShippingAddressDtoSchema } from '@maihan/contracts';
import type { CartDto, CheckoutSessionDto, SearchResult } from '@maihan/contracts';
import {
  addItemToCart,
  createCart,
  createCheckoutSession,
  createPaymentRecord,
  executeSearch,
  getCartByToken,
  getCheckoutSession,
  placeOrder,
  removeCartItem,
  saveCheckoutSession,
  submitConfirmCheckpoint,
  submitPaymentCheckpoint,
  submitShippingCheckpoint,
  transitionOrderState,
  updateCartItemQuantity,
  validateDiscount,
  createCustomerRequestRecord,
  findActiveCartTokenForCustomer,
  findCartOwnership,
  findCompatGemstoneByRef,
  findPublicCertificateForGemRef,
  getCustomerOrderByNumber,
  listCompatGemstones,
  listCompatSettings,
  listCustomerOrderSummaries,
  resolvePurchasableProductRef,
  subscribeNewsletter,
  unsubscribeNewsletter,
} from '@maihan/db';
import { AiOrchestrator, TOOL_REGISTRY, type ToolServices } from '@maihan/ai';

import type { HandlerOutcome } from '../handlers.js';
import type { CompatGemstoneRow, CompatSettingRow } from '@maihan/db';
import type { FreshContext } from './handlers.js';
import {
  isDevelopmentEnvironment,
  optionalPositiveInt,
  optionalString,
  readJsonObject,
  requireEmail,
  requireString,
  resolveShopperActor,
  ensureShopperActor,
  resolveShopperSession,
} from './session.js';

/* ------------------------------------------------------------------ output */

const NO_STORE = { 'Cache-Control': 'private, no-store' } as const;

function ok(body: unknown, status = 200): HandlerOutcome {
  return { status, body, headers: NO_STORE };
}

/* ------------------------------------------------------------------- carts */

interface CartView {
  readonly token: string;
  readonly status: string;
  readonly currency: string;
  readonly items: ReadonlyArray<Record<string, unknown>>;
  readonly subtotal: number;
}

function toCartView(cart: CartDto): CartView {
  const items = cart.items.map((item) => ({
    id: item.id,
    owner_kind: item.configuration_id === null ? 'product' : 'configuration',
    product_id: item.product_id,
    configuration_id: item.configuration_id,
    product_ref: item.product_slug,
    product_slug: item.product_slug,
    product_name: item.title,
    // The cart DTO does not carry the product kind; null is the honest value.
    product_kind: null,
    gemstone_ref: null,
    quantity: item.quantity,
    unit_price: Number(item.unit_price),
    line_total: Number(item.line_total),
    currency: cart.currency,
  }));
  return {
    token: cart.cart_token,
    status: cart.state,
    currency: cart.currency,
    items,
    subtotal: Number(cart.pricing_snapshot.subtotal),
  };
}

/**
 * Load a cart only after its owner is known.
 *
 * A cart bound to a customer is answered 404 to every other caller — anonymous
 * or signed in as somebody else — so the URL cannot be used to enumerate carts.
 * An unbound cart is a guest cart and the token is its credential, exactly as
 * develop's checkout used it.
 */
async function loadAuthorizedCart(ctx: FreshContext, token: string): Promise<CartDto> {
  const owner = await findCartOwnership(ctx.db, token);
  if (owner === null) {
    throw new ContractError('CART_NOT_FOUND', 'Cart not found.');
  }
  if (owner.customer_id !== null) {
    const actor = await resolveShopperActor(ctx);
    if (actor === null || actor.customer.id !== owner.customer_id) {
      throw new ContractError('CART_NOT_FOUND', 'Cart not found.');
    }
  }
  if (owner.state !== 'ACTIVE') {
    throw new ContractError('CART_EXPIRED', 'Cart is not active.');
  }
  return getCartByToken(ctx.db, token);
}

function requireCartToken(ctx: FreshContext): string {
  const token = ctx.params['token'];
  if (token === undefined || token.trim().length === 0) {
    throw new ContractError('NOT_FOUND', 'No cart was named in the path.');
  }
  return token;
}

/** GET /api/fresh/carts — the signed-in customer's current cart. */
export async function cartCurrentHandler(ctx: FreshContext): Promise<HandlerOutcome> {
  const actor = await ensureShopperActor(ctx);
  const token = await findActiveCartTokenForCustomer(ctx.db, actor.customer.id);
  if (token === null) {
    throw new ContractError('CART_NOT_FOUND', 'No active cart for this customer.');
  }
  return ok(toCartView(await getCartByToken(ctx.db, token)));
}

/** POST /api/fresh/carts — create or return a cart for the supplied token. */
export async function cartCreateHandler(ctx: FreshContext): Promise<HandlerOutcome> {
  const body = await readJsonObject(ctx, { required: false });
  const supplied = optionalString(body, 'token', { max: 200 });
  const actor = await resolveShopperActor(ctx);

  if (supplied !== undefined) {
    const owner = await findCartOwnership(ctx.db, supplied);
    if (owner !== null && owner.state === 'ACTIVE') {
      if (owner.customer_id !== null && owner.customer_id !== actor?.customer.id) {
        throw new ContractError('CART_NOT_FOUND', 'Cart not found.');
      }
      return ok({ token: owner.cart_token, created: false });
    }
  }

  const cart = await createCart(ctx.db, actor === null ? {} : { customer_id: actor.customer.id });
  return ok({ token: cart.cart_token, created: true }, 201);
}

/** GET /api/fresh/carts/{token} */
export async function cartViewHandler(ctx: FreshContext): Promise<HandlerOutcome> {
  const cart = await loadAuthorizedCart(ctx, requireCartToken(ctx));
  return ok(toCartView(cart));
}

/** POST /api/fresh/carts/{token}/items */
export async function cartAddItemHandler(ctx: FreshContext): Promise<HandlerOutcome> {
  const token = requireCartToken(ctx);
  await loadAuthorizedCart(ctx, token);
  const body = await readJsonObject(ctx);

  if (body['configuration_code'] !== undefined) {
    // cart_items.product_id is NOT NULL: a configured line needs the priced
    // product realisation of the configuration, not a guessed product. The
    // DYO review page uses main's /api/v1/dyo/... conversion instead.
    throw new ContractError(
      'UNPROCESSABLE',
      'A design-your-own configuration must be converted to its priced product before it can join the cart.',
    );
  }

  const ref = requireString(body, 'ref', { max: 200 });
  const quantity = optionalPositiveInt(body, 'quantity', 1);
  const product = await resolvePurchasableProductRef(ctx.db, ref);
  if (product === null) {
    throw new ContractError('PRODUCT_NOT_FOUND', 'No product matches that reference.');
  }
  if (product.state !== 'ACTIVE' || !product.availability) {
    throw new ContractError('UNPROCESSABLE', 'That piece is not currently available.');
  }
  if (product.price_amount === null || Number(product.price_amount) <= 0) {
    throw new ContractError('UNPROCESSABLE', 'That piece has no published price.');
  }

  const cart = await addItemToCart(ctx.db, token, {
    product_id: product.id,
    quantity,
  });
  return ok(toCartView(cart));
}

/** PATCH /api/fresh/carts/{token}/items/{itemId} */
export async function cartUpdateItemHandler(ctx: FreshContext): Promise<HandlerOutcome> {
  const token = requireCartToken(ctx);
  await loadAuthorizedCart(ctx, token);
  const itemId = ctx.params['itemId'];
  if (itemId === undefined || itemId.trim().length === 0) {
    throw new ContractError('NOT_FOUND', 'No cart item was named in the path.');
  }
  const body = await readJsonObject(ctx);
  const quantity = optionalPositiveInt(body, 'quantity', 1);
  const cart = await updateCartItemQuantity(ctx.db, token, itemId, { quantity });
  return ok(toCartView(cart));
}

/** DELETE /api/fresh/carts/{token}/items/{itemId} */
export async function cartRemoveItemHandler(ctx: FreshContext): Promise<HandlerOutcome> {
  const token = requireCartToken(ctx);
  await loadAuthorizedCart(ctx, token);
  const itemId = ctx.params['itemId'];
  if (itemId === undefined || itemId.trim().length === 0) {
    throw new ContractError('NOT_FOUND', 'No cart item was named in the path.');
  }
  const cart = await removeCartItem(ctx.db, token, itemId);
  return ok(toCartView(cart));
}

/** GET /api/fresh/carts/{token}/quote — a read; nothing is written. */
export async function cartQuoteHandler(ctx: FreshContext): Promise<HandlerOutcome> {
  const cart = await loadAuthorizedCart(ctx, requireCartToken(ctx));
  const subtotal = Number(cart.pricing_snapshot.subtotal);
  const currency = cart.currency;

  let discount = 0;
  const code = ctx.url.searchParams.get('discount');
  if (code !== null && code.trim().length > 0) {
    const validated = await validateDiscount(ctx.db, { code: code.trim(), subtotal });
    discount = Number(validated.discount_amount);
  }

  const grand = Math.max(0, Math.round((subtotal - discount) * 100) / 100);
  return ok({
    subtotal,
    discount,
    tax: 0,
    tax_label: 'UNCONFIGURED',
    shipping: 0,
    grand_total: grand,
    currency,
  });
}

/* ---------------------------------------------------------------- checkout */

interface AddressBody {
  recipient?: unknown;
  full_name?: unknown;
  line1?: unknown;
  line2?: unknown;
  line3?: unknown;
  city?: unknown;
  region?: unknown;
  postal_code?: unknown;
  country?: unknown;
  country_code?: unknown;
  phone?: unknown;
}

function buildShippingAddress(raw: unknown): Record<string, unknown> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new ContractError('VALIDATION_FAILED', 'shipping_address must be an object.', [
      { field: 'shipping_address', code: 'INVALID_TYPE', message: 'shipping_address must be an object.' },
    ]);
  }
  const address = raw as AddressBody;
  const text = (value: unknown): string | undefined =>
    typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;

  const parsed = ShippingAddressDtoSchema.safeParse({
    full_name: text(address.recipient) ?? text(address.full_name),
    recipient: text(address.recipient) ?? null,
    line1: text(address.line1),
    line2: text(address.line2) ?? null,
    line3: text(address.line3) ?? null,
    city: text(address.city),
    region: text(address.region) ?? null,
    postal_code: text(address.postal_code),
    country_code: (text(address.country_code) ?? text(address.country) ?? 'US').toUpperCase(),
    phone: text(address.phone) ?? null,
  });
  if (!parsed.success) {
    throw new ContractError('VALIDATION_FAILED', 'The shipping address is incomplete.', [
      { field: 'shipping_address', code: 'INVALID_ADDRESS', message: 'The shipping address is incomplete.' },
    ]);
  }
  return parsed.data as unknown as Record<string, unknown>;
}

function totalsFromOrder(order: {
  subtotal: string;
  discount_total: string;
  tax_total: string;
  shipping_total: string;
  grand_total: string;
  currency: string;
}): Record<string, unknown> {
  return {
    subtotal: Number(order.subtotal),
    discount: Number(order.discount_total),
    tax: Number(order.tax_total),
    tax_label: 'UNCONFIGURED',
    shipping: Number(order.shipping_total),
    grand_total: Number(order.grand_total),
    currency: order.currency,
  };
}

/**
 * POST /api/fresh/carts/{token}/checkout — place the order.
 *
 * Stock reservation is main's own semantics, not a second implementation:
 * `createCheckoutSession` calls `reserveStockForCart` inside Postgres before
 * any order row exists. The three checkpoints then carry the real address and
 * a payment-intent reference, and `placeOrder` writes the immutable snapshots.
 * A repeat call is idempotent on the cart token.
 */
export async function cartCheckoutHandler(ctx: FreshContext): Promise<HandlerOutcome> {
  const token = requireCartToken(ctx);
  const cart = await loadAuthorizedCart(ctx, token);
  if (cart.items.length === 0) {
    throw new ContractError('UNPROCESSABLE', 'Cannot place an order for an empty cart.');
  }

  const body = await readJsonObject(ctx);
  const email = requireEmail(body);
  const shippingAddress = buildShippingAddress(body['shipping_address']);
  const actor = await resolveShopperActor(ctx);

  const session = await createCheckoutSession(ctx.db, {
    cart_token: token,
    email,
    ...(actor === null ? {} : { customer_id: actor.customer.id }),
  });
  const shipped = await submitShippingCheckpoint(ctx.db, session.id, {
    shipping_address: shippingAddress as never,
  });
  let confirmed = await submitPaymentCheckpoint(ctx.db, shipped.id);

  const discountCode = optionalString(body, 'discount_code', { max: 64 });
  if (discountCode !== undefined) {
    const subtotal = Number(confirmed.pricing_snapshot.subtotal);
    const validated = await validateDiscount(ctx.db, {
      code: discountCode,
      subtotal,
      ...(actor === null ? {} : { customer_id: actor.customer.id }),
    });
    const discount = Number(validated.discount_amount);
    const tax = Number(confirmed.pricing_snapshot.tax_total);
    const shipping = Number(confirmed.pricing_snapshot.shipping_total);
    const grand = Math.max(0, Math.round((subtotal - discount + tax + shipping) * 100) / 100);
    confirmed = await saveCheckoutSession(ctx.db, {
      ...confirmed,
      pricing_snapshot: {
        ...confirmed.pricing_snapshot,
        discount_total: discount.toFixed(2),
        grand_total: grand.toFixed(2),
        computed_at: new Date().toISOString(),
      },
    });
  }

  const customerNote = optionalString(body, 'customer_note', { max: 1000 });
  const order = await placeOrder(ctx.db, {
    checkout_session_id: confirmed.id,
    idempotency_key: `fresh-checkout:${token}`,
    ...(customerNote === undefined ? {} : { customer_note: customerNote }),
  });

  return ok(
    {
      order_number: order.order_number,
      order_id: order.id,
      // main's orders table has no guest access-token column, and this surface
      // does not invent one. The order dossier is readable by the owning
      // session only; a guest sees the confirmation above.
      access_token: '',
      totals: totalsFromOrder(order),
      payment_pending: true,
    },
    201,
  );
}

/** POST /api/fresh/checkout — start a checkout session (reserves stock). */
export async function checkoutStartHandler(ctx: FreshContext): Promise<HandlerOutcome> {
  const body = await readJsonObject(ctx);
  const cartToken = requireString(body, 'cart_token', { max: 200 });
  await loadAuthorizedCart(ctx, cartToken);
  const email = optionalString(body, 'email', { max: 320 });
  const actor = await resolveShopperActor(ctx);

  const session = await createCheckoutSession(ctx.db, {
    cart_token: cartToken,
    ...(email === undefined ? {} : { email }),
    ...(actor === null ? {} : { customer_id: actor.customer.id }),
  });
  return ok(checkoutView(session), 201);
}

function checkoutView(session: CheckoutSessionDto): Record<string, unknown> {
  return {
    session_id: session.id,
    cart_token: session.cart_token,
    current_step: session.current_step,
    email: session.email ?? null,
    pricing_snapshot: session.pricing_snapshot,
    reservation_expires_at: session.reservation_expires_at,
    shipping_address: session.shipping_address ?? null,
    payment_intent_id: session.payment_intent_id ?? null,
    completed_order_id: session.completed_order_id ?? null,
  };
}

/** GET /api/fresh/checkout/{sessionId} */
export async function checkoutSessionHandler(ctx: FreshContext): Promise<HandlerOutcome> {
  const sessionId = ctx.params['sessionId'];
  if (sessionId === undefined || sessionId.trim().length === 0) {
    throw new ContractError('NOT_FOUND', 'No checkout session was named in the path.');
  }
  const session = await getCheckoutSession(ctx.db, sessionId);
  return ok(checkoutView(session));
}

/** POST /api/fresh/checkout/{sessionId}/advance */
export async function checkoutAdvanceHandler(ctx: FreshContext): Promise<HandlerOutcome> {
  const sessionId = ctx.params['sessionId'];
  if (sessionId === undefined || sessionId.trim().length === 0) {
    throw new ContractError('NOT_FOUND', 'No checkout session was named in the path.');
  }
  const body = await readJsonObject(ctx);
  const step = requireString(body, 'step', { max: 20 }).toUpperCase();

  if (step === 'SHIPPING') {
    const session = await submitShippingCheckpoint(ctx.db, sessionId, {
      shipping_address: buildShippingAddress(body['shipping_address']) as never,
      ...(body['shipping_method'] === undefined
        ? {}
        : { shipping_method: body['shipping_method'] as never }),
    });
    return ok(checkoutView(session));
  }

  if (step === 'PAYMENT') {
    const session = await submitPaymentCheckpoint(ctx.db, sessionId);
    return ok(checkoutView(session));
  }

  if (step === 'CONFIRM') {
    const idempotencyKey = requireString(body, 'idempotency_key', { max: 200 });
    const session = await submitConfirmCheckpoint(ctx.db, sessionId, { idempotency_key: idempotencyKey });
    const customerNote = optionalString(body, 'customer_note', { max: 1000 });
    const order = await placeOrder(ctx.db, {
      checkout_session_id: session.id,
      idempotency_key: idempotencyKey,
      ...(customerNote === undefined ? {} : { customer_note: customerNote }),
    });
    const completed = await getCheckoutSession(ctx.db, sessionId);
    return ok({ session: checkoutView(completed), order: { order_number: order.order_number, order_id: order.id } });
  }

  throw new ContractError('VALIDATION_FAILED', 'step must be SHIPPING, PAYMENT or CONFIRM.', [
    { field: 'step', code: 'INVALID_VALUE', message: 'step must be SHIPPING, PAYMENT or CONFIRM.' },
  ]);
}

/* ------------------------------------------------------------------ orders */

function requireOrderNumber(ctx: FreshContext): string {
  const orderNumber = ctx.params['orderNumber'];
  if (orderNumber === undefined || orderNumber.trim().length === 0) {
    throw new ContractError('NOT_FOUND', 'No order was named in the path.');
  }
  return orderNumber;
}

/** GET /api/fresh/orders — the signed-in customer's history (bare array). */
export async function orderListHandler(ctx: FreshContext): Promise<HandlerOutcome> {
  const actor = await ensureShopperActor(ctx);
  const orders = await listCustomerOrderSummaries(ctx.db, actor.customer.id);
  return ok(orders);
}

/** GET /api/fresh/orders/{orderNumber} — inside the customer boundary. */
export async function orderDetailHandler(ctx: FreshContext): Promise<HandlerOutcome> {
  const actor = await ensureShopperActor(ctx);
  const order = await getCustomerOrderByNumber(ctx.db, actor.customer.id, requireOrderNumber(ctx));
  if (order === null) {
    throw new ContractError('ORDER_NOT_FOUND', 'Order not found.');
  }
  return ok({
    order_number: order.order_number,
    customer_id: order.customer_id,
    email: order.email,
    status: order.status,
    currency: order.currency,
    subtotal: order.subtotal,
    tax: order.tax,
    shipping: order.shipping,
    discount: order.discount,
    grand_total: order.grand_total,
    shipping_address: order.shipping_address,
    customer_note: order.customer_note,
    placed_at: order.placed_at,
    paid_at: order.paid_at,
    items: order.items,
    events: order.events,
  });
}

/**
 * POST /api/fresh/orders/{orderNumber}/pay
 *
 * develop's checkout labels this control "Test instrument. Dev mode captures a
 * test payment without moving real money." This surface keeps that honesty:
 * the payment row records provider `test`, and the route refuses unless
 * `ENVIRONMENT` is one of the four local names. There is no PSP decision in
 * main, and none is invented here.
 */
export async function orderPayHandler(ctx: FreshContext): Promise<HandlerOutcome> {
  const actor = await ensureShopperActor(ctx);
  const order = await getCustomerOrderByNumber(ctx.db, actor.customer.id, requireOrderNumber(ctx));
  if (order === null) {
    throw new ContractError('ORDER_NOT_FOUND', 'Order not found.');
  }
  if (order.status !== 'PENDING_PAYMENT') {
    throw new ContractError('UNPROCESSABLE', `Order ${order.order_number} is ${order.status}, not payable.`);
  }
  if (!isDevelopmentEnvironment(ctx.environment)) {
    throw new ContractError(
      'UNPROCESSABLE',
      'No payment provider is configured in this environment; the order stays pending payment.',
    );
  }

  const providerPaymentId = `test_${randomUUID()}`;
  await createPaymentRecord(ctx.db, {
    order_id: order.id,
    provider: 'test',
    provider_payment_id: providerPaymentId,
    amount: order.grand_total,
    currency: order.currency,
    state: 'CAPTURED',
  });
  await transitionOrderState(
    ctx.db,
    order.id,
    { type: 'PAYMENT_RECEIVED', transactionId: providerPaymentId, amount: order.grand_total },
    { type: 'CUSTOMER', id: actor.session.userId },
  );

  return ok({
    order_number: order.order_number,
    status: 'PAID',
    payment: { state: 'CAPTURED', provider: 'test' },
  });
}

/* ----------------------------------------------------- leads / newsletter */

const LEAD_SOURCES = new Set(['newsletter', 'viewing_request', 'contact']);
const SOURCE_INTENT = {
  viewing_request: 'APPOINTMENT',
  contact: 'INQUIRY',
  newsletter: 'INQUIRY',
} as const;

/**
 * POST /api/fresh/leads
 *
 * `newsletter` becomes the consent record. Every other source becomes a durable
 * customer request through the SAME tool the AI concierge uses
 * (`create_customer_request`) — the handler never writes the table itself, so
 * the AI architecture's "tools, not database clients" rule holds on the
 * form path too.
 */
export async function leadCreateHandler(ctx: FreshContext): Promise<HandlerOutcome> {
  return createLead(ctx);
}

/**
 * POST /api/fresh/viewing-requests
 *
 * The explicit viewing-request path. It is the same tool/service as `/leads`
 * with the source fixed, so a caller cannot smuggle a newsletter subscription
 * through the appointment endpoint.
 */
export async function viewingRequestCreateHandler(ctx: FreshContext): Promise<HandlerOutcome> {
  return createLead(ctx, 'viewing_request');
}

async function createLead(ctx: FreshContext, forcedSource?: 'viewing_request'): Promise<HandlerOutcome> {
  const body = await readJsonObject(ctx);
  const email = requireEmail(body);
  const source = forcedSource ?? optionalString(body, 'source', { max: 40 }) ?? 'newsletter';
  if (!LEAD_SOURCES.has(source)) {
    throw new ContractError('VALIDATION_FAILED', `Unsupported lead source '${source}'.`, [
      { field: 'source', code: 'INVALID_VALUE', message: 'source must be newsletter, viewing_request or contact.' },
    ]);
  }

  if (source === 'newsletter') {
    const subscription = await subscribeNewsletter(ctx.db, { email, source });
    return ok(
      { ok: true, id: subscription.id, message: 'subscribed', consent_at: subscription.consent_at },
      201,
    );
  }

  const name = optionalString(body, 'name', { max: 120 }) ?? null;
  const note = optionalString(body, 'note', { max: 2000 });
  const actor = await resolveShopperActor(ctx);

  const tool = TOOL_REGISTRY.get('create_customer_request');
  if (tool === undefined) {
    throw new ContractError('INTERNAL', 'The customer-request tool is not registered.');
  }

  const services = buildLeadToolServices(ctx, {
    email,
    name,
    source,
    note: note ?? `Contact request from the ${source} form.`,
    customerId: actor?.customer.id ?? null,
  });
  const toolContext = {
    actorType: actor === null ? ('ANONYMOUS_WEB' as const) : ('CUSTOMER' as const),
    ...(actor === null ? {} : { actorId: actor.session.userId, customerId: actor.customer.id }),
    sessionNonce: ctx.ids.requestId,
    surface: 'storefront_lead_form',
    services,
  };

  const input = {
    intent: SOURCE_INTENT[source as keyof typeof SOURCE_INTENT] ?? 'INQUIRY',
    notes: note ?? `Contact request from the ${source} form.`,
    contactInfo: name === null ? email : `${name} <${email}>`,
  };
  const decision = tool.authorization(toolContext, input);
  if (!decision.allowed) {
    throw new ContractError('FORBIDDEN', 'That request is not permitted.');
  }
  const output = (await tool.execute(toolContext, input)) as { requestId: string };

  return ok({ ok: true, id: output.requestId, message: 'submitted' }, 201);
}

function buildLeadToolServices(
  ctx: FreshContext,
  lead: {
    email: string;
    name: string | null;
    source: string;
    note: string;
    customerId: string | null;
  },
): ToolServices {
  return {
    catalog: {
      search: async () => ({ items: [], total: 0 }),
      getProduct: async () => null,
      getGemstone: async () => null,
      getGemstones: async () => [],
    },
    knowledge: { search: async () => [] },
    dyo: {
      checkCompatibility: async () => {
        throw new Error('Compatibility is evaluated on a configuration dossier.');
      },
    },
    pricing: {
      getQuote: async () => {
        throw new Error('No quote exists without a configuration dossier.');
      },
    },
    certificates: { getPublicCertificate: async () => null },
    commerce: {
      createCustomerRequest: async (input) => {
        const record = await createCustomerRequestRecord(ctx.db, {
          intent: input.intent as 'INQUIRY',
          source: lead.source,
          email: lead.email,
          name: lead.name,
          notes: input.notes,
          customerId: lead.customerId,
        });
        return { requestId: record.id };
      },
    },
    ai: {
      transferToHuman: async () => {
        throw new Error('A handoff is not available on this surface.');
      },
    },
  };
}

/** POST /api/fresh/leads/unsubscribe — idempotent, never enumerates. */
export async function leadUnsubscribeHandler(ctx: FreshContext): Promise<HandlerOutcome> {
  const body = await readJsonObject(ctx);
  const email = requireEmail(body);
  await unsubscribeNewsletter(ctx.db, email);
  return ok({ ok: true, message: 'unsubscribed' });
}

/** POST /api/fresh/newsletter — the explicit consent endpoint. */
export async function newsletterSubscribeHandler(ctx: FreshContext): Promise<HandlerOutcome> {
  const body = await readJsonObject(ctx);
  const email = requireEmail(body);
  const source = optionalString(body, 'source', { max: 40 }) ?? 'newsletter';
  const subscription = await subscribeNewsletter(ctx.db, { email, source });
  return ok(
    {
      ok: true,
      id: subscription.id,
      email: subscription.email,
      consent_at: subscription.consent_at,
      message: 'subscribed',
    },
    201,
  );
}

/* --------------------------------------------------------------- catalogue */

interface GemFilters {
  readonly kind: 'gemstones';
  readonly count: number;
  readonly items: readonly CompatGemstoneRow[];
}

function summaryToGemstone(item: Record<string, unknown>): CompatGemstoneRow {
  const asText = (value: unknown): string | null =>
    value === null || value === undefined || value === '' ? null : String(value);
  const variety = item['variety'] as { name?: string; slug?: string } | null | undefined;
  const color = item['color'] as { name?: string; slug?: string } | null | undefined;
  const kind = String(item['kind'] ?? 'LOOSE_STONE');
  const weight = item['total_weight_ct'];
  return {
    ref: String(item['slug'] ?? ''),
    slug: String(item['slug'] ?? ''),
    name: String(item['title'] ?? ''),
    kind: kind === 'STONE_PAIR' ? 'PAIR' : 'SINGLE',
    variety: variety?.name ?? null,
    variety_code: variety?.slug ?? null,
    family_code: null,
    colour: color?.name ?? null,
    colour_slug: color?.slug ?? null,
    origin: null,
    shape: null,
    clarity: null,
    treatment: null,
    weight_ct: asText(weight),
    total_weight_ct: asText(weight),
    price_amount: asText(item['price_amount']),
    currency: String(item['currency'] ?? 'USD'),
    status: String(item['state'] ?? 'ACTIVE'),
    origin_type: null,
    description: null,
    primary_image: null,
  };
}

async function runSearch(
  ctx: FreshContext,
  query: { q: string; limit: number },
): Promise<SearchResult> {
  const search = ctx.deps.search ?? executeSearch;
  return search(ctx.db, {
    query: query.q,
    limit: Math.min(query.limit, 100),
    filters: {},
  });
}

function parseRefs(raw: string | null): readonly string[] {
  if (raw === null || raw.trim().length === 0) return [];
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .slice(0, 100);
}

/** GET /api/fresh/catalogue/gemstones?q&refs&limit&offset */
export async function catalogueGemstonesHandler(ctx: FreshContext): Promise<HandlerOutcome> {
  const q = (ctx.url.searchParams.get('q') ?? '').trim();
  const refs = parseRefs(ctx.url.searchParams.get('refs'));
  const limit = Math.min(Math.max(Number(ctx.url.searchParams.get('limit') ?? '50'), 1), 200);
  const offset = Math.max(Number(ctx.url.searchParams.get('offset') ?? '0'), 0);

  if (q.length > 0 && refs.length === 0) {
    // Search/typeahead goes through the existing search service.
    const result = await runSearch(ctx, { q, limit });
    const items = result.items
      .filter((item) => item.kind === 'LOOSE_STONE' || item.kind === 'STONE_PAIR')
      .map((item) => summaryToGemstone(item as unknown as Record<string, unknown>));
    return ok({ kind: 'gemstones', count: items.length, items } satisfies GemFilters);
  }

  const items = await listCompatGemstones(ctx.db, {
    ...(q.length === 0 ? {} : { q }),
    ...(refs.length === 0 ? {} : { refs }),
    limit,
    offset: Number.isFinite(offset) ? Math.trunc(offset) : 0,
  });
  return ok({ kind: 'gemstones', count: items.length, items } satisfies GemFilters);
}

/** GET /api/fresh/catalogue/settings?q&refs&limit */
export async function catalogueSettingsHandler(ctx: FreshContext): Promise<HandlerOutcome> {
  const q = (ctx.url.searchParams.get('q') ?? '').trim();
  const refs = parseRefs(ctx.url.searchParams.get('refs'));
  const limit = Math.min(Math.max(Number(ctx.url.searchParams.get('limit') ?? '50'), 1), 200);
  const items: readonly CompatSettingRow[] = await listCompatSettings(ctx.db, {
    ...(q.length === 0 ? {} : { q }),
    ...(refs.length === 0 ? {} : { refs }),
    limit,
    offset: 0,
  });
  return ok({ kind: 'settings', count: items.length, items });
}

/* --------------------------------------------------------------- concierge */

interface ConciergeInterpretation {
  readonly label: string;
  readonly value: string;
}

const CONCIERGE_REFUSAL =
  'No stones in the vault match that reading. Try a variety, colour, origin, shape, budget or carat weight — the concierge refuses rather than guessing.';

interface ParsedConcierge {
  readonly interpretation: readonly ConciergeInterpretation[];
  readonly filters: Record<string, unknown>;
  readonly kind: 'LOOSE_STONE' | 'STONE_PAIR';
}

/** Deterministic reading of the shopper's own words; no invented attribute. */
function readConciergeQuery(query: string): ParsedConcierge {
  const interpretation: ConciergeInterpretation[] = [];
  const filters: Record<string, unknown> = {};

  const pair = /\b(pairs?|earrings?|matched)\b/i.test(query);
  const kind: 'LOOSE_STONE' | 'STONE_PAIR' = pair ? 'STONE_PAIR' : 'LOOSE_STONE';
  if (pair) interpretation.push({ label: 'Type', value: 'Matched pair' });

  const budget = /(?:under|below|max|less than|up to|≤|<)\s*\$?\s*([\d][\d,]{2,})/i.exec(query)
    ?? /\$\s*([\d][\d,]{2,})/i.exec(query);
  if (budget) {
    const max = Number(budget[1]?.replace(/,/g, ''));
    if (Number.isFinite(max) && max > 0) {
      filters['maxPrice'] = max;
      interpretation.push({ label: 'Budget', value: `Up to $${max.toLocaleString('en-US')}` });
    }
  }

  const carat = /(\d+(?:\.\d+)?)\s*(?:ct|carat)/i.exec(query);
  if (carat) {
    const weight = Number(carat[1]);
    if (Number.isFinite(weight) && weight > 0) {
      filters['minWeightCt'] = Math.round(weight * 0.9 * 1000) / 1000;
      filters['maxWeightCt'] = Math.round(weight * 1.1 * 1000) / 1000;
      interpretation.push({ label: 'Carat', value: `≈ ${weight} ct` });
    }
  }

  if (interpretation.length === 0) {
    interpretation.push({ label: 'Search', value: query.slice(0, 200) });
  }
  return { interpretation, filters, kind };
}

function conciergeToolServices(ctx: FreshContext): ToolServices {
  return {
    catalog: {
      search: async (params) => {
        const query = typeof params['query'] === 'string' ? params['query'] : '';
        const limit = Number(params['limit'] ?? 5);
        const result = await runSearch(ctx, { q: query, limit });
        return { items: result.items, total: result.items.length, facets: result.facets };
      },
      getProduct: async () => null,
      getGemstone: async (gemRef) => findCompatGemstoneByRef(ctx.db, gemRef),
      getGemstones: async (gemRefs) => {
        const rows: CompatGemstoneRow[] = [];
        for (const ref of gemRefs) {
          const row = await findCompatGemstoneByRef(ctx.db, ref);
          if (row !== null) rows.push(row);
        }
        return rows;
      },
    },
    knowledge: {
      // The knowledge corpus is empty until content is published; an empty
      // answer is the honest one.
      search: async () => [],
    },
    dyo: {
      checkCompatibility: async () => {
        throw new Error('Compatibility is evaluated on a configuration dossier.');
      },
    },
    pricing: {
      getQuote: async () => {
        throw new Error('No quote exists without a configuration dossier.');
      },
    },
    certificates: {
      getPublicCertificate: async (identifier) => {
        const id = identifier.gemRef ?? identifier.certificateId;
        return id === undefined ? null : findPublicCertificateForGemRef(ctx.db, id);
      },
    },
    commerce: {
      createCustomerRequest: async () => {
        throw new Error('The concierge cannot submit a request; use the contact form.');
      },
    },
    ai: {
      transferToHuman: async () => {
        throw new Error('A handoff is not available on this surface.');
      },
    },
  };
}

/**
 * POST /api/fresh/concierge
 *
 * The conversational reply comes from the existing AI orchestrator, which
 * plans tools and authorises each one in code before executing it. The
 * orchestrator writes nothing: this handler does not create a conversation,
 * append a message or record an interaction. The stone rail is the same live
 * catalogue read, so the reply and the rail cannot disagree about what exists.
 */
export async function conciergeHandler(ctx: FreshContext): Promise<HandlerOutcome> {
  const body = await readJsonObject(ctx);
  const query = requireString(body, 'query', { max: 300 });
  const actor = await resolveShopperSession(ctx);
  const parsed = readConciergeQuery(query);

  const result = await runSearch(ctx, { q: query, limit: 8 });
  const items = result.items
    .filter((item) => item.kind === parsed.kind)
    .map((item) => summaryToGemstone(item as unknown as Record<string, unknown>));
  const total = items.length;

  let reply: string | null = null;
  let handoff: unknown;
  try {
    const orchestrator = new AiOrchestrator({
      services: conciergeToolServices(ctx),
      surface: 'search_assist',
    });
    const outcome = await orchestrator.executeTurn({
      conversationKey: `fresh-concierge:${ctx.ids.requestId}`,
      message: query,
      surface: 'search_assist',
      actorType: actor === null ? 'ANONYMOUS_WEB' : 'CUSTOMER',
      ...(actor === null ? {} : { actorId: actor.userId }),
    });
    reply = outcome.responseText;
    handoff =
      outcome.handoff === undefined
        ? undefined
        : { notice: outcome.handoff.specialistNotice, reason: outcome.handoff.trigger };
  } catch {
    // The rail above is already the honest catalogue answer; a planner failure
    // must not turn the surface into a 500.
    reply = null;
  }

  return ok({
    interpretation: parsed.interpretation,
    items,
    total,
    ...(total === 0 ? { refusal: CONCIERGE_REFUSAL } : {}),
    ...(reply === null ? {} : { reply }),
    model: false,
    ...(handoff === undefined ? {} : { handoff }),
  });
}
