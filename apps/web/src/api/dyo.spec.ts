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

describe('Design Your Own (DYO) HTTP API & Cart Conversion (Phase 7)', () => {
  it('creates, retrieves, validates, quotes, and converts DYO configuration to cart', async () => {
    let storedConfig: any = null;
    let storedCart: any = {
      id: 'cart-123',
      cart_token: 'cart_token_abc',
      currency: 'USD',
      items: [],
      totals: { subtotal_amount: 0, discount_amount: 0, estimated_tax_amount: 0, grand_total: 0 },
    };

    const mockDb: any = {
      query: async (sql: string, params: any[]) => {
        if (sql.includes('INSERT INTO dyo_configurations')) {
          storedConfig = {
            id: 'dyo-cfg-uuid-1',
            configuration_hash: params[0],
            short_code: params[1] || 'short-code-123',
            jewellery_type: params[2],
            setting_id: params[3],
            setting_variant_id: params[4],
            gemstone_id: params[5],
            state: 'DRAFT',
            compatibility_status: 'UNKNOWN',
            created_at: new Date(),
            updated_at: new Date(),
          };
          return { rows: [storedConfig] };
        }
        if (sql.includes('FROM dyo_configurations WHERE short_code = $1')) {
          return { rows: storedConfig ? [storedConfig] : [] };
        }
        if (sql.includes('SELECT base_price::float as price FROM gemstones')) {
          return { rows: [{ price: 3500 }] };
        }
        if (sql.includes('SELECT base_price::float as price FROM setting_variants')) {
          return { rows: [{ price: 1200 }] };
        }
        if (sql.includes('FROM gemstones WHERE id = $1')) {
          return {
            rows: [
              {
                variety_id: 'variety-1',
                colour_id: 'colour-1',
                shape: 'OVAL',
                weight: 2.5,
                kind: 'SINGLE',
                jewellery_type: 'RING',
              },
            ],
          };
        }
        if (sql.includes('FROM setting_compatibility_rules')) {
          return {
            rows: [
              {
                id: 'rule-allow-1',
                settingId: params[0],
                jewelleryType: 'RING',
                stoneKind: 'SINGLE',
                minWeightCt: 1.0,
                maxWeightCt: 5.0,
                ruleKind: 'ALLOW',
                priority: 100,
                explanation: 'Ring setting accepts single gems up to 5ct',
              },
            ],
          };
        }
        if (sql.includes('UPDATE dyo_configurations')) {
          if (sql.includes('state = $1::dyo_state')) {
            storedConfig.state = params[0];
            storedConfig.compatibility_status = params[1];
            storedConfig.compatibility_detail = JSON.parse(params[2]);
            return { rows: [storedConfig] };
          }
          if (sql.includes("state = 'PRICED'::dyo_state")) {
            storedConfig.state = 'PRICED';
            return { rows: [storedConfig] };
          }
          if (sql.includes("state = 'ADDED_TO_CART'::dyo_state")) {
            storedConfig.state = 'ADDED_TO_CART';
            return { rows: [storedConfig] };
          }
        }
        if (sql.includes('INSERT INTO dyo_price_snapshots')) {
          return {
            rows: [
              {
                id: 'snap-1',
                configuration_id: params[0],
                gemstone_component: params[1],
                setting_component: params[2],
                total: params[7],
                currency: params[8],
              },
            ],
          };
        }
        if (sql.includes('INSERT INTO dyo_quotes')) {
          return { rows: [] };
        }
        if (sql.includes('FROM settings s')) {
          return {
            rows: [
              { id: 'setting-1', design_code: '1150', name: 'Solitaire Ring', jewellery_type: 'RING' },
            ],
          };
        }
        if (sql.includes('SELECT id FROM products WHERE state =')) {
          return { rows: [{ id: 'product-active-1' }] };
        }
        // Cart repository mock queries
        if (sql.includes('SELECT id, cart_token, state')) {
          return { rows: [storedCart] };
        }
        if (sql.includes('SELECT ci.*, p.slug as product_slug')) {
          return { rows: [] };
        }
        if (sql.includes('INSERT INTO cart_items')) {
          return { rows: [{ id: 'item-1', cart_id: storedCart.id, product_id: 'product-active-1', quantity: 1 }] };
        }
        if (sql.includes('UPDATE carts')) {
          return { rows: [storedCart] };
        }
        return { rows: [] };
      },
      execute: async (sqlQuery: any) => {
        let queryText = '';
        if (typeof sqlQuery === 'string') {
          queryText = sqlQuery;
        } else if (sqlQuery && Array.isArray(sqlQuery.queryChunks)) {
          queryText = sqlQuery.queryChunks.map((c: any) => (typeof c === 'string' ? c : c?.value ?? '')).join(' ');
        } else {
          queryText = JSON.stringify(sqlQuery);
        }

        if (queryText.includes('FROM carts') || queryText.includes('carts WHERE cart_token')) {
          return {
            rows: [
              {
                id: storedCart.id,
                state: 'ACTIVE',
                expires_at: new Date(Date.now() + 86400000),
              },
            ],
          };
        }
        if (queryText.includes('FROM products') || queryText.includes('products WHERE id')) {
          return {
            rows: [
              {
                id: 'product-active-1',
                slug: 'active-piece-1',
                title: 'Active Configured Piece',
                price_amount: '4700.00',
                currency: 'USD',
                state: 'ACTIVE',
                availability: true,
              },
            ],
          };
        }
        if (queryText.includes('INSERT INTO cart_items')) {
          storedCart.items.push({
            id: 'item-1',
            cart_id: storedCart.id,
            product_id: 'product-active-1',
            quantity: 1,
            unit_price_snapshot: '4700.00',
            line_total: '4700.00',
          });
          return { rows: [] };
        }
        if (queryText.includes('FROM cart_items') || queryText.includes('cart_items ci')) {
          return {
            rows: [
              {
                id: 'item-1',
                cart_id: storedCart.id,
                product_id: 'product-active-1',
                product_slug: 'active-piece-1',
                product_title: 'Active Configured Piece',
                product_state: 'ACTIVE',
                product_price_amount: '4700.00',
                price_entry_amount: '4700.00',
                unit_price: '4700.00',
                quantity: 1,
                added_at: new Date(),
                engraving_text: null,
                options: null,
              },
            ],
          };
        }
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
    expect(quoteData.data.priceSnapshot.total).toBe(4700);
    expect(quoteData.data.quoteToken).toContain('quote_');

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
      }),
    });
    const addCartRes = await api(addCartReq);
    expect(addCartRes.status).toBe(200);
    const addCartData = (await addCartRes.json()) as any;
    expect(addCartData.data.state).toBe('ADDED_TO_CART');
  });
});
