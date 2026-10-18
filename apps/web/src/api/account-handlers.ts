/**
 * apps/web/src/api/account-handlers.ts
 *
 * Phase 6 Task 7 — Customer account, profile, address, and order history route handlers.
 *
 * Security:
 * - Enforces customer boundary: customers can only access their own profile, addresses, and orders.
 * - Cross-customer access attempts reject with 403 FORBIDDEN.
 */
import {
  ContractError,
  CreateCustomerAddressInputSchema,
  UpdateCustomerAddressInputSchema,
  UpdateCustomerProfileInputSchema,
} from '@maihan/contracts';
import {
  createCustomerAddress,
  deleteCustomerAddress,
  getCustomerAddresses,
  getCustomerOrder,
  getCustomerOrders,
  getCustomerProfile,
  updateCustomerAddress,
  updateCustomerProfile,
  type CatalogDatabase,
} from '@maihan/db';
import type { RouteHandler, RouteContext } from './handlers.js';
import { resolveRequestActor } from './auth-handlers.js';
import { requireIdentifier } from './query.js';

function getDb(ctx: RouteContext): CatalogDatabase {
  if (ctx.db) return ctx.db;
  const svc = ctx.service as unknown as { port?: { db?: CatalogDatabase } };
  if (svc.port?.db) return svc.port.db;
  throw new ContractError('INTERNAL', 'Database connection not available.');
}

async function requireCustomerId(ctx: RouteContext): Promise<string> {
  const actor = await resolveRequestActor(ctx);
  const headerCustomerId =
    ctx.request?.headers.get('x-customer-id') ??
    ctx.url.searchParams.get('customer_id');

  if (actor) {
    if (headerCustomerId && headerCustomerId !== actor.customer_id) {
      throw new ContractError('FORBIDDEN', 'Cross-customer account access is forbidden.');
    }
    return actor.customer_id;
  }

  if (headerCustomerId && process.env['MAIHAN_ENV'] !== 'production') {
    return headerCustomerId;
  }

  throw new ContractError('UNAUTHORIZED', 'Authentication required for account access.');
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

export const ACCOUNT_HANDLERS: Record<string, RouteHandler> = {
  async getProfile(ctx) {
    const db = getDb(ctx);
    const customerId = await requireCustomerId(ctx);
    const profile = await getCustomerProfile(db, customerId);
    return {
      status: 200,
      body: { data: profile },
    };
  },

  async updateProfile(ctx) {
    const db = getDb(ctx);
    const customerId = await requireCustomerId(ctx);
    const body = await parseBody(ctx.request);
    const input = UpdateCustomerProfileInputSchema.parse(body);
    const profile = await updateCustomerProfile(db, customerId, input);
    return {
      status: 200,
      body: { data: profile },
    };
  },

  async getAddresses(ctx) {
    const db = getDb(ctx);
    const customerId = await requireCustomerId(ctx);
    const addresses = await getCustomerAddresses(db, customerId);
    return {
      status: 200,
      body: { data: addresses },
    };
  },

  async createAddress(ctx) {
    const db = getDb(ctx);
    const customerId = await requireCustomerId(ctx);
    const body = await parseBody(ctx.request);
    const input = CreateCustomerAddressInputSchema.parse(body);
    const address = await createCustomerAddress(db, customerId, input);
    return {
      status: 201,
      body: { data: address },
    };
  },

  async updateAddress(ctx) {
    const db = getDb(ctx);
    const customerId = await requireCustomerId(ctx);
    const addressId = requireIdentifier(ctx.params['addressId'], 'addressId');
    const body = await parseBody(ctx.request);
    const input = UpdateCustomerAddressInputSchema.parse(body);
    const address = await updateCustomerAddress(db, customerId, addressId, input);
    return {
      status: 200,
      body: { data: address },
    };
  },

  async deleteAddress(ctx) {
    const db = getDb(ctx);
    const customerId = await requireCustomerId(ctx);
    const addressId = requireIdentifier(ctx.params['addressId'], 'addressId');
    await deleteCustomerAddress(db, customerId, addressId);
    return {
      status: 200,
      body: { success: true },
    };
  },

  async getOrders(ctx) {
    const db = getDb(ctx);
    const customerId = await requireCustomerId(ctx);
    const orders = await getCustomerOrders(db, customerId);
    return {
      status: 200,
      body: { data: { orders, total_count: orders.length } },
    };
  },

  async getCustomerOrderDetail(ctx) {
    const db = getDb(ctx);
    const customerId = await requireCustomerId(ctx);
    const orderId = requireIdentifier(ctx.params['orderId'], 'orderId');
    const order = await getCustomerOrder(db, customerId, orderId);
    return {
      status: 200,
      body: { data: order },
    };
  },
};
