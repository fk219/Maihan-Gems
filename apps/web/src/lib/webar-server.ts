/**
 * WebAR server seam (develop's exported names, main's reality).
 *
 * develop read `fresh.assets` (kind = 'MODEL_3D') through its own HTTP
 * service. That service does not exist here, and main's locked schema has no
 * MODEL_3D asset rows, so the honest answer is a miss: every lookup returns
 * null/[] and the AR pages render their missing-asset paths.
 *
 * No network call is made. A fetch to an absent local service produced
 * connection-refused noise on every AR render and could only ever return
 * nothing; this module states that directly.
 */
import 'server-only';
import { createHash } from 'node:crypto';
import type { WebarAssetReadModel } from '@maihan/contracts';
import type { WebarHandoffSession, WebArAssetView } from './mgh/adapters/webar-types';

export async function loadWebarAssetByAssetId(_assetId: string): Promise<WebarAssetReadModel | null> {
  return null;
}

export async function loadWebArAssetView(_assetId: string): Promise<WebArAssetView | null> {
  return null;
}

export async function listReadyWebArAssets(): Promise<WebArAssetView[]> {
  return [];
}

const sha256 = (v: string): string => createHash('sha256').update(v).digest('hex');

/** Handoff tokens have no table in the locked schema — read-only honest miss. */
export async function loadWebArHandoffSession(_rawToken: string): Promise<WebarHandoffSession> {
  void sha256;
  return { valid: false } as unknown as WebarHandoffSession;
}
