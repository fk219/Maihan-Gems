/**
 * packages/db/src/compat/fresh-compat-repository.spec.ts
 *
 * No database. The suite pins the compatibility read layer:
 *   - every statement is a SELECT (no write path exists on this surface);
 *   - every caller value is BOUND, never interpolated;
 *   - the vendor boundary is a parameter, and a mismatched vendor asks the
 *     database for the OTHER vendor's rows only because the caller passed that
 *     vendor's id — there is no unscoped overload;
 *   - a concept `main` does not model comes back as null + an `unsupported`
 *     entry, never as a fabricated zero;
 *   - NUMERIC text becomes a number, and null money stays null.
 */

import { describe, expect, it } from 'vitest';

import { createScriptedExecutor } from '../test/sql-capture.js';
import type { CatalogDatabase } from '../catalog/executor.js';
import {
  listActiveVarieties,
  listConsoleAudit,
  listConsoleDiscounts,
  listConsoleInventory,
  listConsoleOrders,
  listConsoleVendors,
  readConsoleStats,
  readVendorAnalytics,
  readVendorInventory,
  resolveVendorSegment,
} from './fresh-compat-repository.js';

const VENDOR_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const VENDOR_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

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

const WRITE_PATTERN = /\b(INSERT|UPDATE|DELETE|TRUNCATE|ALTER|DROP|CREATE)\b/i;

function assertReadOnly(queries: ReadonlyArray<{ text: string }>): void {
  for (const query of queries) {
    expect(query.text).not.toMatch(WRITE_PATTERN);
  }
}

describe('readConsoleStats', () => {
  it('maps every count to a number and leaves unmodelled concepts null', async () => {
    const { db, queries } = dbWith([
      [
        {
          products_total: '12',
          products_active: '7',
          gemstones_total: '30',
          gemstones_active: '21',
          settings_total: '40',
          settings_active: '33',
          orders_total: '5',
          orders_pending: '2',
          orders_paid: '3',
          revenue_total: '1250.50',
          customers_total: '4',
          vendors_total: '2',
          vendors_active: '1',
          vendors_pending: '1',
          inventory_value: '9900.00',
          configurations_total: '6',
          certificates_total: '3',
        },
      ],
    ]);

    const stats = await readConsoleStats(db);

    expect(stats).toMatchObject({
      products_total: 12,
      products_active: 7,
      gemstones_total: 30,
      gemstones_active: 21,
      settings_total: 40,
      settings_active: 33,
      orders_total: 5,
      orders_pending: 2,
      orders_paid: 3,
      revenue_total: 1250.5,
      revenue_currency: 'USD',
      customers_total: 4,
      vendors_total: 2,
      vendors_active: 1,
      vendors_pending: 1,
      inventory_value: 9900,
      configurations_total: 6,
      certificates_total: 3,
    });
    // Concepts the locked schema does not model are null AND declared.
    expect(stats.products_sold).toBeNull();
    expect(stats.gemstones_sold).toBeNull();
    expect(stats.submissions_total).toBeNull();
    expect(stats.submissions_pending).toBeNull();
    expect(stats.leads_total).toBeNull();
    expect(stats.leads_new).toBeNull();
    expect(stats.unsupported).toEqual([
      'gemstones_sold',
      'products_sold',
      'submissions_pending',
      'submissions_total',
      'leads_total',
      'leads_new',
    ]);

    expect(queries).toHaveLength(1);
    expect(queries[0]?.text).toContain('FROM products');
    expect(queries[0]?.text).toContain('FROM vendors');
    expect(queries[0]?.text).toContain('FROM certificates');
    assertReadOnly(queries);
  });

  it('reports 0 only for counts it actually asked for', async () => {
    const { db } = dbWith([[{}]]);
    const stats = await readConsoleStats(db);
    expect(stats.products_total).toBe(0);
    expect(stats.revenue_total).toBe(0);
    expect(stats.leads_total).toBeNull();
  });
});

describe('listConsoleInventory', () => {
  const row = {
    ref: 'oval-blue-sapphire-ring',
    name: 'Oval Blue Sapphire Ring',
    kind: 'READY_MADE',
    status: 'ACTIVE',
    price_amount: '1250.00',
    currency: 'USD',
    weight_ct: '1.240',
    variety: 'Sapphire',
    origin: 'Sri Lanka',
    origin_type: null,
    vendor_code: 'atelier-a',
    vendor_name: 'Atelier A',
    created_at: '2026-11-20T10:00:00.000Z',
    primary_image: 'https://cdn.example/a.webp',
  };

  it('projects main columns onto the console fields', async () => {
    const { db, queries } = dbWith([[{ count: '1' }], [row]]);
    const page = await listConsoleInventory(db, { limit: 100, offset: 0 });

    expect(page.total).toBe(1);
    expect(page.items).toEqual([
      {
        ref: 'oval-blue-sapphire-ring',
        name: 'Oval Blue Sapphire Ring',
        kind: 'READY_MADE',
        status: 'ACTIVE',
        price_amount: 1250,
        currency: 'USD',
        weight_ct: 1.24,
        variety: 'Sapphire',
        origin: 'Sri Lanka',
        origin_type: null,
        vendor_code: 'atelier-a',
        vendor_name: 'Atelier A',
        table_name: 'products',
        primary_image: 'https://cdn.example/a.webp',
        created_at: '2026-11-20T10:00:00.000Z',
        // main has availability, not a quantity, so the console gets null.
        quantity: null,
      },
    ]);
    assertReadOnly(queries);
  });

  it('binds the search pattern, state and kind — never interpolates them', async () => {
    const { db, queries } = dbWith([[{ count: '0' }], []]);
    await listConsoleInventory(db, {
      search: "'; DROP TABLE products; --",
      state: 'ACTIVE',
      kind: 'LOOSE_STONE',
      limit: 10,
      offset: 20,
    });

    const [counted, page] = queries;
    expect(counted?.values).toContain("%'; DROP TABLE products; --%");
    expect(counted?.values).toContain('ACTIVE');
    expect(counted?.values).toContain('LOOSE_STONE');
    expect(counted?.text).not.toContain('DROP TABLE');
    expect(page?.text).toContain('LIMIT $');
    expect(page?.values).toEqual(expect.arrayContaining([10, 20]));
    assertReadOnly(queries);
  });

  it('clamps the page size to 200 and floors the offset at 0', async () => {
    const { db, queries } = dbWith([[{ count: '0' }], []]);
    const page = await listConsoleInventory(db, { limit: 99_999, offset: -5 });
    expect(page.limit).toBe(200);
    expect(page.offset).toBe(0);
    expect(queries[1]?.values).toEqual(expect.arrayContaining([200, 0]));
  });
});

describe('listConsoleOrders', () => {
  it('maps order_state and reads the payment provider from payments', async () => {
    const { db, queries } = dbWith([
      [{ count: '1' }],
      [
        {
          order_number: 'MG-2026-000001',
          email: 'buyer@example.test',
          status: 'PAID',
          grand_total: '880.00',
          currency: 'USD',
          placed_at: '2026-11-25T09:00:00.000Z',
          payment_provider: 'stripe',
        },
      ],
    ]);
    const page = await listConsoleOrders(db, { limit: 200, offset: 0 });

    expect(page.total).toBe(1);
    expect(page.items[0]).toEqual({
      order_number: 'MG-2026-000001',
      email: 'buyer@example.test',
      status: 'PAID',
      grand_total: '880.00',
      currency: 'USD',
      placed_at: '2026-11-25T09:00:00.000Z',
      payment_provider: 'stripe',
    });
    expect(queries[1]?.text).toContain('FROM payments pay');
    assertReadOnly(queries);
  });

  it('a Date from pg becomes an ISO string; a missing provider stays null', async () => {
    const { db } = dbWith([
      [],
      [
        {
          order_number: 'MG-2026-000002',
          email: 'b@example.test',
          status: 'PENDING_PAYMENT',
          grand_total: '10.00',
          currency: 'USD',
          placed_at: new Date('2026-11-24T00:00:00.000Z'),
          payment_provider: null,
        },
      ],
    ]);
    const page = await listConsoleOrders(db, { limit: 10, offset: 0 });
    expect(page.items[0]?.placed_at).toBe('2026-11-24T00:00:00.000Z');
    expect(page.items[0]?.payment_provider).toBeNull();
    expect(page.items[0]?.status).toBe('PENDING_PAYMENT');
  });
});

describe('listConsoleVendors', () => {
  it('uses the slug as the vendor code and money only from RELEASED allocations', async () => {
    const { db, queries } = dbWith([
      [
        {
          code: 'atelier-a',
          name: 'Atelier A',
          country: 'LK',
          status: 'APPROVED',
          email: 'a@vendor.test',
          onboarding_status: 'APPROVED',
          live_gems: '4',
          inventory_value: '5000.00',
          revenue: '1200.00',
        },
      ],
    ]);
    const rows = await listConsoleVendors(db);

    expect(rows).toEqual([
      {
        code: 'atelier-a',
        name: 'Atelier A',
        country: 'LK',
        status: 'APPROVED',
        email: 'a@vendor.test',
        contact_name: null,
        onboarding_status: 'APPROVED',
        live_gems: 4,
        inventory_value: 5000,
        revenue: 1200,
        total_submissions: null,
      },
    ]);
    expect(queries[0]?.text).toContain("a.state = 'RELEASED'");
    assertReadOnly(queries);
  });
});

describe('listConsoleAudit', () => {
  it('renames the audit columns the console reads and caps the limit', async () => {
    const { db, queries } = dbWith([
      [
        {
          id: '42',
          actor_kind: 'ADMIN',
          action: 'UPDATE',
          entity_kind: 'products',
          entity_id: '11111111-1111-4111-8111-111111111111',
          after: { state: 'ACTIVE' },
          created_at: '2026-11-25T10:00:00.000Z',
        },
      ],
    ]);
    const rows = await listConsoleAudit(db, 5000);

    expect(rows).toEqual([
      {
        id: '42',
        actor_kind: 'ADMIN',
        action: 'UPDATE',
        entity_kind: 'products',
        entity_id: '11111111-1111-4111-8111-111111111111',
        after: { state: 'ACTIVE' },
        created_at: '2026-11-25T10:00:00.000Z',
      },
    ]);
    expect(queries[0]?.values).toEqual([500]);
    assertReadOnly(queries);
  });
});

describe('listConsoleDiscounts', () => {
  it('translates main discount types and exposes validity as starts/ends', async () => {
    const { db } = dbWith([
      [
        {
          id: 'd1',
          code: 'WELCOME10',
          type: 'PERCENTAGE',
          value: '10.00',
          min_subtotal: '100.00',
          starts_at: '2026-01-01T00:00:00.000Z',
          ends_at: null,
          usage_limit: 100,
          used_count: 3,
          state: 'ACTIVE',
          created_at: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'd2',
          code: null,
          type: 'FREE_SHIPPING',
          value: null,
          min_subtotal: null,
          starts_at: '2026-01-01T00:00:00.000Z',
          ends_at: '2026-02-01T00:00:00.000Z',
          usage_limit: null,
          used_count: 0,
          state: 'ARCHIVED',
          created_at: '2026-01-02T00:00:00.000Z',
        },
      ],
    ]);
    const rows = await listConsoleDiscounts(db);

    expect(rows[0]).toMatchObject({
      kind: 'PERCENT',
      value: '10.00',
      usage_limit: 100,
      used_count: 3,
      active: true,
      ends_at: null,
    });
    // A type the console does not know is passed through, never flattened.
    expect(rows[1]).toMatchObject({ kind: 'FREE_SHIPPING', value: null, active: false });
  });
});

describe('readVendorInventory', () => {
  it('bounds the query to the vendor id and reports whole-inventory stats', async () => {
    const { db, queries } = dbWith([
      [
        {
          ref: 'a-ring',
          name: 'A Ring',
          kind: 'READY_MADE',
          status: 'ACTIVE',
          price_amount: '300.00',
          currency: 'USD',
          weight_ct: null,
          variety: '',
          origin: null,
          vendor_code: 'atelier-a',
          vendor_name: 'Atelier A',
          created_at: '2026-11-20T00:00:00.000Z',
          primary_image: null,
        },
      ],
      [
        {
          total_items: '3',
          live_items: '1',
          sold_items: '1',
          hidden_items: '1',
          total_value: '300.00',
          currency: 'USD',
        },
      ],
    ]);

    const page = await readVendorInventory(db, VENDOR_A);

    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.quantity).toBeNull();
    expect(page.stats).toEqual({
      total_items: 3,
      live_items: 1,
      sold_items: 1,
      hidden_items: 1,
      total_value: 300,
      currency: 'USD',
    });

    for (const query of queries) {
      expect(query.text).toContain('p.vendor_id = $1');
      expect(query.values).toContain(VENDOR_A);
      expect(query.text).not.toContain(VENDOR_A);
    }
    assertReadOnly(queries);
  });
});

describe('readVendorAnalytics', () => {
  it('derives revenue from RELEASED allocations and a balance from the ledger', async () => {
    const { db, queries } = dbWith([
      [{ revenue: '1200.00', orders: '2', currency: 'USD' }],
      [
        { day: '2026-11-24', revenue: '700.00', orders: '1' },
        { day: '2026-11-25', revenue: '500.00', orders: '2' },
      ],
      [{ balance: '-150.00', entry_count: '3' }],
      [
        { entry_type: 'COMMISSION', amount: '-180.00' },
        { entry_type: 'SALE', amount: '1200.00' },
      ],
    ]);

    const analytics = await readVendorAnalytics(db, VENDOR_A);

    expect(analytics.totals).toEqual({ revenue: 1200, units: null, orders: 2 });
    expect(analytics.series).toEqual([
      { day: '2026-11-24', revenue: 700, units: null, orders: 1 },
      { day: '2026-11-25', revenue: 500, units: null, orders: 2 },
    ]);
    expect(analytics.top_items).toEqual([]);
    expect(analytics.payments).toEqual([]);
    expect(analytics.ledger).toEqual({
      balance: '-150.00',
      entry_count: 3,
      by_type: [
        { entry_type: 'COMMISSION', amount: '-180.00' },
        { entry_type: 'SALE', amount: '1200.00' },
      ],
    });
    expect(analytics.unsupported).toEqual(['units', 'top_items', 'payments']);
    expect(queries[0]?.text).toContain("a.state = 'RELEASED'");
    expect(queries[2]?.text).toContain('FROM vendor_ledger');
    for (const query of queries) expect(query.values).toContain(VENDOR_A);
    assertReadOnly(queries);
  });
});

describe('listActiveVarieties', () => {
  it('returns only ACTIVE, non-deleted varieties with a species and stone count', async () => {
    const { db, queries } = dbWith([
      [
        {
          slug: 'tsavorite-garnet',
          name: 'Tsavorite',
          display_name: 'Tsavorite Garnet',
          species_code: 'garnet',
          species_name: 'Garnet',
          stones: '12',
        },
      ],
    ]);
    const rows = await listActiveVarieties(db);

    expect(rows).toEqual([
      {
        code: 'TSAVORITE-GARNET',
        slug: 'tsavorite-garnet',
        name: 'Tsavorite Garnet',
        species: 'garnet',
        family: 'garnet',
        family_name: 'Garnet',
        stones: 12,
      },
    ]);
    expect(queries[0]?.text).toContain("v.state = 'ACTIVE'");
    expect(queries[0]?.text).toContain('v.deleted_at IS NULL');
    assertReadOnly(queries);
  });
});

describe('resolveVendorSegment', () => {
  it('accepts a slug case-insensitively and binds it', async () => {
    const { db, queries } = dbWith([[{ id: VENDOR_A, slug: 'atelier-a', display_name: 'A', state: 'APPROVED' }]]);
    const vendor = await resolveVendorSegment(db, 'Atelier-A');
    expect(vendor).toEqual({ id: VENDOR_A, slug: 'atelier-a', display_name: 'A', state: 'APPROVED' });
    expect(queries[0]?.values).toEqual(['Atelier-A']);
    expect(queries[0]?.text).not.toContain('Atelier-A');
  });

  it('treats a UUID segment as an id lookup', async () => {
    const { db, queries } = dbWith([[{ id: VENDOR_B, slug: 'atelier-b', display_name: 'B', state: 'APPROVED' }]]);
    await resolveVendorSegment(db, VENDOR_B);
    expect(queries[0]?.text).toContain('WHERE id = $1');
    expect(queries[0]?.values).toEqual([VENDOR_B]);
  });

  it('answers null for an empty segment without querying', async () => {
    const { db, queries } = dbWith([]);
    expect(await resolveVendorSegment(db, '   ')).toBeNull();
    expect(queries).toHaveLength(0);
  });
});
