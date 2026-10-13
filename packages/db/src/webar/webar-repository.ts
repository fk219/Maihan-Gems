/**
 * packages/db/src/webar/webar-repository.ts
 *
 * WebAR & 3D Asset Repository.
 * Authority:
 *   - technical_design/21_WEBAR_ARCHITECTURE.md §3, §7
 *   - 0011_assets.sql (webar_assets, ar_handoff_tokens)
 *
 * Implements:
 *   - Asset budget validation and registration
 *   - Querying webar_assets by product_id or setting_variant_id
 *   - Creation of hashed single-use QR handoff tokens
 *   - Atomic consumption and verification of handoff tokens
 */
import { createHash, randomBytes } from 'node:crypto';
import {
  WEBAR_BUDGETS,
  type WebarAssetReadModel,
  type FitRule,
  type CreateHandoffResponse,
  type RedeemHandoffResponse,
  type JewelleryType,
} from '@maihan/contracts';

export type DbClient = {
  query: (text: string, params?: any[]) => Promise<{ rows: any[]; rowCount?: number }>;
};


export interface InsertWebarAssetParams {
  readonly assetId?: string | null;
  readonly productId?: string | null;
  readonly settingVariantId?: string | null;
  readonly jewelleryType: JewelleryType;
  readonly modelFormat: 'GLB' | 'GLTF';
  readonly compression?: 'DRACO' | 'MESHOPT' | 'NONE';
  readonly storageKey: string;
  readonly cdnUrl: string;
  readonly hdrEnvKey?: string | null;
  readonly textureMaxPx?: number;
  readonly polyCount?: number;
  readonly vertexCount?: number;
  readonly fileBytes?: number;
  readonly fitRule?: FitRule;
  readonly state?: 'PENDING' | 'FETCHING' | 'READY' | 'FAILED';
}

export interface BudgetValidationResult {
  readonly valid: boolean;
  readonly violations: string[];
}

/** Validates asset parameters against technical budgets in doc 21 §3 */
export function validateWebarAssetBudgets(params: {
  jewelleryType: JewelleryType;
  polyCount?: number;
  fileBytes?: number;
  textureMaxPx?: number;
}): BudgetValidationResult {
  const budget = WEBAR_BUDGETS[params.jewelleryType];
  const violations: string[] = [];

  if (budget === undefined) {
    violations.push(`No WebAR budget defined for jewellery type ${params.jewelleryType}`);
    return { valid: false, violations };
  }

  if (params.polyCount && params.polyCount > budget.maxTriangles) {
    violations.push(`Polygon count (${params.polyCount}) exceeds budget for ${params.jewelleryType} (${budget.maxTriangles})`);
  }

  if (params.fileBytes && params.fileBytes > budget.maxBytes) {
    violations.push(`File size (${params.fileBytes} bytes) exceeds budget for ${params.jewelleryType} (${budget.maxBytes} bytes)`);
  }

  if (params.textureMaxPx && params.textureMaxPx > budget.maxTexturePx) {
    violations.push(`Texture resolution (${params.textureMaxPx}px) exceeds max allowed (${budget.maxTexturePx}px)`);
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}

export function mapWebarAssetRow(row: any): WebarAssetReadModel {
  return {
    id: row.id,
    assetId: row.asset_id ?? null,
    productId: row.product_id ?? null,
    settingVariantId: row.setting_variant_id ?? null,
    jewelleryType: row.jewellery_type,
    modelFormat: row.model_format,
    compression: row.compression ?? null,
    storageKey: row.storage_key,
    cdnUrl: row.cdn_url,
    hdrEnvKey: row.hdr_env_key ?? null,
    textureMaxPx: row.texture_max_px,
    polyCount: row.poly_count !== null ? Number(row.poly_count) : null,
    vertexCount: row.vertex_count !== null ? Number(row.vertex_count) : null,
    fileBytes: row.file_bytes !== null ? Number(row.file_bytes) : null,
    fitRule: typeof row.fit_rule === 'string' ? JSON.parse(row.fit_rule) : (row.fit_rule ?? {}),
    state: row.state,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export async function createWebarAsset(
  db: DbClient,
  params: InsertWebarAssetParams,
): Promise<WebarAssetReadModel> {
  const validation = validateWebarAssetBudgets(params);
  if (!validation.valid) {
    throw new Error(`AR_ASSET_OVER_BUDGET: ${validation.violations.join('; ')}`);
  }

  const query = `
    INSERT INTO webar_assets (
      asset_id, product_id, setting_variant_id, jewellery_type,
      model_format, compression, storage_key, cdn_url, hdr_env_key,
      texture_max_px, poly_count, vertex_count, file_bytes, fit_rule, state
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, $15
    ) RETURNING *;
  `;

  const values = [
    params.assetId ?? null,
    params.productId ?? null,
    params.settingVariantId ?? null,
    params.jewelleryType,
    params.modelFormat,
    params.compression ?? 'DRACO',
    params.storageKey,
    params.cdnUrl,
    params.hdrEnvKey ?? null,
    params.textureMaxPx ?? 1024,
    params.polyCount ?? null,
    params.vertexCount ?? null,
    params.fileBytes ?? null,
    JSON.stringify(params.fitRule ?? {}),
    params.state ?? 'READY',
  ];

  const res = await db.query(query, values);
  return mapWebarAssetRow(res.rows[0]);
}

export async function findWebarAssetById(
  db: DbClient,
  id: string,
): Promise<WebarAssetReadModel | null> {
  const res = await db.query('SELECT * FROM webar_assets WHERE id = $1 LIMIT 1;', [id]);
  if (!res.rows[0]) return null;
  return mapWebarAssetRow(res.rows[0]);
}

export async function findWebarAssetForProduct(
  db: DbClient,
  productId: string,
): Promise<WebarAssetReadModel | null> {
  const query = `
    SELECT wa.*
    FROM webar_assets wa
    WHERE wa.product_id = $1 AND wa.state = 'READY'
    LIMIT 1;
  `;
  const res = await db.query(query, [productId]);
  if (res.rows[0]) return mapWebarAssetRow(res.rows[0]);

  // Fallback: check if the product has a setting_variant associated
  const fallbackQuery = `
    SELECT wa.*
    FROM webar_assets wa
    JOIN products p ON p.setting_variant_id = wa.setting_variant_id
    WHERE p.id = $1 AND wa.state = 'READY'
    LIMIT 1;
  `;
  const fallbackRes = await db.query(fallbackQuery, [productId]);
  if (!fallbackRes.rows[0]) return null;
  return mapWebarAssetRow(fallbackRes.rows[0]);
}

export async function findWebarAssetForSetting(
  db: DbClient,
  settingVariantId: string,
): Promise<WebarAssetReadModel | null> {
  const query = `
    SELECT *
    FROM webar_assets
    WHERE setting_variant_id = $1 AND state = 'READY'
    LIMIT 1;
  `;
  const res = await db.query(query, [settingVariantId]);
  if (!res.rows[0]) return null;
  return mapWebarAssetRow(res.rows[0]);
}

/**
 * Creates a short-lived (10 min) single-use QR handoff token.
 * Only the SHA-256 hash of the token is stored at rest (doc 21 §7).
 */
export async function createArHandoffToken(
  db: DbClient,
  params: { webarAssetId: string; productId?: string; baseUrl: string },
): Promise<CreateHandoffResponse> {
  const rawToken = randomBytes(24).toString('base64url');
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  const query = `
    INSERT INTO ar_handoff_tokens (token_hash, product_id, webar_asset_id, expires_at, uses)
    VALUES ($1, $2, $3, $4, 1);
  `;
  await db.query(query, [tokenHash, params.productId ?? null, params.webarAssetId, expiresAt]);

  const cleanBase = params.baseUrl.replace(/\/+$/, '');
  return {
    rawToken,
    handoffUrl: `${cleanBase}/ar/handoff/${rawToken}`,
    expiresAt: expiresAt.toISOString(),
  };
}

/**
 * Atomically redeems a single-use handoff token.
 * Rejects expired tokens with AR_HANDOFF_INVALID and already consumed tokens with AR_HANDOFF_REPLAYED.
 */
export async function redeemArHandoffToken(
  db: DbClient,
  rawToken: string,
): Promise<RedeemHandoffResponse> {

  const tokenHash = createHash('sha256').update(rawToken).digest('hex');

  const checkQuery = `
    SELECT t.*, wa.cdn_url, wa.jewellery_type, wa.fit_rule, wa.state
    FROM ar_handoff_tokens t
    JOIN webar_assets wa ON wa.id = t.webar_asset_id
    WHERE t.token_hash = $1
    LIMIT 1;
  `;
  const res = await db.query(checkQuery, [tokenHash]);
  const row = res.rows[0];

  if (!row) {
    throw new Error('AR_HANDOFF_INVALID: Unknown or expired handoff token.');
  }

  const now = new Date();
  if (new Date(row.expires_at) < now) {
    throw new Error('AR_HANDOFF_INVALID: Handoff token has expired.');
  }

  if (row.consumed_at !== null) {
    throw new Error('AR_HANDOFF_REPLAYED: Token already consumed.');
  }

  // Atomically mark as consumed
  const updateQuery = `
    UPDATE ar_handoff_tokens
    SET consumed_at = now()
    WHERE token_hash = $1 AND consumed_at IS NULL;
  `;
  const updateRes = await db.query(updateQuery, [tokenHash]);
  if ((updateRes as any).rowCount === 0) {
    throw new Error('AR_HANDOFF_REPLAYED: Token already consumed.');
  }

  return {
    webarAssetId: row.webar_asset_id,
    productId: row.product_id ?? null,
    cdnUrl: row.cdn_url,
    jewelleryType: row.jewellery_type,
    fitRule: typeof row.fit_rule === 'string' ? JSON.parse(row.fit_rule) : (row.fit_rule ?? {}),
  };
}
