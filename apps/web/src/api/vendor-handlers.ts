/**
 * apps/web/src/api/vendor-handlers.ts
 *
 * BUILD_BACKLOG Track D (D1/D3/D4/D5/D8) — the vendor portal HTTP surface.
 *
 * Every handler gates first through `requireVendor` and then calls exactly ONE
 * repository function with the actor's `vendorId`. There is no route that
 * accepts a vendor id from the client: the boundary comes from membership, so
 * a forged body or query parameter cannot widen it. `POST /products/{id}`
 * answers 404 both for "does not exist" and for "belongs to another vendor".
 */
import { z } from 'zod';
import { ContractError } from '@maihan/contracts';
import {
  createVendorProduct,
  listVendorOrders,
  listVendorProducts,
  updateVendorProduct,
  vendorStatement,
  type CatalogDatabase,
  type VendorJewelleryType,
  type VendorProductState,
  type VendorCreatableProductKind,
} from '@maihan/db';
import type { HandlerOutcome, RouteContext } from './handlers.js';
import { requireVendor } from './vendor/session-authz.js';

const STATES = [
  'DRAFT',
  'ACTIVE',
  'ARCHIVED',
  'SOLD_OUT',
  'DISCONTINUED',
] as const satisfies readonly VendorProductState[];

/**
 * Only the kinds whose INV-01 composition the portal can actually satisfy.
 * CONFIGURED and SETTING_ONLY need a setting variant (and a stone) that this
 * surface does not capture yet; the strict schema refuses them rather than
 * letting the database CHECK answer with a 500.
 */
const KINDS = [
  'READY_MADE',
  'LOOSE_STONE',
  'STONE_PAIR',
] as const satisfies readonly VendorCreatableProductKind[];

const JEWELLERY_TYPES = [
  'RING',
  'EARRINGS',
  'NECKLACE',
  'PENDANT',
  'BRACELET',
  'BROOCH',
  'CUFFLINKS',
  'CHARM',
] as const satisfies readonly VendorJewelleryType[];

const SlugSchema = z
  .string()
  .min(1)
  .max(180)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, digits and single hyphens.');

/** Integer minor units. The NUMERIC(12,2) ceiling, enforced before SQL. */
const PriceMinorSchema = z.number().int().min(0).max(999_999_999_999);

const CurrencySchema = z.string().regex(/^[A-Z]{3}$/);

const DecimalWeightSchema = z
  .string()
  .regex(/^\d{1,5}(\.\d{1,3})?$/, 'Carat weight must be a decimal with at most 3 places.');

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CreateVendorProductSchema = z
  .object({
    kind: z.enum(KINDS),
    slug: SlugSchema,
    title: z.string().min(1).max(200),
    subtitle: z.string().max(200).nullish(),
    jewelleryType: z.enum(JEWELLERY_TYPES),
    priceMinor: PriceMinorSchema,
    currency: CurrencySchema.optional(),
    totalWeightCt: DecimalWeightSchema.nullish(),
    description: z.string().max(20_000).nullish(),
    shortDescription: z.string().max(1_000).nullish(),
  })
  // Strict: a client that sends `state`, `price_evidence`, `vendor_id` or any
  // other platform-only column gets a 400 instead of a silently ignored field.
  .strict();

const UpdateVendorProductSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    subtitle: z.string().max(200).nullable().optional(),
    description: z.string().max(20_000).nullable().optional(),
    shortDescription: z.string().max(1_000).nullable().optional(),
    priceMinor: PriceMinorSchema.optional(),
    currency: CurrencySchema.optional(),
    totalWeightCt: DecimalWeightSchema.nullable().optional(),
    availability: z.boolean().optional(),
  })
  .strict();

function database(ctx: RouteContext): CatalogDatabase {
  if (ctx.db === undefined) throw new ContractError('INTERNAL', 'Database seam is not configured.');
  return ctx.db;
}

async function readJsonBody(ctx: RouteContext): Promise<unknown> {
  if (ctx.request === undefined) {
    throw new ContractError('VALIDATION_FAILED', 'A request body is required.');
  }
  try {
    return await ctx.request.json();
  } catch {
    throw new ContractError('VALIDATION_FAILED', 'Body must be JSON.');
  }
}

interface Pagination {
  readonly limit: number;
  readonly offset: number;
}

function pagination(url: URL): Pagination {
  const rawLimit = Number(url.searchParams.get('limit') ?? '50');
  const rawOffset = Number(url.searchParams.get('offset') ?? '0');
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.trunc(rawLimit), 1), 200) : 50;
  const offset = Number.isFinite(rawOffset) ? Math.max(Math.trunc(rawOffset), 0) : 0;
  return { limit, offset };
}

function parseState(url: URL): VendorProductState | undefined {
  const raw = url.searchParams.get('state');
  if (raw === null || raw.trim().length === 0) return undefined;
  const upper = raw.trim().toUpperCase();
  if (!(STATES as readonly string[]).includes(upper)) {
    throw new ContractError('VALIDATION_FAILED', 'Unknown product state filter.');
  }
  return upper as VendorProductState;
}

function parseInstant(raw: string | null, field: string): string | undefined {
  if (raw === null || raw.trim().length === 0) return undefined;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new ContractError('VALIDATION_FAILED', `"${field}" must be an ISO-8601 instant.`, [
      { field, code: 'INVALID_DATE' },
    ]);
  }
  return parsed.toISOString();
}

/** Postgres unique violation, without importing the driver's error types. */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === '23505'
  );
}

/**
 * GET /api/v1/vendor/me
 *
 * The gate's membership read IS this endpoint's single read; re-reading the
 * vendor would add a query without adding a guarantee.
 */
export async function vendorMeHandler(ctx: RouteContext): Promise<HandlerOutcome> {
  const actor = await requireVendor(ctx);
  return {
    status: 200,
    body: {
      data: {
        user: {
          id: actor.userId,
          email: actor.email,
          displayName: actor.displayName,
        },
        vendor: {
          id: actor.vendor.id,
          slug: actor.vendor.slug,
          displayName: actor.vendor.display_name,
          legalName: actor.vendor.legal_name,
          country: actor.vendor.country,
          state: actor.vendor.state,
          commissionBps: actor.vendor.commission_bps,
          payoutCurrency: actor.vendor.payout_currency,
        },
        role: actor.role,
      },
    },
  };
}

/** GET /api/v1/vendor/products */
export async function vendorListProductsHandler(ctx: RouteContext): Promise<HandlerOutcome> {
  const actor = await requireVendor(ctx);
  const db = database(ctx);
  const state = parseState(ctx.url);
  const { limit, offset } = pagination(ctx.url);

  const result = await listVendorProducts(db, actor.vendorId, {
    ...(state === undefined ? {} : { state }),
    limit,
    offset,
  });

  return {
    status: 200,
    body: {
      data: result.items,
      meta: { total: result.total, limit, offset, state: state ?? null },
    },
  };
}

/** POST /api/v1/vendor/products — always DRAFT, always price evidence UNKNOWN. */
export async function vendorCreateProductHandler(ctx: RouteContext): Promise<HandlerOutcome> {
  const actor = await requireVendor(ctx);
  const db = database(ctx);
  const input = CreateVendorProductSchema.parse(await readJsonBody(ctx));

  try {
    const row = await createVendorProduct(db, actor.vendorId, {
      ...input,
      actorId: actor.userId,
      requestId: ctx.ids.requestId,
    });
    return { status: 201, body: { data: row } };
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ContractError('VALIDATION_FAILED', 'That product slug is already in use.', [
        { field: 'slug', code: 'ALREADY_TAKEN' },
      ]);
    }
    throw error;
  }
}

/** POST /api/v1/vendor/products/{productId} */
export async function vendorUpdateProductHandler(ctx: RouteContext): Promise<HandlerOutcome> {
  const actor = await requireVendor(ctx);
  const db = database(ctx);
  const productId = ctx.params['productId'];
  if (productId === undefined || productId.length === 0) {
    throw new ContractError('VALIDATION_FAILED', 'A product id is required.');
  }
  // A malformed id must not reach the uuid cast (that would be a 500).
  if (!UUID_PATTERN.test(productId)) {
    throw new ContractError('VALIDATION_FAILED', 'A product id must be a UUID.');
  }
  const patch = UpdateVendorProductSchema.parse(await readJsonBody(ctx));

  const row = await updateVendorProduct(db, actor.vendorId, productId, {
    ...patch,
    actorId: actor.userId,
    requestId: ctx.ids.requestId,
  });
  // Same answer for "not yours" and "not there" — the portal cannot probe.
  if (row === null) throw new ContractError('NOT_FOUND', 'No such product.');

  return { status: 200, body: { data: row } };
}

/** GET /api/v1/vendor/orders */
export async function vendorListOrdersHandler(ctx: RouteContext): Promise<HandlerOutcome> {
  const actor = await requireVendor(ctx);
  const db = database(ctx);
  const { limit, offset } = pagination(ctx.url);

  const result = await listVendorOrders(db, actor.vendorId, { limit, offset });
  return {
    status: 200,
    body: {
      data: result.items,
      meta: { total: result.total, limit, offset },
    },
  };
}

/** GET /api/v1/vendor/statement */
export async function vendorStatementHandler(ctx: RouteContext): Promise<HandlerOutcome> {
  const actor = await requireVendor(ctx);
  const db = database(ctx);
  const from = parseInstant(ctx.url.searchParams.get('from'), 'from');
  const to = parseInstant(ctx.url.searchParams.get('to'), 'to');
  if (from !== undefined && to !== undefined && from >= to) {
    throw new ContractError('VALIDATION_FAILED', '"from" must be earlier than "to".');
  }

  const statement = await vendorStatement(db, actor.vendorId, {
    ...(from === undefined ? {} : { from }),
    ...(to === undefined ? {} : { to }),
  });

  return {
    status: 200,
    body: {
      data: statement.entries,
      meta: { total: statement.total, from: statement.from, to: statement.to },
    },
  };
}
