/**
 * apps/web/src/api/media-handlers.ts
 *
 * Track A5 — `GET /api/v1/media/{assetId}`.
 *
 * The endpoint is a redirect, not a proxy: the application verifies the asset
 * is publicly deliverable, then hands the browser a storage URL. Bytes never
 * pass through the Next process.
 *
 * Rules enforced here:
 *   - unknown or malformed id             -> 404 envelope (no oracle)
 *   - not READY, or no storage key        -> 404
 *   - certificate / report / appraisal    -> 404. Those are private and are
 *     served by an audited signed-URL endpoint after authorization
 *     (technical_design/24 §6, NFR-11). A public redirect would be an
 *     incident, so this file must not be "helpful" about them.
 *   - READY public image                  -> 302 + Location + immutable cache
 *
 * An immutable cache lifetime is honest because keys are content-addressed
 * (`ab/cd/<sha256>.<ext>`); replacing the bytes changes the key.
 */
import { ContractError } from '@maihan/contracts';
import {
  findAssetForDelivery,
  isPubliclyDeliverableAsset,
  type CatalogDatabase,
  type ObjectStorage,
} from '@maihan/db';
import type { HandlerOutcome, RouteContext, RouteHandler } from './handlers.js';

/** Content-addressed keys never change for a given URL. */
export const MEDIA_CACHE_CONTROL = 'public, max-age=31536000, immutable';

function getDb(ctx: RouteContext): CatalogDatabase {
  if (ctx.db) return ctx.db;
  const service = ctx.service as unknown as { port?: { db?: CatalogDatabase } };
  if (service.port?.db) return service.port.db;
  throw new ContractError('INTERNAL', 'Database connection not available.');
}

function getStorage(ctx: RouteContext): ObjectStorage {
  if (ctx.storage === undefined) {
    throw new ContractError('INTERNAL', 'Media storage is not configured.');
  }
  return ctx.storage;
}

export async function getMediaAssetHandler(ctx: RouteContext): Promise<HandlerOutcome> {
  const storage = getStorage(ctx);
  const assetId = ctx.params['assetId'];
  if (assetId === undefined || assetId.length === 0) {
    throw new ContractError('NOT_FOUND', 'Media asset not found.');
  }

  const db = getDb(ctx);
  const asset = await findAssetForDelivery(db, assetId);
  if (asset === null || !isPubliclyDeliverableAsset(asset)) {
    throw new ContractError('NOT_FOUND', 'Media asset not found.');
  }

  let location: string;
  try {
    location = storage.publicUrl(asset.storageKey);
  } catch {
    // A malformed key in the database is a data fault; the honest response
    // is still "not found", never a 500 that exposes storage internals.
    throw new ContractError('NOT_FOUND', 'Media asset not found.');
  }

  return {
    status: 302,
    body: null,
    headers: {
      Location: location,
      'Cache-Control': MEDIA_CACHE_CONTROL,
    },
  };
}

export const MEDIA_HANDLERS: Record<string, RouteHandler> = {
  getMediaAssetHandler,
};
