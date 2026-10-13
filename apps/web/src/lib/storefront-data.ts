/**
 * Storefront reads against migration 0019 (unified products).
 */
import 'server-only';
import { createPool } from '@maihan/db';

import { parseSearchQuery, type ParsedSearch } from './search-parser.js';
import type { StorefrontCard } from './storefront-types.js';

export type { StorefrontCard } from './storefront-types.js';

const pool = createPool(process.env['DATABASE_URL'] ?? '');


export interface StoneTypeRow {
  stoneType: string;
  count: number;
  pairCount: number;
}

export interface FxRates {
  USD: number;
  AED: number;
  THB: number;
}

function num(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function mapRow(row: Record<string, unknown>): StorefrontCard {
  return {
    id: String(row['id']),
    sku: String(row['sku']),
    slug: String(row['slug']),
    title: String(row['title']),
    kind: row['kind'] as StorefrontCard['kind'],
    description: (row['description'] as string | null) ?? null,
    priceUsd: num(row['price']) ?? 0,
    stoneType: (row['stone_type'] as string | null) ?? null,
    variety: (row['variety'] as string | null) ?? null,
    caratTotal: num(row['carat_total']),
    shape: (row['shape'] as string | null) ?? null,
    colorHue: (row['color_hue'] as string | null) ?? null,
    originCountry: (row['origin_country'] as string | null) ?? null,
    treatment: (row['treatment_status'] as string | null) ?? null,
    quantityType: (row['quantity_type'] as string | null) ?? null,
    jewelryType: (row['jewelry_type'] as string | null) ?? null,
    settingFor: (row['setting_for'] as string | null) ?? null,
    style: Array.isArray(row['style']) ? (row['style'] as string[]) : null,
    metalType: (row['metal_type'] as string | null) ?? null,
    metalColor: (row['metal_color'] as string | null) ?? null,
  };
}

const SELECT = `
  SELECT
    p.id, p.sku, p.slug, p.title, p.kind, p.description,
    COALESCE(pp.amount, 0) AS price,
    gd.stone_type, gd.variety, gd.carat_total, gd.shape, gd.color_hue,
    gd.origin_country, gd.treatment_status, gd.quantity_type,
    jd.jewelry_type, jd.metal_type, jd.metal_color,
    sd.setting_for, sd.style
  FROM products p
  LEFT JOIN gemstone_details gd ON gd.product_id = p.id
  LEFT JOIN jewelry_details jd ON jd.product_id = p.id
  LEFT JOIN setting_details sd ON sd.product_id = p.id
  LEFT JOIN product_variants pv ON pv.product_id = p.id AND pv.is_default = true
  LEFT JOIN product_prices pp ON pp.variant_id = pv.id AND pp.region_code IS NULL
`;

export async function getFxRates(): Promise<FxRates> {
  const result = await pool.query<{ quote: string; rate: string }>(`
    SELECT DISTINCT ON (quote) quote, rate
    FROM fx_rates
    WHERE base = 'USD' AND quote IN ('AED', 'THB')
    ORDER BY quote, fetched_at DESC
  `);
  const rates: FxRates = { USD: 1, AED: 3.6725, THB: 34.5 };
  for (const row of result.rows) {
    if (row.quote === 'AED' || row.quote === 'THB') {
      rates[row.quote] = Number(row.rate);
    }
  }
  return rates;
}

export async function listStoneTypes(): Promise<StoneTypeRow[]> {
  const result = await pool.query<{ stone_type: string; count: string; pair_count: string }>(`
    SELECT gd.stone_type,
           COUNT(*)::text AS count,
           COUNT(*) FILTER (WHERE gd.quantity_type = 'pair')::text AS pair_count
    FROM gemstone_details gd
    JOIN products p ON p.id = gd.product_id
    WHERE p.status = 'active'
    GROUP BY gd.stone_type
    ORDER BY COUNT(*) DESC, gd.stone_type
  `);
  return result.rows.map((row) => ({
    stoneType: row.stone_type,
    count: Number(row.count),
    pairCount: Number(row.pair_count),
  }));
}

export interface ProductListFilters {
  kind?: 'gemstone' | 'jewelry' | 'setting';
  stoneType?: string;
  quantityType?: 'single' | 'pair';
  jewelryType?: string;
  settingFor?: string;
  shape?: string;
  origin?: string;
  treatment?: string;
  minCarat?: number;
  maxCarat?: number;
  minPriceUsd?: number;
  maxPriceUsd?: number;
  titleContains?: string;
  limit?: number;
}

function push(params: unknown[], value: unknown): string {
  params.push(value);
  return `$${params.length}`;
}

export async function listProducts(filters: ProductListFilters = {}): Promise<StorefrontCard[]> {
  const clauses = [`p.status = 'active'`, `p.visibility = 'public'`];
  const params: unknown[] = [];

  if (filters.kind) clauses.push(`p.kind = ${push(params, filters.kind)}`);
  if (filters.stoneType) clauses.push(`gd.stone_type = ${push(params, filters.stoneType)}`);
  if (filters.quantityType) clauses.push(`gd.quantity_type = ${push(params, filters.quantityType)}`);
  if (filters.jewelryType) clauses.push(`jd.jewelry_type = ${push(params, filters.jewelryType)}`);
  if (filters.settingFor) clauses.push(`sd.setting_for = ${push(params, filters.settingFor)}`);
  if (filters.shape) clauses.push(`gd.shape ILIKE ${push(params, `%${filters.shape.replace(/_/g, ' ')}%`)}`);
  if (filters.origin) {
    const a = push(params, `%${filters.origin}%`);
    const b = push(params, `%${filters.origin}%`);
    clauses.push(`(gd.origin_country ILIKE ${a} OR gd.origin_region ILIKE ${b})`);
  }
  if (filters.treatment) clauses.push(`gd.treatment_status ILIKE ${push(params, `%${filters.treatment}%`)}`);
  if (filters.minCarat !== undefined) clauses.push(`gd.carat_total >= ${push(params, filters.minCarat)}`);
  if (filters.maxCarat !== undefined) clauses.push(`gd.carat_total <= ${push(params, filters.maxCarat)}`);
  if (filters.minPriceUsd !== undefined) clauses.push(`pp.amount >= ${push(params, filters.minPriceUsd)}`);
  if (filters.maxPriceUsd !== undefined) clauses.push(`pp.amount <= ${push(params, filters.maxPriceUsd)}`);
  if (filters.titleContains) clauses.push(`p.title ILIKE ${push(params, `%${filters.titleContains}%`)}`);

  const limit = push(params, filters.limit ?? 24);
  const sql = `${SELECT} WHERE ${clauses.join(' AND ')} ORDER BY pp.amount DESC NULLS LAST, p.created_at LIMIT ${limit}`;
  const result = await pool.query(sql, params);
  return result.rows.map((row) => mapRow(row as Record<string, unknown>));
}

export async function getFeaturedHome(): Promise<{
  gemstones: StorefrontCard[];
  settings: StorefrontCard[];
  jewelry: StorefrontCard[];
}> {
  const [gemstones, settings, jewelry] = await Promise.all([
    listProducts({ kind: 'gemstone', limit: 8 }),
    listProducts({ kind: 'setting', limit: 6 }),
    listProducts({ kind: 'jewelry', limit: 8 }),
  ]);
  return { gemstones, settings, jewelry };
}

export async function getProductBySlug(slug: string): Promise<StorefrontCard | null> {
  const result = await pool.query(`${SELECT} WHERE p.slug = $1 AND p.status = 'active' LIMIT 1`, [slug]);
  const row = result.rows[0];
  return row ? mapRow(row as Record<string, unknown>) : null;
}

export async function searchStorefront(query: string, limit = 12): Promise<{
  parsed: ParsedSearch;
  items: StorefrontCard[];
}> {
  const parsed = parseSearchQuery(query);
  const clauses = [`p.status = 'active'`, `p.visibility = 'public'`];
  const params: unknown[] = [];

  if (parsed.kind) clauses.push(`p.kind = ${push(params, parsed.kind)}`);
  if (parsed.stoneType) {
    const stone = push(params, parsed.stoneType);
    const title = push(params, `%${parsed.stoneType.replace(/_/g, ' ')}%`);
    clauses.push(`(gd.stone_type = ${stone} OR p.title ILIKE ${title})`);
  }
  if (parsed.quantityType) clauses.push(`gd.quantity_type = ${push(params, parsed.quantityType)}`);
  if (parsed.shape) clauses.push(`gd.shape ILIKE ${push(params, `%${parsed.shape.replace(/_/g, ' ')}%`)}`);
  if (parsed.origin) {
    const a = push(params, `%${parsed.origin}%`);
    const b = push(params, `%${parsed.origin}%`);
    clauses.push(`(gd.origin_country ILIKE ${a} OR gd.origin_region ILIKE ${b})`);
  }
  if (parsed.treatment) clauses.push(`gd.treatment_status ILIKE ${push(params, `%${parsed.treatment}%`)}`);
  if (parsed.minCarat !== undefined) clauses.push(`gd.carat_total >= ${push(params, parsed.minCarat)}`);
  if (parsed.maxCarat !== undefined) clauses.push(`gd.carat_total <= ${push(params, parsed.maxCarat)}`);
  if (parsed.minPriceUsd !== undefined) clauses.push(`pp.amount >= ${push(params, parsed.minPriceUsd)}`);
  if (parsed.maxPriceUsd !== undefined) clauses.push(`pp.amount <= ${push(params, parsed.maxPriceUsd)}`);
  if (parsed.jewelryType) clauses.push(`jd.jewelry_type = ${push(params, parsed.jewelryType)}`);

  const remainder = parsed.remainder;
  if (remainder.length > 0) {
    const like = push(params, `%${remainder}%`);
    const fuzzy = push(params, remainder);
    clauses.push(`(
      p.title ILIKE ${like}
      OR COALESCE(p.description, '') ILIKE ${like}
      OR similarity(p.title, ${fuzzy}) > 0.12
      OR similarity(COALESCE(p.description, ''), ${fuzzy}) > 0.12
      OR p.title % ${fuzzy}
    )`);
  }

  const rankText = push(params, remainder.length > 0 ? remainder : parsed.raw);
  const limitSlot = push(params, limit);
  const sql = `
    ${SELECT}
    WHERE ${clauses.join(' AND ')}
    ORDER BY
      GREATEST(
        similarity(p.title, ${rankText}),
        similarity(COALESCE(p.description, ''), ${rankText})
      ) DESC,
      pp.amount DESC NULLS LAST
    LIMIT ${limitSlot}
  `;
  const result = await pool.query(sql, params);
  return { parsed, items: result.rows.map((row) => mapRow(row as Record<string, unknown>)) };
}

/** Legacy helpers used by the previous home page. */
export async function getSettings(limit = 6) {
  return listProducts({ kind: 'setting', limit });
}

export async function getGemstones(limit = 20, stoneType?: string) {
  return listProducts({ kind: 'gemstone', stoneType, limit });
}
