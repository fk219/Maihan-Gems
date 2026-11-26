/**
 * apps/web/src/lib/dyo-server.ts
 *
 * Storefront server seam for Phase 7 Design Your Own (DYO) configurations.
 * Allows Server Components to retrieve canonical DYO configuration state,
 * verified invariants, and price snapshots directly without HTTP loopback.
 *
 * Features test override seam for isolated test environments.
 */
import 'server-only';
import {
  getDyoConfigurationByShortCode,
  loadDyoReviewDetail,
  type DyoConfigurationRow,
  type DyoReviewDetail,
} from '@maihan/db';

import { getServerDb } from '../api/next-adapter.js';

export interface DyoServerConfig {
  loadConfiguration: (shortCode: string) => Promise<DyoConfigurationRow | null>;
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

export async function loadDyoConfiguration(
  shortCode: string,
): Promise<DyoConfigurationRow | null> {
  const override = globalStore.__maihanDyoOverride;
  if (override !== undefined) {
    return override(shortCode);
  }

  try {
    // The shared server pool, not a pool per request.
    const db = await getServerDb();
    return await getDyoConfigurationByShortCode(db, shortCode);
  } catch {
    // If DB is unavailable during testing or static generation, return null
    return null;
  }
}

/* ------------------------------------------------------------------ review */

/**
 * The review page's display model (develop's shape, kept so the copied page is
 * byte-identical). develop read it from its own `configurations` endpoint;
 * here it is assembled from the configuration's REAL joined rows:
 *
 *   - the gemstone (or matched pair) resolved by `gemstone_id` /
 *     `gemstone_pair_id`;
 *   - the setting variant and its design, resolved by `setting_variant_id`;
 *   - the newest non-expired `dyo_price_snapshots` row for the configuration.
 *
 * A column that is NULL stays null, and the page renders its `Not evidenced`
 * marker (INV-07). Nothing is derived from a sibling row or a plausible guess.
 */
export interface DyoReviewModel {
  configurationCode: string;
  configuration: {
    state: string;
    compatibility_status: string;
    short_code: string;
    selected_options: Record<string, string>;
    engraving_text: string | null;
  };
  gemstone: {
    name: string;
    carat: number | null;
    gemRef: string;
    variety: string;
    colour: string;
    clarity: string;
    origin: string;
    shape: string | null;
    treatment: string | null;
    totalWeightCt: string | null;
    priceAmount: string | null;
  } | null;
  settingVariant: {
    name: string;
    metal: string;
    metalCode: string | null;
    sku: string;
    variantSku: string;
    designCode: string;
    basePrice: string | null;
  } | null;
  quote: {
    total: string;
    currency: string;
    gemstoneComponent: string | null;
    settingComponent: string | null;
    sideStoneComponent: string | null;
    makingComponent: string | null;
    taxComponent: string | null;
    pricingRuleVersion: string | null;
  } | null;
}

function selectedOptions(row: DyoConfigurationRow): Record<string, string> {
  const options: Record<string, string> = {};
  for (const [key, value] of Object.entries(row.selected_options ?? {})) {
    if (typeof value === 'string') options[key] = value;
  }
  return options;
}

export function buildDyoReviewModel(detail: DyoReviewDetail): DyoReviewModel {
  const { configuration, gemstone, settingVariant, quote } = detail;
  return {
    configurationCode: configuration.short_code,
    configuration: {
      state: configuration.state,
      compatibility_status: configuration.compatibility_status,
      short_code: configuration.short_code,
      selected_options: selectedOptions(configuration),
      engraving_text: configuration.engraving_text,
    },
    gemstone:
      gemstone === null
        ? null
        : {
            name: gemstone.name,
            carat: gemstone.totalWeightCt === null ? null : Number(gemstone.totalWeightCt),
            gemRef: gemstone.gemRef,
            variety: gemstone.variety ?? '',
            colour: gemstone.colour ?? '',
            clarity: gemstone.clarity ?? '',
            origin: gemstone.origin ?? '',
            shape: gemstone.shape,
            treatment: gemstone.treatment,
            totalWeightCt: gemstone.totalWeightCt,
            priceAmount: gemstone.priceAmount,
          },
    settingVariant:
      settingVariant === null
        ? null
        : {
            name: settingVariant.name,
            metal: settingVariant.metal,
            metalCode: settingVariant.metalCode,
            sku: settingVariant.sku,
            variantSku: settingVariant.variantSku,
            designCode: settingVariant.designCode,
            basePrice: settingVariant.basePrice,
          },
    quote:
      quote === null
        ? null
        : {
            total: quote.total,
            currency: quote.currency,
            gemstoneComponent: quote.gemstoneComponent,
            settingComponent: quote.settingComponent,
            sideStoneComponent: quote.sideStoneComponent,
            makingComponent: quote.makingComponent,
            taxComponent: quote.taxComponent,
            pricingRuleVersion: quote.pricingRuleVersion,
          },
  };
}

/**
 * A configuration row without its joins. Only the test override uses this: the
 * row it supplies carries no gemstone/setting/quote ids to resolve, so those
 * components stay null exactly as the INV-07 test pins.
 */
function modelFromBareRow(row: DyoConfigurationRow): DyoReviewModel {
  return buildDyoReviewModel({
    configuration: row,
    gemstone: null,
    settingVariant: null,
    quote: null,
  });
}

export async function loadDyoReviewModel(code: string): Promise<DyoReviewModel | null> {
  const override = globalStore.__maihanDyoOverride;
  if (override !== undefined) {
    const row = await override(code);
    return row === null ? null : modelFromBareRow(row);
  }

  try {
    const db = await getServerDb();
    const detail = await loadDyoReviewDetail(db, code);
    return detail === null ? null : buildDyoReviewModel(detail);
  } catch {
    return null;
  }
}
