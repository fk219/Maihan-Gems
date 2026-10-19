import { describe, expect, it } from 'vitest';
import { PgDialect, type SQL } from 'drizzle-orm/pg-core';
import type { CheckoutSessionDto, PricingSnapshotDto } from '@maihan/contracts';
import { placeOrder } from './order-repository.js';

const dialect = new PgDialect();

function queryDetails(statement: unknown): { text: string; params: unknown[] } {
  const query = dialect.sqlToQuery(statement as SQL);
  return { text: query.sql, params: query.params };
}

describe('Order repository DYO snapshots', () => {
  it('freezes the configuration and the price snapshot selected by the cart item', async () => {
    const cartId = 'cart-1';
    const productId = 'product-1';
    const configurationId = 'configuration-1';
    const priceSnapshotId = 'snapshot-cart-selected';
    const itemSnapshot = {
      configuration_id: configurationId,
      configuration_hash: 'sha256:configuration',
      short_code: 'short123',
      jewellery_type: 'RING',
      setting_variant_id: 'variant-1',
      gemstone_id: 'gem-1',
      selected_options: { metal: '18K_YELLOW_GOLD' },
      price_snapshot_id: priceSnapshotId,
      gemstone_component: '3500.00',
      setting_component: '1200.00',
      total: '4700.00',
      currency: 'USD',
      pricing_rule_version: '1',
      breakdown: { gemstone: '3500.00', setting: '1200.00' },
    };
    const pricingSnapshot: PricingSnapshotDto = {
      currency: 'USD',
      subtotal: '4700.00',
      discount_total: '0.00',
      shipping_total: '50.00',
      tax_total: '0.00',
      grand_total: '4750.00',
      item_count: 1,
      computed_at: new Date().toISOString(),
    };
    const checkoutSession: CheckoutSessionDto = {
      id: 'checkout-1',
      cart_token: 'cart-token',
      customer_id: null,
      email: 'buyer@example.com',
      current_step: 'CONFIRM',
      pricing_snapshot: pricingSnapshot,
      shipping_address: {
        full_name: 'Buyer',
        line1: '1 Main Street',
        city: 'New York',
        postal_code: '10001',
        country_code: 'US',
      },
      shipping_method: null,
      payment_intent_id: 'payment-1',
      reservation_expires_at: new Date(Date.now() + 60_000).toISOString(),
      created_at: new Date().toISOString(),
      completed_order_id: null,
    };
    const orderRow = {
      id: 'order-1',
      order_number: 'MG-2026-000001',
      customer_id: null,
      email: 'buyer@example.com',
      state: 'PENDING_PAYMENT',
      currency: 'USD',
      subtotal: '4700.00',
      discount_total: '0.00',
      shipping_total: '50.00',
      tax_total: '0.00',
      grand_total: '4750.00',
      pricing_snapshot: pricingSnapshot,
      shipping_address: checkoutSession.shipping_address,
      billing_address: checkoutSession.shipping_address,
      customer_note: null,
      placed_at: new Date(),
      idempotency_key: 'order-idempotency-key',
      version: 1,
      created_at: new Date(),
    };
    let insertedConfigurationSnapshot: string | undefined;
    let configurationLookup: { text: string; params: unknown[] } | undefined;

    const db: any = {
      execute: async (statement: unknown) => {
        const { text, params } = queryDetails(statement);
        if (text.includes('SELECT id FROM orders WHERE idempotency_key')) return { rows: [] };
        if (text.includes('FROM checkout_sessions')) return { rows: [{ payload: checkoutSession, state: 'ACTIVE', reservation_expires_at: checkoutSession.reservation_expires_at }] };
        if (text.includes('SELECT') && text.includes('FROM carts')) {
          return { rows: [{ id: cartId, cart_token: 'cart-token', customer_id: null, anonymous_session_id: null, currency: 'USD', state: 'ACTIVE', pricing_snapshot: null, expires_at: new Date(Date.now() + 60_000), converted_order_id: null, created_at: new Date(), updated_at: new Date() }] };
        }
        if (text.includes('SELECT count(*)::int AS cnt FROM orders')) return { rows: [{ cnt: 0 }] };
        if (text.includes('SELECT id FROM orders WHERE order_number')) return { rows: [] };
        if (text.includes('INSERT INTO orders')) return { rows: [{ id: orderRow.id }] };
        if (text.includes('FROM products p')) return { rows: [{ id: 'gem-1', gem_ref: 'GEM-1', variety: 'Sapphire', shape: 'OVAL', carat_weight: '2.50' }] };
        if (text.includes('FROM certificates c')) return { rows: [] };
        if (text.includes('FROM dyo_configurations c')) {
          configurationLookup = { text, params };
          return { rows: [itemSnapshot] };
        }
        if (text.includes('FROM cart_items ci') && text.includes('JOIN products p ON p.id = ci.product_id')) {
          return { rows: [{ id: 'cart-item-1', cart_id: cartId, product_id: productId, configuration_id: configurationId, price_snapshot_id: priceSnapshotId, dyo_snapshot_amount: '4700.00', quantity: 1, unit_price: '4700.00', engraving_text: null, options: { message: 'engraving' }, added_at: new Date(), product_slug: 'dyo-short123', product_title: 'Configured ring', product_state: 'ACTIVE', product_price_amount: '1.00', price_entry_amount: '1.00' }] };
        }
        if (text.includes('INSERT INTO order_items')) {
          insertedConfigurationSnapshot = params[5] as string | undefined;
          return { rows: [] };
        }
        if (text.includes('UPDATE checkout_sessions')) return { rows: [{ id: 'checkout-job-1' }] };
        if (text.includes('FROM orders') && text.includes('WHERE id =')) return { rows: [orderRow] };
        if (text.includes('FROM order_items') && text.includes('WHERE order_id =')) {
          return { rows: [{ id: 'order-item-1', order_id: orderRow.id, product_id: productId, configuration_id: configurationId, sku_snapshot: 'dyo-short123', title_snapshot: 'Configured ring', configuration_snapshot: itemSnapshot, gem_snapshot: {}, document_snapshot: null, quantity: 1, unit_price: '4700.00', line_total: '4700.00', production_days: null, state: 'PENDING' }] };
        }
        return { rows: [] };
      },
    };

    const order = await placeOrder(db, {
      checkout_session_id: checkoutSession.id,
      idempotency_key: 'order-idempotency-key',
    });

    expect(order.items[0]?.configuration_snapshot).toEqual(itemSnapshot);
    expect(order.items[0]?.unit_price).toBe('4700.00');
    expect(insertedConfigurationSnapshot).toBe(JSON.stringify(itemSnapshot));
    expect(configurationLookup?.text).toContain('ci.price_snapshot_id');
    expect(configurationLookup?.params).toContain(cartId);
    expect(configurationLookup?.params).toContain(productId);
    expect(configurationLookup?.params).toContain(configurationId);
  });
});
