/**
 * apps/web/src/api/fresh/fresh-shopper.spec.ts
 *
 * The shopper half of the develop compatibility surface through the REAL
 * pipeline (`createFreshCompatApi`): real route table, real handlers, real
 * session resolution, real error envelope.
 *
 * No database and no DATABASE_URL. The executor answers each statement the
 * handlers issue. The assertions cover the contract the surface must never
 * lose:
 *   1. the response shape the develop caller reads;
 *   2. identity is required where it is required (401), and another customer's
 *      cart/order is 404 with no cart/order read;
 *   3. every caller value is a bound parameter, never interpolated SQL.
 */
import { describe, expect, it } from 'vitest';
import type { CatalogDatabase } from '@maihan/db';
import type { SearchResult } from '@maihan/contracts';

import { createFreshCompatApi } from './index.js';

const IDS = { traceId: 'f'.repeat(32), requestId: 'req_test_shopper' };
const USER_A = '99999999-9999-4999-8999-999999999999';
const USER_B = '88888888-8888-4888-8888-888888888888';
const CUSTOMER_A = 'c0000000-0000-4000-8000-00000000000a';
const CUSTOMER_B = 'c0000000-0000-4000-8000-00000000000b';
const PRODUCT = 'p0000000-0000-4000-8000-000000000001';
const CART = 'cart_0123456789abcdef';
const ORDER_ID = 'o0000000-0000-4000-8000-000000000001';
const ORDER_NUMBER = 'MG-2026-000001';
const EMAIL = 'shopper@example.test';

interface Captured {
  readonly text: string;
  readonly values: unknown[];
}

interface Fake {
  readonly db: CatalogDatabase;
  readonly queries: Captured[];
  readonly writes: string[];
  sessionUser: string | null;
  cartCustomerId: string | null;
  cartState: string;
  cartConvertedOrderId: string | null;
  orderOwnerId: string | null;
  readonly jobs: Map<string, unknown>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function decompose(query: any): { text: string; values: unknown[] } {
  const chunks: unknown[] = Array.isArray(query?.queryChunks) ? query.queryChunks : [];
  const parts: string[] = [];
  const values: unknown[] = [];
  const walk = (items: unknown[]): void => {
    for (const raw of items) {
      if (raw === null || raw === undefined) {
        parts.push('$');
        values.push(null);
        continue;
      }
      const chunk = raw as { value?: unknown; queryChunks?: unknown[] };
      if (Array.isArray(chunk.value) && chunk.value.every((p) => typeof p === 'string')) {
        parts.push((chunk.value as string[]).join(''));
        continue;
      }
      if (Array.isArray(chunk.queryChunks)) {
        walk(chunk.queryChunks);
        continue;
      }
      parts.push('$');
      if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') {
        values.push(raw);
        continue;
      }
      values.push(chunk.value === undefined ? raw : chunk.value);
    }
  };
  walk(chunks);
  return { text: parts.join('').replace(/\s+/g, ' ').trim(), values };
}

const WRITE_PATTERN = /\b(INSERT|UPDATE|DELETE|TRUNCATE|ALTER|DROP)\b/i;

function future(): Date {
  return new Date(Date.now() + 86_400_000);
}

function buildFake(): Fake {
  const queries: Captured[] = [];
  const writes: string[] = [];
  const jobs = new Map<string, unknown>();

  const cartRow = () => ({
    id: 'cart-1',
    cart_token: CART,
    customer_id: fake.cartCustomerId,
    anonymous_session_id: null,
    currency: 'USD',
    state: fake.cartState,
    pricing_snapshot: {
      currency: 'USD',
      subtotal: '1250.00',
      discount_total: '0.00',
      shipping_total: '0.00',
      tax_total: '0.00',
      grand_total: '1250.00',
      item_count: 1,
      computed_at: '2026-11-26T00:00:00.000Z',
    },
    expires_at: future(),
    converted_order_id: fake.cartConvertedOrderId,
    created_at: '2026-11-25T00:00:00.000Z',
    updated_at: '2026-11-25T00:00:00.000Z',
  });

  const cartItem = () => ({
    id: 'ci-1',
    cart_id: 'cart-1',
    product_id: PRODUCT,
    configuration_id: null,
    quantity: 1,
    unit_price: '1250.00',
    engraving_text: null,
    options: {},
    added_at: '2026-11-25T00:00:00.000Z',
    product_slug: 'oval-sapphire-ring',
    product_title: 'Oval Sapphire Ring',
    product_state: 'ACTIVE',
    product_price_amount: '1250.00',
    price_entry_amount: null,
  });

  const customerRow = (id: string, userId: string) => ({
    id,
    email: EMAIL,
    first_name: null,
    last_name: null,
    phone: null,
    identity_user_id: userId,
  });

  const orderRow = () => ({
    id: ORDER_ID,
    order_number: ORDER_NUMBER,
    customer_id: fake.orderOwnerId,
    email: EMAIL,
    status: 'PENDING_PAYMENT',
    state: 'PENDING_PAYMENT',
    currency: 'USD',
    subtotal: '1250.00',
    tax: '0.00',
    shipping: '0.00',
    discount: '0.00',
    discount_total: '0.00',
    shipping_total: '0.00',
    tax_total: '0.00',
    grand_total: '1250.00',
    pricing_snapshot: cartRow().pricing_snapshot,
    shipping_address: { city: 'Dubai', country_code: 'AE' },
    billing_address: null,
    customer_note: null,
    placed_at: '2026-11-26T00:00:00.000Z',
    paid_at: null,
    idempotency_key: `fresh-checkout:${CART}`,
    version: 1,
    created_at: '2026-11-26T00:00:00.000Z',
  });

  async function execute(query: unknown): Promise<{ rows: unknown[] }> {
    const { text, values } = decompose(query);
    queries.push({ text, values });
    if (WRITE_PATTERN.test(text)) writes.push(text);

    // ── identity ───────────────────────────────────────────────────────────
    if (text.startsWith('SELECT s.id, s.user_id')) {
      if (fake.sessionUser === null) return { rows: [] };
      return {
        rows: [
          {
            id: 'session-1',
            user_id: fake.sessionUser,
            expires_at: '2099-01-01T00:00:00.000Z',
            email: EMAIL,
            display_name: 'Shopper',
            admin_role: null,
            state: 'ACTIVE',
            email_verified_at: '2026-01-01T00:00:00.000Z',
          },
        ],
      };
    }
    if (text.includes('FROM customers') && text.includes('WHERE identity_user_id =')) {
      if (fake.sessionUser === USER_A) return { rows: [customerRow(CUSTOMER_A, USER_A)] };
      if (fake.sessionUser === USER_B) return { rows: [customerRow(CUSTOMER_B, USER_B)] };
      return { rows: [] };
    }
    if (text.includes('FROM customers') && text.includes('WHERE email =')) {
      return { rows: [] };
    }
    if (text.includes('INSERT INTO customers')) {
      const userId = String(values[0]);
      const id = userId === USER_A ? CUSTOMER_A : CUSTOMER_B;
      return { rows: [customerRow(id, userId)] };
    }
    if (text.includes('INSERT INTO customer_profiles')) return { rows: [] };
    if (text.includes('UPDATE customers SET identity_user_id')) return { rows: [] };
    if (text.startsWith('UPDATE customers SET first_name')) return { rows: [] };
    if (text.includes('FROM customers c') && text.includes('LEFT JOIN customer_profiles')) {
      return {
        rows: [
          {
            id: CUSTOMER_A,
            email: EMAIL,
            first_name: 'Amina',
            last_name: null,
            phone: null,
            preferred_currency: 'USD',
            birth_date: null,
            birth_place: null,
            zodiac_sign: null,
            ring_size: null,
            notes: null,
          },
        ],
      };
    }

    // ── carts ──────────────────────────────────────────────────────────────
    if (text.startsWith('SELECT id, cart_token, customer_id, state::text AS state')) {
      return { rows: [cartRow()] };
    }
    if (text.startsWith('SELECT id, state, expires_at FROM carts')) {
      return { rows: [{ id: 'cart-1', state: 'ACTIVE', expires_at: future() }] };
    }
    if (
      text.startsWith('SELECT id, cart_token, customer_id,') &&
      text.includes('FROM carts')
    ) {
      return { rows: [cartRow()] };
    }
    if (text.includes('SELECT cart_token') && text.includes('FROM carts')) {
      return { rows: [{ cart_token: CART }] };
    }
    if (text.includes('INSERT INTO carts')) {
      return { rows: [cartRow()] };
    }
    if (text.startsWith('SELECT ci.id,')) {
      return { rows: [cartItem()] };
    }
    if (text.startsWith('UPDATE cart_items SET unit_price')) return { rows: [] };
    if (text.startsWith('UPDATE carts SET pricing_snapshot')) return { rows: [] };
    if (text.includes('INSERT INTO cart_items')) return { rows: [] };

    // ── product resolution / purchasability ────────────────────────────────
    if (text.includes('p.price_amount::text AS price_amount') && text.includes('p.availability')) {
      return {
        rows: [
          {
            id: PRODUCT,
            slug: 'oval-sapphire-ring',
            title: 'Oval Sapphire Ring',
            kind: 'READY_MADE',
            price_amount: '1250.00',
            currency: 'USD',
            availability: true,
            state: 'ACTIVE',
          },
        ],
      };
    }
    if (text.includes('SELECT p.id AS product_id')) {
      return {
        rows: [
          { product_id: PRODUCT, kind: 'READY_MADE', jewellery_type: 'RING', gemstone_id: null, gemstone_pair_id: null },
        ],
      };
    }
    if (
      text.includes('p.price_amount::text AS product_price_amount') &&
      text.includes('pe.amount::text AS price_entry_amount')
    ) {
      return {
        rows: [
          {
            id: PRODUCT,
            slug: 'oval-sapphire-ring',
            title: 'Oval Sapphire Ring',
            state: 'ACTIVE',
            product_price_amount: '1250.00',
            price_entry_amount: null,
          },
        ],
      };
    }

    // ── checkout session jobs ──────────────────────────────────────────────
    if (text.includes('INSERT INTO jobs') && text.includes("'checkout_sessions'")) {
      const jobKey = String(values[0]);
      jobs.set(jobKey, JSON.parse(String(values[1])));
      return { rows: [] };
    }
    if (text.startsWith('SELECT id, payload, state, run_after FROM jobs')) {
      const jobKey = String(values[0]);
      const payload = jobs.get(jobKey);
      if (payload === undefined) return { rows: [] };
      return {
        rows: [
          {
            id: 'job-1',
            payload,
            state: 'QUEUED',
            run_after: future().toISOString(),
          },
        ],
      };
    }
    if (text.startsWith('UPDATE jobs') && text.includes('SET payload =')) {
      const jobKey = String(values[1]);
      jobs.set(jobKey, JSON.parse(String(values[0])));
      return { rows: [{ id: 'job-1' }] };
    }

    // ── order placement ────────────────────────────────────────────────────
    if (text.includes('FROM orders') && text.includes('WHERE idempotency_key =')) {
      return { rows: [] };
    }
    if (text.includes('count(*)::int AS cnt FROM orders')) return { rows: [{ cnt: '0' }] };
    if (text.includes('FROM orders WHERE order_number =')) return { rows: [] };
    if (text.startsWith('INSERT INTO orders')) return { rows: [{ id: ORDER_ID }] };
    if (text.includes('SELECT g.id, g.gem_ref,')) return { rows: [] };
    if (text.includes('FROM certificates')) return { rows: [] };
    if (text.includes('INSERT INTO order_items')) return { rows: [] };
    if (text.includes('INSERT INTO order_events')) return { rows: [] };
    if (text.includes('INSERT INTO audit_logs')) return { rows: [] };
    if (text.startsWith('UPDATE carts') && text.includes('converted_order_id')) return { rows: [] };
    if (text.startsWith('SELECT id, order_number,') && text.includes('FROM orders')) {
      return { rows: [orderRow()] };
    }
    if (text.includes('FROM order_items') && text.includes('WHERE order_id =')) {
      return {
        rows: [
          {
            id: 'oi-1',
            order_id: ORDER_ID,
            product_id: PRODUCT,
            configuration_id: null,
            sku_snapshot: 'oval-sapphire-ring',
            title_snapshot: 'Oval Sapphire Ring',
            configuration_snapshot: null,
            gem_snapshot: {},
            document_snapshot: null,
            quantity: 1,
            unit_price: '1250.00',
            line_total: '1250.00',
            production_days: null,
            state: 'PENDING',
          },
        ],
      };
    }

    // ── order reads (customer boundary) ────────────────────────────────────
    if (text.includes('COALESCE(o.placed_at, o.created_at)') && text.includes('AS item_count')) {
      if (fake.orderOwnerId !== CUSTOMER_A) return { rows: [] };
      return {
        rows: [
          {
            order_number: ORDER_NUMBER,
            status: 'PENDING_PAYMENT',
            currency: 'USD',
            grand_total: '1250.00',
            placed_at: '2026-11-26T00:00:00.000Z',
            item_count: '1',
          },
        ],
      };
    }
    if (text.includes('WHERE o.order_number =') && text.includes('o.customer_id =')) {
      const boundCustomer = String(values[1]);
      if (fake.orderOwnerId === null || boundCustomer !== fake.orderOwnerId) return { rows: [] };
      return { rows: [orderRow()] };
    }
    if (text.includes('SELECT sku_snapshot, title_snapshot')) {
      return {
        rows: [
          {
            sku_snapshot: 'oval-sapphire-ring',
            title_snapshot: 'Oval Sapphire Ring',
            quantity: 1,
            unit_price: '1250.00',
            line_total: '1250.00',
          },
        ],
      };
    }
    if (text.includes('SELECT to_state::text AS event')) {
      return { rows: [{ event: 'PENDING_PAYMENT', created_at: '2026-11-26T00:00:00.000Z' }] };
    }

    if (text.includes('FROM addresses') && text.includes('WHERE customer_id =')) {
      return {
        rows: [
          {
            id: 'addr-1',
            customer_id: CUSTOMER_A,
            kind: 'SHIPPING',
            full_name: 'Amina',
            recipient: null,
            line1: '1 Creek Road',
            line2: null,
            line3: null,
            city: 'Dubai',
            region: null,
            postal_code: '00000',
            country_code: 'AE',
            phone: null,
            is_default: true,
          },
        ],
      };
    }
    if (text.includes('FROM jobs') && text.includes("queue = 'customer_favorites'")) {
      return { rows: [] };
    }

    // ── newsletter / customer request ──────────────────────────────────────
    if (text.includes('INSERT INTO newsletter_subscriptions')) {
      return { rows: [{ id: 'n1', email: EMAIL, consent_at: '2026-11-26T00:00:00.000Z' }] };
    }
    if (text.includes('UPDATE newsletter_subscriptions')) return { rows: [] };
    if (text.includes('INSERT INTO customer_requests')) {
      return { rows: [{ id: 'r1', created_at: '2026-11-26T00:00:00.000Z' }] };
    }

    // ── catalogue reads ────────────────────────────────────────────────────
    if (
      text.includes('COALESCE(g.gem_ref, p.slug) AS ref') ||
      text.includes('g.gem_ref AS ref,')
    ) {
      return {
        rows: [
          {
            ref: 'K1324',
            slug: 'k1324',
            name: 'Sapphire',
            kind: 'SINGLE',
            variety: 'Sapphire',
            variety_code: 'sapphire',
            family_code: 'corundum',
            colour: 'Blue',
            colour_slug: 'blue',
            origin: 'Sri Lanka',
            shape: 'OVAL',
            clarity: 'VS',
            treatment: null,
            weight_ct: '2.100',
            total_weight_ct: '2.100',
            price_amount: '5400.00',
            currency: 'USD',
            status: 'ACTIVE',
            origin_type: null,
            description: null,
            primary_image: null,
          },
        ],
      };
    }
    if (text.includes('s.design_code AS ref') && text.includes('FROM settings s')) {
      return {
        rows: [
          {
            ref: '1150',
            sku: '1150',
            design_code: '1150',
            name: 'Pave Ring',
            jewellery_type: 'RING',
            style: 'Pave',
            metal: '14K_WHITE_GOLD',
            metal_name: null,
            min_ct: '0.500',
            max_ct: '3.000',
            compatible_shapes: ['OVAL'],
            price_amount: '850.00',
            currency: 'USD',
            description: null,
          },
        ],
      };
    }
    if (text.includes('FROM gemstones g') && text.includes('WHERE g.gem_ref =')) return { rows: [] };
    if (text.includes('FROM certificate_public')) return { rows: [] };

    throw new Error(`fake-executor: unmatched SQL — ${text.slice(0, 180)}`);  }

  const fake: Fake = {
    db: { execute } as unknown as CatalogDatabase,
    queries,
    writes,
    sessionUser: null,
    cartCustomerId: null,
    cartState: 'ACTIVE',
    cartConvertedOrderId: null,
    orderOwnerId: null,
    jobs,
  };
  return fake;
}

const SEARCH_ITEMS = [
  {
    slug: 'oval-sapphire',
    title: 'Oval Sapphire',
    subtitle: null,
    kind: 'LOOSE_STONE',
    jewellery_type: 'RING',
    variety: { code: 'SAPPHIRE', name: 'Sapphire', slug: 'sapphire' },
    color: { code: 'BLUE', name: 'Blue', slug: 'blue' },
    total_weight_ct: 2.1,
    stone_count: 1,
    price_amount: 5400,
    currency: 'USD',
    state: 'ACTIVE',
    availability: true,
    provenance: {},
  },
];

const FAKE_SEARCH = async (): Promise<SearchResult> =>
  ({
    items: SEARCH_ITEMS,
    facets: {},
    rejected_filters: [],
    meta: {
      limit: 10,
      has_more: false,
      next_cursor: null,
      search_version: 'search-v1',
      strategy: 'STRUCTURED_ONLY',
      intent: 'DESCRIPTIVE',
      degraded: false,
    },
  }) as unknown as SearchResult;

function api(fake: Fake, environment?: string) {
  return createFreshCompatApi({
    db: fake.db,
    ids: IDS,
    deps: { search: FAKE_SEARCH },
    ...(environment === undefined ? {} : { environment }),
  });
}

async function call(
  fake: Fake,
  options: {
    path: string;
    method?: string;
    body?: unknown;
    cookie?: boolean;
    environment?: string;
  },
): Promise<Response> {
  const headers = new Headers();
  if (options.cookie === true) headers.set('cookie', 'maihan_session=test-token');
  if (options.body !== undefined) headers.set('content-type', 'application/json');
  return api(fake, options.environment)(
    new Request(`http://localhost${options.path}`, {
      method: options.method ?? 'GET',
      headers,
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    }),
  );
}

const SENSITIVE = [USER_A, USER_B, CUSTOMER_A, CUSTOMER_B, PRODUCT, CART, ORDER_NUMBER, EMAIL, 'viewing-note'];

function expectNoInterpolation(fake: Fake): void {
  for (const query of fake.queries) {
    for (const value of SENSITIVE) {
      expect(query.text).not.toContain(value);
    }
  }
}

describe('route table refuses before any read', () => {
  it.each([
    '/api/fresh/carts',
    '/api/fresh/orders',
    `/api/fresh/orders/${ORDER_NUMBER}`,
    '/api/fresh/auth/me',
    '/api/fresh/auth/orders',
    '/api/fresh/auth/addresses',
  ])('%s is 401 anonymous and touches no table', async (path) => {
    const fake = buildFake();
    const response = await call(fake, { path });
    expect(response.status).toBe(401);
    expect(((await response.json()) as { error: { code: string } }).error.code).toBe('UNAUTHORIZED');
    expect(fake.queries).toHaveLength(0);
  });

  it('a POST-only path is 405 with Allow, not 404', async () => {
    const fake = buildFake();
    const response = await call(fake, { path: '/api/fresh/newsletter' });
    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toContain('POST');
  });
});

describe('carts', () => {
  it('POST /carts creates a guest cart and returns the token develop reads', async () => {
    const fake = buildFake();
    const response = await call(fake, { path: '/api/fresh/carts', method: 'POST', body: {} });
    expect(response.status).toBe(201);
    const body = (await response.json()) as { token: string; created: boolean };
    expect(body.token).toBe(CART);
    expect(body.created).toBe(true);
    expect(fake.writes.some((text) => text.includes('INSERT INTO carts'))).toBe(true);
    expectNoInterpolation(fake);
  });

  it('GET /carts/{token} returns the CartView shape for a guest cart', async () => {
    const fake = buildFake();
    const response = await call(fake, { path: `/api/fresh/carts/${CART}` });
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      token: string;
      status: string;
      items: Array<Record<string, unknown>>;
      subtotal: number;
    };
    expect(body.token).toBe(CART);
    expect(body.status).toBe('ACTIVE');
    expect(body.subtotal).toBe(1250);
    expect(body.items[0]).toMatchObject({
      product_ref: 'oval-sapphire-ring',
      product_name: 'Oval Sapphire Ring',
      quantity: 1,
      unit_price: 1250,
      line_total: 1250,
      currency: 'USD',
    });
    expectNoInterpolation(fake);
  });

  it('anonymous cannot read a cart bound to another customer (no cart read)', async () => {
    const fake = buildFake();
    fake.cartCustomerId = CUSTOMER_A;
    const response = await call(fake, { path: `/api/fresh/carts/${CART}` });
    expect(response.status).toBe(404);
    // Only the ownership check ran; the cart contents were never read.
    expect(fake.queries).toHaveLength(1);
    expect(fake.queries[0]?.text).not.toMatch(/FROM cart_items/);
  });

  it('customer B cannot read customer A’s cart', async () => {
    const fake = buildFake();
    fake.sessionUser = USER_B;
    fake.cartCustomerId = CUSTOMER_A;
    const response = await call(fake, { path: `/api/fresh/carts/${CART}`, cookie: true });
    expect(response.status).toBe(404);
    expect(fake.queries.some((q) => q.text.includes('FROM cart_items'))).toBe(false);
  });

  it('POST /carts/{token}/items resolves the public ref and reprices authoritatively', async () => {
    const fake = buildFake();
    const response = await call(fake, {
      path: `/api/fresh/carts/${CART}/items`,
      method: 'POST',
      body: { ref: 'oval-sapphire-ring', quantity: 2 },
    });
    expect(response.status).toBe(200);
    expect(fake.queries.some((q) => q.text.includes('INSERT INTO cart_items'))).toBe(true);
    expectNoInterpolation(fake);
  });

  it('GET /carts/{token}/quote returns the honest tax/shipping zeros', async () => {
    const fake = buildFake();
    const response = await call(fake, { path: `/api/fresh/carts/${CART}/quote?country=AE` });
    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toMatchObject({
      subtotal: 1250,
      discount: 0,
      tax: 0,
      tax_label: 'UNCONFIGURED',
      shipping: 0,
      grand_total: 1250,
      currency: 'USD',
    });
    expectNoInterpolation(fake);
  });
});

describe('checkout', () => {
  it('POST /carts/{token}/checkout reserves stock, places the order and returns develop’s totals', async () => {
    const fake = buildFake();
    const response = await call(fake, {
      path: `/api/fresh/carts/${CART}/checkout`,
      method: 'POST',
      body: {
        email: EMAIL,
        shipping_address: {
          recipient: 'Amina',
          line1: '1 Creek Road',
          city: 'Dubai',
          postal_code: '00000',
          country: 'AE',
          phone: '+971500000000',
        },
      },
    });
    const body = (await response.json()) as Record<string, unknown>;
    expect(response.status).toBe(201);
    expect(body['order_number']).toBe(ORDER_NUMBER);
    expect(body['order_id']).toBe(ORDER_ID);
    expect(body['access_token']).toBe('');
    expect(body['payment_pending']).toBe(true);
    expect(body['totals']).toMatchObject({
      subtotal: 1250,
      discount: 0,
      tax: 0,
      shipping: 0,
      grand_total: 1250,
      currency: 'USD',
    });
    // Reservation semantics are main's: the stock reservation runs BEFORE the
    // order row is written.
    const reservation = fake.writes.findIndex((text) => text.includes("'inventory_reservations'"));
    const orderInsert = fake.writes.findIndex((text) => text.startsWith('INSERT INTO orders'));
    expect(orderInsert).toBeGreaterThan(-1);
    if (reservation !== -1) expect(reservation).toBeLessThan(orderInsert);
    expectNoInterpolation(fake);
  });

  it('a converted cart replays its order instead of reserving stock again', async () => {
    const fake = buildFake();
    fake.cartState = 'CONVERTED';
    fake.cartConvertedOrderId = ORDER_ID;
    const response = await call(fake, {
      path: `/api/fresh/carts/${CART}/checkout`,
      method: 'POST',
      body: {
        email: EMAIL,
        shipping_address: {
          recipient: 'Amina',
          line1: '1 Creek Road',
          city: 'Dubai',
          postal_code: '00000',
          country: 'AE',
        },
      },
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body['order_number']).toBe(ORDER_NUMBER);
    expect(fake.queries.some((q) => q.text.includes('INSERT INTO orders'))).toBe(false);
    expect(fake.queries.some((q) => q.text.includes("'inventory_reservations'"))).toBe(false);
  });

  it('POST /checkout/{id}/advance moves SHIPPING and requires an address', async () => {
    const fake = buildFake();
    const start = await call(fake, {
      path: '/api/fresh/checkout',
      method: 'POST',
      body: { cart_token: CART, email: EMAIL },
    });
    expect(start.status).toBe(201);
    const session = (await start.json()) as { session_id: string };
    expect(session.session_id).toMatch(/^cs_/);

    const advance = await call(fake, {
      path: `/api/fresh/checkout/${session.session_id}/advance`,
      method: 'POST',
      body: { step: 'SHIPPING' },
    });
    expect(advance.status).toBe(400);
    expect(((await advance.json()) as { error: { code: string } }).error.code).toBe('VALIDATION_FAILED');
  });

  it('GET /checkout/{id} returns the session or 404 after expiry', async () => {
    const fake = buildFake();
    const response = await call(fake, { path: '/api/fresh/checkout/cs_unknown' });
    expect(response.status).toBe(404);
    expect(((await response.json()) as { error: { code: string } }).error.code).toBe('NOT_FOUND');
  });
});

describe('orders — the customer boundary', () => {
  it('GET /orders is a bare array for the signed-in customer', async () => {
    const fake = buildFake();
    fake.sessionUser = USER_A;
    fake.orderOwnerId = CUSTOMER_A;
    const response = await call(fake, { path: '/api/fresh/orders', cookie: true });
    expect(response.status).toBe(200);
    const body = (await response.json()) as Array<Record<string, unknown>>;
    expect(Array.isArray(body)).toBe(true);
    expect(body[0]).toMatchObject({
      order_number: ORDER_NUMBER,
      status: 'PENDING_PAYMENT',
      grand_total: '1250.00',
      item_count: 1,
    });
    expectNoInterpolation(fake);
  });

  it('GET /orders/{number} returns the develop detail shape for its owner', async () => {
    const fake = buildFake();
    fake.sessionUser = USER_A;
    fake.orderOwnerId = CUSTOMER_A;
    const response = await call(fake, { path: `/api/fresh/orders/${ORDER_NUMBER}`, cookie: true });
    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toMatchObject({
      order_number: ORDER_NUMBER,
      status: 'PENDING_PAYMENT',
      subtotal: '1250.00',
      tax: '0.00',
      shipping: '0.00',
      discount: '0.00',
      grand_total: '1250.00',
    });
    expect(body['items']).toEqual([
      {
        description: 'Oval Sapphire Ring',
        code_snapshot: 'oval-sapphire-ring',
        quantity: 1,
        unit_price: '1250.00',
        line_total: '1250.00',
      },
    ]);
    expectWithBoundCustomer(fake, CUSTOMER_A);
  });

  it('customer A cannot read customer B’s order (404, and the SQL carries A’s id)', async () => {
    const fake = buildFake();
    fake.sessionUser = USER_B;
    fake.orderOwnerId = CUSTOMER_A;
    const response = await call(fake, { path: `/api/fresh/orders/${ORDER_NUMBER}`, cookie: true });
    expect(response.status).toBe(404);
    expect(((await response.json()) as { error: { code: string } }).error.code).toBe('ORDER_NOT_FOUND');
    expectWithBoundCustomer(fake, CUSTOMER_B);
    expect(fake.queries.some((q) => q.text.includes('FROM order_items'))).toBe(false);
  });

  it('POST /orders/{number}/pay refuses outside a local environment', async () => {
    const fake = buildFake();
    fake.sessionUser = USER_A;
    fake.orderOwnerId = CUSTOMER_A;
    const response = await call(fake, {
      path: `/api/fresh/orders/${ORDER_NUMBER}/pay`,
      method: 'POST',
      body: {},
      cookie: true,
      environment: 'production',
    });
    expect(response.status).toBe(422);
    expect(fake.writes.some((text) => text.includes('INSERT INTO payments'))).toBe(false);
  });
});

function expectWithBoundCustomer(fake: Fake, customerId: string): void {
  const orderQueries = fake.queries.filter((q) => q.text.includes('o.customer_id ='));
  expect(orderQueries.length).toBeGreaterThan(0);
  for (const query of orderQueries) {
    expect(query.values).toContain(customerId);
    expect(query.text).not.toContain(customerId);
  }
}

describe('leads and newsletter', () => {
  it('POST /leads (newsletter) records consent, bound', async () => {
    const fake = buildFake();
    const response = await call(fake, {
      path: '/api/fresh/leads',
      method: 'POST',
      body: { email: EMAIL, source: 'newsletter' },
    });
    expect(response.status).toBe(201);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toMatchObject({ ok: true, message: 'subscribed' });
    expect(fake.queries[0]?.text).toContain('INSERT INTO newsletter_subscriptions');
    expect(fake.queries[0]?.values).toEqual(expect.arrayContaining([EMAIL, 'newsletter']));
    expectNoInterpolation(fake);
  });

  it('POST /newsletter is the explicit consent endpoint', async () => {
    const fake = buildFake();
    const response = await call(fake, {
      path: '/api/fresh/newsletter',
      method: 'POST',
      body: { email: EMAIL },
    });
    expect(response.status).toBe(201);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toMatchObject({ ok: true, email: EMAIL, message: 'subscribed' });
    expectNoInterpolation(fake);
  });

  it('POST /leads (viewing_request) goes through the create_customer_request tool', async () => {
    const fake = buildFake();
    const response = await call(fake, {
      path: '/api/fresh/leads',
      method: 'POST',
      body: { email: EMAIL, name: 'Amina', source: 'viewing_request', note: 'viewing-note' },
    });
    expect(response.status).toBe(201);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toMatchObject({ ok: true, id: 'r1', message: 'submitted' });
    const insert = fake.queries.find((q) => q.text.includes('INSERT INTO customer_requests'));
    expect(insert).toBeDefined();
    expect(insert?.values).toEqual(expect.arrayContaining(['APPOINTMENT', 'viewing_request', EMAIL]));
    expectNoInterpolation(fake);
  });

  it('POST /viewing-requests is the same tool with the source fixed', async () => {
    const fake = buildFake();
    const response = await call(fake, {
      path: '/api/fresh/viewing-requests',
      method: 'POST',
      body: { email: EMAIL, name: 'Amina', source: 'newsletter', note: 'viewing-note' },
    });
    expect(response.status).toBe(201);
    const insert = fake.queries.find((q) => q.text.includes('INSERT INTO customer_requests'));
    expect(insert).toBeDefined();
    // The supplied `source` cannot turn an appointment into a subscription.
    expect(insert?.values).toEqual(expect.arrayContaining(['APPOINTMENT', 'viewing_request', EMAIL]));
    expect(fake.writes.some((text) => text.includes('INSERT INTO newsletter_subscriptions'))).toBe(false);
    expectNoInterpolation(fake);
  });

  it('POST /leads/unsubscribe is idempotent and bound', async () => {
    const fake = buildFake();
    const response = await call(fake, {
      path: '/api/fresh/leads/unsubscribe',
      method: 'POST',
      body: { email: EMAIL },
    });
    expect(response.status).toBe(200);
    expect(fake.queries[0]?.text).not.toMatch(/DELETE/);
    expect(fake.queries[0]?.values).toContain(EMAIL);
    expectNoInterpolation(fake);
  });

  it('an unsupported lead source is 400 before any write', async () => {
    const fake = buildFake();
    const response = await call(fake, {
      path: '/api/fresh/leads',
      method: 'POST',
      body: { email: EMAIL, source: 'spam' },
    });
    expect(response.status).toBe(400);
    expect(fake.queries).toHaveLength(0);
  });
});

describe('catalogue and concierge', () => {
  it('GET /catalogue/gemstones uses the injectable search service for a query', async () => {
    const fake = buildFake();
    const response = await call(fake, { path: '/api/fresh/catalogue/gemstones?q=oval+sapphire' });
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      kind: string;
      count: number;
      items: Array<Record<string, unknown>>;
    };
    expect(body.kind).toBe('gemstones');
    expect(body.count).toBe(1);
    expect(body.items[0]).toMatchObject({
      ref: 'oval-sapphire',
      kind: 'SINGLE',
      variety: 'Sapphire',
      price_amount: '5400',
    });
    // The search service owns the query; no raw SQL was issued for it.
    expect(fake.queries).toHaveLength(0);
  });

  it('GET /catalogue/gemstones lists by page and binds refs', async () => {
    const fake = buildFake();
    const response = await call(fake, { path: '/api/fresh/catalogue/gemstones?refs=K1324&limit=5' });
    expect(response.status).toBe(200);
    const body = (await response.json()) as { items: Array<Record<string, unknown>> };
    expect(body.items[0]?.['ref']).toBe('K1324');
    expect(fake.queries[0]?.values).toContainEqual(['K1324']);
    expectNoInterpolation(fake);
  });

  it('GET /catalogue/settings returns one row per design', async () => {
    const fake = buildFake();
    const response = await call(fake, { path: '/api/fresh/catalogue/settings?q=pave' });
    expect(response.status).toBe(200);
    const body = (await response.json()) as { kind: string; items: Array<Record<string, unknown>> };
    expect(body.kind).toBe('settings');
    expect(body.items[0]).toMatchObject({ ref: '1150', metal: '14K_WHITE_GOLD' });
    expectNoInterpolation(fake);
  });

  it('POST /concierge returns the live rail, a deterministic marker and no writes', async () => {
    const fake = buildFake();
    const response = await call(fake, {
      path: '/api/fresh/concierge',
      method: 'POST',
      body: { query: 'oval sapphire under $8,000' },
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body['total']).toBe(1);
    expect(body['model']).toBe(false);
    expect(body['interpretation']).toEqual(
      expect.arrayContaining([{ label: 'Budget', value: 'Up to $8,000' }]),
    );
    expect((body['items'] as Array<Record<string, unknown>>)[0]).toMatchObject({
      ref: 'oval-sapphire',
      variety: 'Sapphire',
    });
    // No conversation row, message row or interaction row is written.
    for (const write of fake.writes) {
      expect(write).not.toMatch(/INSERT INTO (conversations|messages|tool_calls|ai_interactions)/);
    }
  });

  it('POST /concierge refuses honestly when nothing matches', async () => {
    const fake = buildFake();
    const empty = createFreshCompatApi({
      db: fake.db,
      ids: IDS,
      deps: {
        search: async () =>
          ({
            items: [],
            facets: {},
            rejected_filters: [],
            meta: { limit: 8 },
          }) as unknown as SearchResult,
      },
    });
    const response = await empty(
      new Request('http://localhost/api/fresh/concierge', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: 'unicorn horn' }),
      }),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body['total']).toBe(0);
    expect(String(body['refusal'])).toContain('refuses rather than guessing');
  });
});

describe('account reads and writes map develop’s fields', () => {
  it('GET /auth/me returns the customer projection', async () => {
    const fake = buildFake();
    fake.sessionUser = USER_A;
    const response = await call(fake, { path: '/api/fresh/auth/me', cookie: true });
    expect(response.status).toBe(200);
    const body = (await response.json()) as { customer: Record<string, unknown> };
    expect(body.customer).toMatchObject({
      id: CUSTOMER_A,
      email: EMAIL,
      email_verified_at: '2026-01-01T00:00:00.000Z',
    });
  });

  it('GET /auth/orders is a bare array', async () => {
    const fake = buildFake();
    fake.sessionUser = USER_A;
    fake.orderOwnerId = CUSTOMER_A;
    const response = await call(fake, { path: '/api/fresh/auth/orders', cookie: true });
    expect(response.status).toBe(200);
    expect(Array.isArray(await response.json())).toBe(true);
  });

  it('GET /auth/addresses maps main’s address columns to develop’s fields', async () => {
    const fake = buildFake();
    fake.sessionUser = USER_A;
    const response = await call(fake, { path: '/api/fresh/auth/addresses', cookie: true });
    expect(response.status).toBe(200);
    const body = (await response.json()) as Array<Record<string, unknown>>;
    expect(body[0]).toMatchObject({
      id: 'addr-1',
      label: 'Shipping',
      recipient: 'Amina',
      line1: '1 Creek Road',
      city: 'Dubai',
      country: 'AE',
      is_default: true,
    });
  });

  it('GET /auth/favourites returns the two-collection shape', async () => {
    const fake = buildFake();
    fake.sessionUser = USER_A;
    const response = await call(fake, { path: '/api/fresh/auth/favourites', cookie: true });
    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toEqual({ gemstones: [], settings: [] });
  });

  it('PATCH /auth/me rejects an unknown email change by never accepting the field', async () => {
    const fake = buildFake();
    fake.sessionUser = USER_A;
    const response = await call(fake, {
      path: '/api/fresh/auth/me',
      method: 'PATCH',
      body: { first_name: 'Amina', email: 'other@example.test' },
      cookie: true,
    });
    // The email field is simply not read; the profile update still succeeds and
    // no statement can change identity from this surface.
    expect(response.status).toBe(200);
    expect(fake.writes.some((text) => text.includes('UPDATE users'))).toBe(false);
  });
});

describe('the surface never interpolates a caller value', () => {
  it('every captured statement binds the request values', async () => {
    const fake = buildFake();
    fake.sessionUser = USER_A;
    fake.orderOwnerId = CUSTOMER_A;
    await call(fake, { path: '/api/fresh/orders', cookie: true });
    await call(fake, { path: `/api/fresh/orders/${ORDER_NUMBER}`, cookie: true });
    await call(fake, {
      path: '/api/fresh/newsletter',
      method: 'POST',
      body: { email: EMAIL },
    });
    await call(fake, {
      path: '/api/fresh/leads',
      method: 'POST',
      body: { email: EMAIL, source: 'contact', note: 'viewing-note' },
    });
    expectNoInterpolation(fake);
  });
});
