/**
 * apps/web/src/api/commerce-handlers.ts
 *
 * Route handlers for Phase 6 Cart & Commerce surfaces:
 *   - POST /carts & POST /api/v1/carts
 *   - GET /carts/{cartToken} & GET /api/v1/carts/{cartToken}
 *   - POST /carts/{cartToken}/items & POST /api/v1/carts/{cartToken}/items
 *   - PATCH /carts/{cartToken}/items/{itemId} & PATCH /api/v1/carts/{cartToken}/items/{itemId}
 *   - DELETE /carts/{cartToken}/items/{itemId} & DELETE /api/v1/carts/{cartToken}/items/{itemId}
 *   - POST /carts/{cartToken}/merge & POST /api/v1/carts/{cartToken}/merge
 */
import {
  AddToCartInputSchema,
  ContractError,
  CreateCartInputSchema,
  MergeCartInputSchema,
  UpdateCartItemInputSchema,
} from '@maihan/contracts';
import {
  addItemToCart,
  createCart,
  getCartByToken,
  mergeGuestCart,
  removeCartItem,
  updateCartItemQuantity,
  type CatalogDatabase,
} from '@maihan/db';
import type { RouteHandler, RouteContext } from './handlers.js';
import { requireIdentifier } from './query.js';

function getDb(ctx: RouteContext): CatalogDatabase {
  if (ctx.db) return ctx.db;
  const svc = ctx.service as unknown as { port?: { db?: CatalogDatabase } };
  if (svc.port?.db) return svc.port.db;
  throw new ContractError('INTERNAL', 'Database connection not available for commerce operations.');
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

export const COMMERCE_HANDLERS: Record<string, RouteHandler> = {
  async createCart(ctx) {
    const db = getDb(ctx);
    const body = await parseBody(ctx.request);
    const input = CreateCartInputSchema.parse(body);
    const cart = await createCart(db, input);
    return {
      status: 201,
      body: { data: cart },
    };
  },

  async getCart(ctx) {
    const db = getDb(ctx);
    const cartToken = requireIdentifier(ctx.params['cartToken'], 'cartToken');
    const cart = await getCartByToken(db, cartToken);
    return {
      status: 200,
      body: { data: cart },
    };
  },

  async addCartItem(ctx) {
    const db = getDb(ctx);
    const cartToken = requireIdentifier(ctx.params['cartToken'], 'cartToken');
    const body = await parseBody(ctx.request);
    const input = AddToCartInputSchema.parse(body);
    const cart = await addItemToCart(db, cartToken, input);
    return {
      status: 200,
      body: { data: cart },
    };
  },

  async updateCartItem(ctx) {
    const db = getDb(ctx);
    const cartToken = requireIdentifier(ctx.params['cartToken'], 'cartToken');
    const itemId = requireIdentifier(ctx.params['itemId'], 'itemId');
    const body = await parseBody(ctx.request);
    const input = UpdateCartItemInputSchema.parse(body);
    const cart = await updateCartItemQuantity(db, cartToken, itemId, input);
    return {
      status: 200,
      body: { data: cart },
    };
  },

  async removeCartItem(ctx) {
    const db = getDb(ctx);
    const cartToken = requireIdentifier(ctx.params['cartToken'], 'cartToken');
    const itemId = requireIdentifier(ctx.params['itemId'], 'itemId');
    const cart = await removeCartItem(db, cartToken, itemId);
    return {
      status: 200,
      body: { data: cart },
    };
  },

  async mergeCart(ctx) {
    const db = getDb(ctx);
    const cartToken = requireIdentifier(ctx.params['cartToken'], 'cartToken');
    const body = await parseBody(ctx.request);
    const input = MergeCartInputSchema.parse(body);
    const cart = await mergeGuestCart(db, cartToken, input.guest_cart_token);
    return {
      status: 200,
      body: { data: cart },
    };
  },
};
