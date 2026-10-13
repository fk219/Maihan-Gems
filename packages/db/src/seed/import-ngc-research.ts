/**
 * Upsert the 443 NGC research products into the storefront schema.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PoolClient } from 'pg';

interface CompiledMedia {
  kind: string;
  order: number;
  url?: string | null;
  title?: string | null;
  description?: string | null;
  localPath?: string | null;
  fileName?: string | null;
  urlPattern?: string | null;
  framesCount?: number | null;
  pastCreation?: boolean;
  sourceType?: number | null;
  cloudinaryPublicId?: string | null;
  cloudinaryResourceType?: string | null;
  secureUrl?: string | null;
}

interface CompiledProduct {
  id: string;
  kind: string;
  title: string;
  slug: string;
  path: string;
  sourceUrl: string | null;
  descriptionHtml: string;
  priceUsd: number;
  discountPriceUsd: number | null;
  pricePerCt: number | null;
  availability: string;
  dyoEnabled: boolean;
  stoneType: string | null;
  stoneSubType: string | null;
  weightCt: number | null;
  lengthMm: number | null;
  widthMm: number | null;
  depthMm: number | null;
  shape: string | null;
  cut: string | null;
  cuttingStyle: string | null;
  color: string | null;
  colorIntensity: string | null;
  clarity: string | null;
  enhancement: string | null;
  origin: string | null;
  lab: string | null;
  settingType: string | null;
  jewelryType: string | null;
  styles: string[];
  colorCategories: string[];
  metalName: string | null;
  media: CompiledMedia[];
  pairStones: Array<{ weightCt: number | null; shape: string | null; color: string | null }>;
}

function catalogPath(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.join(process.cwd(), 'apps/web/src/data/ngc-catalog.json'),
    path.join(process.cwd(), 'src/data/ngc-catalog.json'),
    path.join(here, '../../../../apps/web/src/data/ngc-catalog.json'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error('ngc-catalog.json not found. Run node scripts/compile-ngc-catalog.mjs');
}

function dbKind(kind: string): 'gemstone' | 'jewelry' | 'setting' {
  if (kind === 'setting') return 'setting';
  if (kind === 'jewelry' || kind === 'dyo_composite') return 'jewelry';
  return 'gemstone';
}

export async function importNgcResearch(client: PoolClient): Promise<{ upserted: number }> {
  const products = JSON.parse(fs.readFileSync(catalogPath(), 'utf8')) as CompiledProduct[];
  let upserted = 0;

  for (const product of products) {
    const kind = dbKind(product.kind);
    let slug = product.slug.toLowerCase();
    const found = await client.query<{ id: string }>(
      `SELECT id FROM products WHERE sku = $1 OR public_code = $1 LIMIT 1`,
      [product.id],
    );
    if (!found.rows[0]) {
      const taken = await client.query(
        `SELECT 1 FROM products WHERE slug = $1 LIMIT 1`,
        [slug],
      );
      if ((taken.rowCount ?? 0) > 0) slug = `${slug}-${product.id.toLowerCase()}`;
    }
    let productId = found.rows[0]?.id;
    if (!productId) {
      const inserted = await client.query<{ id: string }>(
        `
        INSERT INTO products (
          sku, slug, title, kind, description, description_html, public_code, source_url,
          pricing_mode, base_currency, status, availability, dyo_enabled, source_payload
        ) VALUES ($1,$2,$3,$4::product_type,$5,$6,$7,$8,'fixed','USD','active',$9,$10,$11::jsonb)
        ON CONFLICT (slug) DO UPDATE SET
          sku = EXCLUDED.sku,
          title = EXCLUDED.title,
          description_html = EXCLUDED.description_html,
          public_code = EXCLUDED.public_code,
          source_url = EXCLUDED.source_url,
          availability = EXCLUDED.availability,
          dyo_enabled = EXCLUDED.dyo_enabled,
          status = 'active'
        RETURNING id
        `,
        [
          product.id,
          slug,
          product.title,
          kind,
          product.descriptionHtml.replace(/<[^>]+>/g, ' ').slice(0, 500),
          product.descriptionHtml,
          product.id,
          product.sourceUrl,
          product.availability,
          product.dyoEnabled,
          JSON.stringify({ path: product.path, kind: product.kind }),
        ],
      );
      productId = inserted.rows[0]?.id;
    }
    if (!productId) continue;

    await client.query(
      `UPDATE products SET
         title = $2, description_html = $3, public_code = $4, source_url = $5,
         availability = $6, dyo_enabled = $7, status = 'active', kind = $8::product_type
       WHERE id = $1`,
      [
        productId,
        product.title,
        product.descriptionHtml,
        product.id,
        product.sourceUrl,
        product.availability,
        product.dyoEnabled,
        kind,
      ],
    );

    if (kind === 'gemstone') {
      await client.query(
        `
        INSERT INTO gemstone_details (
          product_id, quantity_type, piece_count, stone_type, variety, origin_type,
          carat_total, length_mm, width_mm, depth_mm, shape, cut_style, color_hue,
          color_intensity, clarity_grade, treatment_status, origin_country
        ) VALUES ($1,$2,$3,$4,$5,'natural',$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
        ON CONFLICT (product_id) DO UPDATE SET
          stone_type = EXCLUDED.stone_type, carat_total = EXCLUDED.carat_total,
          shape = EXCLUDED.shape, color_hue = EXCLUDED.color_hue, origin_country = EXCLUDED.origin_country
        `,
        [
          productId,
          product.kind === 'stone_pair' ? 'pair' : 'single',
          product.kind === 'stone_pair' ? 2 : 1,
          product.stoneType ?? product.title,
          product.stoneSubType,
          product.weightCt,
          product.lengthMm,
          product.widthMm,
          product.depthMm,
          product.shape,
          product.cut ?? product.cuttingStyle,
          product.color,
          product.colorIntensity,
          product.clarity,
          product.enhancement,
          product.origin,
        ],
      );
    } else if (kind === 'setting') {
      await client.query(
        `
        INSERT INTO setting_details (product_id, setting_for, style, price_excludes_center)
        VALUES ($1,$2,$3,true)
        ON CONFLICT (product_id) DO UPDATE SET setting_for = EXCLUDED.setting_for, style = EXCLUDED.style
        `,
        [
          productId,
          product.settingType === 'earring' ? 'earrings' : product.settingType === 'pendant_necklace' ? 'pendant' : product.settingType === 'bracelet' ? 'bracelet' : 'ring',
          product.styles,
        ],
      );
    } else {
      await client.query(
        `
        INSERT INTO jewelry_details (product_id, jewelry_type, metal_type, metal_color, total_carat_weight)
        VALUES ($1,$2,$3,$4,$5)
        ON CONFLICT (product_id) DO UPDATE SET jewelry_type = EXCLUDED.jewelry_type, metal_type = EXCLUDED.metal_type
        `,
        [
          productId,
          product.jewelryType ?? 'ring',
          product.metalName,
          product.metalName,
          product.weightCt,
        ],
      );
    }

    await client.query(`DELETE FROM stone_specs WHERE product_id = $1`, [productId]);
    await client.query(
      `
      INSERT INTO stone_specs (
        product_id, role, position, gem_type, gem_subtype, weight_ct, length_mm, width_mm, depth_mm,
        shape, cut, cutting_style, color, color_intensity, clarity, enhancement, origin, lab, price_per_ct_usd
      ) VALUES ($1,'primary',0,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      `,
      [
        productId,
        product.stoneType,
        product.stoneSubType,
        product.weightCt,
        product.lengthMm,
        product.widthMm,
        product.depthMm,
        product.shape,
        product.cut,
        product.cuttingStyle,
        product.color,
        product.colorIntensity,
        product.clarity,
        product.enhancement,
        product.origin,
        product.lab,
        product.pricePerCt,
      ],
    );

    await client.query(`DELETE FROM product_color_categories WHERE product_id = $1`, [productId]);
    for (const color of product.colorCategories ?? []) {
      await client.query(
        `INSERT INTO product_color_categories (product_id, color_category) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
        [productId, color],
      );
    }

    await client.query(`DELETE FROM product_media_items WHERE product_id = $1`, [productId]);
    for (const item of product.media ?? []) {
      await client.query(
        `
        INSERT INTO product_media_items (
          product_id, kind, sort, title, description, url, source_url, storage_key, file_name,
          frames_count, frame_url_pattern, is_primary, is_past_creation, source_type_code,
          cloudinary_public_id, cloudinary_resource_type
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
        `,
        [
          productId,
          item.kind,
          item.order,
          item.title,
          item.description,
          item.secureUrl ?? item.url,
          item.url,
          item.cloudinaryPublicId ?? (item.fileName ? `maihan/products/${product.id}/${item.fileName}` : null),
          item.fileName,
          item.framesCount,
          item.urlPattern,
          item.kind === 'image' && item.order <= 1,
          Boolean(item.pastCreation),
          item.sourceType,
          item.cloudinaryPublicId ?? null,
          item.cloudinaryResourceType ?? null,
        ],
      );
    }

    const variant = await client.query<{ id: string }>(
      `
      INSERT INTO product_variants (product_id, sku, is_default, status)
      VALUES ($1,$2,true,'active')
      ON CONFLICT (sku) DO UPDATE SET product_id = EXCLUDED.product_id
      RETURNING id
      `,
      [productId, `${product.id}-default`],
    );
    const variantId = variant.rows[0]?.id;
    if (variantId && product.priceUsd != null) {
      await client.query(
        `
        INSERT INTO product_prices (variant_id, region_code, currency, amount, compare_at_amount, price_per_carat)
        VALUES ($1,NULL,'USD',$2,$3,$4)
        ON CONFLICT DO NOTHING
        `,
        [variantId, product.priceUsd, product.discountPriceUsd, product.pricePerCt],
      );
      await client.query(
        `INSERT INTO product_prices (variant_id, region_code, currency, amount) VALUES ($1,'AE','AED',$2) ON CONFLICT DO NOTHING`,
        [variantId, Math.round(product.priceUsd * 3.6725 * 100) / 100],
      );
      await client.query(
        `INSERT INTO product_prices (variant_id, region_code, currency, amount) VALUES ($1,'TH','THB',$2) ON CONFLICT DO NOTHING`,
        [variantId, Math.round(product.priceUsd * 34.5 * 100) / 100],
      );
    }

    upserted += 1;
  }

  return { upserted };
}
