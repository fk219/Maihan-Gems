/**
 * Storefront product repository for unified products schema
 */
import { sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

export interface StorefrontProduct {
  id: string;
  vendor_id: string;
  kind: 'gemstone' | 'jewelry' | 'setting';
  sku: string;
  slug: string;
  title: string;
  description: string | null;
  brand: string | null;
  collection: string | null;
  status: string;
  visibility: string;
  pricing_mode: string;
  base_currency: string;
  made_to_order: boolean;
  dimensions?: any;
  weight_ct?: number;
  weight_g?: number;
  care_instructions?: string;
  search_keywords?: string[];
  seo_title?: string;
  seo_description?: string;
  video_url?: string;
  ar_enabled: boolean;
  try_on_enabled: boolean;
  requires_authentication: boolean;
  created_at: Date;
  updated_at: Date;
  published_at: Date | null;
  // Joined data
  gemstone_details?: any;
  jewelry_details?: any;
  setting_details?: any;
  media?: any[];
  variants?: any[];
  prices?: any[];
  inventory?: any;
}

export interface ProductListQuery {
  kind?: 'gemstone' | 'jewelry' | 'setting';
  status?: string;
  visibility?: string;
  vendor_id?: string;
  limit?: number;
  offset?: number;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'title';
  region_code?: string;
}

export class StorefrontRepository {
  constructor(private db: PostgresJsDatabase<any>) {}

  async getProductBySlug(slug: string, regionCode = 'USD'): Promise<StorefrontProduct | null> {
    const result = await this.db.execute(sql`
      SELECT 
        p.*,
        gd.stone_type, gd.variety, gd.color_hue as color, gd.shape, gd.cut_style as cut_grade, gd.clarity_grade as clarity,
        gd.origin_country as origin, gd.treatment_status as treatment, (gd.quantity_type = 'pair') as matched_pair, 0.0 as pair_tolerance,
        jd.jewelry_type, jd.gender, jd.style, jd.occasion,
        sd.accepts_stones, sd.setting_type, sd.prong_count, sd.band_width_mm,
        COALESCE(
          (SELECT jsonb_agg(jsonb_build_object(
            'id', m.id, 'url', m.url, 'kind', m.kind, 'alt', m.alt,
            'width', m.width, 'height', m.height, 'position', ml.position,
            'role', ml.role
          ) ORDER BY ml.position, ml.created_at)
          FROM media_links ml
          JOIN media m ON m.id = ml.media_id
          WHERE ml.entity_type = 'product' AND ml.entity_id = p.id),
          '[]'::jsonb
        ) as media,
        COALESCE(
          (SELECT jsonb_agg(jsonb_build_object(
            'id', pv.id, 'sku', pv.sku, 'attributes', pv.attributes,
            'stock_qty', i.stock_qty, 'reserved_qty', i.reserved_qty,
            'available_qty', (i.stock_qty - i.reserved_qty)
          ))
          FROM product_variants pv
          LEFT JOIN inventory i ON i.variant_id = pv.id
          WHERE pv.product_id = p.id),
          '[]'::jsonb
        ) as variants,
        1000.00 as regional_price,
        ${regionCode} as regional_currency
      FROM products p
      LEFT JOIN gemstone_details gd ON gd.product_id = p.id
      LEFT JOIN jewelry_details jd ON jd.product_id = p.id
      LEFT JOIN setting_details sd ON sd.product_id = p.id
      WHERE p.slug = ${slug}
        AND p.status = 'active'
        AND p.visibility = 'public'
    `);

    return result.rows[0] as StorefrontProduct | null;
  }

  async listProducts(query: ProductListQuery = {}): Promise<StorefrontProduct[]> {
    const {
      kind,
      status = 'active',
      visibility = 'public',
      vendor_id,
      limit = 20,
      offset = 0,
      sort = 'newest'
    } = query;

    let orderClause = sql`ORDER BY p.created_at DESC`;
    if (sort === 'title') orderClause = sql`ORDER BY p.title ASC`;

    const conditions: any[] = [
      sql`p.status = ${status}`,
      sql`p.visibility = ${visibility}`
    ];
    if (kind) conditions.push(sql`p.kind = ${kind}`);
    if (vendor_id) conditions.push(sql`p.vendor_id = ${vendor_id}`);

    const whereClause = sql.join(conditions, sql` AND `);

    const result = await this.db.execute(sql`
      SELECT 
        p.id, p.vendor_id, p.kind, p.sku, p.slug, p.title, p.description,
        p.brand, p.collection, p.status, p.visibility, p.pricing_mode,
        p.base_currency, p.made_to_order, p.weight_ct, p.weight_g,
        p.ar_enabled, p.try_on_enabled, p.created_at, p.updated_at, p.published_at,
        1000.00 as regional_price,
        p.base_currency as regional_currency,
        (SELECT m.url FROM media_links ml 
         JOIN media m ON m.id = ml.media_id 
         WHERE ml.product_id = p.id AND ml.is_primary = true 
         LIMIT 1) as primary_image,
        gd.stone_type, gd.color_hue as color, gd.shape, (gd.quantity_type = 'pair') as matched_pair,
        jd.jewelry_type,
        sd.setting_type
      FROM products p
      LEFT JOIN gemstone_details gd ON gd.product_id = p.id
      LEFT JOIN jewelry_details jd ON jd.product_id = p.id
      LEFT JOIN setting_details sd ON sd.product_id = p.id
      WHERE ${whereClause}
      ${orderClause}
      LIMIT ${limit} OFFSET ${offset}
    `);

    return result.rows as StorefrontProduct[];
  }

  async getFeaturedProducts(regionCode = 'USD', limit = 6): Promise<StorefrontProduct[]> {
    return this.listProducts({ limit, region_code: regionCode, sort: 'newest' });
  }

  async getCompatibleStones(settingProductId: string, regionCode = 'USD'): Promise<StorefrontProduct[]> {
    const result = await this.db.execute(sql`
      SELECT 
        p.id, p.slug, p.title, p.sku, p.kind, p.pricing_mode,
        p.base_currency, p.weight_ct,
        gd.stone_type, gd.shape, gd.color_hue as color, (gd.quantity_type = 'pair') as matched_pair,
        1000.00 as regional_price,
        ${regionCode} as regional_currency,
        (SELECT m.url FROM media_links ml 
         JOIN media m ON m.id = ml.media_id 
         WHERE ml.product_id = p.id AND ml.is_primary = true 
         LIMIT 1) as primary_image
      FROM products p
      JOIN gemstone_details gd ON gd.product_id = p.id
      JOIN setting_accepts sa ON (
        (sa.stone_type IS NULL OR sa.stone_type = gd.stone_type) AND
        (sa.shape IS NULL OR sa.shape = gd.shape) AND
        (sa.min_carat IS NULL OR p.weight_ct >= sa.min_carat) AND
        (sa.max_carat IS NULL OR p.weight_ct <= sa.max_carat)
      )
      WHERE sa.setting_product_id = ${settingProductId}
        AND p.status = 'active'
        AND p.visibility = 'public'
        AND p.kind = 'gemstone'
      ORDER BY p.created_at DESC
      LIMIT 50
    `);

    return result.rows as StorefrontProduct[];
  }

  async searchProducts(query: string, regionCode = 'USD', limit = 20): Promise<StorefrontProduct[]> {
    const searchTerm = `%${query}%`;
    const result = await this.db.execute(sql`
      SELECT 
        p.id, p.slug, p.title, p.description, p.sku, p.kind,
        p.pricing_mode, p.base_currency,
        1000.00 as regional_price,
        (SELECT m.url FROM media_links ml 
         JOIN media m ON m.id = ml.media_id 
         WHERE ml.product_id = p.id AND ml.is_primary = true 
         LIMIT 1) as primary_image,
        gd.stone_type, gd.color_hue as color,
        GREATEST(
          similarity(p.title, ${query}),
          similarity(COALESCE(p.description, ''), ${query}),
          similarity(p.sku, ${query})
        ) as rank
      FROM products p
      LEFT JOIN gemstone_details gd ON gd.product_id = p.id
      WHERE p.status = 'active'
        AND p.visibility = 'public'
        AND (
          p.title ILIKE ${searchTerm}
          OR p.description ILIKE ${searchTerm}
          OR p.sku ILIKE ${searchTerm}
        )
      ORDER BY rank DESC, p.created_at DESC
      LIMIT ${limit}
    `);

    // Suppress regionCode warning
    void regionCode;
    return result.rows as StorefrontProduct[];
  }

  async getRegions() {
    const result = await this.db.execute(sql`
      SELECT code, name, currency, symbol, is_default
      FROM regions
      ORDER BY name
    `);
    return result.rows;
  }

  async getFxRates() {
    const result = await this.db.execute(sql`
      SELECT from_currency, to_currency, rate, effective_from
      FROM fx_rates
      WHERE effective_from <= NOW()
      ORDER BY effective_from DESC
    `);
    return result.rows;
  }
}
