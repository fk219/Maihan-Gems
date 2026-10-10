/**
 * apps/web/src/api/discount-handlers.ts
 *
 * Phase 6 Task 10 — Discount validation route handlers.
 *
 * Authority:
 * - technical_design/13 COMMERCE ARCHITECTURE §Discounts.
 * - Invariant: Server-side validation (scope, window, minimum, per-customer limit, redemption count).
 */
import {
  ContractError,
  ValidateDiscountInputSchema,
} from '@maihan/contracts';
import {
  getDiscountByCode,
  validateDiscount,
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

export const DISCOUNT_HANDLERS: Record<string, RouteHandler> = {
  async validateDiscountEndpoint(ctx) {
    const db = getDb(ctx);
    const body = await parseBody(ctx.request);
    const input = ValidateDiscountInputSchema.parse(body);
    const result = await validateDiscount(db, input);
    return {
      status: 200,
      body: { data: result },
    };
  },

  async getDiscountEndpoint(ctx) {
    const db = getDb(ctx);
    const code = requireIdentifier(ctx.params['code'], 'code');
    const discount = await getDiscountByCode(db, code);
    return {
      status: 200,
      body: { data: discount },
    };
  },
};
