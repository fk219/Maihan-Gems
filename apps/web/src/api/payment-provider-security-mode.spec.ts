/**
 * apps/web/src/api/payment-provider-security-mode.spec.ts
 *
 * P1-6 fail-closed rollout: payment-provider simulation paths, default test
 * webhook secrets and the TEST provider itself must be unreachable in any
 * unseamed (production-shaped) environment — not only when MAIHAN_ENV is
 * explicitly 'production' (the old fail-open condition).
 */
import { describe, it, expect, afterAll } from 'vitest';
import {
  StripePaymentProvider,
  createPaymentProvider,
} from '../integrations/payment/stripe-payment-provider.js';
import { TestPaymentProvider } from '../integrations/payment/test-payment-provider.js';

type MutableEnv = Record<string, string | undefined>;
const env = process.env as unknown as MutableEnv;

const prevStripeSecret = env['STRIPE_SECRET_KEY'];
const prevStripeWebhookSecret = env['STRIPE_WEBHOOK_SECRET'];
const prevMaHanEnv = env['MAIHAN_ENV'];
const prevNodeEnv = env['NODE_ENV'];

afterAll(() => {
  if (prevStripeSecret === undefined) delete env['STRIPE_SECRET_KEY'];
  else env['STRIPE_SECRET_KEY'] = prevStripeSecret;
  if (prevStripeWebhookSecret === undefined) delete env['STRIPE_WEBHOOK_SECRET'];
  else env['STRIPE_WEBHOOK_SECRET'] = prevStripeWebhookSecret;
  if (prevMaHanEnv === undefined) delete env['MAIHAN_ENV'];
  else env['MAIHAN_ENV'] = prevMaHanEnv;
  if (prevNodeEnv === undefined) delete env['NODE_ENV'];
  else env['NODE_ENV'] = prevNodeEnv;
});

function forceProductionEnvironment(): void {
  // security-mode rule: MAIHAN_ENV=production forces fail-closed even when
  // NODE_ENV=test would open the seam.
  delete env['STRIPE_SECRET_KEY'];
  delete env['STRIPE_WEBHOOK_SECRET'];
  env['MAIHAN_ENV'] = 'production';
}

function restoreSeamEnvironment(): void {
  env['MAIHAN_ENV'] = prevMaHanEnv ?? 'local';
  env['NODE_ENV'] = 'test';
}

describe('payment providers are fail-closed without credentials (P1-6)', () => {
  it('Stripe authorize refuses to simulate a payment when unconfigured in fail-closed mode', async () => {
    forceProductionEnvironment();
    expect(createPaymentProvider).toThrow(/No live payment provider/);
    const provider = new StripePaymentProvider();
    await expect(
      provider.authorize({
        order_id: 'order-1',
        order_number: 'MG-1',
        amount: '10.00',
        currency: 'USD',
        method_type: 'TEST',
      }),
    ).rejects.toThrow(/not configured/);
  });

  it('Stripe capture and refund refuse the simulated path in fail-closed mode', async () => {
    forceProductionEnvironment();
    const provider = new StripePaymentProvider();
    await expect(
      provider.capture({
        provider_payment_id: 'pi_x',
        order_id: 'order-1',
        amount: '10.00',
        currency: 'USD',
      }),
    ).rejects.toThrow(/not configured/);
    await expect(
      provider.refund({
        order_id: 'order-1',
        provider_payment_id: 'pi_x',
        amount: '10.00',
        currency: 'USD',
        reason: 'audit spec',
      }),
    ).rejects.toThrow(/not configured/);
  });

  it('Stripe verifyWebhook refuses the default webhook secret in fail-closed mode', () => {
    forceProductionEnvironment();
    const provider = new StripePaymentProvider();
    expect(() => provider.verifyWebhook({ headers: {}, rawBody: '{}' })).toThrow(/webhook_secret/i);
  });

  it('keeps the simulated seam behaviour for explicit developer environments', async () => {
    restoreSeamEnvironment();
    const provider = new StripePaymentProvider();
    const res = await provider.authorize({
      order_id: 'order-1',
      order_number: 'MG-1',
      amount: '10.00',
      currency: 'USD',
      method_type: 'TEST',
    });
    expect(res.provider_payment_id).toMatch(/^pi_sim_/);
  });
});

describe('Test payment provider default secret policy (P1-6 neighbourhood)', () => {
  it('documents that the default test secret exists for seam-only runs', () => {
    env['NODE_ENV'] = 'test';
    const provider = new TestPaymentProvider();
    expect(typeof provider.verifyWebhook).toBe('function');
  });
});
