/**
 * apps/web/src/api/vendor-handlers.ts
 *
 * Vendor Portal HTTP API Handlers:
 * - Vendor dashboard & inventory/sales summaries
 * - Vendor profile & onboarding status
 * - Vendor product creation, editing, asset validation & review submission
 * - Vendor order line listing & fulfilment status updates
 */
import { z } from 'zod';
import { ContractError } from '@maihan/contracts';
import {
  createVendorProduct,
  getVendorById,
  listVendorOrders,
  listVendorProducts,
  submitVendorProductForReview,
  updateVendorOrderFulfillment,
  updateVendorProduct,
  updateVendorProfile,
  type AuthenticatedActor,
  type CatalogDatabase,
} from '@maihan/db';
import { resolveRequestActorWithCsrf } from './auth-handlers.js';
import type { RouteContext, RouteHandler } from './handlers.js';
import { requireIdentifier } from './query.js';

const UpdateVendorProfileSchema = z.object({
  display_name: z.string().min(2).max(120).optional(),
  legal_name: z.string().min(2).max(160).optional(),
  country_code: z.string().length(2).optional(),
  city: z.string().min(2).max(80).optional(),
  bourse_member: z.boolean().optional(),
  description: z.string().max(2000).optional(),
  contact_phone: z.string().max(40).optional(),
});

const ImageAssetSchema = z.union([
  z.string().min(1),
  z.object({
    url: z.string().min(1),
    mime_type: z.string().optional(),
    bytes: z.number().int().positive().optional(),
    alt_text: z.string().max(200).optional(),
  }),
]);

const CreateVendorProductSchema = z.object({
  sku: z.string().min(2).max(64),
  title: z.string().min(3).max(200),
  description: z.string().max(5000).optional(),
  kind: z.enum(['LOOSE_STONE', 'STONE_PAIR', 'READY_MADE']).optional(),
  jewellery_type: z.enum(['RING', 'EARRINGS', 'NECKLACE', 'PENDANT', 'BRACELET']).optional(),
  price_amount: z.union([z.number().positive(), z.string().min(1)]),
  inventory_quantity: z.number().int().min(0).max(10000).optional(),
  total_weight_ct: z.union([z.number().positive(), z.string()]).optional(),
  stone_type: z.string().max(80).optional(),
  shape: z.string().max(60).optional(),
  origin_country: z.string().max(80).optional(),
  treatment_status: z.string().max(80).optional(),
  metal_type: z.string().max(80).optional(),
  images: z.array(ImageAssetSchema).max(12).optional(),
});

const UpdateVendorProductSchema = CreateVendorProductSchema.partial();

const UpdateFulfillmentSchema = z.object({
  state: z.enum(['IN_FULFILLMENT', 'SHIPPED', 'DELIVERED']),
  carrier: z.string().max(80).optional(),
  tracking_number: z.string().max(120).optional(),
  tracking_url: z.string().max(500).optional(),
});

function getDb(ctx: RouteContext): CatalogDatabase {
  if (ctx.db) return ctx.db;
  const svc = ctx.service as unknown as { port?: { db?: CatalogDatabase } };
  if (svc.port?.db) return svc.port.db;
  throw new ContractError('INTERNAL', 'Database connection not available for vendor operations.');
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

async function requireVendorActor(ctx: RouteContext): Promise<AuthenticatedActor & { vendor_id: string }> {
  const actor = await resolveRequestActorWithCsrf(ctx);
  if (!actor) {
    throw new ContractError('UNAUTHORIZED', 'Vendor authentication required.');
  }
  if (actor.role !== 'VENDOR' || !actor.vendor_id) {
    throw new ContractError('FORBIDDEN', 'Vendor role is required to access vendor operations.');
  }
  return actor as AuthenticatedActor & { vendor_id: string };
}

export const VENDOR_HANDLERS: Record<string, RouteHandler> = {
  async getVendorDashboardHandler(ctx) {
    const db = getDb(ctx);
    const actor = await requireVendorActor(ctx);
    const [profile, products, orders] = await Promise.all([
      getVendorById(db, actor.vendor_id),
      listVendorProducts(db, actor.vendor_id),
      listVendorOrders(db, actor.vendor_id),
    ]);
    if (!profile) {
      throw new ContractError('NOT_FOUND', 'Vendor profile not found.');
    }

    const totalRevenue = orders
      .filter((o) => o.order_state !== 'CANCELLED' && o.order_state !== 'REFUNDED')
      .reduce((acc, o) => acc + Number(o.line_total || 0), 0);

    const summary = {
      total_products: products.length,
      draft_products: products.filter((p) => p.moderation_status === 'DRAFT').length,
      submitted_products: products.filter((p) => p.moderation_status === 'SUBMITTED').length,
      approved_products: products.filter((p) => p.moderation_status === 'APPROVED').length,
      published_products: products.filter((p) => p.state === 'ACTIVE').length,
      rejected_products: products.filter((p) => p.moderation_status === 'REJECTED').length,
      out_of_stock_products: products.filter((p) => p.inventory_quantity <= 0 || !p.availability).length,
      total_order_lines: orders.length,
      pending_fulfillment_lines: orders.filter((o) => o.fulfillment_state === 'PENDING' || o.fulfillment_state === 'IN_FULFILLMENT').length,
      total_revenue_usd: totalRevenue.toFixed(2),
    };

    return {
      status: 200,
      body: {
        data: {
          vendor: profile,
          summary,
          recent_products: products.slice(0, 10),
          recent_orders: orders.slice(0, 10),
        },
      },
    };
  },

  async getVendorProfileHandler(ctx) {
    const db = getDb(ctx);
    const actor = await requireVendorActor(ctx);
    const profile = await getVendorById(db, actor.vendor_id);
    if (!profile) {
      throw new ContractError('NOT_FOUND', 'Vendor profile not found.');
    }
    return {
      status: 200,
      body: { data: profile },
    };
  },

  async updateVendorProfileHandler(ctx) {
    const db = getDb(ctx);
    const actor = await requireVendorActor(ctx);
    const body = await parseBody(ctx.request);
    const input = UpdateVendorProfileSchema.parse(body);
    const updated = await updateVendorProfile(db, actor.vendor_id, actor.customer_id, input);
    return {
      status: 200,
      body: { data: updated },
    };
  },

  async listVendorProductsHandler(ctx) {
    const db = getDb(ctx);
    const actor = await requireVendorActor(ctx);
    const products = await listVendorProducts(db, actor.vendor_id);
    return {
      status: 200,
      body: { data: { products, total_count: products.length } },
    };
  },

  async createVendorProductHandler(ctx) {
    const db = getDb(ctx);
    const actor = await requireVendorActor(ctx);
    const body = await parseBody(ctx.request);
    const input = CreateVendorProductSchema.parse(body);
    const created = await createVendorProduct(db, actor.vendor_id, input);
    return {
      status: 201,
      body: { data: created },
    };
  },

  async updateVendorProductHandler(ctx) {
    const db = getDb(ctx);
    const actor = await requireVendorActor(ctx);
    const productId = requireIdentifier(ctx.params['productId'], 'productId');
    const body = await parseBody(ctx.request);
    const input = UpdateVendorProductSchema.parse(body);
    const updated = await updateVendorProduct(db, actor.vendor_id, productId, input);
    return {
      status: 200,
      body: { data: updated },
    };
  },

  async submitVendorProductHandler(ctx) {
    const db = getDb(ctx);
    const actor = await requireVendorActor(ctx);
    const productId = requireIdentifier(ctx.params['productId'], 'productId');
    const submitted = await submitVendorProductForReview(db, actor.vendor_id, productId);
    return {
      status: 200,
      body: { data: submitted },
    };
  },

  async listVendorOrdersHandler(ctx) {
    const db = getDb(ctx);
    const actor = await requireVendorActor(ctx);
    const orders = await listVendorOrders(db, actor.vendor_id);
    return {
      status: 200,
      body: { data: { orders, total_count: orders.length } },
    };
  },

  async updateVendorFulfillmentHandler(ctx) {
    const db = getDb(ctx);
    const actor = await requireVendorActor(ctx);
    const orderId = requireIdentifier(ctx.params['orderId'], 'orderId');
    const itemId = requireIdentifier(ctx.params['itemId'], 'itemId');
    const body = await parseBody(ctx.request);
    const input = UpdateFulfillmentSchema.parse(body);
    const updated = await updateVendorOrderFulfillment(db, {
      vendorId: actor.vendor_id,
      orderId,
      orderItemId: itemId,
      state: input.state,
      carrier: input.carrier,
      trackingNumber: input.tracking_number,
      trackingUrl: input.tracking_url,
    });
    return {
      status: 200,
      body: { data: updated },
    };
  },
};
