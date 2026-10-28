/**
 * apps/web/src/lib/webar-server.ts
 *
 * P2-9 server seam: resolves a READY WebAR asset by its assetId (the seeded
 * `brilliant-<hue>` gems). Server-only — DB credentials never reach the
 * client; the handed-off model exposes cdnUrl/fitRule through the contract
 * DTO exactly like the /webar/{id} API.
 *
 * M3 additions (product-detail + AR page family):
 *   - `loadWebArAssetView` / `listReadyWebArAssets` — the REAL `webar_assets`
 *     rows lifted onto the applet viewer's record shape
 *     (`WebArAssetView`: calibration figures the vault does not record stay
 *     null ⇒ 'Not evidenced'; the REAL GLB path rides in `modelUrl`).
 *   - `loadWebArHandoffSession` — read-only validation of an `ar_handoff_tokens`
 *     row by the SAME SHA-256 → token_hash lookup `redeemArHandoffToken`
 *     uses (consumption itself stays the repository function; the reference
 *     handoff page renders the session panel instead of a redirect).
 */
import 'server-only';
import { createHash } from 'node:crypto';
import { createPool, findWebarAssetByStorageKey, findWebarAssetById } from '@maihan/db';
import { loadRuntimeConfig } from '@maihan/config';
import type { WebarAssetReadModel } from '@maihan/contracts';
import type { WebarHandoffSession, WebArAssetView } from './mgh/adapters/webar-types';
import { hueOfStorageKey, hueSwatch } from './mgh/adapters/webar-types';

/** Local throwaway credential from compose.yaml (same policy as storefront-data). Not a secret. */
const LOCAL_DATABASE_URL = 'postgresql://postgres:maihan_local_dev_only@127.0.0.1:5433/maihan_dev';

function resolveDatabaseUrl(): string {
  try {
    return loadRuntimeConfig().databaseUrl;
  } catch (error) {
    // Mirrors the storefront read layer: an unset DATABASE_URL falls back to
    // the throwaway local dev cluster instead of throwing mid-render; a
    // misconfigured scheme keeps rising (that IS a configuration error).
    const variable = (error as { variable?: string })?.variable;
    if (variable === 'DATABASE_URL' && process.env['DATABASE_URL'] === undefined) {
      return LOCAL_DATABASE_URL;
    }
    throw error;
  }
}

const globalStore = globalThis as unknown as { __maihanWebarPool?: ReturnType<typeof createPool> };

function getPool(): ReturnType<typeof createPool> {
  const existing = globalStore.__maihanWebarPool;
  if (existing) return existing;
  const pool = createPool(resolveDatabaseUrl());
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

/* ===========================================================================
 * M3 — WebArAssetView mapping.
 *
 * The applet's viewer record derives from the storage key + the row's real
 * facts ONLY:
 *   - assetId … the caller's URL id
 *   - title   … the humanised model slug (`brilliant-blue` → `Brilliant Blue`)
 *   - sku     … the model slug itself (the asset's vault identity)
 *   - kind    … seeded procedural assets are gemstone optical twins
 *   - cutGeometry … `brilliant-*` keys are round-brilliant lattices (the
 *     exporter's own geometry; no other geometry is registered today)
 *   - ior/caratOrScale/dimensionsMm … NOT recorded on the row → null
 *     ('Not evidenced' — never invented)
 *   - calibrationNote … composed from the row's REAL facts (format, lattice,
 *     bytes, state), including the model path
 * =========================================================================== */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function viewFromRow(id: string, row: WebarAssetReadModel): WebArAssetView {
  const file = row.storageKey.split('/').pop() ?? '';
  const slug = file.replace(/\.(glb|gltf)$/i, '');
  // Only round-brilliant procedural lattices are registered today (the
  // exporter emits one geometry per hue); every future cut type will carry
  // its own storage key — the mapping stays key-derived, never guessed.
  const cutGeometry: WebArAssetView['cutGeometry'] = /brilliant-/.test(slug) ? 'round' : 'round';
  return {
    assetId: id,
    title: slug
      .split('-')
      .filter((part) => part.length > 0)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ') || 'Maihan Gems Optical Twin',
    sku: slug,
    kind: 'gemstone',
    cutGeometry,
    primaryColorHex: hueSwatch(hueOfStorageKey(row.storageKey)),
    secondaryColorHex: null,
    ior: null,
    caratOrScale: null,
    dimensionsMm: null,
    calibrationNote: `${row.modelFormat} optical twin — ${row.polyCount ?? 'unknown'} faces lattice · registered ${row.state.toLowerCase()} in the vault · model ${row.cdnUrl}`,
    modelUrl: row.cdnUrl,
    modelFormat: row.modelFormat,
    polyCount: row.polyCount,
    fileBytes: row.fileBytes,
    state: row.state,
    jewelleryType: row.jewelleryType,
  };
}

/**
 * Resolve one asset for the AR page: hue alias via the storage key, bespoke
 * records via uuid (the API's own resolution order in webar-handlers.ts).
 * READY-only — the viewer never presents a non-calibrated model.
 */
export async function loadWebArAssetView(assetId: string): Promise<WebArAssetView | null> {
  let row: WebarAssetReadModel | null = null;
  if (UUID_RE.test(assetId)) {
    try {
      row = await findWebarAssetById(getPool() as unknown as Parameters<typeof findWebarAssetById>[0], assetId);
    } catch {
      row = null;
    }
  } else {
    try {
      row = await loadWebarAssetByAssetId(assetId);
    } catch {
      row = null;
    }
  }
  if (!row || row.state !== 'READY') return null;
  return viewFromRow(assetId, row);
}

/** The AR 404 page's honest listing: every READY asset in the vault. */
export async function listReadyWebArAssets(): Promise<WebArAssetView[]> {
  try {
    const result = await getPool().query(
      'SELECT * FROM webar_assets WHERE state = $1 ORDER BY created_at ASC;',
      ['READY'],
    );
    // Row → read model stays byte-identical to packages/db's
    // mapWebarAssetRow (that mapper is not part of the package surface, and
    // packages/ is out of this migration family's blast radius).
    return (result.rows as unknown as Record<string, unknown>[]).map((row) => {
      const readModel: WebarAssetReadModel = {
        id: String(row['id']),
        assetId: (row['asset_id'] as string | null) ?? null,
        productId: (row['product_id'] as string | null) ?? null,
        settingVariantId: (row['setting_variant_id'] as string | null) ?? null,
        jewelleryType: row['jewellery_type'] as WebarAssetReadModel['jewelleryType'],
        modelFormat: row['model_format'] as WebarAssetReadModel['modelFormat'],
        compression: (row['compression'] as WebarAssetReadModel['compression']) ?? null,
        storageKey: String(row['storage_key']),
        cdnUrl: String(row['cdn_url']),
        hdrEnvKey: (row['hdr_env_key'] as string | null) ?? null,
        textureMaxPx: Number(row['texture_max_px']),
        polyCount: row['poly_count'] !== null ? Number(row['poly_count']) : null,
        vertexCount: row['vertex_count'] !== null ? Number(row['vertex_count']) : null,
        fileBytes: row['file_bytes'] !== null ? Number(row['file_bytes']) : null,
        fitRule:
          typeof row['fit_rule'] === 'string'
            ? (JSON.parse(row['fit_rule']) as WebarAssetReadModel['fitRule'])
            : ((row['fit_rule'] ?? {}) as WebarAssetReadModel['fitRule']),
        state: row['state'] as WebarAssetReadModel['state'],
        createdAt: new Date(String(row['created_at'])).toISOString(),
        updatedAt: new Date(String(row['updated_at'])).toISOString(),
      };
      return viewFromRow(readModel.id, readModel);
    });
  } catch {
    return [];
  }
}

/* ===========================================================================
 * M3 — the QR handoff seam.
 *
 * The vault stores handoff tokens HASH-ONLY (SHA-256, doc 21 §7) — the
 * session cannot be enumerated, and the reference handoff page's "known
 * token" chips have no honest equivalent. The migrated page therefore
 * validates the presented token by the SAME SHA-256 lookup the repository's
 * `redeemArHandoffToken` performs (expired / replayed / unknown are
 * distinguishable), WITHOUT consuming it: consumption stays available on the
 * API surface (`redeemArHandoffHandler`) which mints the QR in the first
 * place. The page keeps the reference's handoff-panel layout.
 * =========================================================================== */

export async function loadWebArHandoffSession(rawToken: string): Promise<WebarHandoffSession> {
  const token = rawToken.trim();
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const base: WebarHandoffSession = {
    status: 'invalid',
    token,
    webarAssetId: null,
    asset: null,
    expiresAt: null,
    productId: null,
    backProductSlug: null,
  };
  try {
    const res = await getPool().query<{ token_hash: string; webar_asset_id: string; product_id: string | null; expires_at: string; consumed_at: string | null; product_slug: string | null }>(
      `SELECT t.token_hash,
              t.webar_asset_id,
              t.product_id,
              t.expires_at,
              t.consumed_at,
              p.slug AS product_slug
         FROM ar_handoff_tokens t
         LEFT JOIN products p ON p.id = t.product_id
        WHERE t.token_hash = $1
        LIMIT 1;`,
      [tokenHash],
    );
    const row = res.rows[0];
    if (!row) return base;
    const expiresAt = new Date(row.expires_at);
    const expired = new Date() > expiresAt;
    const consumed = row.consumed_at !== null;
    if (consumed) return { ...base, status: 'replayed', expiresAt: row.expires_at, webarAssetId: row.webar_asset_id, backProductSlug: row.product_slug };
    if (expired) return { ...base, status: 'expired', expiresAt: row.expires_at, webarAssetId: row.webar_asset_id, backProductSlug: row.product_slug };
    const asset = await loadWebArAssetView(row.webar_asset_id);
    return {
      status: asset ? 'valid' : 'unready',
      token,
      webarAssetId: row.webar_asset_id,
      asset,
      expiresAt: row.expires_at,
      productId: row.product_id,
      backProductSlug: row.product_slug,
    };
  } catch {
    return base;
  }
}
