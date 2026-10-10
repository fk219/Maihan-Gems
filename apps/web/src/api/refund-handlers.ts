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
  getOrderRefunds,
  rejectRefund,
  requestRefund,
  type CatalogDatabase,
} from '@maihan/db';
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

export const REFUND_HANDLERS: Record<string, RouteHandler> = {
  async requestRefundHandler(ctx) {
    const db = getDb(ctx);
    const orderId = requireIdentifier(ctx.params['orderId'], 'orderId');
    const body = await parseBody(ctx.request);
    const input = RequestRefundInputSchema.parse(body);
    const refund = await requestRefund(db, {
      orderId,
      amount: input.amount,
      reason: input.reason,
    });
    return {
      status: 201,
      body: { data: refund },
    };
  },

  async listOrderRefundsHandler(ctx) {
    const db = getDb(ctx);
    const orderId = requireIdentifier(ctx.params['orderId'], 'orderId');
    const refunds = await getOrderRefunds(db, orderId);
    return {
      status: 200,
      body: { data: refunds },
    };
  },

  async approveRefundHandler(ctx) {
    const db = getDb(ctx);
    const refundId = requireIdentifier(ctx.params['refundId'], 'refundId');
    const body = await parseBody(ctx.request);
    const input = ApproveRefundInputSchema.parse(body);
    const refund = await approveRefund(db, {
      refundId,
      approved_by: input.approved_by,
    });
    return {
      status: 200,
      body: { data: refund },
    };
  },

  async rejectRefundHandler(ctx) {
    const db = getDb(ctx);
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
    const refundId = requireIdentifier(ctx.params['refundId'], 'refundId');
    const refund = await executeRefund(db, refundId);
    return {
      status: 200,
      body: { data: refund },
    };
  },
};
