import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createCatalogDatabase,
  createCatalogQueryPort,
  createDiscount,
  createPool,
  redeemDiscount,
  type CatalogDatabase,
} from '@maihan/db';
import {
  createCatalogQueryService,
  MemoryGenerationStore,
  NullCacheStore,
} from '../modules/catalog/index.js';
import { createCatalogApi, type CatalogApi } from './index.js';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

function getDatabaseUrl(): string | undefined {
  if (process.env['DATABASE_URL']) return process.env['DATABASE_URL'];
  const envPath = resolve(process.cwd(), '../../.env');
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('DATABASE_URL=')) {
        return trimmed.slice('DATABASE_URL='.length).trim().replace(/^['"]|['"]$/g, '');
      }
    }
  }
  return undefined;
}

describe('Discount Validation & Atomic Redemption (Phase 6 Task 10)', () => {
  let pool: ReturnType<typeof createPool> | undefined;
  let db: CatalogDatabase | undefined;
  let api: CatalogApi | undefined;
  let hasDb = false;
  const createdDiscountCodes: string[] = [];

  let validPctCode: string;
  let expiredCode: string;
  let minSubtotalCode: string;
  let maxRedeemCode: string;
  let scopedCode: string;

  beforeAll(async () => {
    const url = getDatabaseUrl();
    if (!url) return;
    try {
      pool = createPool(url, { max: 2 });
      db = createCatalogDatabase(pool);
      const port = createCatalogQueryPort(db);
      const service = createCatalogQueryService({
        port,
        store: new NullCacheStore(),
        generations: new MemoryGenerationStore(),
        namespace: 'test',
      });

      api = createCatalogApi({
        service,
        db,
      });

      const ts = Date.now();
      validPctCode = `PCT10-${ts}`;
      expiredCode = `EXP-${ts}`;
      minSubtotalCode = `MIN1000-${ts}`;
      maxRedeemCode = `ONCE-${ts}`;
      scopedCode = `SCOPE-${ts}`;

      createdDiscountCodes.push(validPctCode, expiredCode, minSubtotalCode, maxRedeemCode, scopedCode);

      // 1. Valid 10% discount
      await createDiscount(db, {
        code: validPctCode,
        name: '10% Off Entire Order',
        type: 'PERCENTAGE',
        value: 10.0,
      });

      // 2. Expired discount
      await createDiscount(db, {
        code: expiredCode,
        name: 'Expired Promo',
        type: 'FIXED_AMOUNT',
        value: 50.0,
        valid_from: new Date(Date.now() - 200000).toISOString(),
        valid_to: new Date(Date.now() - 100000).toISOString(),
      });

      // 3. Min subtotal discount
      await createDiscount(db, {
        code: minSubtotalCode,
        name: '$100 Off $1000+',
        type: 'FIXED_AMOUNT',
        value: 100.0,
        min_subtotal: 1000.0,
      });

      // 4. Max redemptions discount (max = 1)
      await createDiscount(db, {
        code: maxRedeemCode,
        name: 'Single Use Flash Sale',
        type: 'FIXED_AMOUNT',
        value: 25.0,
        max_redemptions: 1,
      });

      // 5. Scoped discount (requires Emerald variety)
      await createDiscount(db, {
        code: scopedCode,
        name: 'Emerald Lovers Special',
        type: 'PERCENTAGE',
        value: 15.0,
        scope: { varieties: ['Emerald'] },
      });

      hasDb = true;
    } catch (err) {
      console.error('Database setup failed for discount.spec.ts:', err);
      hasDb = false;
    }
  });

  afterAll(async () => {
    if (pool && hasDb) {
      const client = await pool.connect();
      try {
        for (const code of createdDiscountCodes) {
          await client.query(`DELETE FROM discounts WHERE code = $1`, [code]);
        }
      } catch (e) {
        console.error('Discount cleanup error:', e);
      } finally {
        client.release();
        await pool.end();
      }
    }
  });

  it('validates a percentage discount and derives authoritative amounts', async () => {
    if (!hasDb || !api) return;

    const res = await api(
      new Request('http://localhost/discounts/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: validPctCode,
          subtotal: 500.0,
        }),
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.valid).toBe(true);
    expect(json.data.discount_amount).toBe('50.00');
    expect(json.data.final_subtotal).toBe('450.00');
  });

  it('rejects an expired discount with 422 DISCOUNT_INVALID', async () => {
    if (!hasDb || !api) return;

    const res = await api(
      new Request('http://localhost/discounts/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: expiredCode,
          subtotal: 200.0,
        }),
      }),
    );
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error.code).toBe('DISCOUNT_INVALID');
    expect(json.error.message).toContain('expired');
  });

  it('rejects when order subtotal is below minimum subtotal threshold', async () => {
    if (!hasDb || !api) return;

    const res = await api(
      new Request('http://localhost/discounts/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: minSubtotalCode,
          subtotal: 500.0, // below 1000
        }),
      }),
    );
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error.code).toBe('DISCOUNT_INVALID');
    expect(json.error.message).toContain('minimum');
  });

  it('rejects when items do not match discount scope', async () => {
    if (!hasDb || !api) return;

    // Cart with Ruby only (Emerald required)
    const res = await api(
      new Request('http://localhost/discounts/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: scopedCode,
          subtotal: 500.0,
          items: [{ variety: 'Ruby' }],
        }),
      }),
    );
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error.code).toBe('DISCOUNT_INVALID');
    expect(json.error.message).toContain('varieties');
  });

  it('atomically increments redemption count and prevents exceeding max redemptions', async () => {
    if (!hasDb || !api || !db) return;

    // 1. First validation succeeds
    const res1 = await api(
      new Request('http://localhost/discounts/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: maxRedeemCode,
          subtotal: 200.0,
        }),
      }),
    );
    expect(res1.status).toBe(200);
    const discountId = (await res1.json()).data.discount.id;

    // 2. Redeem discount once
    const redeemed = await redeemDiscount(db, discountId);
    expect(redeemed.redemption_count).toBe(1);

    // 3. Second validation must fail because max_redemptions (1) is exhausted
    const res2 = await api(
      new Request('http://localhost/discounts/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: maxRedeemCode,
          subtotal: 200.0,
        }),
      }),
    );
    expect(res2.status).toBe(422);
    const json2 = await res2.json();
    expect(json2.error.code).toBe('DISCOUNT_INVALID');
    expect(json2.error.message).toContain('maximum redemptions');
  });
});
