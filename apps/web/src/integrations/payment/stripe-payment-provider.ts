/**
 * apps/web/src/integrations/payment/stripe-payment-provider.ts
 *
 * Phase 4 — Production-ready Stripe REST Payment Provider & Webhook Verifier.
 *
 * Authority:
 * - technical_design/13 COMMERCE ARCHITECTURE §97-113
 * - Charter §16: No vendor SDK in domain or application code; this adapter
 *   uses Web-standard `fetch` and `node:crypto` behind the `PaymentProvider`
 *   interface.
 * - Verifies `Stripe-Signature` (`t=...,v1=...`) HMAC-SHA256 over the raw
 *   request bytes BEFORE JSON parsing, with replay-window enforcement.
 */
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import {
  ContractError,
  type PaymentAuthorizeInput,
  type PaymentAuthorizeResult,
  type PaymentCaptureInput,
  type PaymentCaptureResult,
  type PaymentProvider,
  type PaymentRefundInput,
  type PaymentRefundResult,
  type RawWebhookRequest,
  type VerifiedWebhook,
} from '@maihan/contracts';
import { isFailClosedMode } from '@maihan/config';
import { TestPaymentProvider } from './test-payment-provider.js';

export interface StripePaymentProviderOptions {
  readonly secretKey?: string;
  readonly webhookSecret?: string;
  readonly apiBaseUrl?: string;
  readonly toleranceSeconds?: number;
  readonly fetchImpl?: typeof fetch;
}

export class StripePaymentProvider implements PaymentProvider {
  readonly providerName = 'STRIPE';
  private readonly secretKey: string;
  private readonly webhookSecret: string;
  private readonly apiBaseUrl: string;
  private readonly toleranceSeconds: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: StripePaymentProviderOptions = {}) {
    this.secretKey = options.secretKey ?? process.env['STRIPE_SECRET_KEY'] ?? '';
    this.webhookSecret =
      options.webhookSecret ?? process.env['STRIPE_WEBHOOK_SECRET'] ?? 'whsec_test_default';
    this.apiBaseUrl = (options.apiBaseUrl ?? 'https://api.stripe.com').replace(/\/$/, '');
    this.toleranceSeconds = options.toleranceSeconds ?? 300;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  private toMinorUnits(amount: string): number {
    const num = Number(amount);
    if (!Number.isFinite(num) || num < 0) return 0;
    return Math.round(num * 100);
  }

  private fromMinorUnits(cents: number): string {
    return (cents / 100).toFixed(2);
  }

  async authorize(input: PaymentAuthorizeInput): Promise<PaymentAuthorizeResult> {
    if (!this.secretKey) {
      // P1-6 fail-closed: in any unseamed (production-shaped) environment the
      // missing key is a configuration failure, never a silent simulated
      // payment. The simulation stays dev/seam-only.
      if (isFailClosedMode()) {
        throw new ContractError(
          'INTERNAL',
          'Stripe credentials are not configured; refusing to simulate a payment in fail-closed mode.',
        );
      }
      return {
        provider: this.providerName,
        provider_payment_id: `pi_sim_${randomBytes(16).toString('hex')}`,
        state: 'AUTHORIZED',
        amount: input.amount,
        currency: input.currency ?? 'USD',
        authorized_at: new Date().toISOString(),
      };
    }

    const params = new URLSearchParams({
      amount: String(this.toMinorUnits(input.amount)),
      currency: (input.currency ?? 'USD').toLowerCase(),
      capture_method: 'manual',
      'metadata[order_id]': input.order_id,
    });

    const response = await this.fetchImpl(`${this.apiBaseUrl}/v1/payment_intents`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        ...(input.idempotency_key ? { 'Idempotency-Key': input.idempotency_key } : {}),
      },
      body: params.toString(),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`Stripe authorize failed with HTTP ${response.status}`);
    }

    const body = (await response.json()) as {
      id: string;
      amount: number;
      currency: string;
      status?: string;
    };
    // A PaymentIntent created without a payment method is only
    // `requires_payment_method`; it is NOT authorized and must never be
    // recorded as such. Manual capture intents are authorized when Stripe
    // reports `requires_capture`.
    if (body.status !== 'requires_capture' && body.status !== 'succeeded') {
      throw new Error(
        `Stripe authorize did not produce an authorized payment (status: ${body.status ?? 'unknown'}).`,
      );
    }
    return {
      provider: this.providerName,
      provider_payment_id: body.id,
      state: 'AUTHORIZED',
      amount: this.fromMinorUnits(body.amount),
      currency: body.currency.toUpperCase(),
      authorized_at: new Date().toISOString(),
    };
  }

  async capture(input: PaymentCaptureInput): Promise<PaymentCaptureResult> {
    if (!this.secretKey) {
      if (isFailClosedMode()) {
        throw new ContractError(
          'INTERNAL',
          'Stripe credentials are not configured; refusing to simulate a capture in fail-closed mode.',
        );
      }
      return {
        provider: this.providerName,
        provider_payment_id: input.provider_payment_id,
        state: 'CAPTURED',
        captured_amount: input.amount,
        currency: input.currency ?? 'USD',
        captured_at: new Date().toISOString(),
      };
    }

    const params = new URLSearchParams({
      amount_to_capture: String(this.toMinorUnits(input.amount)),
    });

    const response = await this.fetchImpl(
      `${this.apiBaseUrl}/v1/payment_intents/${encodeURIComponent(input.provider_payment_id)}/capture`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          ...(input.idempotency_key ? { 'Idempotency-Key': input.idempotency_key } : {}),
        },
        body: params.toString(),
        signal: AbortSignal.timeout(15000),
      },
    );

    if (!response.ok) {
      throw new Error(`Stripe capture failed with HTTP ${response.status}`);
    }

    const body = (await response.json()) as { id: string; amount_received: number; currency: string };
    return {
      provider: this.providerName,
      provider_payment_id: body.id,
      state: 'CAPTURED',
      captured_amount: this.fromMinorUnits(body.amount_received),
      currency: body.currency.toUpperCase(),
      captured_at: new Date().toISOString(),
    };
  }

  async refund(input: PaymentRefundInput): Promise<PaymentRefundResult> {
    if (!this.secretKey) {
      if (isFailClosedMode()) {
        throw new ContractError(
          'INTERNAL',
          'Stripe credentials are not configured; refusing to simulate a refund in fail-closed mode.',
        );
      }
      return {
        provider: this.providerName,
        provider_payment_id: input.provider_payment_id,
        provider_refund_id: `re_sim_${randomBytes(16).toString('hex')}`,
        refunded_amount: input.amount,
        currency: input.currency ?? 'USD',
        refunded_at: new Date().toISOString(),
      };
    }

    const params = new URLSearchParams({
      payment_intent: input.provider_payment_id,
      amount: String(this.toMinorUnits(input.amount)),
    });

    const response = await this.fetchImpl(`${this.apiBaseUrl}/v1/refunds`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        ...(input.idempotency_key ? { 'Idempotency-Key': input.idempotency_key } : {}),
      },
      body: params.toString(),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`Stripe refund failed with HTTP ${response.status}`);
    }

    const body = (await response.json()) as { id: string; amount: number; currency: string };
    return {
      provider: this.providerName,
      provider_payment_id: input.provider_payment_id,
      provider_refund_id: body.id,
      refunded_amount: this.fromMinorUnits(body.amount),
      currency: body.currency.toUpperCase(),
      refunded_at: new Date().toISOString(),
    };
  }

  verifyWebhook(req: RawWebhookRequest, secret?: string): VerifiedWebhook {
    // P1-6 fail-closed: the secret is required in every unseamed
    // (production-shaped) environment — not only when MAIHAN_ENV is set.
    if (isFailClosedMode() && !secret && !process.env['STRIPE_WEBHOOK_SECRET']) {
      throw new Error('STRIPE_WEBHOOK_SECRET must be configured in fail-closed mode.');
    }
    const rawBodyBuffer =
      typeof req.rawBody === 'string' ? Buffer.from(req.rawBody, 'utf8') : req.rawBody;
    const rawBodyString = rawBodyBuffer.toString('utf8');
    const signingSecret = secret ?? this.webhookSecret;

    const stripeSigRaw = req.headers['stripe-signature'];
    const stripeHeader = Array.isArray(stripeSigRaw) ? stripeSigRaw[0] : stripeSigRaw;

    if (stripeHeader && stripeHeader.includes('v1=')) {
      const parts = stripeHeader.split(',').map((p) => p.trim());
      const tPart = parts.find((p) => p.startsWith('t='))?.slice(2);
      const v1Part = parts.find((p) => p.startsWith('v1='))?.slice(3);

      if (!tPart || !v1Part) {
        return {
          isValid: false,
          provider: this.providerName,
          externalEventId: '',
          eventType: 'unknown',
          timestamp: new Date().toISOString(),
          rawPayload: {},
          signatureError: 'Malformed Stripe-Signature header',
        };
      }

      const timestampSec = Number(tPart);
      const nowSec = Math.floor(Date.now() / 1000);
      if (
        !Number.isFinite(timestampSec) ||
        Math.abs(nowSec - timestampSec) > this.toleranceSeconds
      ) {
        return {
          isValid: false,
          provider: this.providerName,
          externalEventId: '',
          eventType: 'unknown',
          timestamp: new Date().toISOString(),
          rawPayload: {},
          signatureError: 'Stripe webhook timestamp outside replay tolerance window',
        };
      }

      const signedPayload = `${tPart}.${rawBodyString}`;
      const expectedHmac = createHmac('sha256', signingSecret)
        .update(Buffer.from(signedPayload, 'utf8'))
        .digest('hex');

      let matched = false;
      try {
        const sigBuf = Buffer.from(v1Part, 'hex');
        const expBuf = Buffer.from(expectedHmac, 'hex');
        if (sigBuf.length === expBuf.length) {
          matched = timingSafeEqual(sigBuf, expBuf);
        }
      } catch {
        matched = false;
      }

      if (!matched) {
        return {
          isValid: false,
          provider: this.providerName,
          externalEventId: '',
          eventType: 'unknown',
          timestamp: new Date().toISOString(),
          rawPayload: {},
          signatureError: 'Invalid Stripe v1 HMAC signature',
        };
      }

      let parsed: Record<string, unknown> = {};
      try {
        parsed = JSON.parse(rawBodyString) as Record<string, unknown>;
      } catch {
        return {
          isValid: false,
          provider: this.providerName,
          externalEventId: '',
          eventType: 'unknown',
          timestamp: new Date().toISOString(),
          rawPayload: {},
          signatureError: 'Malformed JSON payload after valid Stripe signature',
        };
      }

      const dataObj = ((parsed['data'] as Record<string, unknown> | undefined)?.['object'] ??
        {}) as Record<string, unknown>;
      const metadata = (dataObj['metadata'] ?? {}) as Record<string, unknown>;
      const rawType = String(parsed['type'] ?? 'payment.captured');
      const normalizedType =
        rawType === 'payment_intent.succeeded' ? 'payment.captured' : rawType;

      return {
        isValid: true,
        provider: this.providerName,
        externalEventId: String(parsed['id'] ?? `evt_${randomBytes(12).toString('hex')}`),
        eventType: normalizedType,
        orderId: metadata['order_id']
          ? String(metadata['order_id'])
          : parsed['order_id']
            ? String(parsed['order_id'])
            : undefined,
        providerPaymentId: dataObj['id']
          ? String(dataObj['id'])
          : parsed['provider_payment_id']
            ? String(parsed['provider_payment_id'])
            : undefined,
        amount:
          typeof dataObj['amount_received'] === 'number'
            ? this.fromMinorUnits(dataObj['amount_received'])
            : parsed['amount']
              ? String(parsed['amount'])
              : undefined,
        currency: dataObj['currency']
          ? String(dataObj['currency']).toUpperCase()
          : parsed['currency']
            ? String(parsed['currency'])
            : 'USD',
        timestamp: new Date(timestampSec * 1000).toISOString(),
        rawPayload: parsed,
      };
    }

    // Fallback to raw HMAC verification for provider-neutral webhook tests
    const fallback = new TestPaymentProvider({ webhookSecret: signingSecret });
    return fallback.verifyWebhook(req, signingSecret);
  }

  signStripeWebhookPayload(
    payloadString: string,
    timestampSec = Math.floor(Date.now() / 1000),
    secret?: string,
  ): string {
    const signingSecret = secret ?? this.webhookSecret;
    const digest = createHmac('sha256', signingSecret)
      .update(Buffer.from(`${timestampSec}.${payloadString}`, 'utf8'))
      .digest('hex');
    return `t=${timestampSec},v1=${digest}`;
  }
}

export function createPaymentProvider(): PaymentProvider {
  if (process.env['STRIPE_SECRET_KEY'] || process.env['STRIPE_WEBHOOK_SECRET']) {
    return new StripePaymentProvider();
  }
  // P1-6 fail-closed: no defaults anywhere outside the explicit dev seam.
  if (isFailClosedMode()) {
    throw new Error('No live payment provider is configured.');
  }
  return new TestPaymentProvider();
}
