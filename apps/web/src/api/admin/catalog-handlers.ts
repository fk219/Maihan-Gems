/**
 * apps/web/src/api/admin/catalog-handlers.ts
 *
 * P3.1 — catalogue publication for administrators.
 *
 * Every handler gates through the one admin authorization path (ADR-027) and
 * then calls exactly one repository function. Gate V15 lives in the
 * repository, so this file never decides what is publishable.
 */
import { ContractError } from '@maihan/contracts';
import {
  countProductsForAdmin,
  listProductsForAdmin,
  publishProduct,
  unpublishProduct,
  ProductPublishError,
} from '@maihan/db';
import type { HandlerOutcome, RouteContext } from '../handlers.js';
import { authzFailureResponse, type CapabilityRequest } from './authz.js';
import { authorizeAdminRequest, type AdminDeps } from './session-authz.js';

interface Gate {
  readonly actor: import('@maihan/contracts').AdminActor;
}

async function gate(
  ctx: RouteContext,
  request: CapabilityRequest,
  deps: AdminDeps,
): Promise<Gate | { failure: Response }> {
  const decision = await authorizeAdminRequest(ctx, request, deps);
  if (decision.ok) return { actor: decision.actor };
  return { failure: authzFailureResponse(decision.status, ctx.ids) };
}

function mapPublishError(error: unknown): never {
  if (error instanceof ProductPublishError) {
    if (error.code === 'NOT_FOUND') {
      throw new ContractError('NOT_FOUND', 'No such product.');
    }
    if (error.code === 'UNVERIFIED_PRICE') {
      throw new ContractError(
        'UNPROCESSABLE',
        'This product cannot be published: its price evidence is UNKNOWN (gate V15).',
      );
    }
    throw new ContractError('UNPROCESSABLE', 'The product is not in a state that allows this action.');
  }
  throw error;
}

const STATES = new Set(['DRAFT', 'ACTIVE', 'ARCHIVED']);

export async function adminListProductsHandler(
  ctx: RouteContext,
  deps: AdminDeps = {},
): Promise<HandlerOutcome> {
  const g = await gate(ctx, { module: 'products', action: 'list' }, deps);
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };

  if (ctx.db === undefined) throw new ContractError('INTERNAL', 'Database seam is not configured.');

  const rawState = ctx.url.searchParams.get('state');
  const state = rawState !== null && STATES.has(rawState.toUpperCase())
    ? (rawState.toUpperCase() as 'DRAFT' | 'ACTIVE' | 'ARCHIVED')
    : undefined;
  const limit = Number(ctx.url.searchParams.get('limit') ?? '50');
  const offset = Number(ctx.url.searchParams.get('offset') ?? '0');

  const [items, total] = await Promise.all([
    listProductsForAdmin(ctx.db, {
      ...(state === undefined ? {} : { state }),
      limit: Number.isFinite(limit) ? limit : 50,
      offset: Number.isFinite(offset) ? offset : 0,
    }),
    countProductsForAdmin(ctx.db, state),
  ]);

  return {
    status: 200,
    body: { data: items, meta: { total, limit, offset, state: state ?? null } },
  };
}

async function transitionHandler(
  ctx: RouteContext,
  deps: AdminDeps,
  action: 'publish' | 'unpublish',
): Promise<HandlerOutcome> {
  const g = await gate(ctx, { module: 'products', action: 'publish' }, deps);
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };

  if (ctx.db === undefined) throw new ContractError('INTERNAL', 'Database seam is not configured.');
  const productId = ctx.params['productId'];
  if (productId === undefined || productId.length === 0) {
    throw new ContractError('VALIDATION_FAILED', 'A product id is required.');
  }

  try {
    const row =
      action === 'publish'
        ? await publishProduct(ctx.db, {
            productId,
            actorId: g.actor.sub,
            requestId: ctx.ids.requestId,
          })
        : await unpublishProduct(ctx.db, {
            productId,
            actorId: g.actor.sub,
            requestId: ctx.ids.requestId,
          });
    return { status: 200, body: { data: row } };
  } catch (error) {
    return mapPublishError(error);
  }
}

export async function adminPublishProductHandler(
  ctx: RouteContext,
  deps: AdminDeps = {},
): Promise<HandlerOutcome> {
  return transitionHandler(ctx, deps, 'publish');
}

export async function adminUnpublishProductHandler(
  ctx: RouteContext,
  deps: AdminDeps = {},
): Promise<HandlerOutcome> {
  return transitionHandler(ctx, deps, 'unpublish');
}
