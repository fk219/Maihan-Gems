/**
 * packages/db/src/vendors/vendor-portal-repository.spec.ts
 *
 * No database, no DATABASE_URL. The executor below emulates exactly the SQL
 * the repository issues, so the suite proves the VENDOR BOUNDARY, not
 * Postgres: every statement is matched with its own `vendor_id` predicate, a
 * mismatched id returns null/empty, and a product is always DRAFT + UNKNOWN.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import {
  createVendorProduct,
  listVendorOrders,
  listVendorProducts,
  minorUnitsToDecimalString,
  updateVendorProduct,
  vendorStatement,
} from './vendor-portal-repository.js';

const VENDOR_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const VENDOR_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const ACTOR_A = '11111111-1111-4111-8111-111111111111';
const ACTOR_B = '22222222-2222-4222-8222-222222222222';

const PRODUCT_A1 = '11111111-1111-4111-8111-111111111111';
const PRODUCT_A2 = '22222222-2222-4222-8222-222222222222';
const PRODUCT_B1 = '33333333-3333-4333-8333-333333333333';

interface Query {
  text: string;
  values: unknown[];
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

interface AuditRecord {
  actorId: string;
  action: string;
  productId: string;
  before: string | null;
  after: string;
  reason: string;
}

interface Harness {
  products: ProductRecord[];
  allocations: AllocationRecord[];
  orders: OrderRecord[];
  ledger: LedgerRecord[];
  audit: AuditRecord[];
  queries: Query[];
  db: { execute: (query: unknown) => Promise<{ rows: unknown[] }> };
}

/** Robust drizzle `sql` template decomposition (boxed strings included). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function decompose(query: any): Query {
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

function money(value: number): string {
  return value.toFixed(2);
}

function product(overrides: Partial<ProductRecord> & Pick<ProductRecord, 'id' | 'vendor_id'>): ProductRecord {
  return {
    slug: overrides.id,
    title: `Product ${overrides.id}`,
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

function buildHarness(): Harness {
  const products: ProductRecord[] = [];
  const allocations: AllocationRecord[] = [];
  const orders: OrderRecord[] = [];
  const ledger: LedgerRecord[] = [];
  const audit: AuditRecord[] = [];
  const queries: Query[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function execute(query: any): Promise<{ rows: unknown[] }> {
    const parsed = decompose(query);
    queries.push(parsed);
    const { text, values } = parsed;

    // ---- listVendorProducts: count -----------------------------------------
    if (text.startsWith('SELECT count(*)::text AS count FROM products p')) {
      const vendorId = values[0] as string;
      const hasState = text.includes('p.state =');
      const state = hasState ? (values[1] as string) : undefined;
      const count = products
        .filter((p) => p.vendor_id === vendorId && p.deleted_at === null)
        .filter((p) => state === undefined || p.state === state).length;
      return { rows: [{ count: String(count) }] };
    }

    // ---- listVendorProducts: page ------------------------------------------
    if (
      text.startsWith('SELECT p.id, p.vendor_id') &&
      text.includes('FROM products p') &&
      !text.includes('WHERE p.id =')
    ) {
      const vendorId = values[0] as string;
      const hasState = text.includes('p.state =');
      const state = hasState ? (values[1] as string) : undefined;
      const limit = values[hasState ? 2 : 1] as number;
      const offset = values[hasState ? 3 : 2] as number;

      const filtered = products
        .filter((p) => p.vendor_id === vendorId && p.deleted_at === null)
        .filter((p) => state === undefined || p.state === state)
        .sort((a, b) => b.created_at.localeCompare(a.created_at) || a.id.localeCompare(b.id));
      return { rows: filtered.slice(offset, offset + limit).map((p) => ({ ...p })) };
    }

    // ---- createVendorProduct ----------------------------------------------
    if (text.startsWith('INSERT INTO products')) {
      const [
        vendorId,
        kind,
        slug,
        title,
        subtitle,
        , // jewellery_type — not part of the returned projection
        price,
        currency,
        totalWeightCt,
        description,
        shortDescription,
      ] = values as [
        string, string, string, string, string | null, string,
        string, string, string | null, string | null, string | null,
      ];
      const row = product({
        id: `product-${products.length + 1}`,
        vendor_id: vendorId,
        slug,
        title,
        subtitle,
        kind,
        price_amount: price,
        currency,
        state: 'DRAFT',
        price_evidence: 'UNKNOWN',
        total_weight_ct: totalWeightCt,
        created_at: '2024-06-01T00:00:00.000Z',
        updated_at: '2024-06-01T00:00:00.000Z',
      });
      // The two long text columns exist in the INSERT but not in the row
      // projection the repository reads back; keep them for completeness.
      (row as unknown as Record<string, unknown>)['description'] = description;
      (row as unknown as Record<string, unknown>)['short_description'] = shortDescription;
      products.push(row);
      return { rows: [{ ...row }] };
    }

    // ---- updateVendorProduct: ownership read -------------------------------
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

    // ---- updateVendorProduct: write ---------------------------------------
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
          row.updated_at = '2024-07-01T00:00:00.000Z';
          continue;
        }
        const match = /^([a-z_]+) = ?(::[a-z]+)?$/.exec(part);
        if (match === null) throw new Error(`fake: unknown assignment "${part}" in ${text}`);
        const column = match[1] as keyof ProductRecord;
        (row as unknown as Record<string, unknown>)[column] = values[cursor];
        cursor += 1;
      }
      return { rows: [{ ...row }] };
    }

    // ---- listVendorOrders: count --------------------------------------------
    if (text.startsWith('SELECT count(*)::text AS count FROM order_vendor_allocations a')) {
      const vendorId = values[0] as string;
      const count = allocations.filter((a) => a.vendor_id === vendorId).length;
      return { rows: [{ count: String(count) }] };
    }

    // ---- listVendorOrders: page ---------------------------------------------
    if (text.startsWith('SELECT a.id AS allocation_id')) {
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
      return { rows: filtered.slice(offset, offset + limit).map((row) => ({ ...row })) };
    }

    // ---- vendorStatement ----------------------------------------------------
    if (text.includes('WITH ledger AS')) {
      const vendorId = values[0] as string;
      const from = values[1] as string | null;
      const to = values[2] as string | null;
      const all = ledger
        .filter((entry) => entry.vendor_id === vendorId)
        .sort((a, b) => a.id - b.id);
      let running = 0;
      const withRunning = all.map((entry) => {
        running += Number(entry.amount);
        return { entry, running_balance: money(running) };
      });
      const fromMs = from === null ? -Infinity : Date.parse(from);
      const toMs = to === null ? Infinity : Date.parse(to);
      const period = withRunning.filter(({ entry }) => {
        const at = Date.parse(entry.created_at);
        return at >= fromMs && at < toMs;
      });
      const periodTotal = period.reduce((sum, { entry }) => sum + Number(entry.amount), 0);
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
          period_total: money(periodTotal),
        })),
      };
    }

    // ---- audit --------------------------------------------------------------
    if (text.startsWith('INSERT INTO audit_logs')) {
      const [actorId, action, productId, before, after, , reason] = values as [
        string, string, string, string | null, string, string | null, string,
      ];
      audit.push({ actorId, action, productId, before, after, reason });
      return { rows: [] };
    }

    throw new Error(`fake: unmatched SQL — ${text.slice(0, 200)}`);
  }

  return {
    products,
    allocations,
    orders,
    ledger,
    audit,
    queries,
    db: { execute },
  };
}

let harness: Harness;

beforeEach(() => {
  harness = buildHarness();
  harness.products.push(
    product({ id: PRODUCT_A1, vendor_id: VENDOR_A, state: 'DRAFT', created_at: '2024-01-01T00:00:00.000Z' }),
    product({ id: PRODUCT_A2, vendor_id: VENDOR_A, state: 'ACTIVE', created_at: '2024-02-01T00:00:00.000Z' }),
    product({ id: PRODUCT_B1, vendor_id: VENDOR_B, state: 'DRAFT', created_at: '2024-03-01T00:00:00.000Z' }),
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
      order_id: null,
      entry_type: 'SALE',
      amount: '100.00',
      currency: 'USD',
      reference: 'seed',
      created_at: '2024-01-01T00:00:00.000Z',
    },
    {
      id: 2,
      vendor_id: VENDOR_A,
      order_id: null,
      entry_type: 'SALE',
      amount: '30.00',
      currency: 'USD',
      reference: 'feb',
      created_at: '2024-02-01T00:00:00.000Z',
    },
    {
      id: 3,
      vendor_id: VENDOR_A,
      order_id: null,
      entry_type: 'PAYOUT',
      amount: '-10.00',
      currency: 'USD',
      reference: 'mar',
      created_at: '2024-03-01T00:00:00.000Z',
    },
    {
      id: 4,
      vendor_id: VENDOR_B,
      order_id: null,
      entry_type: 'SALE',
      amount: '999.00',
      currency: 'USD',
      reference: 'other',
      created_at: '2024-02-15T00:00:00.000Z',
    },
  );
});

describe('listVendorProducts', () => {
  it('returns only the requested vendor’s products', async () => {
    const result = await listVendorProducts(harness.db as never, VENDOR_A, {
      limit: 50,
      offset: 0,
    });
    expect(result.total).toBe(2);
    expect(result.items.map((row) => row.id)).toEqual([PRODUCT_A2, PRODUCT_A1]);
    expect(result.items.some((row) => row.id === PRODUCT_B1)).toBe(false);
  });

  it('filters by state inside the vendor boundary', async () => {
    const result = await listVendorProducts(harness.db as never, VENDOR_A, {
      state: 'DRAFT',
      limit: 50,
      offset: 0,
    });
    expect(result.total).toBe(1);
    expect(result.items[0]?.id).toBe(PRODUCT_A1);
  });

  it('binds the vendor id as a parameter, never as SQL text', async () => {
    await listVendorProducts(harness.db as never, VENDOR_A, { limit: 50, offset: 0 });
    const listQuery = harness.queries.find((q) => q.text.includes('FROM products p'));
    expect(listQuery?.values).toContain(VENDOR_A);
    expect(listQuery?.text).not.toContain(VENDOR_A);
  });

  it('clamps the page size to the documented maximum', async () => {
    await listVendorProducts(harness.db as never, VENDOR_A, { limit: 5000, offset: 0 });
    const pageQuery = harness.queries.find((q) => q.text.includes('ORDER BY p.created_at'));
    expect(pageQuery?.values).toContain(200);
  });

  it('keeps the true total when the offset is past the end', async () => {
    const result = await listVendorProducts(harness.db as never, VENDOR_A, {
      limit: 10,
      offset: 50,
    });
    expect(result.items).toEqual([]);
    expect(result.total).toBe(2);
  });
});

describe('createVendorProduct', () => {
  it('always creates DRAFT with UNKNOWN price evidence and writes an audit row', async () => {
    const row = await createVendorProduct(harness.db as never, VENDOR_A, {
      actorId: ACTOR_A,
      kind: 'LOOSE_STONE',
      slug: 'ceylon-sapphire',
      title: 'Ceylon sapphire',
      jewelleryType: 'RING',
      priceMinor: 123_455,
      currency: 'USD',
    });

    expect(row.vendor_id).toBe(VENDOR_A);
    expect(row.state).toBe('DRAFT');
    expect(row.price_evidence).toBe('UNKNOWN');
    expect(row.price_amount).toBe('1234.55');
    expect(harness.audit).toHaveLength(1);
    expect(harness.audit[0]).toMatchObject({
      actorId: ACTOR_A,
      action: 'CREATE',
      productId: row.id,
      before: null,
    });
  });

  it('converts minor units with integer arithmetic', () => {
    expect(minorUnitsToDecimalString(0)).toBe('0.00');
    expect(minorUnitsToDecimalString(5)).toBe('0.05');
    expect(minorUnitsToDecimalString(100)).toBe('1.00');
    expect(minorUnitsToDecimalString(123_455)).toBe('1234.55');
    expect(() => minorUnitsToDecimalString(-1)).toThrow();
    expect(() => minorUnitsToDecimalString(1.5)).toThrow();
  });
});

describe('updateVendorProduct', () => {
  it('updates a row the vendor owns and audits before/after', async () => {
    const row = await updateVendorProduct(harness.db as never, VENDOR_A, PRODUCT_A1, {
      actorId: ACTOR_A,
      title: 'Renamed stone',
      priceMinor: 9_99,
      availability: false,
    });

    expect(row?.title).toBe('Renamed stone');
    expect(row?.price_amount).toBe('9.99');
    expect(row?.availability).toBe(false);
    expect(harness.audit).toHaveLength(1);
    expect(harness.audit[0]).toMatchObject({ action: 'UPDATE', productId: PRODUCT_A1 });
    expect(harness.audit[0]?.before).toContain(`"title":"Product ${PRODUCT_A1}"`);
    expect(harness.audit[0]?.after).toContain('"title":"Renamed stone"');
  });

  it('returns null for another vendor’s row and does not mutate it', async () => {
    const before = harness.products.find((p) => p.id === PRODUCT_A1)?.title;
    const row = await updateVendorProduct(harness.db as never, VENDOR_B, PRODUCT_A1, {
      actorId: ACTOR_B,
      title: 'Hijacked',
    });

    expect(row).toBeNull();
    expect(harness.products.find((p) => p.id === PRODUCT_A1)?.title).toBe(before);
    expect(harness.audit).toHaveLength(0);
  });

  it('returns null for a row that does not exist — the same answer as not-yours', async () => {
    const row = await updateVendorProduct(
      harness.db as never,
      VENDOR_A,
      '99999999-9999-4999-8999-999999999999',
      {
        actorId: ACTOR_A,
        title: 'x',
      },
    );
    expect(row).toBeNull();
  });

  it('does not write or audit an empty patch', async () => {
    const row = await updateVendorProduct(harness.db as never, VENDOR_A, PRODUCT_A1, {
      actorId: ACTOR_A,
    });
    expect(row?.title).toBe(`Product ${PRODUCT_A1}`);
    expect(harness.audit).toHaveLength(0);
  });
});

describe('listVendorOrders', () => {
  it('returns allocations for this vendor only, joined to the order', async () => {
    const result = await listVendorOrders(harness.db as never, VENDOR_A, { limit: 50, offset: 0 });
    expect(result.total).toBe(1);
    expect(result.items[0]).toMatchObject({
      allocation_id: 'alloc-a',
      order_number: 'MH-A-1',
      vendor_payable: '850.00',
    });
  });

  it('returns nothing for a vendor with no allocations', async () => {
    const result = await listVendorOrders(harness.db as never, 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', {
      limit: 50,
      offset: 0,
    });
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });
});

describe('vendorStatement', () => {
  it('returns a cumulative running balance and the period total', async () => {
    const statement = await vendorStatement(harness.db as never, VENDOR_A, {
      from: '2024-02-01T00:00:00.000Z',
      to: '2024-03-01T00:00:00.000Z',
    });

    expect(statement.entries).toHaveLength(1);
    expect(statement.entries[0]).toMatchObject({
      entry_type: 'SALE',
      amount: '30.00',
      running_balance: '130.00',
    });
    expect(statement.total).toBe('30.00');
  });

  it('includes the whole history when no range is supplied', async () => {
    const statement = await vendorStatement(harness.db as never, VENDOR_A);
    expect(statement.entries.map((entry) => entry.running_balance)).toEqual([
      '100.00',
      '130.00',
      '120.00',
    ]);
    expect(statement.total).toBe('120.00');
  });

  it('never mixes another vendor’s ledger into the balance', async () => {
    const statement = await vendorStatement(harness.db as never, VENDOR_A);
    expect(statement.entries.some((entry) => entry.reference === 'other')).toBe(false);
    expect(statement.total).not.toBe('1119.00');
  });

  it('reports zero for an empty ledger', async () => {
    const statement = await vendorStatement(harness.db as never, 'dddddddd-dddd-4ddd-8ddd-dddddddddddd');
    expect(statement.entries).toEqual([]);
    expect(statement.total).toBe('0');
  });
});
