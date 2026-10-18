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
  rejectRefund,
  requestRefund,
  type CatalogDatabase,
} from '@maihan/db';
import { ADMIN_ROLES } from '@maihan/domain';
import { extractSessionToken, resolveRequestActor } from './auth-handlers.js';
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
  if (process.env['MAIHAN_ENV'] === 'production') {
    throw new ContractError('UNAUTHORIZED', 'Administrative authentication required.');
  }
  return undefined;
}

export const REFUND_HANDLERS: Record<string, RouteHandler> = {
  async requestRefundHandler(ctx) {
    const db = getDb(ctx);
    const orderId = requireIdentifier(ctx.params['orderId'], 'orderId');
    const actor = await resolveRequestActor(ctx);
    const headerCustomerId = ctx.request?.headers.get('x-customer-id');
    if (actor?.role === 'CUSTOMER' || headerCustomerId) {
      const order = await getOrderById(db, orderId);
      const effectiveCustomerId = actor?.customer_id ?? headerCustomerId;
      if (order.customer_id && order.customer_id !== effectiveCustomerId) {
        throw new ContractError('FORBIDDEN', 'You do not have permission to request a refund for another customer’s order.');
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
    const actor = await resolveRequestActor(ctx);
    const headerCustomerId = ctx.request?.headers.get('x-customer-id');
    if (actor?.role === 'CUSTOMER' || headerCustomerId) {
      const order = await getOrderById(db, orderId);
      const effectiveCustomerId = actor?.customer_id ?? headerCustomerId;
      if (order.customer_id && order.customer_id !== effectiveCustomerId) {
        throw new ContractError('FORBIDDEN', 'You do not have permission to view refunds for another customer’s order.');
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
    const refund = await executeRefund(db, refundId);
    return {
      status: 200,
      body: { data: refund },
    };
  },
};
