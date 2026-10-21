/**
 * apps/web/src/api/addon-handlers.ts
 *
 * Phase 6 Task 9 — Financing & Protection Plan product add-on route handlers.
 *
 * Authority:
 * - technical_design/13 COMMERCE ARCHITECTURE §Add-ons.
 * - Invariant: Attached as separate order lines; placed orders are immutable.
 */
import {
  AttachAddonInputSchema,
  ContractError,
} from '@maihan/contracts';
import { isDevSeamEnabled } from '@maihan/config';
import { ADMIN_ROLES } from '@maihan/domain';
import {
  attachAddonToOrder,
  getOrderById,
  getProductAddon,
  listProductAddons,
  type CatalogDatabase,
} from '@maihan/db';
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

/**
 * P1-12 ownership gate: only the order's owner (or an administrator) may
 * attach an add-on. The former unauthenticated attach made every order id a
 * public mutation target.
 */
async function assertAddonAttachOwnership(
  ctx: RouteContext,
  db: CatalogDatabase,
  orderId: string,
): Promise<void> {
  const sessionToken = extractSessionToken(ctx.request);
  const actor = sessionToken ? await resolveRequestActor(ctx) : null;
  if (sessionToken && !actor) {
    throw new ContractError('UNAUTHORIZED', 'Valid session required.');
  }
  const isAdmin = Boolean(actor && (ADMIN_ROLES as readonly string[]).includes(actor.role));
  if (isAdmin) return;
  if (actor?.role === 'VENDOR') {
    throw new ContractError('FORBIDDEN', 'Vendors cannot attach add-ons to customer orders via this surface.');
  }

  const order = await getOrderById(db, orderId);
  if (order.customer_id) {
    // Named customer: the session must BE that customer.
    if (actor?.customer_id && actor.customer_id !== order.customer_id) {
      throw new ContractError('FORBIDDEN', 'You do not have permission to attach add-ons to another customer’s order.');
    }
    if (!actor?.customer_id && !isDevSeamEnabled()) {
      throw new ContractError('UNAUTHORIZED', 'Authentication required to attach add-ons to this order.');
    }
  } else if (!isDevSeamEnabled()) {
    // Guest orders: add-on attach requires support (the capability was
    // open to anyone holding the order id before P1-12).
    throw new ContractError('UNAUTHORIZED', 'Please contact support to attach an add-on to this order.');
  }
}

export const ADDON_HANDLERS: Record<string, RouteHandler> = {
  async listAddons(ctx) {
    const db = getDb(ctx);
    const productId = ctx.url.searchParams.get('product_id') ?? undefined;
    const addonType = ctx.url.searchParams.get('addon_type') ?? undefined;
    const addons = await listProductAddons(db, { productId, addonType });
    return {
      status: 200,
      body: { data: addons },
    };
  },

  async getAddon(ctx) {
    const db = getDb(ctx);
    const addonId = requireIdentifier(ctx.params['addonId'], 'addonId');
    const addon = await getProductAddon(db, addonId);
    return {
      status: 200,
      body: { data: addon },
    };
  },

  async attachAddon(ctx) {
    const db = getDb(ctx);
    const orderId = requireIdentifier(ctx.params['orderId'], 'orderId');
    await assertAddonAttachOwnership(ctx, db, orderId);
    const body = await parseBody(ctx.request);
    const input = AttachAddonInputSchema.parse(body);
    const result = await attachAddonToOrder(db, {
      orderId,
      addonId: input.addon_id,
      targetProductId: input.target_product_id,
    });
    return {
      status: 201,
      body: { data: result },
    };
  },
};
