/**
 * Simplified storefront product repository
 */
import { sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

export interface SimpleProduct {
  id: string;
  kind: 'gemstone' | 'jewelry' | 'setting';
  sku: string;
  slug: string;
  title: string;
  description: string | null;
  stone_type?: string;
  color_hue?: string;
  shape?: string;
  jewelry_type?: string;
  setting_for?: string;
  head_type?: string;
  created_at: Date;
}

export class SimpleStorefrontRepository {
  constructor(private db: PostgresJsDatabase<any>) {}

  async listProducts(kind?: 'gemstone' | 'jewelry' | 'setting', limit = 20): Promise<SimpleProduct[]> {
    let kindFilter = sql`TRUE`;
    if (kind) {
      kindFilter = sql`p.kind = ${kind}`;
    }

    const result = await this.db.execute(sql`
      SELECT 
        p.id, p.kind, p.sku, p.slug, p.title, p.description, p.created_at,
        gd.stone_type, gd.color_hue, gd.shape,
        jd.jewelry_type,
        sd.setting_for, sd.head_type
      FROM products p
      LEFT JOIN gemstone_details gd ON gd.product_id = p.id
      LEFT JOIN jewelry_details jd ON jd.product_id = p.id
      LEFT JOIN setting_details sd ON sd.product_id = p.id
      WHERE ${kindFilter}
        AND p.status = 'active'
        AND p.visibility = 'public'
        AND p.deleted_at IS NULL
      ORDER BY p.created_at DESC
      LIMIT ${limit}
    `);

    return result.rows as SimpleProduct[];
  }
}
