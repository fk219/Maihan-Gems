/**
 * packages/db/src/dyo/dyo-review-repository.ts
 *
 * The review dossier's joined read.
 *
 * `dyo_configurations` stores ids, options and a short code; the human-readable
 * stone, mount and quote live on other rows. This projection joins exactly
 * those rows and nothing else:
 *
 *   - the one gemstone (or matched pair) attached by id;
 *   - the one setting variant, and its design;
 *   - the newest non-expired `dyo_price_snapshots` row for the configuration.
 *
 * A NULL foreign key or a missing row stays `null`. The review page renders its
 * `Not evidenced` marker for those cells (INV-07); this file never substitutes a
 * plausible value.
 */
import { sql } from 'drizzle-orm';
import type { CatalogDatabase } from '../catalog/executor.js';
import type { DyoConfigurationRow } from './dyo-repository.js';

export interface DyoReviewGemstone {
  readonly name: string;
  readonly gemRef: string;
  readonly kind: string;
  readonly variety: string | null;
  readonly colour: string | null;
  readonly clarity: string | null;
  readonly origin: string | null;
  readonly shape: string | null;
  readonly treatment: string | null;
  readonly totalWeightCt: string | null;
  readonly priceAmount: string | null;
  readonly currency: string;
}

export interface DyoReviewSettingVariant {
  readonly name: string;
  readonly metal: string;
  readonly metalCode: string | null;
  readonly sku: string;
  readonly variantSku: string;
  readonly designCode: string;
  readonly basePrice: string | null;
  readonly currency: string;
}

export interface DyoReviewQuote {
  readonly total: string;
  readonly currency: string;
  readonly gemstoneComponent: string | null;
  readonly settingComponent: string | null;
  readonly sideStoneComponent: string | null;
  readonly makingComponent: string | null;
  readonly taxComponent: string | null;
  readonly pricingRuleVersion: string | null;
}

export interface DyoReviewDetail {
  readonly configuration: DyoConfigurationRow;
  readonly gemstone: DyoReviewGemstone | null;
  readonly settingVariant: DyoReviewSettingVariant | null;
  readonly quote: DyoReviewQuote | null;
}

function row(value: unknown): Record<string, unknown> {
  return (value ?? {}) as Record<string, unknown>;
}

function text(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const out = String(value);
  return out.length === 0 ? null : out;
}

/** Latest live price snapshot for a configuration, or null. */
export async function readLatestDyoQuote(
  db: CatalogDatabase,
  configurationId: string,
): Promise<DyoReviewQuote | null> {
  const res = await db.execute(sql`
    SELECT
      total::text AS total,
      currency::text AS currency,
      gemstone_component::text AS gemstone_component,
      setting_component::text AS setting_component,
      side_stone_component::text AS side_stone_component,
      making_component::text AS making_component,
      tax_component::text AS tax_component,
      pricing_rule_version
    FROM dyo_price_snapshots
    WHERE configuration_id = ${configurationId}
      AND (expires_at IS NULL OR expires_at > now())
    ORDER BY computed_at DESC
    LIMIT 1
  `);
  if (res.rows.length === 0) return null;
  const quote = row(res.rows[0]);
  return {
    total: String(quote['total'] ?? '0.00'),
    currency: String(quote['currency'] ?? 'USD'),
    gemstoneComponent: text(quote['gemstone_component']),
    settingComponent: text(quote['setting_component']),
    sideStoneComponent: text(quote['side_stone_component']),
    makingComponent: text(quote['making_component']),
    taxComponent: text(quote['tax_component']),
    pricingRuleVersion: text(quote['pricing_rule_version']),
  };
}

/** The gemstone/pair attached to a configuration, with its real taxonomy. */
export async function readDyoGemstone(
  db: CatalogDatabase,
  gemstoneId: string,
): Promise<DyoReviewGemstone | null> {
  const res = await db.execute(sql`
    SELECT
      g.gem_ref,
      g.kind::text AS kind,
      gv.name AS variety,
      gc.name AS colour,
      cl.label AS clarity,
      go.name AS origin,
      g.shape::text AS shape,
      t.code AS treatment,
      g.total_weight_ct::text AS total_weight_ct,
      g.price_amount::text AS price_amount,
      g.currency::text AS currency
    FROM gemstones g
    LEFT JOIN gemstone_varieties gv ON gv.id = g.variety_id
    LEFT JOIN gemstone_colours gc ON gc.id = g.colour_id
    LEFT JOIN clarities cl ON cl.id = g.clarity_id
    LEFT JOIN gemstone_origins go ON go.id = g.origin_id
    LEFT JOIN treatments t ON t.id = g.treatment_id
    WHERE g.id = ${gemstoneId}
      AND g.deleted_at IS NULL
    LIMIT 1
  `);
  if (res.rows.length === 0) return null;
  const gem = row(res.rows[0]);
  const variety = text(gem['variety']);
  const gemRef = String(gem['gem_ref'] ?? '');
  return {
    name: variety ?? gemRef,
    gemRef,
    kind: String(gem['kind'] ?? 'SINGLE'),
    variety,
    colour: text(gem['colour']),
    clarity: text(gem['clarity']),
    origin: text(gem['origin']),
    shape: text(gem['shape']),
    treatment: text(gem['treatment']),
    totalWeightCt: text(gem['total_weight_ct']),
    priceAmount: text(gem['price_amount']),
    currency: String(gem['currency'] ?? 'USD'),
  };
}

/** The setting variant and its design. */
export async function readDyoSettingVariant(
  db: CatalogDatabase,
  settingVariantId: string,
): Promise<DyoReviewSettingVariant | null> {
  const res = await db.execute(sql`
    SELECT
      s.design_code,
      s.name AS setting_name,
      v.sku,
      v.metal_code::text AS metal_code,
      v.base_price::text AS base_price,
      v.currency::text AS currency
    FROM setting_variants v
    JOIN settings s ON s.id = v.setting_id
    WHERE v.id = ${settingVariantId}
      AND v.deleted_at IS NULL
    LIMIT 1
  `);
  if (res.rows.length === 0) return null;
  const setting = row(res.rows[0]);
  const metalCode = text(setting['metal_code']);
  return {
    name: String(setting['setting_name'] ?? ''),
    metal: metalCode ?? '',
    metalCode,
    sku: String(setting['design_code'] ?? ''),
    variantSku: String(setting['sku'] ?? ''),
    designCode: String(setting['design_code'] ?? ''),
    basePrice: text(setting['base_price']),
    currency: String(setting['currency'] ?? 'USD'),
  };
}

/**
 * Load a review dossier by short code.
 *
 * Every join is by the configuration's own foreign key. A pair configuration
 * uses `gemstone_pair_id`; both point at a `gemstones` row, so one read serves
 * both (INV-01: exactly one of the two is set).
 */
export async function loadDyoReviewDetail(
  db: CatalogDatabase,
  shortCode: string,
): Promise<DyoReviewDetail | null> {
  const configRes = await db.execute(sql`
    SELECT *
    FROM dyo_configurations
    WHERE short_code = ${shortCode}
    LIMIT 1
  `);
  if (configRes.rows.length === 0) return null;
  const configuration = configRes.rows[0] as unknown as DyoConfigurationRow;

  const stoneId = configuration.gemstone_id ?? configuration.gemstone_pair_id;
  const gemstone = stoneId === null ? null : await readDyoGemstone(db, stoneId);
  const settingVariant =
    configuration.setting_variant_id === null
      ? null
      : await readDyoSettingVariant(db, configuration.setting_variant_id);
  const quote = await readLatestDyoQuote(db, configuration.id);

  return { configuration, gemstone, settingVariant, quote };
}
