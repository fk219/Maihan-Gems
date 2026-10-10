/**
 * apps/web/src/api/favorites-handlers.ts
 *
 * Phase 6 Task 8 — Wishlist (/favorites) and Compare-list (/compare) route handlers.
 *
 * Authority:
 * - PROJECT_SOURCE_OF_TRUTH.md §11.5, §24, FR-COM-05.
 * - technical_design/06 API ARCHITECTURE §Commerce.
 */
import {
  AddFavoriteInputSchema,
  ContractError,
} from '@maihan/contracts';
import {
  addCustomerFavorite,
  getCompareMatrix,
  getCustomerFavorites,
  removeCustomerFavorite,
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

function requireCustomerId(ctx: RouteContext): string {
  const customerId =
    ctx.request?.headers.get('x-customer-id') ??
    ctx.url.searchParams.get('customer_id');

  if (!customerId) {
    throw new ContractError('UNAUTHORIZED', 'Authentication required for wishlist access.');
  }
  return customerId;
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

export const FAVORITES_HANDLERS: Record<string, RouteHandler> = {
  async getFavorites(ctx) {
    const db = getDb(ctx);
    const customerId = requireCustomerId(ctx);
    const favorites = await getCustomerFavorites(db, customerId);
    return {
      status: 200,
      body: { data: favorites },
    };
  },

  async addFavorite(ctx) {
    const db = getDb(ctx);
    const customerId = requireCustomerId(ctx);
    const body = await parseBody(ctx.request);
    const input = AddFavoriteInputSchema.parse(body);
    const favorites = await addCustomerFavorite(db, customerId, input.product_id);
    return {
      status: 201,
      body: { data: favorites },
    };
  },

  async removeFavorite(ctx) {
    const db = getDb(ctx);
    const customerId = requireCustomerId(ctx);
    const productId = requireIdentifier(ctx.params['productId'], 'productId');
    const favorites = await removeCustomerFavorite(db, customerId, productId);
    return {
      status: 200,
      body: { data: favorites },
    };
  },

  async getCompare(ctx) {
    const db = getDb(ctx);
    const idsParam = ctx.url.searchParams.get('ids');
    let ids: string[] = [];
    if (idsParam) {
      ids = idsParam.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
    } else {
      ids = ctx.url.searchParams.getAll('id').filter((s) => s.length > 0);
    }

    if (ids.length === 0) {
      throw new ContractError('VALIDATION_FAILED', 'Compare-list requires between 2 and 4 product ids.');
    }

    const matrix = await getCompareMatrix(db, ids);
    return {
      status: 200,
      body: { data: matrix },
    };
  },
};
