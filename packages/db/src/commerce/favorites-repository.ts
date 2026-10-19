/**
 * packages/db/src/commerce/favorites-repository.ts
 *
 * Phase 6 Task 8 — Wishlist (/favorites) and Compare-list (/compare) repository.
 *
 * Authority:
 * - PROJECT_SOURCE_OF_TRUTH.md §11.5, §24, FR-COM-05.
 * - technical_design/13 COMMERCE ARCHITECTURE.
 * - technical_design/06 API ARCHITECTURE.
 */
import { sql } from 'drizzle-orm';
import type { CatalogDatabase } from '../catalog/executor.js';
import {
  ContractError,
  type CompareAttributeRow,
  type CompareMatrixDto,
  type CompareProductDto,
  type FavoriteItemDto,
} from '@maihan/contracts';

interface FavoritesPayload {
  product_ids: string[];
}

function getFavoritesJobKey(customerId: string): string {
  return `favorites:customer:${customerId}`;
}

async function getStoredProductIds(db: CatalogDatabase, customerId: string): Promise<string[]> {
  const jobKey = getFavoritesJobKey(customerId);
  const res = await db.execute(sql`
    SELECT payload
    FROM jobs
    WHERE queue = 'customer_favorites'
      AND job_key = ${jobKey}
    LIMIT 1
  `);

  if (res.rows.length === 0) return [];
  const row = res.rows[0] as Record<string, unknown> | undefined;
  if (!row) return [];
  const payload = row['payload'] as FavoritesPayload | null;
  if (!payload || !Array.isArray(payload.product_ids)) return [];
  return payload.product_ids;
}

export async function getCustomerFavorites(
  db: CatalogDatabase,
  customerId: string,
): Promise<FavoriteItemDto[]> {
  const productIds = await getStoredProductIds(db, customerId);
  if (productIds.length === 0) return [];

  // Query products with variety and image
  const res = await db.execute(sql`
    SELECT
      p.id,
      COALESCE(p.source_sku, p.source_sku_derived, 'MG-' || p.product_number::text) AS sku,
      p.title,
      p.price_amount::text AS price_amount,
      p.currency,
      p.state,
      p.created_at,
      gv.name AS variety_name,
      g.availability AS gemstone_availability,
      a.storage_key AS image_storage_key
    FROM products p
    LEFT JOIN gemstones g ON g.id = p.gemstone_id
    LEFT JOIN gemstone_varieties gv ON gv.id = g.variety_id
    LEFT JOIN asset_usages au ON au.entity_type = 'PRODUCT' AND au.entity_id = p.id AND au.role = 'PRIMARY'
    LEFT JOIN assets a ON a.id = au.asset_id
    WHERE p.id IN (${sql.join(productIds.map((id) => sql`${id}`), sql`, `)})
      AND p.state <> 'DRAFT'
  `);

  const rows = res.rows as unknown as Array<{
    id: string;
    sku: string;
    title: string;
    price_amount: string | null;
    currency: string;
    state: string;
    created_at: string;
    variety_name: string | null;
    gemstone_availability: boolean | null;
    image_storage_key: string | null;
  }>;

  // Preserve order of productIds
  const rowMap = new Map(rows.map((r) => [r.id, r]));

  const result: FavoriteItemDto[] = [];
  for (const id of productIds) {
    const row = rowMap.get(id);
    if (!row) continue;
    result.push({
      id: row.id,
      sku: row.sku,
      title: row.title,
      price_amount: row.price_amount ? Number(row.price_amount).toFixed(2) : null,
      currency: row.currency ?? 'USD',
      variety: row.variety_name,
      primary_image_url: row.image_storage_key ? `/media/${row.image_storage_key}` : null,
      availability: row.gemstone_availability ?? true,
      created_at: new Date(row.created_at).toISOString(),
    });
  }

  return result;
}

export async function addCustomerFavorite(
  db: CatalogDatabase,
  customerId: string,
  productId: string,
): Promise<FavoriteItemDto[]> {
  // Verify product exists
  const prodCheck = await db.execute(sql`
    SELECT id FROM products
    WHERE id = ${productId}
      AND state <> 'DRAFT'
    LIMIT 1
  `);

  if (prodCheck.rows.length === 0) {
    throw new ContractError('NOT_FOUND', `Product "${productId}" not found.`);
  }

  const existingIds = await getStoredProductIds(db, customerId);
  const updatedIds = existingIds.includes(productId) ? existingIds : [...existingIds, productId];

  const jobKey = getFavoritesJobKey(customerId);
  const payloadJson = JSON.stringify({ product_ids: updatedIds });

  await db.execute(sql`
    INSERT INTO jobs (queue, job_key, job_type, payload, state, run_after)
    VALUES ('customer_favorites', ${jobKey}, 'SYNC_FAVORITES', ${payloadJson}::jsonb, 'SUCCEEDED', now())
    ON CONFLICT (job_key)
    DO UPDATE SET payload = EXCLUDED.payload, updated_at = now()
  `);

  return getCustomerFavorites(db, customerId);
}

export async function removeCustomerFavorite(
  db: CatalogDatabase,
  customerId: string,
  productId: string,
): Promise<FavoriteItemDto[]> {
  const existingIds = await getStoredProductIds(db, customerId);
  const updatedIds = existingIds.filter((id) => id !== productId);

  const jobKey = getFavoritesJobKey(customerId);
  const payloadJson = JSON.stringify({ product_ids: updatedIds });

  await db.execute(sql`
    INSERT INTO jobs (queue, job_key, job_type, payload, state, run_after)
    VALUES ('customer_favorites', ${jobKey}, 'SYNC_FAVORITES', ${payloadJson}::jsonb, 'SUCCEEDED', now())
    ON CONFLICT (job_key)
    DO UPDATE SET payload = EXCLUDED.payload, updated_at = now()
  `);

  return getCustomerFavorites(db, customerId);
}

export async function getCompareMatrix(
  db: CatalogDatabase,
  productIds: string[],
): Promise<CompareMatrixDto> {
  const uniqueIds = Array.from(new Set(productIds));
  if (uniqueIds.length < 2 || uniqueIds.length > 4) {
    throw new ContractError('VALIDATION_FAILED', 'Compare-list requires between 2 and 4 products.');
  }

  const res = await db.execute(sql`
    SELECT
      p.id,
      COALESCE(p.source_sku, p.source_sku_derived, 'MG-' || p.product_number::text) AS sku,
      p.title,
      p.price_amount::text AS price_amount,
      p.currency,
      gv.name AS variety_name,
      gs.name AS species_name,
      g.total_weight_ct::text AS carat_weight,
      g.length_mm::text || ' x ' || g.width_mm::text || ' x ' || g.depth_mm::text AS dimensions_mm,
      g.shape::text AS shape,
      gc.name AS color_name,
      cl.label AS clarity_name,
      go.name AS origin_name,
      tr.code::text AS treatment_code,
      cft.certificate_number,
      cft.lab_name AS certificate_lab,
      a.storage_key AS image_storage_key
    FROM products p
    LEFT JOIN gemstones g ON g.id = p.gemstone_id
    LEFT JOIN gemstone_varieties gv ON gv.id = g.variety_id
    LEFT JOIN gemstone_species gs ON gs.id = g.species_id
    LEFT JOIN gemstone_colours gc ON gc.id = g.colour_id
    LEFT JOIN clarities cl ON cl.id = g.clarity_id
    LEFT JOIN gemstone_origins go ON go.id = g.origin_id
    LEFT JOIN treatments tr ON tr.id = g.treatment_id
    LEFT JOIN certificates cft ON cft.gemstone_id = g.id
    LEFT JOIN asset_usages au ON au.entity_type = 'PRODUCT' AND au.entity_id = p.id AND au.role = 'PRIMARY'
    LEFT JOIN assets a ON a.id = au.asset_id
    WHERE p.id IN (${sql.join(uniqueIds.map((id) => sql`${id}`), sql`, `)})
      AND p.state <> 'DRAFT'
  `);

  const rows = res.rows as unknown as Array<{
    id: string;
    sku: string;
    title: string;
    price_amount: string | null;
    currency: string;
    variety_name: string | null;
    species_name: string | null;
    carat_weight: string | null;
    dimensions_mm: string | null;
    shape: string | null;
    color_name: string | null;
    clarity_name: string | null;
    origin_name: string | null;
    treatment_code: string | null;
    certificate_number: string | null;
    certificate_lab: string | null;
    image_storage_key: string | null;
  }>;

  if (rows.length !== uniqueIds.length) {
    throw new ContractError('NOT_FOUND', 'One or more products to compare were not found.');
  }

  const rowMap = new Map(rows.map((r) => [r.id, r]));
  const products: CompareProductDto[] = [];

  for (const id of uniqueIds) {
    const row = rowMap.get(id)!;
    const cert = row.certificate_number
      ? `${row.certificate_lab ?? 'Cert'} #${row.certificate_number}`
      : null;

    products.push({
      id: row.id,
      sku: row.sku,
      title: row.title,
      price_amount: row.price_amount ? Number(row.price_amount).toFixed(2) : null,
      currency: row.currency ?? 'USD',
      variety: row.variety_name,
      gemstone_species: row.species_name,
      carat_weight: row.carat_weight ? Number(row.carat_weight) : null,
      dimensions: row.dimensions_mm,
      shape: row.shape,
      color: row.color_name,
      clarity: row.clarity_name,
      origin: row.origin_name,
      treatment: row.treatment_code,
      certificate: cert,
      primary_image_url: row.image_storage_key ? `/media/${row.image_storage_key}` : null,
    });
  }

  const attributeDefinitions: Array<{
    key: string;
    label: string;
    extract: (p: CompareProductDto) => string | number | null;
  }> = [
    {
      key: 'price',
      label: 'Price',
      extract: (p) => (p.price_amount ? `$${p.price_amount} ${p.currency}` : null),
    },
    { key: 'variety', label: 'Variety', extract: (p) => p.variety },
    { key: 'carat_weight', label: 'Carat Weight', extract: (p) => p.carat_weight },
    { key: 'shape', label: 'Shape / Cut', extract: (p) => p.shape },
    { key: 'dimensions', label: 'Dimensions (mm)', extract: (p) => p.dimensions },
    { key: 'color', label: 'Color', extract: (p) => p.color },
    { key: 'clarity', label: 'Clarity', extract: (p) => p.clarity },
    { key: 'origin', label: 'Origin', extract: (p) => p.origin },
    { key: 'treatment', label: 'Treatment', extract: (p) => p.treatment },
    { key: 'certificate', label: 'Certificate', extract: (p) => p.certificate },
  ];

  const attributes: CompareAttributeRow[] = attributeDefinitions.map((def) => {
    const values: Record<string, string | number | null> = {};
    for (const p of products) {
      values[p.id] = def.extract(p);
    }
    return {
      key: def.key,
      label: def.label,
      values,
    };
  });

  return { products, attributes };
}
