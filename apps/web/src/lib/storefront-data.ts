/**
 * Storefront reads against migration 0019 (unified products).
 */
import 'server-only';
import { createPool } from '@maihan/db';

import {
  findNgcProduct,
  ngcCards,
  ngcStoneTypeRows,
  settingsForDyo,
  toStorefrontCard,
  type NgcListFilter,
} from './ngc/catalog.js';
import { parseSearchQuery, type ParsedSearch } from './search-parser.js';
import type { SettingForDyo, StorefrontCard } from './storefront-types.js';

export type { SettingAcceptRule, SettingForDyo, StorefrontCard } from './storefront-types.js';

/** Local throwaway credential from compose.yaml. Not a secret. */
const LOCAL_DATABASE_URL = 'postgresql://postgres:maihan_local_dev_only@127.0.0.1:5433/maihan_dev';

function resolveDatabaseUrl(): string {
  const configured = process.env['DATABASE_URL']?.trim() ?? '';
  if (!configured || configured.includes('<SECRET>') || configured.includes('<user>')) return LOCAL_DATABASE_URL;
  return configured;
}

const pool = createPool(resolveDatabaseUrl());

const FALLBACK_FX: FxRates = { USD: 1, AED: 3.6725, THB: 34.5 };

let catalogueOffline = false;

/** True after a storefront read could not reach Postgres. Resets on the next successful read. */
export function isCatalogueOffline(): boolean {
  return catalogueOffline;
}

function databaseUnavailable(error: unknown): boolean {
  const seen = new Set<unknown>();
  const walk = (value: unknown): boolean => {
    if (!value || typeof value !== 'object' || seen.has(value)) return false;
    seen.add(value);
    const code = (value as { code?: string }).code;
    if (
      code === 'ECONNREFUSED' ||
      code === 'ENOTFOUND' ||
      code === 'ETIMEDOUT' ||
      code === 'EAI_AGAIN' ||
      code === 'ECONNRESET' ||
      code === '3D000' ||
      code === '28P01' ||
      code === '57P01' ||
      code === '42P01'
    ) {
      return true;
    }
    const nested = (value as { errors?: unknown }).errors;
    if (Array.isArray(nested) && nested.some(walk)) return true;
    const message = value instanceof Error ? value.message : String((value as { message?: string }).message ?? '');
    return (
      message.includes('ECONNREFUSED') ||
      message.includes('password authentication failed') ||
      message.includes('does not exist')
    );
  };
  return walk(error);
}

async function withCatalogue<T>(fallback: T, run: () => Promise<T>): Promise<T> {
  try {
    const value = await run();
    catalogueOffline = false;
    return value;
  } catch (error) {
    if (!databaseUnavailable(error)) throw error;
    catalogueOffline = true;
    console.warn(
      '[storefront] catalogue unavailable (connection or schema). Try: docker compose up -d && pnpm storefront:db:setup',
    );
    return fallback;
  }
}


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
    imageUrl: (row['image_url'] as string | null) ?? null,
    vendorName: (row['vendor_name'] as string | null) ?? null,
    certificateLab: (row['certificate_lab'] as string | null) ?? null,
  };
}

const SELECT = `
  SELECT
    p.id, p.sku, p.slug, p.title, p.kind, p.description,
    COALESCE(pp.amount, 0) AS price,
    gd.stone_type, gd.variety, gd.carat_total, gd.shape, gd.color_hue,
    gd.origin_country, gd.treatment_status, gd.quantity_type,
    jd.jewelry_type, jd.metal_type, jd.metal_color,
    sd.setting_for, sd.style,
    v.display_name AS vendor_name,
    (SELECT m.url
       FROM media_links ml
       JOIN media m ON m.id = ml.media_id
      WHERE ml.entity_type = 'product' AND ml.entity_id = p.id AND ml.role = 'primary'
      ORDER BY ml.position
      LIMIT 1) AS image_url,
    (SELECT c.lab
       FROM certificate_links cl
       JOIN certificates c ON c.id = cl.certificate_id
      WHERE cl.product_id = p.id
      LIMIT 1) AS certificate_lab
  FROM products p
  LEFT JOIN vendors v ON v.id = p.vendor_id
  LEFT JOIN gemstone_details gd ON gd.product_id = p.id
  LEFT JOIN jewelry_details jd ON jd.product_id = p.id
  LEFT JOIN setting_details sd ON sd.product_id = p.id
  LEFT JOIN product_variants pv ON pv.product_id = p.id AND pv.is_default = true
  LEFT JOIN product_prices pp ON pp.variant_id = pv.id AND pp.region_code IS NULL
`;

export async function getFxRates(): Promise<FxRates> {
  return withCatalogue({ ...FALLBACK_FX }, async () => {
    const result = await pool.query<{ quote: string; rate: string }>(`
      SELECT DISTINCT ON (quote) quote, rate
      FROM fx_rates
      WHERE base = 'USD' AND quote IN ('AED', 'THB')
      ORDER BY quote, fetched_at DESC
    `);
    const rates: FxRates = { ...FALLBACK_FX };
    for (const row of result.rows) {
      const quote = row.quote.trim();
      const rate = Number(row.rate);
      if ((quote === 'AED' || quote === 'THB') && Number.isFinite(rate) && rate > 0) {
        rates[quote] = rate;
      }
    }
    return rates;
  });
}

function ngcListFilters(filters: ProductListFilters): NgcListFilter {
  const kind =
    filters.kind === 'setting'
      ? 'setting'
      : filters.kind === 'jewelry'
        ? (['jewelry', 'dyo_composite'] as const)
        : filters.kind === 'gemstone'
          ? filters.quantityType === 'pair'
            ? 'stone_pair'
            : filters.quantityType === 'single'
              ? 'loose_stone'
              : (['loose_stone', 'stone_pair'] as const)
          : undefined;
  return {
    kind: kind as NgcListFilter['kind'],
    stoneSlug: filters.stoneType?.replace(/_/g, '-'),
    jewelryType: filters.jewelryType,
    settingType: filters.settingFor === 'earrings' ? 'earring' : filters.settingFor,
    pairs: filters.quantityType === 'pair',
    query: filters.titleContains,
    limit: filters.limit,
  };
}

function mergeCards(primary: StorefrontCard[], extra: StorefrontCard[], limit: number): StorefrontCard[] {
  const seen = new Set(primary.map((row) => row.sku.toUpperCase()));
  const out = [...primary];
  for (const row of extra) {
    if (seen.has(row.sku.toUpperCase())) continue;
    seen.add(row.sku.toUpperCase());
    out.push(row);
    if (out.length >= limit) break;
  }
  return out.slice(0, limit);
}

export async function listStoneTypes(): Promise<StoneTypeRow[]> {
  const fromNgc = ngcStoneTypeRows();
  if (fromNgc.length > 0) return fromNgc;
  return withCatalogue([], async () => {
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
  });
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
  settingForIn?: string[];
  limit?: number;
}

function push(params: unknown[], value: unknown): string {
  params.push(value);
  return `$${params.length}`;
}

const LOCKED_SELECT = `
  SELECT
    p.id::text AS id,
    COALESCE(p.source_sku, p.source_sku_derived, p.structured_extra->>'sku', 'MG-' || p.product_number::text) AS sku,
    p.slug,
    p.title,
    CASE
      WHEN p.kind IN ('LOOSE_STONE', 'STONE_PAIR') THEN 'gemstone'
      WHEN p.kind = 'SETTING_ONLY' THEN 'setting'
      ELSE 'jewelry'
    END AS kind,
    p.description,
    COALESCE(p.price_amount, 0) AS price,
    p.structured_extra->>'stone_type' AS stone_type,
    p.structured_extra->>'variety' AS variety,
    p.total_weight_ct AS carat_total,
    p.structured_extra->>'shape' AS shape,
    p.structured_extra->>'color_hue' AS color_hue,
    p.structured_extra->>'origin_country' AS origin_country,
    p.structured_extra->>'treatment_status' AS treatment_status,
    CASE WHEN p.kind = 'STONE_PAIR' THEN 'pair' ELSE 'single' END AS quantity_type,
    lower(p.jewellery_type::text) AS jewelry_type,
    p.structured_extra->>'metal_type' AS metal_type,
    p.structured_extra->>'metal_color' AS metal_color,
    CASE WHEN p.kind = 'SETTING_ONLY' THEN lower(p.jewellery_type::text) ELSE NULL END AS setting_for,
    NULL::text[] AS style,
    COALESCE(p.structured_extra->>'vendor_name', 'Maihan Vault') AS vendor_name,
    COALESCE(
      p.structured_extra #>> '{images,0,url}',
      p.structured_extra #>> '{images,0}',
      (SELECT a.cdn_url FROM asset_usages au JOIN assets a ON a.id = au.asset_id WHERE au.entity_type = 'PRODUCT' AND au.entity_id = p.id ORDER BY au.position ASC LIMIT 1)
    ) AS image_url,
    NULL::text AS certificate_lab
  FROM products p
`;

async function queryLockedActiveProducts(filters: ProductListFilters = {}): Promise<StorefrontCard[]> {
  const clauses = [`p.state = 'ACTIVE'`, `p.deleted_at IS NULL`, `p.availability = true`];
  const params: unknown[] = [];
  if (filters.kind === 'gemstone') {
    if (filters.quantityType === 'pair') {
      clauses.push(`p.kind = 'STONE_PAIR'`);
    } else if (filters.quantityType === 'single') {
      clauses.push(`p.kind = 'LOOSE_STONE'`);
    } else {
      clauses.push(`p.kind IN ('LOOSE_STONE', 'STONE_PAIR')`);
    }
  } else if (filters.kind === 'setting') {
    clauses.push(`p.kind = 'SETTING_ONLY'`);
  } else if (filters.kind === 'jewelry') {
    clauses.push(`p.kind IN ('READY_MADE', 'CONFIGURED')`);
  }
  if (filters.stoneType) {
    clauses.push(`lower(COALESCE(p.structured_extra->>'stone_type', p.title)) LIKE ${push(params, `%${filters.stoneType.toLowerCase().replace(/_/g, ' ')}%`)}`);
  }
  if (filters.shape) {
    clauses.push(`lower(COALESCE(p.structured_extra->>'shape', '')) LIKE ${push(params, `%${filters.shape.toLowerCase().replace(/_/g, ' ')}%`)}`);
  }
  if (filters.origin) {
    clauses.push(`lower(COALESCE(p.structured_extra->>'origin_country', '')) LIKE ${push(params, `%${filters.origin.toLowerCase()}%`)}`);
  }
  if (filters.treatment) {
    clauses.push(`lower(COALESCE(p.structured_extra->>'treatment_status', '')) LIKE ${push(params, `%${filters.treatment.toLowerCase()}%`)}`);
  }
  if (filters.minCarat !== undefined) clauses.push(`p.total_weight_ct >= ${push(params, filters.minCarat)}`);
  if (filters.maxCarat !== undefined) clauses.push(`p.total_weight_ct <= ${push(params, filters.maxCarat)}`);
  if (filters.minPriceUsd !== undefined) clauses.push(`p.price_amount >= ${push(params, filters.minPriceUsd)}`);
  if (filters.maxPriceUsd !== undefined) clauses.push(`p.price_amount <= ${push(params, filters.maxPriceUsd)}`);
  if (filters.titleContains) clauses.push(`p.title ILIKE ${push(params, `%${filters.titleContains}%`)}`);

  const limit = filters.limit ?? 24;
  const sql = `${LOCKED_SELECT} WHERE ${clauses.join(' AND ')} ORDER BY p.published_at DESC NULLS LAST, p.created_at DESC LIMIT ${push(params, limit)}`;
  const res = await pool.query(sql, params);
  return res.rows.map((row) => mapRow(row as Record<string, unknown>));
}

async function queryInactiveProductKeys(): Promise<{ skus: Set<string>; slugs: Set<string> }> {
  try {
    const res = await pool.query<{ sku: string | null; slug: string | null }>(`
      SELECT upper(COALESCE(source_sku, source_sku_derived, structured_extra->>'sku')) AS sku,
             lower(slug) AS slug
      FROM products
      WHERE state <> 'ACTIVE' OR availability = false OR deleted_at IS NOT NULL
    `);
    const skus = new Set<string>();
    const slugs = new Set<string>();
    for (const r of res.rows) {
      if (r.sku) skus.add(r.sku.toUpperCase());
      if (r.slug) slugs.add(r.slug.toLowerCase());
    }
    return { skus, slugs };
  } catch {
    return { skus: new Set(), slugs: new Set() };
  }
}

export async function listProducts(filters: ProductListFilters = {}): Promise<StorefrontCard[]> {
  const limit = filters.limit ?? 24;
  const fromNgcRaw = ngcCards(ngcListFilters({ ...filters, limit: 500 }));
  const { rows: fromDb, inactive } = await withCatalogue(
    { rows: [] as StorefrontCard[], inactive: { skus: new Set<string>(), slugs: new Set<string>() } },
    async () => {
      try {
        const [activeRows, inactiveKeys] = await Promise.all([
          queryLockedActiveProducts(filters),
          queryInactiveProductKeys(),
        ]);
        return { rows: activeRows, inactive: inactiveKeys };
      } catch {
        const clauses = [`p.status = 'active'`, `p.visibility = 'public'`];
        const params: unknown[] = [];
        if (filters.kind) clauses.push(`p.kind = ${push(params, filters.kind)}`);
        if (filters.stoneType) clauses.push(`gd.stone_type = ${push(params, filters.stoneType)}`);
        if (filters.quantityType) clauses.push(`gd.quantity_type = ${push(params, filters.quantityType)}`);
        if (filters.jewelryType) clauses.push(`jd.jewelry_type = ${push(params, filters.jewelryType)}`);
        if (filters.settingFor) clauses.push(`sd.setting_for = ${push(params, filters.settingFor)}`);
        if (filters.settingForIn?.length) {
          clauses.push(`sd.setting_for = ANY(${push(params, filters.settingForIn)}::text[])`);
        }
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

        const sql = `${SELECT} WHERE ${clauses.join(' AND ')} ORDER BY pp.amount DESC NULLS LAST, p.created_at LIMIT ${push(params, limit)}`;
        const result = await pool.query(sql, params);
        return {
          rows: result.rows.map((row) => mapRow(row as Record<string, unknown>)),
          inactive: { skus: new Set<string>(), slugs: new Set<string>() },
        };
      }
    },
  );
  // Exclude any NGC static card that has been marked SOLD_OUT, DRAFT, or ARCHIVED in Postgres
  const fromNgc = fromNgcRaw.filter(
    (c) => !inactive.skus.has(c.sku.toUpperCase()) && !inactive.slugs.has(c.slug.toLowerCase()),
  );
  if (fromDb.length > 0 && fromNgc.length > 0) return mergeCards(fromDb, fromNgc, limit);
  if (fromNgc.length > 0) return fromNgc.slice(0, limit);
  return fromDb;
}

export async function getFeaturedHome(): Promise<{
  gemstones: StorefrontCard[];
  settings: StorefrontCard[];
  jewelry: StorefrontCard[];
}> {
  const [gemstones, settings, jewelry] = await Promise.all([
    listProducts({ kind: 'gemstone', limit: 8 }),
    listProducts({ kind: 'setting', settingForIn: ['ring', 'pendant', 'earrings'], limit: 6 }),
    listProducts({ kind: 'jewelry', limit: 8 }),
  ]);
  return { gemstones, settings, jewelry };
}

export async function getProductBySlug(slug: string): Promise<StorefrontCard | null> {
  const dbOutcome = await withCatalogue<{ card: StorefrontCard | null; isInactiveInDb: boolean }>(
    { card: null, isInactiveInDb: false },
    async () => {
      try {
        const anyRes = await pool.query<{ state: string; availability: boolean; deleted_at: unknown }>(
          `SELECT state::text AS state, availability, deleted_at FROM products WHERE (lower(slug) = lower($1) OR upper(source_sku) = upper($1)) LIMIT 1`,
          [slug],
        );
        const existing = anyRes.rows[0];
        if (existing && (existing.state !== 'ACTIVE' || !existing.availability || existing.deleted_at !== null)) {
          return { card: null, isInactiveInDb: true };
        }
        const lockedRes = await pool.query(
          `${LOCKED_SELECT} WHERE (lower(p.slug) = lower($1) OR upper(p.source_sku) = upper($1)) AND p.state = 'ACTIVE' AND p.availability = true AND p.deleted_at IS NULL LIMIT 1`,
          [slug],
        );
        if (lockedRes.rows[0]) {
          return { card: mapRow(lockedRes.rows[0] as Record<string, unknown>), isInactiveInDb: false };
        }
      } catch {
        const result = await pool.query(`${SELECT} WHERE p.slug = $1 AND p.status = 'active' LIMIT 1`, [slug]);
        const row = result.rows[0];
        if (row) return { card: mapRow(row as Record<string, unknown>), isInactiveInDb: false };
      }
      return { card: null, isInactiveInDb: false };
    },
  );
  if (dbOutcome.isInactiveInDb) return null;
  if (dbOutcome.card) return dbOutcome.card;
  const ngc = findNgcProduct(slug);
  if (ngc) return toStorefrontCard(ngc);
  return null;
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
  const found = await withCatalogue([] as StorefrontCard[], async () => {
    try {
      return await queryLockedActiveProducts({
        kind: parsed.kind,
        stoneType: parsed.stoneType,
        quantityType: parsed.quantityType,
        shape: parsed.shape,
        origin: parsed.origin,
        treatment: parsed.treatment,
        minCarat: parsed.minCarat,
        maxCarat: parsed.maxCarat,
        minPriceUsd: parsed.minPriceUsd,
        maxPriceUsd: parsed.maxPriceUsd,
        titleContains: remainder.length > 0 ? remainder : undefined,
        limit,
      });
    } catch {
      const result = await pool.query(sql, params);
      return result.rows.map((row) => mapRow(row as Record<string, unknown>));
    }
  });
  const fromNgc = ngcCards({ query: parsed.raw || remainder, limit });
  return { parsed, items: mergeCards(found, fromNgc, limit) };
}

export async function listSettingsForDyo(limit = 16): Promise<SettingForDyo[]> {
  const dbSettings = await withCatalogue([] as SettingForDyo[], async () => {
    const res = await pool.query<Record<string, unknown>>(
      `SELECT
        p.id::text AS id,
        COALESCE(p.source_sku_derived, p.source_sku, 'MG-' || p.product_number::text) AS sku,
        p.slug, p.title, 'setting' AS kind,
        p.description,
        p.price_amount AS price,
        p.availability,
        lower(p.jewellery_type::text) AS setting_for,
        s.design_code AS design_code,
        st.code AS style_code,
        st.label AS style_label,
        sv.sku AS variant_sku,
        m.code AS metal_code,
        m.label AS metal_label,
        m.colour AS metal_colour,
        rules.shapes AS shapes,
        COALESCE(
          p.structured_extra #>> '{images,0,url}',
          p.structured_extra #>> '{images,0}',
          (SELECT a.cdn_url FROM asset_usages au JOIN assets a ON a.id = au.asset_id WHERE au.entity_type = 'PRODUCT' AND au.entity_id = p.id ORDER BY au.position ASC LIMIT 1)
        ) AS image_url
      FROM products p
      JOIN setting_variants sv ON sv.id = p.setting_variant_id
      JOIN settings s ON s.id = sv.setting_id
      LEFT JOIN setting_styles st ON st.id = s.style_id
      LEFT JOIN metals m ON m.code = sv.metal_code
      LEFT JOIN LATERAL (
        SELECT array_agg(r.shape::text) AS shapes
        FROM setting_compatibility_rules r
        WHERE r.setting_id = s.id AND r.state = 'ACTIVE' AND r.rule_kind = 'ALLOW'
      ) rules ON true
      WHERE p.kind = 'SETTING_ONLY' AND p.state = 'ACTIVE' AND p.deleted_at IS NULL AND p.availability = true
      ORDER BY p.price_amount ASC
      LIMIT $1`,
      [limit],
    );
    return res.rows.map((row) => {
      const card = mapRow(row);
      const shapes = Array.isArray(row['shapes']) ? (row['shapes'] as Array<string | null>) : [];
      const evidenced = shapes.filter((s): s is string => typeof s === 'string' && s.length > 0);
      // M5 (DYOJ port): the applet configurator needs the REAL setting-variant
      // SKU (the value the DYO create API resolves against setting_variants),
      // plus the design/style/metal descriptors — carried as optional seam
      // fields so every existing consumer of SettingForDyo keeps compiling.
      return {
        ...card,
        // Acceptance rules come verbatim from setting_compatibility_rules;
        // an evidenced-shape list may be empty, in which case any shape is
        // accepted (rule rows are the only authority — nothing invented).
        accepts: evidenced.length > 0
          ? evidenced.map((shape) => ({ shape: shape.toLowerCase(), minCarat: null, maxCarat: null }))
          : [{ shape: null, minCarat: null, maxCarat: null }],
        settingFor: typeof row['setting_for'] === 'string' ? row['setting_for'] : card.settingFor,
        designCode: textOrNull(row['design_code']),
        styleCode: textOrNull(row['style_code']),
        styleLabel: textOrNull(row['style_label']),
        variantSku: textOrNull(row['variant_sku']),
        metalCode: textOrNull(row['metal_code']),
        metalLabel: textOrNull(row['metal_label']),
        metalColour: textOrNull(row['metal_colour']),
      } satisfies SettingForDyo;
    });
  });
  if (dbSettings.length > 0) return dbSettings;
  return settingsForDyo(limit);
}

function textOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

/**
 * The newest REAL commission short codes (M5 — the DYOJ ledger panel and the
 * landing-page "latest commission" CTA render this public ledger; nothing is
 * substituted when the ledger is empty).
 */
export async function listDyoRecentlyCommissioned(limit = 2): Promise<string[]> {
  return withCatalogue([] as string[], async () => {
    const shaped = Math.max(1, Math.min(10, limit));
    const res = await pool.query<{ short_code: string }>(
      `SELECT short_code FROM dyo_configurations ORDER BY created_at DESC LIMIT $1`,
      [shaped],
    );
    return res.rows.map((row) => row.short_code);
  });
}

/** Legacy helpers used by the previous home page. */
export async function getSettings(limit = 6) {
  return listProducts({ kind: 'setting', limit });
}

export async function getGemstones(limit = 20, stoneType?: string) {
  return listProducts({ kind: 'gemstone', stoneType, limit });
}
