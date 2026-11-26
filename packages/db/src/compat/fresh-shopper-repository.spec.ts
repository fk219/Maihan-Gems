/**
 * packages/db/src/compat/fresh-shopper-repository.spec.ts
 *
 * No database. The suite pins the shopper compatibility data layer:
 *   - every caller value is BOUND, never interpolated;
 *   - the customer boundary is a parameter (`customer_id = $n`), so an order or
 *     an address list cannot be read without it;
 *   - a record that does not exist is null, never a plausible row;
 *   - the only writes are the two new records from migration 0023 plus the
 *     identity link and profile provisioning; nothing touches price, stock,
 *     order, payment, certificate or permission state.
 */

import { describe, expect, it } from 'vitest';

import { createScriptedExecutor } from '../test/sql-capture.js';
import type { CatalogDatabase } from '../catalog/executor.js';
import {
  createCustomerRequestRecord,
  ensureCustomerForIdentity,
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
} from './fresh-shopper-repository.js';

const USER = '99999999-9999-4999-8999-999999999999';
const OTHER_USER = '88888888-8888-4888-8888-888888888888';
const CUSTOMER = 'c0000000-0000-4000-8000-000000000001';
const OTHER_CUSTOMER = 'c0000000-0000-4000-8000-000000000002';
const PRODUCT = 'p0000000-0000-4000-8000-000000000001';
const CONFIGURATION = 'd0000000-0000-4000-8000-000000000001';
const ORDER = 'o0000000-0000-4000-8000-000000000001';
const EMAIL = 'shopper@example.test';
const TOKEN = 'cart_abc123';

function dbWith(results: ReadonlyArray<ReadonlyArray<Record<string, unknown>>>): {
  db: CatalogDatabase;
  queries: Array<{ text: string; values: unknown[] }>;
} {
  const scripted = createScriptedExecutor(results);
  return {
    db: scripted as unknown as CatalogDatabase,
    queries: scripted.queries as Array<{ text: string; values: unknown[] }>,
  };
}

/** No captured statement may contain the caller's value as literal text. */
function expectNeverInterpolated(
  queries: ReadonlyArray<{ text: string; values: unknown[] }>,
  values: readonly string[],
): void {
  for (const query of queries) {
    for (const value of values) {
      expect(query.text).not.toContain(value);
    }
    expect(query.values.length).toBeGreaterThan(0);
  }
}

const SENSITIVE = [USER, OTHER_USER, CUSTOMER, OTHER_CUSTOMER, PRODUCT, ORDER, EMAIL, TOKEN];

describe('ensureCustomerForIdentity', () => {
  it('finds a linked customer, provisions the profile and binds the identity', async () => {
    const { db, queries } = dbWith([
      [
        {
          id: CUSTOMER,
          email: EMAIL,
          first_name: 'Amina',
          last_name: null,
          phone: null,
        },
      ],
      [],
    ]);

    const customer = await ensureCustomerForIdentity(db, { userId: USER, email: EMAIL });

    expect(customer).toEqual({
      id: CUSTOMER,
      email: EMAIL,
      first_name: 'Amina',
      last_name: null,
      phone: null,
    });
    expect(queries[0]?.values).toContain(USER);
    expect(queries[1]?.text).toMatch(/INSERT INTO customer_profiles/);
    expectNeverInterpolated(queries, SENSITIVE);
  });

  it('adopts an unlinked guest customer with the same email', async () => {
    const { db, queries } = dbWith([
      [],
      [{ id: CUSTOMER, email: EMAIL, first_name: null, last_name: null, phone: null, identity_user_id: null }],
      [],
      [],
    ]);

    const customer = await ensureCustomerForIdentity(db, { userId: USER, email: EMAIL });

    expect(customer.id).toBe(CUSTOMER);
    expect(queries[2]?.text).toMatch(/UPDATE customers/);
    expect(queries[2]?.values).toContain(USER);
    expect(queries[2]?.values).toContain(CUSTOMER);
    expectNeverInterpolated(queries, SENSITIVE);
  });

  it('refuses a customer row linked to another identity', async () => {
    const { db, queries } = dbWith([
      [],
      [
        {
          id: OTHER_CUSTOMER,
          email: EMAIL,
          first_name: null,
          last_name: null,
          phone: null,
          identity_user_id: OTHER_USER,
        },
      ],
    ]);

    await expect(ensureCustomerForIdentity(db, { userId: USER, email: EMAIL })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    // No profile was provisioned for the other identity's row.
    expect(queries.some((q) => q.text.includes('INSERT INTO customer_profiles'))).toBe(false);
    expectNeverInterpolated(queries, SENSITIVE);
  });

  it('creates a new customer and profile when neither link exists', async () => {
    const { db, queries } = dbWith([
      [],
      [],
      [{ id: CUSTOMER, email: EMAIL, first_name: null, last_name: null, phone: null }],
      [],
    ]);

    const customer = await ensureCustomerForIdentity(db, { userId: USER, email: EMAIL });

    expect(customer.id).toBe(CUSTOMER);
    expect(queries[2]?.text).toMatch(/INSERT INTO customers/);
    expect(queries[2]?.values).toContain(USER);
    expect(queries[2]?.values).toContain(EMAIL);
    expectNeverInterpolated(queries, SENSITIVE);
  });
});

describe('cart ownership', () => {
  it('reads the owner without touching the cart', async () => {
    const { db, queries } = dbWith([
      [{ id: 'cart-1', cart_token: TOKEN, customer_id: CUSTOMER, state: 'ACTIVE', expires_at: new Date() }],
    ]);
    const owner = await findCartOwnership(db, TOKEN);
    expect(owner?.customer_id).toBe(CUSTOMER);
    expect(queries[0]?.text).toMatch(/FROM carts/);
    expect(queries[0]?.values).toContain(TOKEN);
    expect(queries[0]?.text).not.toMatch(/UPDATE/);
    expectNeverInterpolated(queries, SENSITIVE);
  });

  it('answers null for an unknown token', async () => {
    const { db } = dbWith([[]]);
    await expect(findCartOwnership(db, TOKEN)).resolves.toBeNull();
  });

  it('finds the newest active cart for a customer', async () => {
    const { db, queries } = dbWith([[{ cart_token: TOKEN }]]);
    await expect(findActiveCartTokenForCustomer(db, CUSTOMER)).resolves.toBe(TOKEN);
    expect(queries[0]?.values).toContain(CUSTOMER);
    expectNeverInterpolated(queries, SENSITIVE);
  });
});

describe('product resolution', () => {
  it('binds the public reference and returns the real sellability columns', async () => {
    const { db, queries } = dbWith([
      [
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
    ]);
    const product = await resolvePurchasableProductRef(db, 'K-DEMO-005');
    expect(product).toEqual({
      id: PRODUCT,
      slug: 'oval-sapphire-ring',
      title: 'Oval Sapphire Ring',
      kind: 'READY_MADE',
      price_amount: '1250.00',
      currency: 'USD',
      availability: true,
      state: 'ACTIVE',
    });
    expect(queries[0]?.values).toContain('K-DEMO-005');
    expectNeverInterpolated(queries, SENSITIVE);
  });

  it('is null when nothing matches', async () => {
    const { db } = dbWith([[]]);
    await expect(resolvePurchasableProductRef(db, 'nope')).resolves.toBeNull();
  });
});

describe('catalogue projections', () => {
  it('maps a gemstone row and binds q/limit/offset', async () => {
    const { db, queries } = dbWith([
      [
        {
          ref: 'K1324',
          slug: 'oval-sapphire',
          name: 'Oval Sapphire',
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
    ]);
    const items = await listCompatGemstones(db, { q: 'sapphire', limit: 10, offset: 20 });
    expect(items[0]).toMatchObject({
      ref: 'K1324',
      kind: 'SINGLE',
      variety: 'Sapphire',
      weight_ct: '2.100',
      price_amount: '5400.00',
    });
    expect(queries[0]?.values).toContain('%sapphire%');
    expect(queries[0]?.values).toContain(10);
    expect(queries[0]?.values).toContain(20);
    expectNeverInterpolated(queries, SENSITIVE);
  });

  it('maps a setting design with the real aggregated metal/shape/price', async () => {
    const { db, queries } = dbWith([
      [
        {
          ref: '1150',
          sku: '1150',
          design_code: '1150',
          name: 'Pave Ring',
          jewellery_type: 'RING',
          style: 'Pave',
          metal: '14K_WHITE_GOLD, 18K_YELLOW_GOLD',
          metal_name: null,
          min_ct: '0.500',
          max_ct: '3.000',
          compatible_shapes: ['OVAL', 'CUSHION'],
          price_amount: '850.00',
          currency: 'USD',
          description: null,
        },
      ],
    ]);
    const items = await listCompatSettings(db, { refs: ['1150'], limit: 5, offset: 0 });
    expect(items[0]).toMatchObject({
      ref: '1150',
      metal: '14K_WHITE_GOLD, 18K_YELLOW_GOLD',
      compatible_shapes: ['OVAL', 'CUSHION'],
      price_amount: '850.00',
    });
    expect(queries[0]?.values).toContainEqual(['1150']);
    expectNeverInterpolated(queries, SENSITIVE);
  });

  it('reads one gemstone and one public certificate by reference', async () => {
    const gem = dbWith([
      [
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
    ]);
    await expect(findCompatGemstoneByRef(gem.db, 'K1324')).resolves.toMatchObject({ ref: 'K1324' });
    expectNeverInterpolated(gem.queries, SENSITIVE);

    const certificate = dbWith([
      [
        {
          id: 'cert-1',
          kind: 'LABORATORY',
          verification_status: 'VERIFIED',
          lab_name: 'GIA',
          field_name: 'origin',
          normalized_value: 'Sri Lanka',
          numeric_value: null,
          confidence: '0.98',
          field_status: 'VERIFIED',
        },
      ],
    ]);
    await expect(findPublicCertificateForGemRef(certificate.db, 'K1324')).resolves.toMatchObject({
      lab_name: 'GIA',
      confidence: '0.98',
    });
    expect(certificate.queries[0]?.text).toMatch(/FROM certificate_public/);
    expectNeverInterpolated(certificate.queries, SENSITIVE);
  });
});

describe('orders and the customer boundary', () => {
  it('lists summaries scoped by the bound customer id', async () => {
    const { db, queries } = dbWith([
      [
        {
          order_number: 'MG-2026-000001',
          status: 'PAID',
          currency: 'USD',
          grand_total: '1250.00',
          placed_at: '2026-11-25T09:00:00.000Z',
          item_count: '2',
        },
      ],
    ]);
    const orders = await listCustomerOrderSummaries(db, CUSTOMER);
    expect(orders[0]).toMatchObject({ order_number: 'MG-2026-000001', item_count: 2, placed_at: '2026-11-25T09:00:00.000Z' });
    expect(queries[0]?.text).toMatch(/WHERE o\.customer_id = \$1/);
    expect(queries[0]?.values).toContain(CUSTOMER);
    expectNeverInterpolated(queries, SENSITIVE);
  });

  it('reads one order only inside the customer predicate', async () => {
    const { db, queries } = dbWith([
      [
        {
          id: ORDER,
          order_number: 'MG-2026-000001',
          customer_id: CUSTOMER,
          email: EMAIL,
          status: 'PAID',
          currency: 'USD',
          subtotal: '1250.00',
          tax: '0.00',
          shipping: '0.00',
          discount: '0.00',
          grand_total: '1250.00',
          shipping_address: { city: 'Dubai' },
          customer_note: null,
          placed_at: '2026-11-25T09:00:00.000Z',
          paid_at: '2026-11-25T09:05:00.000Z',
        },
      ],
      [
        {
          sku_snapshot: 'oval-sapphire-ring',
          title_snapshot: 'Oval Sapphire Ring',
          quantity: 1,
          unit_price: '1250.00',
          line_total: '1250.00',
        },
      ],
      [{ event: 'PENDING_PAYMENT', created_at: '2026-11-25T09:00:00.000Z' }],
    ]);
    const order = await getCustomerOrderByNumber(db, CUSTOMER, 'MG-2026-000001');
    expect(order).toMatchObject({
      order_number: 'MG-2026-000001',
      status: 'PAID',
      items: [{ description: 'Oval Sapphire Ring', code_snapshot: 'oval-sapphire-ring' }],
      events: [{ event: 'PENDING_PAYMENT' }],
    });
    expect(queries[0]?.text).toMatch(/AND o\.customer_id = \$2/);
    expect(queries[0]?.values).toEqual(expect.arrayContaining([CUSTOMER, 'MG-2026-000001']));
    expectNeverInterpolated(queries, SENSITIVE);
  });

  it('is null for another customer’s order (or an unknown one)', async () => {
    const { db, queries } = dbWith([[]]);
    await expect(getCustomerOrderByNumber(db, OTHER_CUSTOMER, 'MG-2026-000001')).resolves.toBeNull();
    expect(queries[0]?.values).toContain(OTHER_CUSTOMER);
    expectNeverInterpolated(queries, SENSITIVE);
  });
});

describe('newsletter and customer requests', () => {
  it('records consent with the email and source bound', async () => {
    const { db, queries } = dbWith([
      [{ id: 'n1', email: EMAIL, consent_at: '2026-11-26T10:00:00.000Z' }],
    ]);
    const subscription = await subscribeNewsletter(db, { email: EMAIL, source: 'newsletter' });
    expect(subscription).toEqual({ id: 'n1', email: EMAIL, consent_at: '2026-11-26T10:00:00.000Z' });
    expect(queries[0]?.text).toMatch(/INSERT INTO newsletter_subscriptions/);
    expect(queries[0]?.values).toEqual(expect.arrayContaining([EMAIL, 'newsletter']));
    expectNeverInterpolated(queries, SENSITIVE);
  });

  it('unsubscribes by a bound email and never deletes', async () => {
    const { db, queries } = dbWith([[]]);
    await unsubscribeNewsletter(db, EMAIL);
    expect(queries[0]?.text).toMatch(/UPDATE newsletter_subscriptions/);
    expect(queries[0]?.text).not.toMatch(/DELETE/);
    expect(queries[0]?.values).toContain(EMAIL);
    expectNeverInterpolated(queries, SENSITIVE);
  });

  it('stores a customer request through the application service', async () => {
    const { db, queries } = dbWith([
      [{ id: 'r1', created_at: '2026-11-26T10:00:00.000Z' }],
    ]);
    const request = await createCustomerRequestRecord(db, {
      intent: 'APPOINTMENT',
      source: 'viewing_request',
      email: EMAIL,
      name: 'Amina',
      notes: 'Private viewing on Thursday.',
      customerId: CONFIGURATION,
    });
    expect(request).toEqual({ id: 'r1', created_at: '2026-11-26T10:00:00.000Z' });
    expect(queries[0]?.text).toMatch(/INSERT INTO customer_requests/);
    expect(queries[0]?.values).toEqual(
      expect.arrayContaining(['APPOINTMENT', 'viewing_request', EMAIL, 'Amina', 'Private viewing on Thursday.']),
    );
    expectNeverInterpolated(queries, SENSITIVE);
  });
});

describe('write surface', () => {
  it('only writes the four new-record/link statements — never commerce state', async () => {
    const all = [
      dbWith([
        [],
        [],
        [{ id: CUSTOMER, email: EMAIL, first_name: null, last_name: null, phone: null }],
        [],
      ]),
      dbWith([[]]),
      dbWith([[{ id: 'n1', email: EMAIL, consent_at: '2026-11-26T10:00:00.000Z' }]]),
      dbWith([[{ id: 'r1', created_at: '2026-11-26T10:00:00.000Z' }]]),
    ];
    await ensureCustomerForIdentity(all[0]!.db, { userId: USER, email: EMAIL });
    await unsubscribeNewsletter(all[1]!.db, EMAIL);
    await subscribeNewsletter(all[2]!.db, { email: EMAIL, source: 'newsletter' });
    await createCustomerRequestRecord(all[3]!.db, {
      intent: 'INQUIRY',
      source: 'contact',
      email: EMAIL,
      name: null,
      notes: 'Please advise.',
      customerId: null,
    });

    const statements = all.flatMap((entry) => entry.queries.map((q) => q.text)).join('\n');
    // No statement touches an existing commerce/trust aggregate.
    for (const table of [
      'products',
      'gemstones',
      'carts',
      'cart_items',
      'orders',
      'order_items',
      'payments',
      'certificates',
      'settings',
      'setting_variants',
      'users',
      'audit_logs',
    ]) {
      expect(statements).not.toMatch(new RegExp(`(INSERT INTO|UPDATE|DELETE FROM)\\s+${table}\\b`));
    }
  });
});
