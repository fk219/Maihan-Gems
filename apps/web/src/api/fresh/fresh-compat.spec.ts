/**
 * apps/web/src/api/fresh/fresh-compat.spec.ts
 *
 * The develop-UI compatibility surface through the REAL pipeline
 * (`createFreshCompatApi`): real route table, real handlers, real ADR-027 /
 * ADR-026 gates, real error envelope.
 *
 * No database and no DATABASE_URL. The executor answers each statement the
 * compatibility repositories issue; the assertions cover the three things the
 * contract must never lose:
 *   1. the body shape the develop caller actually reads;
 *   2. an unauthenticated request is 401 (a refusal is 403) — never a 500 and
 *      never a read before the gate;
 *   3. a concept `main` does not model returns an empty collection with the
 *      `X-Maihan-Compat-Unsupported` flag, and produces no query at all.
 *
 * The suite also fails if any statement on this surface is a write.
 */
import { describe, expect, it } from 'vitest';

import type { CatalogDatabase } from '@maihan/db';
import { createFreshCompatApi, UNSUPPORTED_HEADER } from './index.js';
import type { AdminDeps } from '../admin/session-authz.js';

const IDS = { traceId: 'f'.repeat(32), requestId: 'req_test_fresh' };

/** Development-only admin header seam, enabled deliberately for the test. */
const TEST_ADMIN: AdminDeps = { allowRoleHeader: true, environment: 'test' };

const VENDOR_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const VENDOR_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const USER = '99999999-9999-4999-8999-999999999999';

interface Captured {
  readonly text: string;
  readonly values: unknown[];
}

interface FakeDb {
  readonly db: CatalogDatabase;
  readonly queries: Captured[];
  readonly writes: string[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function decompose(query: any): { text: string; values: unknown[] } {
  const chunks: unknown[] = Array.isArray(query?.queryChunks) ? query.queryChunks : [];
  const parts: string[] = [];
  const values: unknown[] = [];
  const walk = (items: unknown[]): void => {
    for (const raw of items) {
      if (raw === null || raw === undefined) {
        parts.push('');
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
      parts.push('');
      const tag = Object.prototype.toString.call(raw);
      if (tag === '[object String]') {
        values.push(String(raw));
        continue;
      }
      if (tag === '[object Number]') {
        values.push(Number(raw));
        continue;
      }
      if (tag === '[object Boolean]') {
        values.push(Boolean((raw as { valueOf(): unknown }).valueOf()));
        continue;
      }
      values.push(chunk.value === undefined ? null : chunk.value);
    }
  };
  walk(chunks);
  return { text: parts.join('').replace(/\s+/g, ' ').trim(), values };
}

const WRITE_PATTERN = /\b(INSERT|UPDATE|DELETE|TRUNCATE|ALTER|DROP)\b/i;

interface Rule {
  readonly when: (text: string) => boolean;
  readonly rows: () => unknown[];
}

function buildFakeDb(): FakeDb {
  const queries: Captured[] = [];
  const writes: string[] = [];

  const vendorA = {
    id: VENDOR_A,
    slug: 'atelier-a',
    display_name: 'Atelier A',
    legal_name: 'Atelier A Ltd',
    email: 'a@vendor.test',
    country: 'LK',
    state: 'APPROVED',
    commission_bps: 1500,
    payout_currency: 'USD',
    approved_at: '2026-01-01T00:00:00.000Z',
    approved_by: null,
  };

  const rules: Rule[] = [
    // ---- identity + vendor gate -------------------------------------------
    {
      when: (text) => text.startsWith('SELECT s.id, s.user_id'),
      rows: () => [
        {
          id: 'session-1',
          user_id: USER,
          expires_at: '2099-01-01T00:00:00.000Z',
          email: 'member@vendor.test',
          display_name: 'Member',
          admin_role: null,
          state: 'ACTIVE',
          email_verified_at: '2026-01-01T00:00:00.000Z',
        },
      ],
    },
    { when: (text) => text.startsWith('UPDATE sessions SET last_seen_at'), rows: () => [] },
    {
      when: (text) => text.includes('FROM vendor_members m') && text.includes('JOIN vendors v'),
      // The user is a member of vendor A only.
      rows: () => [{ ...vendorA, member_role: 'OWNER' }],
    },
    {
      when: (text) => text.includes('FROM vendors') && text.includes('WHERE lower(slug) = lower('),
      rows: () => [], // filled per-test by `withVendorLookup`
    },
    {
      when: (text) => text.includes('FROM vendors') && text.includes('WHERE id = '),
      rows: () => [],
    },
    // ---- stats -------------------------------------------------------------
    {
      when: (text) => text.includes('AS products_total'),
      rows: () => [
        {
          products_total: '4',
          products_active: '3',
          gemstones_total: '9',
          gemstones_active: '8',
          settings_total: '2',
          settings_active: '1',
          orders_total: '2',
          orders_pending: '1',
          orders_paid: '1',
          revenue_total: '1250.50',
          customers_total: '1',
          vendors_total: '2',
          vendors_active: '1',
          vendors_pending: '1',
          inventory_value: '9800.00',
          configurations_total: '0',
          certificates_total: '2',
        },
      ],
    },
    // ---- inventory ---------------------------------------------------------
    {
      when: (text) => text.startsWith('SELECT count(*)::text AS count FROM products p WHERE'),
      rows: () => [{ count: '1' }],
    },
    {
      when: (text) => text.includes('AS ref') && text.includes('AS vendor_code'),
      rows: () => [
        {
          ref: 'oval-sapphire-ring',
          name: 'Oval Sapphire Ring',
          kind: 'READY_MADE',
          status: 'ACTIVE',
          price_amount: '1250.00',
          currency: 'USD',
          weight_ct: null,
          variety: 'Sapphire',
          origin: null,
          origin_type: null,
          vendor_code: 'atelier-a',
          vendor_name: 'Atelier A',
          created_at: '2026-11-20T10:00:00.000Z',
          primary_image: null,
        },
      ],
    },
    {
      when: (text) => text.includes('AS total_items'),
      rows: () => [
        {
          total_items: '1',
          live_items: '1',
          sold_items: '0',
          hidden_items: '0',
          total_value: '1250.00',
          currency: 'USD',
        },
      ],
    },
    // ---- orders ------------------------------------------------------------
    {
      when: (text) => text.startsWith('SELECT count(*)::text AS count FROM orders'),
      rows: () => [{ count: '1' }],
    },
    {
      when: (text) => text.includes('FROM orders o'),
      rows: () => [
        {
          order_number: 'MG-2026-000001',
          email: 'buyer@example.test',
          status: 'PAID',
          grand_total: '1250.00',
          currency: 'USD',
          placed_at: '2026-11-25T09:00:00.000Z',
          payment_provider: 'stripe',
        },
      ],
    },
    // ---- vendor analytics --------------------------------------------------
    {
      // Distinctive: only the totals statement filters a count on allocation state.
      when: (text) => text.includes('FILTER (WHERE a.state <>'),
      rows: () => [{ revenue: '900.00', orders: '1', currency: 'USD' }],
    },
    {
      when: (text) => text.includes('interval') && text.includes('GROUP BY 1'),
      rows: () => [{ day: '2026-11-25', revenue: '900.00', orders: '1' }],
    },
    {
      when: (text) => text.includes('AS balance'),
      rows: () => [{ balance: '-150.00', entry_count: '2' }],
    },
    {
      when: (text) => text.includes('GROUP BY l.entry_type'),
      rows: () => [
        { entry_type: 'COMMISSION', amount: '-150.00' },
        { entry_type: 'SALE', amount: '900.00' },
      ],
    },
    // ---- vendors / audit / discounts / varieties ---------------------------
    {
      when: (text) => text.includes('AS live_gems'),
      rows: () => [
        {
          code: 'atelier-a',
          name: 'Atelier A',
          country: 'LK',
          status: 'APPROVED',
          email: 'a@vendor.test',
          onboarding_status: 'APPROVED',
          live_gems: '3',
          inventory_value: '9800.00',
          revenue: '900.00',
        },
      ],
    },
    {
      when: (text) => text.includes('FROM audit_logs'),
      rows: () => [
        {
          id: '7',
          actor_kind: 'ADMIN',
          action: 'UPDATE',
          entity_kind: 'products',
          entity_id: '11111111-1111-4111-8111-111111111111',
          after: { state: 'ACTIVE' },
          created_at: '2026-11-25T10:00:00.000Z',
        },
      ],
    },
    {
      when: (text) => text.includes('FROM discounts'),
      rows: () => [
        {
          id: 'd1',
          code: 'WELCOME10',
          type: 'PERCENTAGE',
          value: '10.00',
          min_subtotal: null,
          starts_at: '2026-01-01T00:00:00.000Z',
          ends_at: null,
          usage_limit: 100,
          used_count: 2,
          state: 'ACTIVE',
          created_at: '2026-01-01T00:00:00.000Z',
        },
      ],
    },
    {
      when: (text) => text.includes('FROM gemstone_varieties v'),
      rows: () => [
        {
          slug: 'sapphire',
          name: 'Sapphire',
          display_name: 'Sapphire',
          species_code: 'corundum',
          species_name: 'Corundum',
          stones: '8',
        },
      ],
    },
  ];

  let vendorLookup: (segment: string) => unknown | undefined = () => undefined;

  async function execute(query: unknown): Promise<{ rows: unknown[] }> {
    const { text, values } = decompose(query);
    queries.push({ text, values });
    // The session gate's `last_seen_at` touch is the auth layer's own
    // bookkeeping, not a write by this surface; its behaviour is pinned by the
    // identity specs. Every OTHER statement must be a read.
    if (WRITE_PATTERN.test(text) && !text.startsWith('UPDATE sessions SET last_seen_at')) {
      writes.push(text);
    }

    // Vendor resolution is per-test configurable (slug / id / not found).
    if (text.includes('FROM vendors') && text.includes('WHERE lower(slug) = lower(')) {
      const found = vendorLookup(String(values[0]));
      return { rows: found === undefined ? [] : [found] };
    }
    if (text.includes('FROM vendors') && text.includes('WHERE id = ')) {
      const found = vendorLookup(String(values[0]));
      return { rows: found === undefined ? [] : [found] };
    }

    for (const rule of rules) {
      if (rule.when(text)) return { rows: rule.rows() };
    }
    throw new Error(`fake-executor: unmatched SQL — ${text.slice(0, 160)}`);
  }

  const fake: FakeDb = {
    db: { execute } as unknown as CatalogDatabase,
    queries,
    writes,
  };
  // Test hook: which vendor a `{code}` segment resolves to.
  (fake as unknown as { setVendors: (fn: (segment: string) => unknown | undefined) => void }).setVendors = (
    fn,
  ) => {
    vendorLookup = fn;
  };
  return fake;
}

function setVendors(fake: FakeDb, fn: (segment: string) => unknown | undefined): void {
  (fake as unknown as { setVendors: (f: (segment: string) => unknown | undefined) => void }).setVendors(fn);
}

interface Call {
  readonly path: string;
  readonly method?: string;
  readonly headers?: Record<string, string>;
}

function api(fake: FakeDb, adminDeps: AdminDeps = {}) {
  return createFreshCompatApi({ db: fake.db, adminDeps, ids: IDS });
}

async function call(fake: FakeDb, options: Call & { adminDeps?: AdminDeps }): Promise<Response> {
  const headers = new Headers(options.headers ?? {});
  return api(fake, options.adminDeps ?? {})(new Request(`http://localhost${options.path}`, {
    method: options.method ?? 'GET',
    headers,
  }));
}

const ADMIN_SUPER = { 'x-admin-sub': 'admin-1', 'x-admin-role': 'ADMIN_SUPER' };
const READ_ONLY = { 'x-admin-sub': 'analyst-1', 'x-admin-role': 'READ_ONLY_ANALYST' };
const VENDOR_COOKIE = { cookie: 'maihan_session=test-token' };

describe('refusals before any read', () => {
  it.each([
    '/api/fresh/admin/stats',
    '/api/fresh/admin/inventory',
    '/api/fresh/admin/orders',
    '/api/fresh/admin/vendors',
    '/api/fresh/admin/audit',
    '/api/fresh/admin/discounts',
    '/api/fresh/admin/leads',
    '/api/fresh/admin/submissions',
    '/api/fresh/vendor/auth/me',
    '/api/fresh/vendors/atelier-a/inventory',
    '/api/fresh/vendors/atelier-a/analytics',
    '/api/fresh/vendors/atelier-a/submissions',
  ])('%s is 401 unauthenticated and touches no table', async (path) => {
    const fake = buildFakeDb();
    const response = await call(fake, { path });
    expect(response.status).toBe(401);
    const body = (await response.json()) as { error: { code: string; requestId: string; traceId: string } };
    expect(body.error.code).toBe('UNAUTHORIZED');
    expect(body.error.requestId).toBe(IDS.requestId);
    expect(body.error.traceId).toBe(IDS.traceId);
    expect(fake.queries).toHaveLength(0);
  });

  it('a role without the module is 403, not a read', async () => {
    const fake = buildFakeDb();
    const response = await call(fake, {
      path: '/api/fresh/admin/orders',
      headers: READ_ONLY,
      adminDeps: TEST_ADMIN,
    });
    expect(response.status).toBe(403);
    expect(((await response.json()) as { error: { code: string } }).error.code).toBe('FORBIDDEN');
    expect(fake.queries).toHaveLength(0);
  });

  it('the header seam stays closed when production wiring omits allowRoleHeader', async () => {
    const fake = buildFakeDb();
    const response = await call(fake, {
      path: '/api/fresh/admin/stats',
      headers: ADMIN_SUPER,
      adminDeps: { environment: 'production' },
    });
    expect(response.status).toBe(401);
    expect(fake.queries).toHaveLength(0);
  });
});

describe('admin console shapes', () => {
  it('GET /admin/stats is a bare object of numbers plus explicit nulls', async () => {
    const fake = buildFakeDb();
    const response = await call(fake, {
      path: '/api/fresh/admin/stats',
      headers: ADMIN_SUPER,
      adminDeps: TEST_ADMIN,
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body['products_total']).toBe(4);
    expect(body['products_active']).toBe(3);
    expect(body['revenue_total']).toBe(1250.5);
    expect(body['revenue_currency']).toBe('USD');
    expect(body['certificates_total']).toBe(2);
    // Unmodelled concepts are null AND declared — never a fabricated zero.
    expect(body['leads_total']).toBeNull();
    expect(body['products_sold']).toBeNull();
    expect(body['unsupported']).toContain('leads_total');
    expect(fake.writes).toEqual([]);
  });

  it('GET /admin/inventory returns { items, meta } with the console field names', async () => {
    const fake = buildFakeDb();
    const response = await call(fake, {
      path: '/api/fresh/admin/inventory?limit=100&q=ring',
      headers: ADMIN_SUPER,
      adminDeps: TEST_ADMIN,
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      items: Array<Record<string, unknown>>;
      meta: Record<string, unknown>;
    };
    expect(body.meta).toMatchObject({ total: 1, limit: 100, offset: 0 });
    expect(body.items[0]).toMatchObject({
      ref: 'oval-sapphire-ring',
      name: 'Oval Sapphire Ring',
      status: 'ACTIVE',
      price_amount: 1250,
      table_name: 'products',
      quantity: null,
    });
    expect(fake.writes).toEqual([]);
  });

  it('an inventory status main does not have is an empty page, flagged, with no query', async () => {
    const fake = buildFakeDb();
    const response = await call(fake, {
      path: '/api/fresh/admin/inventory?status=SOLD',
      headers: ADMIN_SUPER,
      adminDeps: TEST_ADMIN,
    });
    const body = (await response.json()) as {
      items: unknown[];
      meta: { unsupported_filter?: boolean; total: number };
    };
    expect(response.status).toBe(200);
    expect(body.items).toEqual([]);
    expect(body.meta.total).toBe(0);
    expect(body.meta.unsupported_filter).toBe(true);
    expect(fake.queries).toHaveLength(0);
  });

  it('GET /admin/orders is a bare array (the console assigns it to state)', async () => {
    const fake = buildFakeDb();
    const response = await call(fake, {
      path: '/api/fresh/admin/orders?limit=200',
      headers: ADMIN_SUPER,
      adminDeps: TEST_ADMIN,
    });
    const body = (await response.json()) as unknown;
    expect(Array.isArray(body)).toBe(true);
    expect((body as Array<Record<string, unknown>>)[0]).toEqual({
      order_number: 'MG-2026-000001',
      email: 'buyer@example.test',
      status: 'PAID',
      grand_total: '1250.00',
      currency: 'USD',
      placed_at: '2026-11-25T09:00:00.000Z',
      payment_provider: 'stripe',
    });
  });

  it('GET /admin/vendors is a bare array keyed by the vendor slug', async () => {
    const fake = buildFakeDb();
    const body = (await (
      await call(fake, { path: '/api/fresh/admin/vendors', headers: ADMIN_SUPER, adminDeps: TEST_ADMIN })
    ).json()) as Array<Record<string, unknown>>;
    expect(body[0]).toMatchObject({
      code: 'atelier-a',
      name: 'Atelier A',
      status: 'APPROVED',
      onboarding_status: 'APPROVED',
      live_gems: 3,
      inventory_value: 9800,
      revenue: 900,
      total_submissions: null,
    });
  });

  it('GET /admin/audit renames the audit columns the console reads', async () => {
    const fake = buildFakeDb();
    const body = (await (
      await call(fake, {
        path: '/api/fresh/admin/audit?limit=100',
        headers: { 'x-admin-sub': 'admin-1', 'x-admin-role': 'ADMIN_SUPER' },
        adminDeps: TEST_ADMIN,
      })
    ).json()) as Array<Record<string, unknown>>;
    expect(body[0]).toMatchObject({ id: '7', actor_kind: 'ADMIN', entity_kind: 'products' });
    expect(body[0]?.['after']).toEqual({ state: 'ACTIVE' });
  });

  it('GET /admin/discounts translates PERCENTAGE to PERCENT', async () => {
    const fake = buildFakeDb();
    const body = (await (
      await call(fake, { path: '/api/fresh/admin/discounts', headers: ADMIN_SUPER, adminDeps: TEST_ADMIN })
    ).json()) as Array<Record<string, unknown>>;
    expect(body[0]).toMatchObject({ kind: 'PERCENT', usage_limit: 100, used_count: 2, active: true });
  });
});

describe('unsupported concepts', () => {
  it.each(['/api/fresh/admin/leads', '/api/fresh/admin/submissions'])(
    '%s returns an honest empty collection with the unsupported flag',
    async (path) => {
      const fake = buildFakeDb();
      const response = await call(fake, { path, headers: ADMIN_SUPER, adminDeps: TEST_ADMIN });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual([]);
      expect(response.headers.get(UNSUPPORTED_HEADER)).toBe('true');
      expect(response.headers.get('X-Maihan-Compat-Unsupported-Concept')).toBeTruthy();
      // No table is consulted: there is no concept to consult.
      expect(fake.queries).toHaveLength(0);
    },
  );

  it('the vendor submissions path is empty with the flag', async () => {
    const fake = buildFakeDb();
    setVendors(fake, (segment) => (segment.toLowerCase() === 'atelier-a' ? {
      id: VENDOR_A,
      slug: 'atelier-a',
      display_name: 'Atelier A',
      state: 'APPROVED',
    } : undefined));
    const response = await call(fake, {
      path: '/api/fresh/vendors/atelier-a/submissions',
      headers: VENDOR_COOKIE,
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
    expect(response.headers.get(UNSUPPORTED_HEADER)).toBe('true');
  });
});

describe('vendor portal', () => {
  it('GET /vendor/auth/me resolves the membership, not a client-supplied code', async () => {
    const fake = buildFakeDb();
    const response = await call(fake, { path: '/api/fresh/vendor/auth/me', headers: VENDOR_COOKIE });
    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body['code']).toBe('atelier-a');
    expect(body['name']).toBe('Atelier A');
    expect(body['state']).toBe('APPROVED');
  });

  it('GET /vendors/{code}/inventory returns the vendor page and its stats', async () => {
    const fake = buildFakeDb();
    setVendors(fake, (segment) => (segment.toLowerCase() === 'atelier-a' ? {
      id: VENDOR_A,
      slug: 'atelier-a',
      display_name: 'Atelier A',
      state: 'APPROVED',
    } : undefined));
    const response = await call(fake, {
      path: '/api/fresh/vendors/atelier-a/inventory',
      headers: VENDOR_COOKIE,
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as { items: unknown[]; stats: Record<string, unknown> };
    expect(body.items).toHaveLength(1);
    expect(body.stats).toMatchObject({ total_items: 1, live_items: 1, total_value: 1250 });

    // The boundary is a bound parameter, never interpolated.
    for (const query of fake.queries) {
      if (query.text.includes('vendor_id = ')) {
        expect(query.values).toContain(VENDOR_A);
        expect(query.text).not.toContain(VENDOR_A);
      }
    }
  });

  it('GET /vendors/{code}/analytics exposes totals, series, ledger and what is unsupported', async () => {
    const fake = buildFakeDb();
    setVendors(fake, (segment) => (segment.toLowerCase() === 'atelier-a' ? {
      id: VENDOR_A,
      slug: 'atelier-a',
      display_name: 'Atelier A',
      state: 'APPROVED',
    } : undefined));
    const response = await call(fake, {
      path: '/api/fresh/vendors/atelier-a/analytics',
      headers: VENDOR_COOKIE,
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body['totals']).toEqual({ revenue: 900, units: null, orders: 1 });
    expect(body['series']).toEqual([{ day: '2026-11-25', revenue: 900, units: null, orders: 1 }]);
    expect(body['top_items']).toEqual([]);
    expect(body['payments']).toEqual([]);
    expect(body['ledger']).toMatchObject({ balance: '-150.00', entry_count: 2 });
    expect(body['unsupported']).toEqual(['units', 'top_items', 'payments']);
  });

  it('another vendor’s code is 403 VENDOR_SCOPE_MISMATCH, not that vendor’s rows', async () => {
    const fake = buildFakeDb();
    setVendors(fake, (segment) => (segment.toLowerCase() === 'atelier-b' ? {
      id: VENDOR_B,
      slug: 'atelier-b',
      display_name: 'Atelier B',
      state: 'APPROVED',
    } : undefined));
    const response = await call(fake, {
      path: '/api/fresh/vendors/atelier-b/inventory',
      headers: VENDOR_COOKIE,
    });
    expect(response.status).toBe(403);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe('VENDOR_SCOPE_MISMATCH');
    // Nothing was read for vendor B.
    expect(fake.queries.some((q) => q.values.includes(VENDOR_B))).toBe(false);
  });

  it('an unknown vendor code is 404 after authentication', async () => {
    const fake = buildFakeDb();
    setVendors(fake, () => undefined);
    const response = await call(fake, {
      path: '/api/fresh/vendors/nobody/inventory',
      headers: VENDOR_COOKIE,
    });
    expect(response.status).toBe(404);
    expect(((await response.json()) as { error: { code: string } }).error.code).toBe('NOT_FOUND');
  });
});

describe('public taxonomy', () => {
  it('GET /catalogue/varieties needs no session and returns { count, items }', async () => {
    const fake = buildFakeDb();
    const response = await call(fake, { path: '/api/fresh/catalogue/varieties' });
    expect(response.status).toBe(200);
    const body = (await response.json()) as { count: number; items: Array<Record<string, unknown>> };
    expect(body.count).toBe(1);
    expect(body.items[0]).toMatchObject({
      code: 'SAPPHIRE',
      slug: 'sapphire',
      name: 'Sapphire',
      species: 'corundum',
      stones: 8,
    });
  });
});

describe('routing contract', () => {
  it('an unimplemented develop path is 404, never 500', async () => {
    const fake = buildFakeDb();
    const response = await call(fake, {
      path: '/api/fresh/admin/certificates',
      headers: ADMIN_SUPER,
      adminDeps: TEST_ADMIN,
    });
    expect(response.status).toBe(404);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe('NOT_FOUND');
    expect(fake.queries).toHaveLength(0);
  });

  it('a non-GET verb gets 405 with Allow, not Next’s bodyless default', async () => {
    const fake = buildFakeDb();
    const response = await call(fake, {
      path: '/api/fresh/admin/stats',
      method: 'POST',
      headers: ADMIN_SUPER,
      adminDeps: TEST_ADMIN,
    });
    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('GET');
    expect(((await response.json()) as { error: { code: string } }).error.code).toBe('METHOD_NOT_ALLOWED');
  });

  it('every response carries the trace header', async () => {
    const fake = buildFakeDb();
    const response = await call(fake, { path: '/api/fresh/admin/stats' });
    expect(response.headers.get('X-Trace-Id')).toBe(IDS.traceId);
  });

  it('no route on this surface issues a write', async () => {
    const fake = buildFakeDb();
    setVendors(fake, (segment) => (segment.toLowerCase() === 'atelier-a' ? {
      id: VENDOR_A,
      slug: 'atelier-a',
      display_name: 'Atelier A',
      state: 'APPROVED',
    } : undefined));

    const paths = [
      '/api/fresh/catalogue/varieties',
      '/api/fresh/admin/stats',
      '/api/fresh/admin/inventory',
      '/api/fresh/admin/orders',
      '/api/fresh/admin/vendors',
      '/api/fresh/admin/audit',
      '/api/fresh/admin/discounts',
      '/api/fresh/vendor/auth/me',
      '/api/fresh/vendors/atelier-a/inventory',
      '/api/fresh/vendors/atelier-a/analytics',
    ];
    for (const path of paths) {
      await call(fake, { path, headers: { ...ADMIN_SUPER, ...VENDOR_COOKIE }, adminDeps: TEST_ADMIN });
    }
    expect(fake.writes).toEqual([]);
  });
});
