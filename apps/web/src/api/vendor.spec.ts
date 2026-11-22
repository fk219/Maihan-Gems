/**
 * apps/web/src/api/vendor.spec.ts
 *
 * P5 / Track D — the vendor portal through the REAL HTTP pipeline.
 *
 * No database and no DATABASE_URL: the executor emulates the identity,
 * membership, product, allocation and ledger statements the real repositories
 * issue. The value of the suite is that it drives the real handlers, the real
 * session resolution and the real vendor gate through `createCatalogApi`.
 *
 * The central assertion is the boundary: a vendor session can never read or
 * mutate another vendor's row, and a mismatched id answers 404/empty rather
 * than leaking existence.
 */
import { describe, expect, it } from 'vitest';

import { hashSessionToken } from '@maihan/domain';
import type { CatalogDatabase } from '@maihan/db';
import { createCatalogApi, type CatalogApi } from './index.js';
import type { RouteContext } from './handlers.js';
import { requireVendor } from './vendor/session-authz.js';
import {
  MemoryCacheStore,
  MemoryGenerationStore,
  createCatalogQueryService,
} from '../modules/catalog/index.js';
import { FakeCatalogPort } from '../modules/catalog/testing/doubles.js';

const IDS = { traceId: 'v'.repeat(32), requestId: 'req_test_vendor' };

const VENDOR_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const VENDOR_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const VENDOR_P = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const VENDOR_S = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const VENDOR_T = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

const PRODUCT_A1 = '11111111-1111-4111-8111-111111111111';
const PRODUCT_A2 = '22222222-2222-4222-8222-222222222222';
const PRODUCT_B1 = '33333333-3333-4333-8333-333333333333';

interface SessionRecord {
  id: string;
  token: string;
  user_id: string;
  expires_at: number;
  revoked_at: number | null;
}

interface UserRecord {
  id: string;
  email: string;
  display_name: string;
  admin_role: string | null;
  state: 'ACTIVE' | 'SUSPENDED';
  email_verified_at: string | null;
}

interface VendorRecord {
  id: string;
  slug: string;
  display_name: string;
  legal_name: string | null;
  email: string;
  country: string | null;
  state: 'PENDING' | 'APPROVED' | 'SUSPENDED' | 'TERMINATED';
  commission_bps: number;
  payout_currency: string;
  approved_at: string | null;
  approved_by: string | null;
}

interface ProductRecord {
  id: string;
  vendor_id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  kind: string;
  state: string;
  price_amount: string;
  currency: string;
  price_evidence: string;
  availability: boolean;
  total_weight_ct: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface AllocationRecord {
  id: string;
  order_id: string;
  vendor_id: string;
  subtotal: string;
  commission: string;
  vendor_payable: string;
  currency: string;
  state: string;
  created_at: string;
}

interface OrderRecord {
  id: string;
  order_number: string;
  state: string;
  currency: string;
  placed_at: string | null;
  created_at: string;
}

interface LedgerRecord {
  id: number;
  vendor_id: string;
  order_id: string | null;
  entry_type: string;
  amount: string;
  currency: string;
  reference: string | null;
  created_at: string;
}

interface Harness {
  users: UserRecord[];
  sessions: SessionRecord[];
  members: Array<{ vendor_id: string; user_id: string; role: string }>;
  vendors: VendorRecord[];
  products: ProductRecord[];
  allocations: AllocationRecord[];
  orders: OrderRecord[];
  ledger: LedgerRecord[];
  audit: Array<{
    actorId: string;
    action: string;
    productId: string;
    before: string | null;
    after: string;
  }>;
  db: CatalogDatabase;
}

/** Robust drizzle `sql` template decomposition (boxed strings included). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function decompose(query: any): { text: string; values: any[] } {
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

function vendor(
  id: string,
  overrides: Partial<VendorRecord> & Pick<VendorRecord, 'slug' | 'display_name' | 'email' | 'state'>,
): VendorRecord {
  return {
    id,
    legal_name: null,
    country: null,
    commission_bps: 1500,
    payout_currency: 'USD',
    approved_at: null,
    approved_by: null,
    ...overrides,
  };
}

function buildHarness(): Harness {
  const users: UserRecord[] = [];
  const sessions: SessionRecord[] = [];
  const members: Array<{ vendor_id: string; user_id: string; role: string }> = [];
  const vendorRows: VendorRecord[] = [
    vendor(VENDOR_A, {
      slug: 'atelier-a',
      display_name: 'Atelier A',
      legal_name: 'Atelier A Ltd',
      email: 'a@vendor.test',
      country: 'LK',
      state: 'APPROVED',
      approved_at: '2024-01-01T00:00:00.000Z',
    }),
    vendor(VENDOR_B, {
      slug: 'atelier-b',
      display_name: 'Atelier B',
      legal_name: 'Atelier B Ltd',
      email: 'b@vendor.test',
      country: 'IN',
      state: 'APPROVED',
      commission_bps: 1800,
      approved_at: '2024-01-01T00:00:00.000Z',
    }),
    vendor(VENDOR_P, {
      slug: 'atelier-p',
      display_name: 'Atelier P',
      email: 'p@vendor.test',
      state: 'PENDING',
    }),
    vendor(VENDOR_S, {
      slug: 'atelier-s',
      display_name: 'Atelier S',
      email: 's@vendor.test',
      state: 'SUSPENDED',
      approved_at: '2024-01-01T00:00:00.000Z',
    }),
    vendor(VENDOR_T, {
      slug: 'atelier-t',
      display_name: 'Atelier T',
      email: 't@vendor.test',
      state: 'TERMINATED',
    }),
  ];
  const products: ProductRecord[] = [];
  const allocations: AllocationRecord[] = [];
  const orders: OrderRecord[] = [];
  const ledger: LedgerRecord[] = [];
  const audit: Harness['audit'] = [];
  let counter = 0;
  const nextId = (prefix: string): string => {
    counter += 1;
    return `${prefix}-${counter}`;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function execute(query: any): Promise<{ rows: unknown[] }> {
    const { text, values } = decompose(query);

    // ---- session ------------------------------------------------------------
    if (text.startsWith('SELECT s.id, s.user_id')) {
      const tokenHash = values[0] as string;
      const session = sessions.find(
        (s) =>
          hashSessionToken(s.token) === tokenHash &&
          s.revoked_at === null &&
          s.expires_at > Date.now(),
      );
      if (session === undefined) return { rows: [] };
      const user = users.find((u) => u.id === session.user_id);
      if (user === undefined || user.state !== 'ACTIVE') return { rows: [] };
      return {
        rows: [
          {
            id: session.id,
            user_id: user.id,
            expires_at: new Date(session.expires_at).toISOString(),
            email: user.email,
            display_name: user.display_name,
            admin_role: user.admin_role,
            state: user.state,
            email_verified_at: user.email_verified_at,
          },
        ],
      };
    }

    if (text.startsWith('UPDATE sessions SET last_seen_at')) return { rows: [] };

    // ---- membership ---------------------------------------------------------
    if (text.includes('FROM vendor_members m') && text.includes('JOIN vendors v')) {
      const userId = values[0] as string;
      return {
        rows: members
          .filter((m) => m.user_id === userId)
          .map((m) => {
            const row = vendorRows.find((v) => v.id === m.vendor_id);
            if (row === undefined) throw new Error('fake: membership without vendor');
            return { ...row, member_role: m.role };
          }),
      };
    }

    // ---- products list ------------------------------------------------------
    if (text.includes('FROM products p') && text.includes('count(*) OVER()')) {
      const vendorId = values[0] as string;
      const hasState = text.includes('p.state =');
      const state = hasState ? (values[1] as string) : undefined;
      const limit = values[hasState ? 2 : 1] as number;
      const offset = values[hasState ? 3 : 2] as number;
      const filtered = products
        .filter((p) => p.vendor_id === vendorId && p.deleted_at === null)
        .filter((p) => state === undefined || p.state === state)
        .sort((a, b) => b.created_at.localeCompare(a.created_at) || a.id.localeCompare(b.id));
      return {
        rows: filtered.slice(offset, offset + limit).map((p) => ({
          ...p,
          total_count: String(filtered.length),
        })),
      };
    }

    // ---- create -------------------------------------------------------------
    if (text.startsWith('INSERT INTO products')) {
      const [vendorId, kind, slug, title, subtitle, , price, currency, totalWeightCt] = values as [
        string,
        string,
        string,
        string,
        string | null,
        string,
        string,
        string,
        string | null,
      ];
      const row: ProductRecord = {
        id: nextId('product'),
        vendor_id: vendorId,
        slug,
        title,
        subtitle,
        kind,
        state: 'DRAFT',
        price_amount: price,
        currency,
        price_evidence: 'UNKNOWN',
        availability: true,
        total_weight_ct: totalWeightCt,
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      };
      products.push(row);
      return { rows: [{ ...row }] };
    }

    // ---- ownership read -----------------------------------------------------
    if (
      text.startsWith('SELECT p.id, p.vendor_id') &&
      text.includes('WHERE p.id =') &&
      text.includes('p.vendor_id =')
    ) {
      const [productId, vendorId] = values as [string, string];
      const row = products.find(
        (p) => p.id === productId && p.vendor_id === vendorId && p.deleted_at === null,
      );
      return { rows: row === undefined ? [] : [{ ...row }] };
    }

    // ---- update -------------------------------------------------------------
    if (text.startsWith('UPDATE products SET')) {
      const productId = values[values.length - 2] as string;
      const vendorId = values[values.length - 1] as string;
      const row = products.find(
        (p) => p.id === productId && p.vendor_id === vendorId && p.deleted_at === null,
      );
      if (row === undefined) return { rows: [] };
      const setClause = text.slice(text.indexOf('SET ') + 4, text.indexOf(' WHERE '));
      let cursor = 0;
      for (const rawPart of setClause.split(', ')) {
        const part = rawPart.trim();
        if (part.startsWith('version = version + 1')) {
          row.version += 1;
          continue;
        }
        if (part.startsWith('updated_at = now()')) {
          row.updated_at = new Date().toISOString();
          continue;
        }
        const match = /^([a-z_]+) = ?(::[a-z]+)?$/.exec(part);
        if (match === null) throw new Error(`fake: unknown assignment "${part}"`);
        (row as unknown as Record<string, unknown>)[match[1] as string] = values[cursor];
        cursor += 1;
      }
      return { rows: [{ ...row }] };
    }

    // ---- allocations --------------------------------------------------------
    if (text.includes('FROM order_vendor_allocations a')) {
      const vendorId = values[0] as string;
      const limit = values[1] as number;
      const offset = values[2] as number;
      const filtered = allocations
        .filter((a) => a.vendor_id === vendorId)
        .map((a) => {
          const order = orders.find((o) => o.id === a.order_id);
          if (order === undefined) throw new Error('fake: allocation without order');
          return {
            allocation_id: a.id,
            order_id: a.order_id,
            order_number: order.order_number,
            order_state: order.state,
            order_currency: order.currency,
            subtotal: a.subtotal,
            commission: a.commission,
            vendor_payable: a.vendor_payable,
            currency: a.currency,
            allocation_state: a.state,
            allocated_at: a.created_at,
            placed_at: order.placed_at,
            order_created_at: order.created_at,
          };
        })
        .sort((a, b) => b.order_created_at.localeCompare(a.order_created_at));
      return {
        rows: filtered
          .slice(offset, offset + limit)
          .map((row) => ({ ...row, total_count: String(filtered.length) })),
      };
    }

    // ---- ledger -------------------------------------------------------------
    if (text.includes('WITH ledger AS')) {
      const vendorId = values[0] as string;
      const from = values[1] as string | null;
      const to = values[2] as string | null;
      let running = 0;
      const rows = ledger
        .filter((entry) => entry.vendor_id === vendorId)
        .sort((a, b) => a.id - b.id)
        .map((entry) => {
          running += Number(entry.amount);
          return { entry, running_balance: running.toFixed(2) };
        });
      const fromMs = from === null ? -Infinity : Date.parse(from);
      const toMs = to === null ? Infinity : Date.parse(to);
      const period = rows.filter(({ entry }) => {
        const at = Date.parse(entry.created_at);
        return at >= fromMs && at < toMs;
      });
      const total = period.reduce((sum, { entry }) => sum + Number(entry.amount), 0);
      return {
        rows: period.map(({ entry, running_balance }) => ({
          id: String(entry.id),
          order_id: entry.order_id,
          entry_type: entry.entry_type,
          amount: entry.amount,
          currency: entry.currency,
          reference: entry.reference,
          created_at: entry.created_at,
          running_balance,
          period_total: total.toFixed(2),
        })),
      };
    }

    // ---- audit --------------------------------------------------------------
    if (text.startsWith('INSERT INTO audit_logs')) {
      const [actorId, action, productId, before, after] = values as [
        string,
        string,
        string,
        string | null,
        string,
      ];
      audit.push({ actorId, action, productId, before, after });
      return { rows: [] };
    }

    throw new Error(`fake: unmatched SQL — ${text.slice(0, 200)}`);
  }

  return {
    users,
    sessions,
    members,
    vendors: vendorRows,
    products,
    allocations,
    orders,
    ledger,
    audit,
    db: { execute } as unknown as CatalogDatabase,
  };
}

function addUserTo(
  harness: Harness,
  email: string,
  vendorId: string | null,
): string {
  const id = `user-${harness.users.length + 1}`;
  harness.users.push({
    id,
    email,
    display_name: `Name ${email}`,
    admin_role: null,
    state: 'ACTIVE',
    email_verified_at: '2024-01-01T00:00:00.000Z',
  });
  const token = `token-${email}`;
  harness.sessions.push({
    id: `session-${harness.sessions.length + 1}`,
    token,
    user_id: id,
    expires_at: Date.now() + 86_400_000,
    revoked_at: null,
  });
  if (vendorId !== null) {
    harness.members.push({ vendor_id: vendorId, user_id: id, role: 'OWNER' });
  }
  return `maihan_session=${encodeURIComponent(token)}`;
}

function product(
  id: string,
  vendorId: string,
  overrides: Partial<ProductRecord> = {},
): ProductRecord {
  return {
    id,
    vendor_id: vendorId,
    slug: id,
    title: `Product ${id}`,
    subtitle: null,
    kind: 'LOOSE_STONE',
    state: 'DRAFT',
    price_amount: '100.00',
    currency: 'USD',
    price_evidence: 'UNKNOWN',
    availability: true,
    total_weight_ct: null,
    version: 1,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    deleted_at: null,
    ...overrides,
  };
}

interface Fixture {
  harness: Harness;
  api: CatalogApi;
  cookies: {
    approvedA: string;
    approvedB: string;
    pending: string;
    suspended: string;
    terminated: string;
    noVendor: string;
  };
}

function buildFixture(): Fixture {
  const harness = buildHarness();
  const cookies = {
    approvedA: addUserTo(harness, 'a@vendor.test', VENDOR_A),
    approvedB: addUserTo(harness, 'b@vendor.test', VENDOR_B),
    pending: addUserTo(harness, 'p@vendor.test', VENDOR_P),
    suspended: addUserTo(harness, 's@vendor.test', VENDOR_S),
    terminated: addUserTo(harness, 't@vendor.test', VENDOR_T),
    noVendor: addUserTo(harness, 'n@vendor.test', null),
  };

  harness.products.push(
    product(PRODUCT_A1, VENDOR_A),
    product(PRODUCT_A2, VENDOR_A, {
      state: 'ACTIVE',
      price_evidence: 'VERIFIED',
      created_at: '2024-02-01T00:00:00.000Z',
    }),
    product(PRODUCT_B1, VENDOR_B, {
      price_amount: '999.00',
      created_at: '2024-03-01T00:00:00.000Z',
    }),
  );

  harness.orders.push(
    {
      id: 'order-a',
      order_number: 'MH-A-1',
      state: 'PAID',
      currency: 'USD',
      placed_at: '2024-02-02T00:00:00.000Z',
      created_at: '2024-02-02T00:00:00.000Z',
    },
    {
      id: 'order-b',
      order_number: 'MH-B-1',
      state: 'PAID',
      currency: 'USD',
      placed_at: '2024-03-02T00:00:00.000Z',
      created_at: '2024-03-02T00:00:00.000Z',
    },
  );
  harness.allocations.push(
    {
      id: 'alloc-a',
      order_id: 'order-a',
      vendor_id: VENDOR_A,
      subtotal: '1000.00',
      commission: '150.00',
      vendor_payable: '850.00',
      currency: 'USD',
      state: 'PENDING',
      created_at: '2024-02-02T00:00:00.000Z',
    },
    {
      id: 'alloc-b',
      order_id: 'order-b',
      vendor_id: VENDOR_B,
      subtotal: '500.00',
      commission: '75.00',
      vendor_payable: '425.00',
      currency: 'USD',
      state: 'PENDING',
      created_at: '2024-03-02T00:00:00.000Z',
    },
  );
  harness.ledger.push(
    {
      id: 1,
      vendor_id: VENDOR_A,
      order_id: 'order-a',
      entry_type: 'SALE',
      amount: '850.00',
      currency: 'USD',
      reference: 'sale-a',
      created_at: '2024-02-02T00:00:00.000Z',
    },
    {
      id: 2,
      vendor_id: VENDOR_B,
      order_id: 'order-b',
      entry_type: 'SALE',
      amount: '425.00',
      currency: 'USD',
      reference: 'sale-b',
      created_at: '2024-03-02T00:00:00.000Z',
    },
  );

  const service = createCatalogQueryService({
    port: new FakeCatalogPort(),
    store: new MemoryCacheStore(),
    generations: new MemoryGenerationStore(),
    namespace: 'mh-test-vendor',
  });
  const api = createCatalogApi({
    service,
    db: harness.db,
    ids: () => ({ ...IDS }),
  });

  return { harness, api, cookies };
}

function call(
  api: CatalogApi,
  path: string,
  init: RequestInit & { cookie?: string } = {},
): Promise<Response> {
  const { cookie, ...rest } = init;
  return api(
    new Request(`http://localhost${path}`, {
      ...rest,
      headers: {
        ...(rest.headers ?? {}),
        ...(cookie === undefined ? {} : { cookie }),
      },
    }),
  );
}

async function json<T = Record<string, unknown>>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

describe('vendor gate', () => {
  it('401 without a session', async () => {
    const { api } = buildFixture();
    const response = await call(api, '/api/v1/vendor/me');
    expect(response.status).toBe(401);
    const body = await json<{ error: { code: string } }>(response);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('403 VENDOR_MEMBERSHIP_REQUIRED for a signed-in non-vendor', async () => {
    const { api, cookies } = buildFixture();
    const response = await call(api, '/api/v1/vendor/me', { cookie: cookies.noVendor });
    expect(response.status).toBe(403);
    const body = await json<{ error: { code: string } }>(response);
    expect(body.error.code).toBe('VENDOR_MEMBERSHIP_REQUIRED');
  });

  it.each([
    ['PENDING', 'pending'],
    ['SUSPENDED', 'suspended'],
    ['TERMINATED', 'terminated'],
  ] as const)('403 VENDOR_NOT_APPROVED for a %s vendor', async (state, key) => {
    const { api, cookies } = buildFixture();
    const response = await call(api, '/api/v1/vendor/products', { cookie: cookies[key] });
    expect(response.status).toBe(403);
    const body = await json<{
      error: { code: string; details?: Array<{ vendorState?: string }> };
    }>(response);
    expect(body.error.code).toBe('VENDOR_NOT_APPROVED');
    expect(body.error.details?.[0]?.vendorState).toBe(state);
  });

  it('requireVendor refuses a different vendor id with VENDOR_SCOPE_MISMATCH', async () => {
    const { harness, cookies } = buildFixture();
    const ctx = {
      db: harness.db,
      request: new Request('http://localhost/api/v1/vendor/me', {
        headers: { cookie: cookies.approvedB },
      }),
      url: new URL('http://localhost/api/v1/vendor/me'),
      params: {},
      ids: { ...IDS },
      service: {},
    } as unknown as RouteContext;

    await expect(requireVendor(ctx, { vendorId: VENDOR_A })).rejects.toMatchObject({
      code: 'VENDOR_SCOPE_MISMATCH',
    });
    const actor = await requireVendor(ctx, { vendorId: VENDOR_B });
    expect(actor.vendorId).toBe(VENDOR_B);
  });
});

describe('GET /api/v1/vendor/me', () => {
  it('returns the approved vendor projection and membership role', async () => {
    const { api, cookies } = buildFixture();
    const response = await call(api, '/api/v1/vendor/me', { cookie: cookies.approvedB });
    expect(response.status).toBe(200);
    const body = await json<{
      data: { vendor: { id: string; state: string }; role: string; user: { email: string } };
    }>(response);
    expect(body.data.vendor.id).toBe(VENDOR_B);
    expect(body.data.vendor.state).toBe('APPROVED');
    expect(body.data.role).toBe('OWNER');
    expect(body.data.user.email).toBe('b@vendor.test');
  });
});

describe('vendor products', () => {
  it('lists only the signed-in vendor’s rows', async () => {
    const { api, cookies } = buildFixture();
    const response = await call(api, '/api/v1/vendor/products', { cookie: cookies.approvedB });
    expect(response.status).toBe(200);
    const body = await json<{ data: Array<{ id: string }>; meta: { total: number } }>(response);
    expect(body.data.map((row) => row.id)).toEqual([PRODUCT_B1]);
    expect(body.meta.total).toBe(1);
  });

  it('creates a DRAFT with UNKNOWN evidence and audits it', async () => {
    const { api, cookies, harness } = buildFixture();
    const response = await call(api, '/api/v1/vendor/products', {
      method: 'POST',
      cookie: cookies.approvedB,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        kind: 'LOOSE_STONE',
        slug: 'new-stone',
        title: 'New stone',
        jewelleryType: 'RING',
        priceMinor: 123_455,
        currency: 'USD',
      }),
    });
    expect(response.status).toBe(201);
    const body = await json<{
      data: {
        id: string;
        vendor_id: string;
        state: string;
        price_evidence: string;
        price_amount: string;
      };
    }>(response);
    expect(body.data.vendor_id).toBe(VENDOR_B);
    expect(body.data.state).toBe('DRAFT');
    expect(body.data.price_evidence).toBe('UNKNOWN');
    expect(body.data.price_amount).toBe('1234.55');
    expect(harness.audit).toHaveLength(1);
    expect(harness.audit[0]?.actorId).toBe(
      harness.users.find((u) => u.email === 'b@vendor.test')?.id,
    );
  });

  it('rejects a platform-only field instead of ignoring it', async () => {
    const { api, cookies, harness } = buildFixture();
    const before = harness.products.length;
    const response = await call(api, '/api/v1/vendor/products', {
      method: 'POST',
      cookie: cookies.approvedB,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        kind: 'LOOSE_STONE',
        slug: 'sneaky',
        title: 'Sneaky',
        jewelleryType: 'RING',
        priceMinor: 100,
        state: 'ACTIVE',
      }),
    });
    expect(response.status).toBe(400);
    const body = await json<{ error: { code: string } }>(response);
    expect(body.error.code).toBe('VALIDATION_FAILED');
    expect(harness.products).toHaveLength(before);
  });

  it('rejects a kind whose INV-01 composition the portal cannot satisfy', async () => {
    const { api, cookies, harness } = buildFixture();
    const before = harness.products.length;
    const response = await call(api, '/api/v1/vendor/products', {
      method: 'POST',
      cookie: cookies.approvedB,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        kind: 'CONFIGURED',
        slug: 'configured-stone',
        title: 'Configured stone',
        jewelleryType: 'RING',
        priceMinor: 100,
      }),
    });
    expect(response.status).toBe(400);
    expect(harness.products).toHaveLength(before);
  });

  it('answers 404 for another vendor’s product and mutates nothing', async () => {
    const { api, cookies, harness } = buildFixture();
    const before = harness.products.find((p) => p.id === PRODUCT_B1)?.title;

    const crossTenant = await call(api, `/api/v1/vendor/products/${PRODUCT_B1}`, {
      method: 'POST',
      cookie: cookies.approvedA,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Hijacked by A' }),
    });
    expect(crossTenant.status).toBe(404);
    const body = await json<{ error: { code: string } }>(crossTenant);
    expect(body.error.code).toBe('NOT_FOUND');
    expect(harness.products.find((p) => p.id === PRODUCT_B1)?.title).toBe(before);

    // The owner can still update it, proving the 404 was ownership and not a
    // broken endpoint.
    const owned = await call(api, `/api/v1/vendor/products/${PRODUCT_B1}`, {
      method: 'POST',
      cookie: cookies.approvedB,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Renamed by B' }),
    });
    expect(owned.status).toBe(200);
    expect(harness.products.find((p) => p.id === PRODUCT_B1)?.title).toBe('Renamed by B');
  });

  it('rejects a malformed product id before it reaches the uuid cast', async () => {
    const { api, cookies, harness } = buildFixture();
    const before = harness.products.length;
    const response = await call(api, '/api/v1/vendor/products/not-a-uuid', {
      method: 'POST',
      cookie: cookies.approvedB,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'x' }),
    });
    expect(response.status).toBe(400);
    const body = await json<{ error: { code: string } }>(response);
    expect(body.error.code).toBe('VALIDATION_FAILED');
    expect(harness.products).toHaveLength(before);
  });
});

describe('vendor orders and statement', () => {
  it('lists only this vendor’s allocations', async () => {
    const { api, cookies } = buildFixture();
    const response = await call(api, '/api/v1/vendor/orders', { cookie: cookies.approvedA });
    expect(response.status).toBe(200);
    const body = await json<{
      data: Array<{ allocation_id: string; order_number: string; vendor_payable: string }>;
      meta: { total: number };
    }>(response);
    expect(body.meta.total).toBe(1);
    expect(body.data[0]).toMatchObject({
      allocation_id: 'alloc-a',
      order_number: 'MH-A-1',
      vendor_payable: '850.00',
    });
  });

  it('returns the ledger statement with a running balance and total', async () => {
    const { api, cookies } = buildFixture();
    const response = await call(api, '/api/v1/vendor/statement', { cookie: cookies.approvedA });
    expect(response.status).toBe(200);
    const body = await json<{
      data: Array<{ running_balance: string; reference: string }>;
      meta: { total: string };
    }>(response);
    expect(body.data).toHaveLength(1);
    expect(body.data[0]?.running_balance).toBe('850.00');
    expect(body.data[0]?.reference).toBe('sale-a');
    expect(body.meta.total).toBe('850.00');
  });

  it('rejects an inverted date range', async () => {
    const { api, cookies } = buildFixture();
    const response = await call(api, '/api/v1/vendor/statement?from=2024-03-01&to=2024-02-01', {
      cookie: cookies.approvedA,
    });
    expect(response.status).toBe(400);
  });
});
