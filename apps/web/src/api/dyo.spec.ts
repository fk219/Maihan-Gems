/**
 * apps/web/src/api/dyo.spec.ts
 *
 * Tests for Phase 7 DYO HTTP API & Cart Conversion
 *
 * Scenarios:
 *   - POST /api/v1/dyo/configurations creates new configuration with short code
 *   - GET /api/v1/dyo/configurations/{shortCode} retrieves configuration
 *   - POST /api/v1/dyo/configurations/{shortCode}/validate runs compatibility evaluator
 *   - POST /api/v1/dyo/configurations/{shortCode}/quote produces price snapshot and quote token
 *   - GET /api/v1/dyo/configurations/{shortCode}/compatible-settings lists settings
 *   - POST /api/v1/dyo/configurations/{shortCode}/add-to-cart adds configured piece to cart inside transaction
 */
import { describe, expect, it } from 'vitest';
import { createCatalogApi } from './index.js';
import {
  createCatalogQueryService,
  MemoryCacheStore,
  MemoryGenerationStore,
} from '../modules/catalog/index.js';
import { FakeCatalogPort } from '../modules/catalog/testing/doubles.js';

function queryChunks(query: unknown): unknown[] {
  if (typeof query === 'string' || query === null || typeof query !== 'object') return [query];
  const value = (query as { value?: unknown }).value;
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return [value];
  const children = (query as { queryChunks?: unknown[]; chunks?: unknown[] }).queryChunks
    ?? (query as { chunks?: unknown[] }).chunks
    ?? [];
  return children.flatMap(queryChunks);
}

function queryText(query: unknown): string {
  return queryChunks(query).map((chunk) => typeof chunk === 'string' ? chunk : '').join(' ');
}

describe('Design Your Own (DYO) HTTP API & Cart Conversion (Phase 7)', () => {
  it('creates, retrieves, validates, quotes, and converts DYO configuration to cart', async () => {
    let storedConfig: any = null;
    let configuredProduct: any = null;
    let cartItem: any = null;
    let consumedQuote = false;
    let forceStaleQuote = false;
    let quoteToken: string | null = null;
    let insertedCartSnapshotId: string | null = null;
    let storedCart: any = {
      id: 'cart-123',
      cart_token: 'cart_token_abc',
      currency: 'USD',
      items: [],
      totals: { subtotal_amount: 0, discount_amount: 0, estimated_tax_amount: 0, grand_total: 0 },
    };

    const mockDb: any = {
      transaction: (callback: (tx: any) => Promise<unknown>) => callback(mockDb),
      query: async (statement: unknown, params?: unknown[]) => {
        const query = typeof statement === 'string' ? statement : queryText(statement);
        if (query.includes('INSERT INTO dyo_configurations')) {
          storedConfig = {
            id: 'dyo-cfg-uuid-1',
            configuration_hash: 'sha256:configuration',
            short_code: 'short-code-123',
            jewellery_type: 'RING',
            setting_id: 'setting-1',
            setting_variant_id: 'variant-1',
            gemstone_id: 'gem-1',
            gemstone_pair_id: null,
            state: 'DRAFT',
            compatibility_status: 'UNKNOWN',
            created_at: new Date(),
            updated_at: new Date(),
          };
          return { rows: [storedConfig] };
        }
        if (query.includes('UPDATE dyo_configurations')) {
          storedConfig.state = String(params?.[0] ?? 'VALID');
          storedConfig.compatibility_status = String(params?.[1] ?? 'COMPATIBLE');
          storedConfig.compatibility_detail = JSON.parse(String(params?.[2] ?? '[]'));
          return { rows: [storedConfig] };
        }
        if (query.includes('FROM dyo_configurations')) {
          return { rows: storedConfig ? [storedConfig] : [] };
        }
        return { rows: [] };
      },
      execute: async (statement: unknown) => {
        const query = queryText(statement);
        if (query.includes('INSERT INTO dyo_configurations')) {
          storedConfig = {
            id: 'dyo-cfg-uuid-1',
            configuration_hash: 'sha256:configuration',
            short_code: 'short-code-123',
            jewellery_type: 'RING',
            setting_id: 'setting-1',
            setting_variant_id: 'variant-1',
            gemstone_id: 'gem-1',
            gemstone_pair_id: null,
            state: 'DRAFT',
            compatibility_status: 'UNKNOWN',
            created_at: new Date(),
            updated_at: new Date(),
          };
          return { rows: [storedConfig] };
        }
        if (query.includes('FROM dyo_configurations')) {
          return { rows: storedConfig ? [storedConfig] : [] };
        }
        if (query.includes('FROM gemstones')) {
          if (query.includes('price_evidence')) {
            return { rows: [{ price: forceStaleQuote ? '3400.00' : '3500.00', currency: 'USD', price_evidence: 'OBSERVED' }] };
          }
          return { rows: [{ variety_id: 'variety-1', colour_id: 'colour-1', shape: 'OVAL', weight: 2.5, kind: 'SINGLE' }] };
        }
        if (query.includes('FROM settings s')) {
          return { rows: [{ id: 'setting-1', design_code: '1150', name: 'Solitaire Ring', jewellery_type: 'RING' }] };
        }
        if (query.includes('FROM setting_variants')) {
          return { rows: [{ price: '1200.00', currency: 'USD', price_evidence: 'OBSERVED' }] };
        }
        if (query.includes('FROM setting_compatibility_rules')) {
          return {
            rows: [{
              id: 'rule-allow-1',
              settingId: 'setting-1',
              jewelleryType: 'RING',
              stoneKind: 'SINGLE',
              varietyId: 'variety-1',
              colourId: 'colour-1',
              shape: 'OVAL',
              minWeightCt: 1.0,
              maxWeightCt: 5.0,
              ruleKind: 'ALLOW',
              priority: 100,
              explanation: 'Ring setting accepts single gems up to 5ct',
            }],
          };
        }
        if (query.includes('UPDATE dyo_configurations')) {
          if (query.includes('compatibility_status')) {
            storedConfig.state = storedConfig.state === 'PRICED' ? 'PRICED' : 'VALID';
            storedConfig.compatibility_status = 'COMPATIBLE';
            storedConfig.compatibility_detail = [];
            return { rows: [storedConfig] };
          }
          if (query.includes("state IN ('VALID'::dyo_state, 'PRICED'::dyo_state)")) {
            storedConfig.state = 'PRICED';
            return { rows: [{ id: storedConfig.id }] };
          }
          if (query.includes("state = 'ADDED_TO_CART'::dyo_state")) {
            storedConfig.state = 'ADDED_TO_CART';
            return { rows: [{ id: storedConfig.id }] };
          }
        }
        if (query.includes('INSERT INTO dyo_price_snapshots')) {
          return { rows: [{ id: 'snap-1', total: '4700.00', configuration_id: 'dyo-cfg-uuid-1', currency: 'USD' }] };
        }
        if (query.includes('INSERT INTO dyo_quotes')) {
          quoteToken = 'quote_test';
          return { rows: [] };
        }
        if (query.includes('FROM dyo_quotes')) {
          return { rows: !consumedQuote && quoteToken ? [{ id: 'quote-row-1', price_snapshot_id: 'snap-1' }] : [] };
        }
        if (query.includes('UPDATE dyo_quotes')) {
          consumedQuote = true;
          return { rows: [{ id: 'quote-row-1' }] };
        }
        if (query.includes('FROM dyo_price_snapshots')) {
          if (query.includes('INSERT INTO')) return { rows: [{ id: 'snap-1', total: '4700.00' }] };
          return { rows: [{ id: 'snap-1', total: '4700.00', currency: 'USD' }] };
        }
        if (query.includes('INSERT INTO products')) {
          configuredProduct = { id: 'product-configured-1', slug: 'dyo-short-code-123', price_amount: '4700.00' };
          return { rows: [configuredProduct] };
        }
        if (query.includes('FROM products')) {
          return { rows: [{ id: 'product-configured-1', slug: 'dyo-short-code-123', title: 'Custom ring', state: 'ACTIVE', product_price_amount: '1.00', price_entry_amount: null }] };
        }
        if (query.includes('FROM carts')) {
          return { rows: [{ id: storedCart.id, cart_token: storedCart.cart_token, customer_id: null, anonymous_session_id: null, currency: 'USD', state: 'ACTIVE', pricing_snapshot: null, expires_at: new Date(Date.now() + 86400000), converted_order_id: null, created_at: new Date(), updated_at: new Date() }] };
        }
        if (query.includes('FROM cart_items')) {
          return { rows: cartItem ? [{ ...cartItem, cart_id: storedCart.id, product_slug: 'dyo-short-code-123', product_title: 'Custom RING short-code-123', product_state: 'ACTIVE', product_price_amount: '4700.00', price_entry_amount: null, price_snapshot_id: 'snap-1', dyo_snapshot_amount: '4700.00', added_at: new Date() }] : [] };
        }
        if (query.includes('INSERT INTO cart_items')) {
          insertedCartSnapshotId = queryChunks(statement).find((value) => value === 'snap-1') as string ?? null;
          cartItem = { id: 'item-1', product_id: 'product-configured-1', configuration_id: 'dyo-cfg-uuid-1', quantity: 1, unit_price: '4700.00', price_snapshot_id: insertedCartSnapshotId };
          storedCart.items = [cartItem];
          return { rows: [] };
        }
        if (query.includes('UPDATE cart_items')) return { rows: [] };
        if (query.includes('UPDATE carts')) return { rows: [storedCart] };
        return { rows: [] };
      },
    };

    const service = createCatalogQueryService({
      port: new FakeCatalogPort(),
      store: new MemoryCacheStore(),
      generations: new MemoryGenerationStore(),
      namespace: 'test',
    });

    const api = createCatalogApi({
      service,
      db: mockDb,
    });

    // 1. Create DYO configuration
    const createReq = new Request('https://maihan.gems/api/v1/dyo/configurations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jewelleryType: 'RING',
        settingVariantSku: 'JS1150W14',
        settingId: 'setting-1',
        settingVariantId: 'variant-1',
        gemstoneId: 'gem-1',
        shortCode: 'short-code-123',
      }),
    });
    const createRes = await api(createReq);
    if (createRes.status !== 201) {
      const errJson = await createRes.json();
      console.error('DYO CREATE ERROR:', JSON.stringify(errJson));
    }
    expect(createRes.status).toBe(201);
    const createData = (await createRes.json()) as any;
    expect(createData.data.configuration.short_code).toBe('short-code-123');

    // 2. Validate DYO configuration
    const valReq = new Request('https://maihan.gems/api/v1/dyo/configurations/short-code-123/validate', {
      method: 'POST',
    });
    const valRes = await api(valReq);
    expect(valRes.status).toBe(200);
    const valData = (await valRes.json()) as any;
    expect(valData.data.configuration.compatibility_status).toBe('COMPATIBLE');
    expect(valData.data.configuration.state).toBe('VALID');

    // 3. Price Quote
    const quoteReq = new Request('https://maihan.gems/api/v1/dyo/configurations/short-code-123/quote', {
      method: 'POST',
    });
    const quoteRes = await api(quoteReq);
    expect(quoteRes.status).toBe(200);
    const quoteData = (await quoteRes.json()) as any;
    expect(Number(quoteData.data.priceSnapshot.total)).toBe(4700);
    expect(quoteData.data.quoteToken).toContain('quote_');
    quoteToken = quoteData.data.quoteToken;

    const priceChangedQuoteReq = new Request('https://maihan.gems/api/v1/dyo/configurations/short-code-123/quote', { method: 'POST' });
    const priceChangedQuoteRes = await api(priceChangedQuoteReq);
    expect(priceChangedQuoteRes.status).toBe(200);
    const refreshedQuote = (await priceChangedQuoteRes.json() as any).data;
    expect(refreshedQuote.priceSnapshot.total).toBe('4700.00');
    quoteToken = refreshedQuote.quoteToken;

    forceStaleQuote = true;
    const currentPricingError = await api(new Request('https://maihan.gems/api/v1/dyo/configurations/short-code-123/add-to-cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cartToken: 'cart_token_abc', quoteToken }),
    }));
    expect(currentPricingError.status).toBe(409);
    expect((await currentPricingError.json()).error.code).toBe('PRICE_CHANGED');
    forceStaleQuote = false;

    // 4. Compatible Settings Lookup
    const compReq = new Request('https://maihan.gems/api/v1/dyo/configurations/short-code-123/compatible-settings', {
      method: 'GET',
    });
    const compRes = await api(compReq);
    expect(compRes.status).toBe(200);
    const compData = (await compRes.json()) as any;
    expect(compData.data.compatibleSettings).toHaveLength(1);

    // 5. Add DYO to Cart
    const addCartReq = new Request('https://maihan.gems/api/v1/dyo/configurations/short-code-123/add-to-cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cartToken: 'cart_token_abc',
        quoteToken,
      }),
    });
    const addCartRes = await api(addCartReq);
    expect(addCartRes.status).toBe(200);
    const addCartData = (await addCartRes.json()) as any;
    expect(addCartData.data.state).toBe('ADDED_TO_CART');
    expect(addCartData.data.cart.items[0]).toMatchObject({
      product_id: 'product-configured-1',
      configuration_id: 'dyo-cfg-uuid-1',
      unit_price: '4700.00',
    });
    expect(configuredProduct).toMatchObject({ price_amount: '4700.00' });
    expect(insertedCartSnapshotId).toBe('snap-1');
    expect(consumedQuote).toBe(true);

    const replayResponse = await api(new Request('https://maihan.gems/api/v1/dyo/configurations/short-code-123/add-to-cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cartToken: 'cart_token_abc', quoteToken }),
    }));
    expect(replayResponse.status).toBe(422);
  });
});
