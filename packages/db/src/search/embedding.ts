/**
 * packages/db/src/search/embedding.ts
 *
 * Product embedding text composition and idempotent generator (Phase 5 Task 6).
 *
 * Scope authority:
 *   - INITIAL_IMPLEMENTATION_PLAN.md Phase 5 Task 6:
 *     "Implement embedding generation for products, content-hash gated for idempotency."
 *   - PROJECT_SOURCE_OF_TRUTH.md §11.3 & §14
 *   - technical_design/12_SEARCH_ARCHITECTURE.md §87-90:
 *     "Product embedding document: title, variety, colour, intensity, shape,
 *      cut, clarity, treatment, origin, setting style, metal.
 *      content_hash makes re-embedding idempotent: an unchanged product
 *      produces the same hash and skips the model call. This is the single
 *      largest AI cost control in the system."
 */
import { createHash } from 'node:crypto';
import { sql } from 'drizzle-orm';
import type { CatalogDatabase } from '../catalog/executor.js';
import { formatPgVector } from './semantic-arm.js';

export const DEFAULT_EMBEDDING_MODEL = 'text-embedding-3-large-1024';

export interface ProductEmbeddingFields {
  readonly title?: string | null;
  readonly variety?: string | null;
  readonly color?: string | null;
  readonly intensity?: string | null;
  readonly shape?: string | null;
  readonly cut?: string | null;
  readonly clarity?: string | null;
  readonly treatment?: string | null;
  readonly origin?: string | null;
  readonly settingStyle?: string | null;
  readonly metal?: string | null;
}

/**
 * Deterministically composes the text document to be embedded.
 */
export function composeProductEmbeddingDocument(fields: ProductEmbeddingFields): string {
  const parts: string[] = [];

  const add = (label: string, val?: string | null) => {
    if (val && val.trim().length > 0) {
      parts.push(`${label}: ${val.trim()}`);
    }
  };

  add('Title', fields.title);
  add('Variety', fields.variety);
  add('Color', fields.color);
  add('Intensity', fields.intensity);
  add('Shape', fields.shape);
  add('Cut', fields.cut);
  add('Clarity', fields.clarity);
  add('Treatment', fields.treatment);
  add('Origin', fields.origin);
  add('Setting Style', fields.settingStyle);
  add('Metal', fields.metal);

  return parts.join(' | ');
}

/**
 * Computes deterministic SHA-256 hash over the composed document text.
 */
export function computeEmbeddingContentHash(documentText: string): string {
  return createHash('sha256').update(documentText, 'utf8').digest('hex');
}

export interface EmbedProductResult {
  readonly productId: string;
  readonly embeddingModel: string;
  readonly contentHash: string;
  readonly skipped: boolean;
  readonly reason: 'UNCHANGED_CONTENT_HASH' | 'GENERATED_AND_PERSISTED';
}

export type VectorProvider = (documentText: string) => Promise<readonly number[] | Float32Array>;

/**
 * Idempotently generates and persists product embeddings gated by content_hash.
 */
export async function syncProductEmbedding(
  db: CatalogDatabase,
  productId: string,
  vectorProvider: VectorProvider,
  modelName: string = DEFAULT_EMBEDDING_MODEL,
): Promise<EmbedProductResult> {
  // 1. Fetch product and joined fields
  const fetchStatement = sql`
    SELECT
      p.id::text AS product_id,
      p.title,
      gv.name AS variety,
      gc.name AS color,
      ci.name AS intensity,
      coalesce(g.shape::text, gp.shape::text) AS shape,
      coalesce(g.cut_label, gp.cut_label) AS cut,
      cl.label AS clarity,
      t.label AS treatment,
      o.name AS origin,
      s.name AS setting_style,
      sv.metal_code::text AS metal
    FROM products p
    LEFT JOIN gemstone_varieties gv ON gv.id = p.variety_id
    LEFT JOIN gemstone_colours gc ON gc.id = p.colour_id
    LEFT JOIN gemstones g ON g.id = p.gemstone_id
    LEFT JOIN gemstones gp ON gp.id = p.gemstone_pair_id
    LEFT JOIN colour_intensities ci ON ci.id = coalesce(g.intensity_id, gp.intensity_id)
    LEFT JOIN clarities cl ON cl.id = coalesce(g.clarity_id, gp.clarity_id)
    LEFT JOIN treatments t ON t.id = coalesce(g.treatment_id, gp.treatment_id)
    LEFT JOIN gemstone_origins o ON o.id = coalesce(g.origin_id, gp.origin_id)
    LEFT JOIN setting_variants sv ON sv.id = p.setting_variant_id
    LEFT JOIN settings s ON s.id = sv.setting_id
    WHERE p.id = ${productId}::uuid
  `;

  const rowsResult = await db.execute(fetchStatement);
  const row = rowsResult.rows?.[0] as Record<string, unknown> | undefined;

  if (!row) {
    throw new Error(`Product not found for embedding sync: ${productId}`);
  }

  // 2. Compose document and compute SHA-256 hash
  const docText = composeProductEmbeddingDocument({
    title: row['title'] as string | null,
    variety: row['variety'] as string | null,
    color: row['color'] as string | null,
    intensity: row['intensity'] as string | null,
    shape: row['shape'] as string | null,
    cut: row['cut'] as string | null,
    clarity: row['clarity'] as string | null,
    treatment: row['treatment'] as string | null,
    origin: row['origin'] as string | null,
    settingStyle: row['setting_style'] as string | null,
    metal: row['metal'] as string | null,
  });

  const contentHash = computeEmbeddingContentHash(docText);

  // 3. Check existing content_hash
  const checkStatement = sql`
    SELECT content_hash
    FROM product_embeddings
    WHERE product_id = ${productId}::uuid
      AND embedding_model = ${modelName}
  `;

  const existingResult = await db.execute(checkStatement);
  const existingHash = existingResult.rows?.[0]?.['content_hash'] as string | undefined;

  if (existingHash === contentHash) {
    return Object.freeze({
      productId,
      embeddingModel: modelName,
      contentHash,
      skipped: true,
      reason: 'UNCHANGED_CONTENT_HASH',
    });
  }

  // 4. Generate vector only when hash changed
  const vector = await vectorProvider(docText);
  const vectorLiteral = formatPgVector(vector);

  // 5. Upsert vector
  const upsertStatement = sql`
    INSERT INTO product_embeddings (product_id, embedding, embedding_model, content_hash)
    VALUES (${productId}::uuid, ${vectorLiteral}::vector(1024), ${modelName}, ${contentHash})
    ON CONFLICT (product_id, embedding_model)
    DO UPDATE SET
      embedding = EXCLUDED.embedding,
      content_hash = EXCLUDED.content_hash,
      created_at = now()
  `;

  await db.execute(upsertStatement);

  return Object.freeze({
    productId,
    embeddingModel: modelName,
    contentHash,
    skipped: false,
    reason: 'GENERATED_AND_PERSISTED',
  });
}
