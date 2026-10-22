/**
 * apps/web/src/lib/webar-server.ts
 *
 * P2-9 server seam: resolves a READY WebAR asset by its assetId (the seeded
 * `brilliant-<hue>` gems). Server-only — DB credentials never reach the
 * client; the handed-off model exposes cdnUrl/fitRule through the contract
 * DTO exactly like the /webar/{id} API.
 */
import 'server-only';
import { createPool, findWebarAssetByStorageKey } from '@maihan/db';
import { loadRuntimeConfig } from '@maihan/config';
import type { WebarAssetReadModel } from '@maihan/contracts';

const globalStore = globalThis as unknown as { __maihanWebarPool?: ReturnType<typeof createPool> };

function getPool(): ReturnType<typeof createPool> {
  const existing = globalStore.__maihanWebarPool;
  if (existing) return existing;
  const pool = createPool(loadRuntimeConfig().databaseUrl);
  globalStore.__maihanWebarPool = pool;
  return pool;
}

export async function loadWebarAssetByAssetId(assetId: string): Promise<WebarAssetReadModel | null> {
  // The hue assets are addressed by their storage key; the repository's
  // DbClient seam is the RAW POOL client (it expects `.query(text, params)` —
  // the Drizzle executor has no such method).
  const storageKey = assetId.startsWith('/models/gems/') ? assetId : `/models/gems/${assetId}.glb`;
  const asset = await findWebarAssetByStorageKey(getPool() as unknown as Parameters<typeof findWebarAssetByStorageKey>[0], storageKey);
  if (!asset || asset.state !== 'READY') return null;
  return asset;
}
