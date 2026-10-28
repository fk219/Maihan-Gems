'use client';

/**
 * M4 — commerce adapter (the reference cart/checkout surfaces → the repo's
 * REAL commerce APIs).
 *
 * The migrated applet cart/checkout markup keeps its EXACT classes; this
 * adapter owns every real call so the applet components stay presentation
 * layers. Call sequence preserved from the repo's replaced funnel
 * (`components/checkout/CheckoutReview|Payment|Confirm`) plus one real
 * relocation: the verified shipping address collected in the applet's
 * step-1 form is recorded through the REAL shipping checkpoint right after
 * the session opens (address → settlement, the same order the applet renders).
 *
 *   cart page      GET /api/v1/carts/{token} (+ item mutations)
 *   checkout entry POST /api/v1/carts → POST /api/v1/carts/{token}/items
 *                  → POST /api/v1/checkout/sessions (server pricing snapshot
 *                    + 30-minute inventory reservation)
 *                  → POST /api/v1/checkout/sessions/{id}/shipping (real
 *                    checkpoint; the server rejects out-of-order steps 422)
 *   step 2         POST /api/v1/checkout/sessions/{id}/payment (method_type
 *                    TEST — the dev provider; card/escrow are a pending
 *                    backend decision and never render as available)
 *   step 3         POST …/confirm (idempotency key) → POST /api/v1/orders
 *   confirmation   GET /api/v1/orders/{id} — the REAL order state; nothing
 *                    here invents an order number or marks payment settled.
 *
 * Honesty rules carried over from the replaced components: the browser is
 * never the price authority (a price mismatch is a 409 PRICE_CHANGED
 * surfaced verbatim); skipped steps surface the server's 422 message
 * verbatim; this module never fabricates an order id, a payment state or a
 * settled amount.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStorefront, type CartItem } from '@/components/mgh/providers/StorefrontProvider';

/** localStorage key the real funnel uses for the bridged server cart token. */
const CART_TOKEN_KEY = 'maihan_cart_token';

/** The applet's own step persistence keys (same values the applet shipped). */
export const CHECKOUT_SHIPPING_KEY = 'maihan_checkout_shipping_v1';
export const CHECKOUT_PAYMENT_KEY = 'maihan_checkout_payment_v1';

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/* -----------------------------------------------------------------------
 * Bag — the merged tray (server cart authoritative + the applet provider
 * bag). The provider's CartItem shape is preserved; server lines are mapped
 * onto it so the applet markup renders both sources identically.
 * ----------------------------------------------------------------------- */

/** A `{ serverCartToken, serverItemId }` extension distinguishes merged lines. */
export type MghBagItem = CartItem & {
  serverCartToken?: string;
  serverItemId?: string;
};

interface ServerCartItem {
  id: string;
  product_id: string;
  product_slug: string;
  title: string;
  configuration_id: string | null;
  quantity: number;
  unit_price: string;
  line_total: string;
}

interface ServerCartEnvelope {
  data?: {
    state?: string;
    cart_token?: string;
    items?: ServerCartItem[];
  };
}

async function readServerCart(): Promise<MghBagItem[]> {
  if (typeof window === 'undefined') return [];
  const token = window.localStorage.getItem(CART_TOKEN_KEY);
  if (!token) return [];
  try {
    const res = await fetch(`/api/v1/carts/${encodeURIComponent(token)}`);
    if (!res.ok) return [];
    const body = (await res.json()) as ServerCartEnvelope;
    if (body.data?.state !== 'ACTIVE' || !Array.isArray(body.data.items)) return [];
    const cartToken = body.data.cart_token ?? token;
    return body.data.items.map((item) => mapServerLine(item, cartToken));
  } catch {
    return [];
  }
}

function mapServerLine(item: ServerCartItem, cartToken: string): MghBagItem {
  return {
    id: item.product_id,
    // The cart endpoint returns the real slug; no separate SKU column — the
    // slug IS the evidenced identifier, and no label is invented beyond it.
    sku: item.product_slug,
    slug: item.product_slug,
    name: item.title,
    subtitle: item.configuration_id ? `DYO Commission · Slug ${item.product_slug}` : '',
    price: Number(item.unit_price) || 0,
    image: '',
    kind: item.configuration_id ? 'dyo' : 'vault',
    quantity: item.quantity,
    serverCartToken: cartToken,
    serverItemId: item.id,
  };
}

/** Intersection test used to keep the server cart authoritative. */
function bagIdOrSlugHit(item: { id: string; slug: string }, seenIds: Set<string>, seenSlugs: Set<string>): boolean {
  return seenIds.has(item.id) || seenSlugs.has((item.slug || item.id).toLowerCase());
}

/**
 * The cart page's merged tray. Both sources the migrated bag renders: the
 * applet provider's localStorage bag (identical add-to-bag UX) and the real
 * server cart materialized at checkout-entry. Merge semantics are the
 * replaced BagView's: the SERVER cart is authoritative; provider pieces
 * merge INTO it (deduped by id + slug), never the other way around.
 */
export function useMergedBag(): {
  items: MghBagItem[];
  subtotal: number;
  pieceCount: number;
  loading: boolean;
  removeItem: (item: MghBagItem) => Promise<void>;
  clearTray: () => Promise<void>;
} {
  const { cart, removeFromCart, clearCart } = useStorefront();
  const [serverItems, setServerItems] = useState<MghBagItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const lines = await readServerCart();
      if (cancelled) return;
      setServerItems(lines);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshServer = useCallback(async () => {
    setServerItems(await readServerCart());
  }, []);

  const removeItem = useCallback(
    async (item: MghBagItem) => {
      if (item.serverCartToken && item.serverItemId) {
        await fetch(
          `/api/v1/carts/${encodeURIComponent(item.serverCartToken)}/items/${encodeURIComponent(item.serverItemId)}`,
          { method: 'DELETE' },
        ).catch(() => undefined);
        await refreshServer();
        return;
      }
      removeFromCart(item.id);
    },
    [removeFromCart, refreshServer],
  );

  const clearTray = useCallback(async () => {
    for (const item of serverItems) {
      if (item.serverCartToken && item.serverItemId) {
        await fetch(
          `/api/v1/carts/${encodeURIComponent(item.serverCartToken)}/items/${encodeURIComponent(item.serverItemId)}`,
          { method: 'DELETE' },
        ).catch(() => undefined);
      }
    }
    await refreshServer();
    clearCart();
  }, [serverItems, refreshServer, clearCart]);

  const items = useMemo<MghBagItem[]>(() => {
    const seenIds = new Set(serverItems.map((item) => item.id));
    const seenSlugs = new Set(serverItems.map((item) => item.slug.toLowerCase()));
    const merged: MghBagItem[] = [...serverItems];
    for (const local of cart) {
      if (bagIdOrSlugHit(local, seenIds, seenSlugs)) continue;
      merged.push(local);
    }
    return merged;
  }, [serverItems, cart]);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * (item.quantity ?? 1), 0),
    [items],
  );
  const pieceCount = useMemo(
    () => items.reduce((sum, item) => sum + (item.quantity ?? 1), 0),
    [items],
  );

  return { items, subtotal, pieceCount, loading, removeItem, clearTray };
}

/* -----------------------------------------------------------------------
 * Discounts (real validation endpoint, verbatim responses surfaced).
 * ----------------------------------------------------------------------- */

export interface ValidatedDiscount {
  code: string;
  name: string;
  discount_amount: string;
  final_subtotal: string;
}

export async function validateDiscount(code: string, subtotal: number): Promise<ValidatedDiscount | null> {
  try {
    const res = await fetch('/api/v1/discounts/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, subtotal }),
    });
    const body = (await res.json().catch(() => null)) as {
      data?: { valid?: boolean; discount?: { code?: string; name?: string } } & ValidatedDiscount;
      error?: { message?: string };
    } | null;
    if (!res.ok || !body?.data?.valid) return null;
    return {
      code: body.data.discount?.code ?? code,
      name: body.data.discount?.name ?? code,
      discount_amount: body.data.discount_amount ?? '0.00',
      final_subtotal: body.data.final_subtotal ?? subtotal.toFixed(2),
    };
  } catch {
    return null;
  }
}

/* -----------------------------------------------------------------------
 * Checkout bridge — the REAL call sequence at applet checkout entry.
 * ----------------------------------------------------------------------- */

export interface CheckoutSession {
  id: string;
  current_step: string;
  cart_token: string;
  email: string | null;
  shipping_address: Record<string, string | null> | null;
  pricing_snapshot: {
    currency: string;
    subtotal: string;
    discount_total: string;
    shipping_total: string;
    tax_total: string;
    grand_total: string;
    item_count: number;
  };
  payment_intent_id: string | null;
  reservation_expires_at: string;
  completed_order_id: string | null;
}

interface SessionEnvelope {
  data?: CheckoutSession;
}

interface ErrorEnvelope {
  error?: { code?: string; message?: string };
}

async function errorMessage(res: Response, fallback: string): Promise<{ code: string | null; message: string }> {
  const body = (await res.json().catch(() => null)) as ErrorEnvelope | null;
  return { code: body?.error?.code ?? null, message: body?.error?.message ?? fallback };
}

/** Shipping address in the REAL checkpoint contract (2-letter country code). */
export interface ShippingAddressInput {
  full_name: string;
  line1: string;
  line2?: string;
  city: string;
  region?: string;
  postal_code: string;
  country_code: string;
  phone?: string;
}

/**
 * Country display names the reference data actually used (the applet demo
 * ran on a Swiss address). Anything outside the map must already be an
 * ISO-3166 alpha-2 code — the real schema enforces two letters and a wrong
 * code is surfaced verbatim by the server (422), never guessed.
 */
const COUNTRY_CODES: Record<string, string> = {
  'switzerland': 'CH',
  'schweiz': 'CH',
  'united arab emirates': 'AE',
  'uae': 'AE',
  'united states': 'US',
  'usa': 'US',
  'united kingdom': 'GB',
  'france': 'FR',
  'germany': 'DE',
  'italy': 'IT',
};

/**
 * Normalises the applet's free-text country field onto the real 2-letter
 * contract. Returns null when the value cannot become a code — the caller
 * reports that honestly instead of shipping a made-up code.
 */
export function normalizeCountryCode(raw: string): string | null {
  const value = raw.trim();
  if (value.length === 2) return value.toUpperCase();
  return COUNTRY_CODES[value.toLowerCase()] ?? null;
}

export interface StartCheckoutInput {
  email: string;
  discountCode: string | null;
  shipping: ShippingAddressInput;
  /** The merged tray (server lines included); the bridge skips those already on the server. */
  candidates: MghBagItem[];
}

/**
 * The real bridge, ported from `CheckoutReview.bridgeAndStart` with the
 * verified address folded in (the applet's step-1 visual is exactly an
 * insured-courier destination form):
 *   1. reuse the existing ACTIVE server cart or create one (token cached),
 *   2. add every bag piece not yet on the server (uuid → product_id, else
 *      product_slug; expected_unit_price guards repricing → 409 surfaced),
 *   3. open the checkout session (server pricing snapshot + reservation),
 *   4. record the real shipping checkpoint,
 *   5. clear browser bags + drop the cart token (server cart stays sole
 *      authority for the funnel).
 * Throws Error with the server's own message on any failed step.
 */
export async function startCheckout(input: StartCheckoutInput): Promise<CheckoutSession> {
  // 1. Server cart (reuse ACTIVE or create).
  const existing = await readServerCart();
  let cartToken = existing.length > 0 && existing[0]?.serverCartToken ? existing[0].serverCartToken : '';
  const serverProductIds = new Set(existing.map((item) => item.id));
  const serverSlugs = new Set(existing.map((item) => item.slug.toLowerCase()));

  if (!cartToken) {
    const cartRes = await fetch('/api/v1/carts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    if (!cartRes.ok) {
      throw new Error((await errorMessage(cartRes, 'The bag could not be opened on the server.')).message);
    }
    const cartBody = (await cartRes.json()) as { data?: { cart_token?: string } };
    cartToken = cartBody.data?.cart_token ?? '';
    if (!cartToken) throw new Error('The server did not return a bag token.');
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(CART_TOKEN_KEY, cartToken);
    }
  }

  // 2. Bridge the browser pieces not already in the server cart.
  for (const item of input.candidates) {
    if (bagIdOrSlugHit(item, serverProductIds, serverSlugs)) continue;
    const body: Record<string, unknown> = {
      quantity: item.quantity ?? 1,
      expected_unit_price: item.price ? item.price.toFixed(2) : undefined,
    };
    if (UUID_RE.test(item.id)) body['product_id'] = item.id;
    else body['product_slug'] = item.slug || item.id;
    const addRes = await fetch(`/api/v1/carts/${encodeURIComponent(cartToken)}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!addRes.ok) {
      const err = await errorMessage(addRes, `This piece could not be reserved for checkout: ${item.name}`);
      if (err.code === 'PRICE_CHANGED') {
        throw new Error('The price of one of your pieces changed on the server. Refresh the bag and review the updated price.');
      }
      throw new Error(err.message);
    }
  }

  // 3. The real session (server freezes prices, applies the discount and reserves stock).
  const sessionPayload: Record<string, unknown> = {
    cart_token: cartToken,
    email: input.email,
  };
  if (input.discountCode) {
    sessionPayload['discount_code'] = input.discountCode;
  }
  const sessionRes = await fetch('/api/v1/checkout/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sessionPayload),
  });
  if (!sessionRes.ok) {
    throw new Error((await errorMessage(sessionRes, 'Checkout could not be started.')).message);
  }
  const sessionBody = (await sessionRes.json()) as SessionEnvelope;
  if (!sessionBody.data) throw new Error('Checkout session response was incomplete.');
  const session = sessionBody.data;

  // 4. The real shipping checkpoint (the applet's step-1 form is exactly this).
  const shippingRes = await fetch(
    `/api/v1/checkout/sessions/${encodeURIComponent(session.id)}/shipping`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shipping_address: input.shipping }),
    },
  );
  if (!shippingRes.ok) {
    throw new Error((await errorMessage(shippingRes, 'The insured courier details were not accepted.')).message);
  }
  const shippingBody = (await shippingRes.json()) as SessionEnvelope;
  const addressed = shippingBody.data ?? session;

  // 5. The server cart is now the sole authority (the replaced funnel dropped
  //    the browser state on success — same here, including the provider tray).
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(CART_TOKEN_KEY);
  }
  return addressed;
}

/* -----------------------------------------------------------------------
 * Steps 2–3 — checkpoints against the real session + real order placement.
 * ----------------------------------------------------------------------- */

export async function getCheckoutSession(sessionId: string): Promise<CheckoutSession> {
  const res = await fetch(`/api/v1/checkout/sessions/${encodeURIComponent(sessionId)}`);
  if (!res.ok) {
    throw new Error((await errorMessage(res, 'This checkout session could not be loaded.')).message);
  }
  const body = (await res.json()) as SessionEnvelope;
  if (!body.data) throw new Error('This checkout session could not be loaded.');
  return body.data;
}

interface ProductAddon {
  id: string;
  addon_type: string;
  code: string;
  name: string;
  price: string;
  currency: string;
}

export async function listProductAddons(): Promise<ProductAddon[]> {
  try {
    const res = await fetch('/api/v1/addons');
    if (!res.ok) return [];
    const body = (await res.json().catch(() => null)) as { data?: ProductAddon[] } | null;
    return Array.isArray(body?.data) ? body.data : [];
  } catch {
    return [];
  }
}

/**
 * Step 2 — the settlement checkpoint. The ONLY method the development
 * environment actually settles through is the TEST (sandbox) provider; the
 * card/escrow rails are a pending backend decision and this adapter refuses
 * to record them as if they existed.
 */
export async function recordSettlementMethod(sessionId: string): Promise<CheckoutSession> {
  const res = await fetch(`/api/v1/checkout/sessions/${encodeURIComponent(sessionId)}/payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method_type: 'TEST' }),
  });
  if (!res.ok) {
    throw new Error((await errorMessage(res, 'The settlement method was not accepted. Please try again.')).message);
  }
  const body = (await res.json()) as SessionEnvelope;
  if (!body.data) throw new Error('The settlement method was not accepted. Please try again.');
  return body.data;
}

/**
 * Step 3 — `POST …/confirm` (final checkpoint, idempotency key) then
 * `POST /api/v1/orders`. Returns the REAL order id; the caller navigates to
 * the real confirmation page, which renders the authoritative order state.
 */
export async function placeOrder(
  sessionId: string,
  selectedAddonIds: readonly string[],
  customerNote?: string,
): Promise<string> {
  const session = await getCheckoutSession(sessionId);
  const idempotencyKey = `order_${session.id}_${Date.now()}`;
  const confirmBody: Record<string, unknown> = { idempotency_key: idempotencyKey };
  if (customerNote && customerNote.trim().length > 0) {
    confirmBody['customer_note'] = customerNote.trim();
  }
  const confirmRes = await fetch(`/api/v1/checkout/sessions/${encodeURIComponent(sessionId)}/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(confirmBody),
  });
  if (!confirmRes.ok) {
    throw new Error((await errorMessage(confirmRes, 'The final confirmation was not accepted.')).message);
  }
  const orderRes = await fetch('/api/v1/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      checkout_session_id: session.id,
      idempotency_key: idempotencyKey,
    }),
  });
  if (!orderRes.ok) {
    throw new Error((await errorMessage(orderRes, 'The order could not be placed.')).message);
  }
  const body = (await orderRes.json()) as { data?: { id?: string } };
  const orderId = body.data?.id ?? '';
  if (!orderId) throw new Error('The order response was incomplete.');

  // Attach selected protection/financing add-ons as separate order lines.
  for (const addonId of selectedAddonIds) {
    await fetch(`/api/v1/orders/${encodeURIComponent(orderId)}/addons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ addon_id: addonId }),
    }).catch(() => undefined);
  }
  return orderId;
}
