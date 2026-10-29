/**
 * F4 — WebAR server seam over the FRESH assets table (replaces the retired
 * `webar_assets` locked-schema seam). Same exported names as the M3 port;
 * the implementation now reads `fresh.assets` (kind = 'MODEL_3D') through
 * fresh-api.
 *
 * Honest states: zero MODEL_3D rows exist today (3D/VTO content is a later
 * increment) — every lookup returns null/[] and the AR pages render their
 * honest missing-asset paths. Handoff sessions have no fresh table (the
 * old `ar_handoff_tokens` machinery was retired at cut-over) — the handoff
 * page renders its invalid-session panel.
 */
import 'server-only';
import { createHash } from 'node:crypto';
import type { WebarAssetReadModel } from '@maihan/contracts';
import type { WebarHandoffSession, WebArAssetView } from './mgh/adapters/webar-types';
import { hueOfStorageKey, hueSwatch } from './mgh/adapters/webar-types';

const FRESH_API_URL = process.env['FRESH_API_URL'] ?? 'http://127.0.0.1:3010';

interface FreshAssetRow {
  id: number;
  owner_kind: string;
  owner_id: number;
  role: string;
  kind: string;
  vto_ready: boolean;
  url: string;
  position: number;
  alt: string | null;
}

async function freshGet<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${FRESH_API_URL}${path}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function toReadModel(row: FreshAssetRow): WebarAssetReadModel {
  return {
    id: `MDL-${row.id}`,
    state: 'READY',
    storage_key: `model/${row.id}`,
    model_url: row.url,
    hue: hueOfStorageKey(`brilliant-${row.id}`) ?? null,
    // Calibration figures the vault does not record stay null ⇒ 'Not evidenced'.
    calibration: null,
  } as unknown as WebarAssetReadModel;
}

function toView(row: FreshAssetRow): WebArAssetView {
  const read = toReadModel(row);
  return {
    assetId: read.id,
    state: 'READY',
    modelUrl: row.url,
    hue: hueOfStorageKey(`brilliant-${row.id}`),
    swatch: hueSwatch(hueOfStorageKey(`brilliant-${row.id}`) ?? 'blue'),
    calibration: null,
    vtoReady: row.vto_ready,
  } as unknown as WebArAssetView;
}

export async function loadWebarAssetByAssetId(assetId: string): Promise<WebarAssetReadModel | null> {
  const data = await freshGet<{ items: FreshAssetRow[] }>(
    `/api/v1/catalogue/assets?kind=MODEL_3D&limit=200`,
  );
  const row = (data?.items ?? []).find((r) => `MDL-${r.id}` === assetId || String(r.id) === assetId);
  return row ? toReadModel(row) : null;
}

export async function loadWebArAssetView(assetId: string): Promise<WebArAssetView | null> {
  const data = await freshGet<{ items: FreshAssetRow[] }>(
    `/api/v1/catalogue/assets?kind=MODEL_3D&limit=200`,
  );
  const row = (data?.items ?? []).find((r) => `MDL-${r.id}` === assetId || String(r.id) === assetId);
  return row ? toView(row) : null;
}

export async function listReadyWebArAssets(): Promise<WebArAssetView[]> {
  const data = await freshGet<{ items: FreshAssetRow[] }>(
    `/api/v1/catalogue/assets?kind=MODEL_3D&limit=200`,
  );
  return (data?.items ?? []).map(toView);
}

const sha256 = (v: string): string => createHash('sha256').update(v).digest('hex');

/** Handoff tokens have no fresh table — read-only honest miss, always. */
export async function loadWebArHandoffSession(_rawToken: string): Promise<WebarHandoffSession> {
  void sha256;
  return { valid: false } as unknown as WebarHandoffSession;
}
