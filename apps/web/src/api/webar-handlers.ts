/**
 * apps/web/src/api/webar-handlers.ts
 *
 * Phase 11 Task 4 — WebAR and QR Handoff API Handlers.
 * Authority: technical_design/21_WEBAR_ARCHITECTURE.md §3, §7, §10
 *
 * Endpoints:
 *   - GET  /api/v1/webar/{assetId}
 *   - POST /api/v1/ar/handoff
 *   - GET  /api/v1/ar/handoff/{token}
 */
import {
  findWebarAssetById,
  createArHandoffToken,
  redeemArHandoffToken,
} from '@maihan/db';
import {
  CreateHandoffRequestSchema,
  ContractError,
} from '@maihan/contracts';
import type { RouteContext, HandlerOutcome } from './handlers.js';

function getDb(ctx: RouteContext): any {
  const db = ctx.db || (ctx.service as any)?.port?.db;
  if (!db) {
    throw new ContractError('INTERNAL', 'Database client unavailable.');
  }
  return (db as any).pool || db;
}

export async function getWebarAssetHandler(ctx: RouteContext): Promise<HandlerOutcome> {
  const assetId = ctx.params['assetId'];
  if (!assetId) {
    throw new ContractError('VALIDATION_FAILED', 'Missing assetId in path parameters.');
  }

  const db = getDb(ctx);
  const asset = await findWebarAssetById(db, assetId);
  if (!asset) {
    throw new ContractError('NOT_FOUND', `WebAR asset with ID ${assetId} not found.`);
  }

  return {
    status: 200,
    body: { data: asset },
  };
}

export async function createArHandoffHandler(ctx: RouteContext): Promise<HandlerOutcome> {
  const db = getDb(ctx);

  if (!ctx.request) {
    throw new ContractError('VALIDATION_FAILED', 'Missing request object.');
  }

  let body: unknown;
  try {
    body = await ctx.request.json();
  } catch {
    throw new ContractError('VALIDATION_FAILED', 'Malformed JSON payload.');
  }

  const parsed = CreateHandoffRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new ContractError(
      'VALIDATION_FAILED',
      'Invalid handoff request body.',
      parsed.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }))
    );
  }

  // Derive base URL from request origin or forwarded headers
  const origin = ctx.url.origin;
  const handoff = await createArHandoffToken(db, {
    webarAssetId: parsed.data.webarAssetId,
    productId: parsed.data.productId,
    baseUrl: origin,
  });

  return {
    status: 201,
    body: { data: handoff },
  };
}

export async function redeemArHandoffHandler(ctx: RouteContext): Promise<HandlerOutcome> {
  const rawToken = ctx.params['token'];
  if (!rawToken) {
    throw new ContractError('VALIDATION_FAILED', 'Missing token in path parameters.');
  }

  const db = getDb(ctx);

  try {
    const session = await redeemArHandoffToken(db, rawToken);
    return {
      status: 200,
      body: { data: session },
    };
  } catch (err: any) {
    const msg = err?.message || '';
    if (msg.includes('AR_HANDOFF_REPLAYED')) {
      throw new ContractError('IDEMPOTENCY_CONFLICT', 'This AR handoff token has already been used.');
    }
    if (msg.includes('AR_HANDOFF_INVALID')) {
      throw new ContractError('NOT_FOUND', 'Handoff token is invalid or expired.');
    }
    throw err;
  }
}
