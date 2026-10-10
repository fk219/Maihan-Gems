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
import {
  attachAddonToOrder,
  getProductAddon,
  listProductAddons,
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
