/**
 * apps/web/src/lib/dyo-server.ts
 *
 * Storefront server seam for Phase 7 Design Your Own (DYO) configurations.
 * Server Components retrieve the canonical DYO configuration state and the
 * REAL component rows (gemstone, matched pair, setting variant) joined from
 * the locked catalogue tables, plus the configuration's own price snapshot.
 *
 * Honesty contract (INV-07 / "refuse rather than guess"):
 *   - Component details are rendered from real columns only. When a row is
 *     absent (derived configuration, unreferenced component), the model
 *     carries `null` and the page renders an explicit not-evidenced marker —
 *     never an invented stone, origin, treatment or price.
 *   - A database failure THROWS. It is never swallowed into `null` (the
 *     null swallow previously made a fabricated fallback page reachable).
 */
import 'server-only';
import { loadRuntimeConfig } from '@maihan/config';
import {
  createPool,
  createCatalogDatabase,
  getDyoConfigurationByShortCode,
  type DyoConfigurationRow,
} from '@maihan/db';

export interface DyoGemComponent {
  gemRef: string;
  kind: 'SINGLE' | 'PAIR';
  variety: string | null;
  colour: string | null;
  intensity: string | null;
  clarity: string | null;
  origin: string | null;
  treatment: string | null;
  shape: string | null;
  cutLabel: string | null;
  totalWeightCt: string | null;
  dimensionsMm: string | null;
  priceAmount: string | null;
  priceEvidence: string;
  availability: boolean | null;
}

export interface DyoSettingComponent {
  designCode: string | null;
  name: string | null;
  jewelleryType: string | null;
  description: string | null;
  metalCode: string | null;
  variantSku: string | null;
  basePrice: string | null;
  priceEvidence: string;
  availability: boolean | null;
}

export interface DyoQuoteSnapshot {
  gemstoneComponent: string;
  settingComponent: string;
  sideStoneComponent: string;
  makingComponent: string;
  discountComponent: string;
  taxComponent: string;
  total: string;
  currency: string;
  pricingRuleVersion: string;
  computedAt: string;
  expiresAt: string | null;
}

export interface DyoReviewModel {
  configuration: DyoConfigurationRow;
  gemstone: DyoGemComponent | null;
  settingVariant: DyoSettingComponent | null;
  quote: DyoQuoteSnapshot | null;
}

const globalStore = globalThis as unknown as {
  __maihanDyoOverride?: (shortCode: string) => Promise<DyoConfigurationRow | null>;
};

export function setDyoServiceForTest(
  override?: (shortCode: string) => Promise<DyoConfigurationRow | null>,
): void {
  if (override === undefined) delete globalStore.__maihanDyoOverride;
  else globalStore.__maihanDyoOverride = override;
}

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function textOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function dimensionsText(length: unknown, width: unknown, depth: unknown): string | null {
  const l = textOrNull(length);
  const w = textOrNull(width);
  const d = textOrNull(depth);
  if (l === null && w === null && d === null) return null;
  return `L ${l ?? '—'} × W ${w ?? '—'} × D ${d ?? '—'} mm`;
}

const GEM_SELECT = `
  SELECT g.gem_ref::text                AS gem_ref,
         g.kind::text                   AS kind,
         gv.name                        AS variety,
         gc.name                        AS colour,
         ci.name                        AS intensity,
         cl.name                        AS clarity,
         go.name                        AS origin,
         tr.name                        AS treatment,
         g.shape::text                  AS shape,
         g.cut_label                    AS cut_label,
         g.total_weight_ct::text        AS total_weight_ct,
         g.length_mm::text              AS length_mm,
         g.width_mm::text               AS width_mm,
         g.depth_mm::text               AS depth_mm,
         g.price_amount::text           AS price_amount,
         g.price_evidence::text         AS price_evidence,
         g.availability                 AS availability
  FROM gemstones g
  LEFT JOIN gemstone_varieties gv ON gv.id = g.variety_id
  LEFT JOIN gemstone_colours gc   ON gc.id = g.colour_id
  LEFT JOIN colour_intensities ci ON ci.id = g.intensity_id
  LEFT JOIN clarities cl          ON cl.id = g.clarity_id
  LEFT JOIN gemstone_origins go   ON go.id = g.origin_id
  LEFT JOIN treatments tr         ON tr.id = g.treatment_id
`;

function gemRow(row: Record<string, unknown>): DyoGemComponent {
  return {
    gemRef: String(row['gem_ref']),
    kind: row['kind'] === 'PAIR' ? 'PAIR' : 'SINGLE',
    variety: textOrNull(row['variety']),
    colour: textOrNull(row['colour']),
    intensity: textOrNull(row['intensity']),
    clarity: textOrNull(row['clarity']),
    origin: textOrNull(row['origin']),
    treatment: textOrNull(row['treatment']),
    shape: textOrNull(row['shape']),
    cutLabel: textOrNull(row['cut_label']),
    totalWeightCt: textOrNull(row['total_weight_ct']),
    dimensionsMm: dimensionsText(row['length_mm'], row['width_mm'], row['depth_mm']),
    priceAmount: textOrNull(row['price_amount']),
    priceEvidence: String(row['price_evidence'] ?? 'UNKNOWN'),
    availability: typeof row['availability'] === 'boolean' ? (row['availability'] as boolean) : null,
  };
}

interface QueryablePool {
  query: <T extends Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ) => Promise<{ rows: T[] }>;
}

function settingRow(row: Record<string, unknown>): DyoSettingComponent {
  return {
    designCode: textOrNull(row['design_code']),
    name: textOrNull(row['name']),
    jewelleryType: textOrNull(row['jewellery_type']),
    description: textOrNull(row['description']),
    metalCode: textOrNull(row['metal_code']),
    variantSku: textOrNull(row['variant_sku']),
    basePrice: textOrNull(row['base_price']),
    priceEvidence: String(row['price_evidence'] ?? 'UNKNOWN'),
    availability: typeof row['availability'] === 'boolean' ? (row['availability'] as boolean) : null,
  };
}

export async function loadDyoReviewModel(
  shortCode: string,
): Promise<DyoReviewModel | null> {
  const override = globalStore.__maihanDyoOverride;
  if (override !== undefined) {
    const configuration = await override(shortCode);
    if (configuration === null) return null;
    return { configuration, gemstone: null, settingVariant: null, quote: null };
  }

  const config = loadRuntimeConfig();
  const pool = createPool(config.databaseUrl);
  const db = createCatalogDatabase(pool);
  try {
    const configuration = await getDyoConfigurationByShortCode(db, shortCode);
    if (configuration === null) return null;

    const queryable = pool as unknown as QueryablePool;
    const gemId = configuration.gemstone_id ?? configuration.gemstone_pair_id;
    const uuid = (value: string | null): string | null =>
      value !== null && UUID_RE.test(value) ? value : null;

    const gemIdSafe = uuid(gemId);
    const variantIdSafe = uuid(configuration.setting_variant_id);
    const settingIdSafe = uuid(configuration.setting_id);

    const [gemRes, settingRes, quoteRes] = await Promise.all([
      gemIdSafe !== null
        ? queryable.query<Record<string, unknown>>(`${GEM_SELECT} WHERE g.id = $1::uuid AND g.deleted_at IS NULL LIMIT 1`, [gemIdSafe])
        : Promise.resolve({ rows: [] as Record<string, unknown>[] }),
      variantIdSafe !== null
        ? queryable.query<Record<string, unknown>>(`
            SELECT s.design_code          AS design_code,
                   s.name                 AS name,
                   s.jewellery_type::text AS jewellery_type,
                   s.description          AS description,
                   sv.metal_code::text    AS metal_code,
                   sv.sku                 AS variant_sku,
                   sv.base_price::text    AS base_price,
                   sv.price_evidence::text AS price_evidence,
                   sv.availability        AS availability
            FROM setting_variants sv
            JOIN settings s ON s.id = sv.setting_id
            WHERE sv.id = $1::uuid AND sv.deleted_at IS NULL AND s.deleted_at IS NULL
            LIMIT 1
          `, [variantIdSafe])
        : settingIdSafe !== null
          ? queryable.query<Record<string, unknown>>(`
              SELECT s.design_code          AS design_code,
                     s.name                 AS name,
                     s.jewellery_type::text AS jewellery_type,
                     s.description          AS description,
                     NULL::text             AS metal_code,
                     NULL::text             AS variant_sku,
                     NULL::text             AS base_price,
                     'UNKNOWN'::text        AS price_evidence,
                     NULL::boolean          AS availability
              FROM settings s
              WHERE s.id = $1::uuid AND s.deleted_at IS NULL
              LIMIT 1
            `, [settingIdSafe])
          : Promise.resolve({ rows: [] as Record<string, unknown>[] }),
      queryable.query<Record<string, unknown>>(`
        SELECT gemstone_component::text   AS gemstone_component,
               setting_component::text    AS setting_component,
               side_stone_component::text AS side_stone_component,
               making_component::text     AS making_component,
               discount_component::text   AS discount_component,
               tax_component::text        AS tax_component,
               total::text                AS total,
               currency                   AS currency,
               pricing_rule_version       AS pricing_rule_version,
               computed_at::text          AS computed_at,
               expires_at::text           AS expires_at
        FROM dyo_price_snapshots
        WHERE configuration_id = $1::uuid
        ORDER BY computed_at DESC
        LIMIT 1
      `, [configuration.id]),
    ]);

    const gemRowValue = gemRes.rows[0] as Record<string, unknown> | undefined;
    const settingRowValue = settingRes.rows[0] as Record<string, unknown> | undefined;
    const quoteRow = quoteRes.rows[0] as Record<string, unknown> | undefined;

    return {
      configuration,
      gemstone: gemRowValue ? gemRow(gemRowValue) : null,
      settingVariant: settingRowValue ? settingRow(settingRowValue) : null,
      quote: quoteRow
        ? {
            gemstoneComponent: String(quoteRow['gemstone_component'] ?? '0.00'),
            settingComponent: String(quoteRow['setting_component'] ?? '0.00'),
            sideStoneComponent: String(quoteRow['side_stone_component'] ?? '0.00'),
            makingComponent: String(quoteRow['making_component'] ?? '0.00'),
            discountComponent: String(quoteRow['discount_component'] ?? '0.00'),
            taxComponent: String(quoteRow['tax_component'] ?? '0.00'),
            total: String(quoteRow['total'] ?? '0.00'),
            currency: String(quoteRow['currency'] ?? 'USD'),
            pricingRuleVersion: String(quoteRow['pricing_rule_version'] ?? ''),
            computedAt: String(quoteRow['computed_at'] ?? ''),
            expiresAt: textOrNull(quoteRow['expires_at']),
          }
        : null,
    };
  } finally {
    await pool.end().catch(() => undefined);
  }
}
