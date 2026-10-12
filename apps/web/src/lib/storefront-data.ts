/**
 * Data access for storefront (migration 0019 schema)
 */
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export interface Setting {
  id: string;
  sku: string;
  title: string;
  setting_for: string;
  style: string[];
  price: number;
}

export interface Gemstone {
  id: string;
  sku: string;
  title: string;
  stone_type: string;
  variety: string | null;
  carat_total: number;
  shape: string | null;
  color_hue: string | null;
  origin_country: string | null;
  price: number;
}

export async function getSettings(limit = 6): Promise<Setting[]> {
  const result = await pool.query(`
    SELECT 
      p.id, p.sku, p.title,
      sd.setting_for, sd.style,
      COALESCE(pp.amount, 0) as price
    FROM products p
    INNER JOIN setting_details sd ON p.id = sd.product_id
    LEFT JOIN product_variants pv ON p.id = pv.product_id AND pv.is_default = true
    LEFT JOIN product_prices pp ON pv.id = pp.variant_id AND pp.region_code IS NULL
    WHERE p.kind = 'setting' AND p.status = 'active'
    ORDER BY p.created_at
    LIMIT $1
  `, [limit]);
  
  return result.rows;
}

export async function getGemstones(limit = 20, stoneType?: string): Promise<Gemstone[]> {
  let query = `
    SELECT 
      p.id, p.sku, p.title,
      gd.stone_type, gd.variety, gd.carat_total, gd.shape, 
      gd.color_hue, gd.origin_country,
      COALESCE(pp.amount, 0) as price
    FROM products p
    INNER JOIN gemstone_details gd ON p.id = gd.product_id
    LEFT JOIN product_variants pv ON p.id = pv.product_id AND pv.is_default = true
    LEFT JOIN product_prices pp ON pv.id = pp.variant_id AND pp.region_code IS NULL
    WHERE p.kind = 'gemstone' AND p.status = 'active'
  `;
  
  const params: any[] = [];
  if (stoneType) {
    query += ` AND gd.stone_type = $${params.length + 1}`;
    params.push(stoneType);
  }
  
  query += ` ORDER BY p.created_at LIMIT $${params.length + 1}`;
  params.push(limit);
  
  const result = await pool.query(query, params);
  return result.rows;
}

export async function getProductBySlug(slug: string) {
  const result = await pool.query(`
    SELECT 
      p.*,
      gd.*,
      jd.*,
      sd.*,
      COALESCE(pp.amount, 0) as price,
      pp.currency
    FROM products p
    LEFT JOIN gemstone_details gd ON p.id = gd.product_id
    LEFT JOIN jewelry_details jd ON p.id = jd.product_id
    LEFT JOIN setting_details sd ON p.id = sd.product_id
    LEFT JOIN product_variants pv ON p.id = pv.product_id AND pv.is_default = true
    LEFT JOIN product_prices pp ON pv.id = pp.variant_id AND pp.region_code IS NULL
    WHERE p.slug = $1 AND p.status = 'active'
    LIMIT 1
  `, [slug]);
  
  return result.rows[0] || null;
}
