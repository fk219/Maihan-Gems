import { describe, it, expect } from 'vitest';
import { TestPaymentProvider } from './test-payment-provider.js';

describe('TestPaymentProvider Adapter (Phase 6 Task 5)', () => {
  const provider = new TestPaymentProvider({ webhookSecret: 'secret_test_key_999' });

  it('authorizes a payment successfully', async () => {
    const result = await provider.authorize({
      order_id: '00000000-0000-0000-0000-000000000001',
      order_number: 'MG-2026-000001',
      amount: '1250.00',
      currency: 'USD',
      method_type: 'TEST',
    });

    expect(result.provider).toBe('TEST');
    expect(result.state).toBe('AUTHORIZED');
    expect(result.provider_payment_id).toMatch(/^pay_test_[a-f0-9]{48}$/);
    expect(result.amount).toBe('1250.00');
    expect(result.currency).toBe('USD');
  });

  it('captures an authorized payment', async () => {
    const result = await provider.capture({
      order_id: '00000000-0000-0000-0000-000000000001',
      provider_payment_id: 'pay_test_12345',
      amount: '1250.00',
      currency: 'USD',
    });

    expect(result.provider).toBe('TEST');
    expect(result.state).toBe('CAPTURED');
    expect(result.captured_amount).toBe('1250.00');
  });

  it('refunds a payment', async () => {
    const result = await provider.refund({
      order_id: '00000000-0000-0000-0000-000000000001',
      provider_payment_id: 'pay_test_12345',
      amount: '250.00',
      currency: 'USD',
      reason: 'Customer returned item',
    });

    expect(result.provider).toBe('TEST');
    expect(result.refunded_amount).toBe('250.00');
    expect(result.provider_refund_id).toMatch(/^ref_test_[a-f0-9]{48}$/);
  });

  it('rejects webhooks missing signature', () => {
    const verified = provider.verifyWebhook({
      rawBody: JSON.stringify({ type: 'payment.captured' }),
      headers: {},
    });

    expect(verified.isValid).toBe(false);
    expect(verified.signatureError).toContain('Missing webhook signature header');
  });

  it('rejects forged webhooks with invalid HMAC signature', () => {
    const rawBody = JSON.stringify({ type: 'payment.captured', id: 'evt_123' });
    const verified = provider.verifyWebhook({
      rawBody,
      headers: {
        'x-maihan-signature': '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff',
      },
    });

    expect(verified.isValid).toBe(false);
    expect(verified.signatureError).toContain('Invalid webhook HMAC signature');
  });

  it('validates authentic webhook with constant-time HMAC and parses payload after verification', () => {
    const payload = {
      id: 'evt_test_payment_100',
      type: 'payment.captured',
      order_id: '00000000-0000-0000-0000-000000000001',
      provider_payment_id: 'pay_test_12345',
      amount: '1250.00',
      currency: 'USD',
      created_at: new Date().toISOString(),
    };
    const rawBody = JSON.stringify(payload);
    const validSignature = provider.signWebhookPayload(rawBody, 'secret_test_key_999');

    const verified = provider.verifyWebhook({
      rawBody,
      headers: {
        'x-maihan-signature': validSignature,
      },
    });

    expect(verified.isValid).toBe(true);
    expect(verified.externalEventId).toBe('evt_test_payment_100');
    expect(verified.eventType).toBe('payment.captured');
    expect(verified.orderId).toBe('00000000-0000-0000-0000-000000000001');
    expect(verified.amount).toBe('1250.00');
  });
});
