/**
 * apps/web/src/api/refund-handlers.ts
 *
 * Phase 6 Task 11 — Refund request and approval workflow route handlers.
 *
 * Authority:
 * - technical_design/13 COMMERCE ARCHITECTURE §Refunds.
 * - Invariant: Bounds check amount <= captured_amount (REFUND_EXCEEDS_CAPTURED).
 */
import {
  ApproveRefundInputSchema,
  ContractError,
  RejectRefundInputSchema,
  RequestRefundInputSchema,
} from '@maihan/contracts';
import {
  approveRefund,
  executeRefund,
  getOrderById,
  getOrderRefunds,
  getPaymentById,
  getRefund,
  rejectRefund,
  requestRefund,
  type CatalogDatabase,
} from '@maihan/db';
import { ADMIN_ROLES } from '@maihan/domain';
import { StripePaymentProvider } from '../integrations/payment/stripe-payment-provider.js';
import { TestPaymentProvider } from '../integrations/payment/test-payment-provider.js';
import { extractSessionToken, resolveRequestActor, resolveRequestActorWithCsrf } from './auth-handlers.js';
import { isDevSeamEnabled, isFailClosedMode } from '@maihan/config';
import type { RouteHandler, RouteContext } from './handlers.js';
import { requireIdentifier } from './query.js';

function getDb(ctx: RouteContext): CatalogDatabase {
  if (ctx.db) return ctx.db;
  const svc = ctx.service as unknown as { port?: { db?: CatalogDatabase } };
  if (svc.port?.db) return svc.port.db;
  throw new ContractError('INTERNAL', 'Database connection not available.');
}

async function parseBody(request?: Request): Promise<unknown> {
  if (!request) return {};
  try {
    const text = await request.text();
    if (text.trim().length === 0) return {};
    return JSON.parse(text);
  } catch {
    throw new ContractError('VALIDATION_FAILED', 'Malformed JSON in request body.');
  }
}

async function assertAdminRefundCapability(ctx: RouteContext): Promise<string | undefined> {
  const sessionToken = extractSessionToken(ctx.request);
  const headerCustomerId = ctx.request?.headers.get('x-customer-id');
  if (headerCustomerId && !sessionToken) {
    throw new ContractError('FORBIDDEN', 'Customers are not permitted to approve, reject, or execute refunds.');
  }
  if (sessionToken) {
    const actor = await resolveRequestActor(ctx);
    if (!actor) {
      throw new ContractError('UNAUTHORIZED', 'Valid session required.');
    }
    if (!(ADMIN_ROLES as readonly string[]).includes(actor.role)) {
      throw new ContractError('FORBIDDEN', 'Administrative role is required to approve, reject, or execute refunds.');
    }
    if (actor.role !== 'ADMIN_SUPER' && actor.role !== 'COMMERCE_OPERATOR') {
      throw new ContractError('FORBIDDEN', 'Your administrative role does not permit refund decisions.');
    }
    return actor.customer_id;
  }
  // R1-1 fail-closed: admin auth enforced unless explicit dev seam.
  if (!isDevSeamEnabled()) {
    throw new ContractError('UNAUTHORIZED', 'Administrative authentication required.');
  }
  return undefined;
}

export const REFUND_HANDLERS: Record<string, RouteHandler> = {
  async requestRefundHandler(ctx) {
    const db = getDb(ctx);
    const orderId = requireIdentifier(ctx.params['orderId'], 'orderId');
    const sessionToken = extractSessionToken(ctx.request);
    const actor = sessionToken ? await resolveRequestActorWithCsrf(ctx) : null;
    if (sessionToken && !actor) {
      throw new ContractError('UNAUTHORIZED', 'Valid session required.');
    }
    if (actor?.role === 'VENDOR') {
      throw new ContractError('FORBIDDEN', 'Vendors cannot request customer order refunds.');
    }
    // P1-4 identity contract: the session is the ONLY customer identity.
    const isAdmin = actor && (ADMIN_ROLES as readonly string[]).includes(actor.role);
    if (!isAdmin) {
      const order = await getOrderById(db, orderId);
      if (order.customer_id) {
        if (actor?.customer_id && order.customer_id !== actor.customer_id) {
          throw new ContractError('FORBIDDEN', 'You do not have permission to request a refund for another customer’s order.');
        }
        if (!actor?.customer_id && !isDevSeamEnabled()) {
          throw new ContractError('UNAUTHORIZED', 'Authentication required to request a refund.');
        }
      } else {
        // Guest orders have no owner to match against: only administrators
        // may request refunds on them (guests are directed to support).
        if (!isDevSeamEnabled()) {
          throw new ContractError('UNAUTHORIZED', 'Please contact support to request a refund for this order.');
        }
      }
    }
    const body = await parseBody(ctx.request);
    const input = RequestRefundInputSchema.parse(body);
    const refund = await requestRefund(db, {
      orderId,
      amount: input.amount,
      reason: input.reason,
      requested_by: actor?.customer_id,
    });
    return {
      status: 201,
      body: { data: refund },
    };
  },

  async listOrderRefundsHandler(ctx) {
    const db = getDb(ctx);
    const orderId = requireIdentifier(ctx.params['orderId'], 'orderId');
    const sessionToken = extractSessionToken(ctx.request);
    const actor = sessionToken ? await resolveRequestActorWithCsrf(ctx) : null;
    if (sessionToken && !actor) {
      throw new ContractError('UNAUTHORIZED', 'Valid session required.');
    }
    if (actor?.role === 'VENDOR') {
      throw new ContractError('FORBIDDEN', 'Vendors cannot view customer order refunds.');
    }
    // P1-4 identity contract: the session is the ONLY customer identity.
    const isAdmin = actor && (ADMIN_ROLES as readonly string[]).includes(actor.role);
    if (!isAdmin) {
      const order = await getOrderById(db, orderId);
      if (order.customer_id) {
        if (actor?.customer_id && order.customer_id !== actor.customer_id) {
          throw new ContractError('FORBIDDEN', 'You do not have permission to view refunds for another customer’s order.');
        }
        if (!actor?.customer_id && !isDevSeamEnabled()) {
          throw new ContractError('UNAUTHORIZED', 'Authentication required to view order refunds.');
        }
      } else if (!isDevSeamEnabled()) {
        throw new ContractError('UNAUTHORIZED', 'Please contact support to view refunds for this order.');
      }
    }
    const refunds = await getOrderRefunds(db, orderId);
    return {
      status: 200,
      body: { data: refunds },
    };
  },

  async approveRefundHandler(ctx) {
    const db = getDb(ctx);
    const adminId = await assertAdminRefundCapability(ctx);
    const refundId = requireIdentifier(ctx.params['refundId'], 'refundId');
    const body = await parseBody(ctx.request);
    const input = ApproveRefundInputSchema.parse(body);
    const refund = await approveRefund(db, {
      refundId,
      approved_by: input.approved_by ?? adminId,
    });
    return {
      status: 200,
      body: { data: refund },
    };
  },

  async rejectRefundHandler(ctx) {
    const db = getDb(ctx);
    await assertAdminRefundCapability(ctx);
    const refundId = requireIdentifier(ctx.params['refundId'], 'refundId');
    const body = await parseBody(ctx.request);
    const input = RejectRefundInputSchema.parse(body);
    const refund = await rejectRefund(db, {
      refundId,
      reason: input.reason,
    });
    return {
      status: 200,
      body: { data: refund },
    };
  },

  async executeRefundHandler(ctx) {
    const db = getDb(ctx);
    await assertAdminRefundCapability(ctx);
    const refundId = requireIdentifier(ctx.params['refundId'], 'refundId');

    const refundRecord = await getRefund(db, refundId);
    if (refundRecord.state !== 'APPROVED' && refundRecord.state !== 'PROCESSING') {
      throw new ContractError('UNPROCESSABLE', `Cannot execute refund in "${refundRecord.state}" state.`);
    }
    const payment = await getPaymentById(db, refundRecord.payment_id);
    if (!payment) {
      throw new ContractError('UNPROCESSABLE', 'The refund payment record does not exist.');
    }

    // P1-6 fail-closed: the TEST provider never moves money at scale; refuse
    // in every unseamed (production-shaped) environment.
    if (isFailClosedMode() && payment.provider === 'TEST') {
      throw new ContractError('INTERNAL', 'The test payment provider cannot refund money in fail-closed mode.');
    }
    if (payment.provider === 'STRIPE' && !process.env['STRIPE_SECRET_KEY']) {
      throw new ContractError('INTERNAL', 'Stripe credentials are not configured.');
    }

    const provider = payment.provider === 'STRIPE'
      ? new StripePaymentProvider()
      : new TestPaymentProvider();
    const providerResult = await provider.refund({
      order_id: refundRecord.order_id,
      provider_payment_id: payment.provider_payment_id,
      amount: refundRecord.amount,
      currency: refundRecord.currency,
      reason: refundRecord.reason,
      idempotency_key: `refund:${refundId}`,
    });

    const refund = await executeRefund(db, refundId, providerResult.provider_refund_id);
    return {
      status: 200,
      body: { data: refund, provider: providerResult.provider },
    };
  },
};
