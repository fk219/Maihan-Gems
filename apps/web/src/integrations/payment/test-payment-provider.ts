/**
 * apps/web/src/integrations/payment/test-payment-provider.ts
 *
 * Phase 6 Task 5 — Provider-neutral test payment adapter.
 *
 * Authority:
 * - technical_design/13 COMMERCE ARCHITECTURE §97-113.
 * - Charter section 16: No vendor SDK appears in domain or application code.
 * - Payment provider is [UNKNOWN] in source; TestPaymentProvider is the single sanctioned Phase 6 adapter.
 */
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type {
  PaymentAuthorizeInput,
  PaymentAuthorizeResult,
  PaymentCaptureInput,
  PaymentCaptureResult,
  PaymentProvider,
  PaymentRefundInput,
  PaymentRefundResult,
  RawWebhookRequest,
  VerifiedWebhook,
} from '@maihan/contracts';

export class TestPaymentProvider implements PaymentProvider {
  readonly providerName = 'TEST';
  private readonly defaultSecret: string;

  constructor(options: { webhookSecret?: string } = {}) {
    this.defaultSecret = options.webhookSecret ?? 'test_webhook_secret_key_123';
  }

  async authorize(input: PaymentAuthorizeInput): Promise<PaymentAuthorizeResult> {
    const providerPaymentId = `pay_test_${randomBytes(24).toString('hex')}`;
    return {
      provider: this.providerName,
      provider_payment_id: providerPaymentId,
      state: 'AUTHORIZED',
      amount: input.amount,
      currency: input.currency ?? 'USD',
      authorized_at: new Date().toISOString(),
    };
  }

  async capture(input: PaymentCaptureInput): Promise<PaymentCaptureResult> {
    return {
      provider: this.providerName,
      provider_payment_id: input.provider_payment_id,
      state: 'CAPTURED',
      captured_amount: input.amount,
      currency: input.currency ?? 'USD',
      captured_at: new Date().toISOString(),
    };
  }

  async refund(input: PaymentRefundInput): Promise<PaymentRefundResult> {
    const providerRefundId = `ref_test_${randomBytes(24).toString('hex')}`;
    return {
      provider: this.providerName,
      provider_payment_id: input.provider_payment_id,
      provider_refund_id: providerRefundId,
      refunded_amount: input.amount,
      currency: input.currency ?? 'USD',
      refunded_at: new Date().toISOString(),
    };
  }

  verifyWebhook(req: RawWebhookRequest, secret?: string): VerifiedWebhook {
    const rawBodyBuffer =
      typeof req.rawBody === 'string' ? Buffer.from(req.rawBody, 'utf8') : req.rawBody;
    const signingSecret = secret ?? this.defaultSecret;

    const sigHeader =
      req.headers['x-maihan-signature'] ??
      req.headers['x-webhook-signature'] ??
      req.headers['stripe-signature'];

    const signature = Array.isArray(sigHeader) ? sigHeader[0] : sigHeader;

    if (!signature) {
      return {
        isValid: false,
        provider: this.providerName,
        externalEventId: '',
        eventType: 'unknown',
        timestamp: new Date().toISOString(),
        rawPayload: {},
        signatureError: 'Missing webhook signature header',
      };
    }

    const expectedHmac = createHmac('sha256', signingSecret).update(rawBodyBuffer).digest('hex');

    // Constant-time HMAC comparison
    let signatureMatches = false;
    try {
      const sigBuf = Buffer.from(signature, 'hex');
      const expectedBuf = Buffer.from(expectedHmac, 'hex');
      if (sigBuf.length === expectedBuf.length) {
        signatureMatches = timingSafeEqual(sigBuf, expectedBuf);
      }
    } catch {
      signatureMatches = false;
    }

    if (!signatureMatches) {
      return {
        isValid: false,
        provider: this.providerName,
        externalEventId: '',
        eventType: 'unknown',
        timestamp: new Date().toISOString(),
        rawPayload: {},
        signatureError: 'Invalid webhook HMAC signature',
      };
    }

    // Verify BEFORE parse per SoT / ADR-003 / Task 5
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(rawBodyBuffer.toString('utf8'));
    } catch {
      return {
        isValid: false,
        provider: this.providerName,
        externalEventId: '',
        eventType: 'unknown',
        timestamp: new Date().toISOString(),
        rawPayload: {},
        signatureError: 'Malformed JSON payload after valid signature',
      };
    }

    const externalEventId = String(
      parsed['id'] ?? parsed['event_id'] ?? `evt_${randomBytes(16).toString('hex')}`,
    );
    const eventType = String(parsed['type'] ?? parsed['event_type'] ?? 'payment.captured');

    return {
      isValid: true,
      provider: this.providerName,
      externalEventId,
      eventType,
      orderId: parsed['order_id'] ? String(parsed['order_id']) : undefined,
      providerPaymentId: parsed['provider_payment_id']
        ? String(parsed['provider_payment_id'])
        : undefined,
      amount: parsed['amount'] ? String(parsed['amount']) : undefined,
      currency: parsed['currency'] ? String(parsed['currency']) : undefined,
      timestamp: String(parsed['created_at'] ?? new Date().toISOString()),
      rawPayload: parsed,
    };
  }

  signWebhookPayload(payloadString: string, secret?: string): string {
    const signingSecret = secret ?? this.defaultSecret;
    return createHmac('sha256', signingSecret)
      .update(Buffer.from(payloadString, 'utf8'))
      .digest('hex');
  }
}
