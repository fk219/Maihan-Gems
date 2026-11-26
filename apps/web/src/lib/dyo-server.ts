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
import { loadRuntimeConfig } from '@maihan/config';
import {
  createPool,
  getDyoConfigurationByShortCode,
  type DyoConfigurationRow,
} from '@maihan/db';

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
    const config = loadRuntimeConfig();
    const pool = createPool(config.databaseUrl);
    return await getDyoConfigurationByShortCode(pool, shortCode);
  } catch {
    // If DB is unavailable during testing or static generation, return null
    return null;
  }
}

/* ------------------------------------------------------------------ review */

/**
 * The review page's display model (develop's shape, kept so the copied page is
 * byte-identical). develop read it from its own `configurations` endpoint,
 * which does not exist here.
 *
 * The locked `design_your_own_configurations` row carries only ids, options
 * and the short code: no gemstone name, no setting name/metal and no quote.
 * Building this model from it would require inventing every human-readable
 * field, so the lookup answers null and the page renders its honest not-found
 * path. This mirrors develop's behaviour when its endpoint is absent.
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
    carat: number;
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

export async function loadDyoReviewModel(code: string): Promise<DyoReviewModel | null> {
  const row = await loadDyoConfiguration(code);
  if (row === null) return null;

  /**
   * Real columns only. The locked row has no joined gemstone / setting /
   * quote: those stay null and the page renders its `Not evidenced` markers
   * (INV-07). `selected_options` is a jsonb object of string options, which is
   * exactly the shape the page reads (ringSize / metal), so it is carried
   * verbatim without inventing keys.
   */
  const options: Record<string, string> = {};
  for (const [key, value] of Object.entries(row.selected_options ?? {})) {
    if (typeof value === 'string') options[key] = value;
  }

  return {
    configurationCode: row.short_code,
    configuration: {
      state: row.state,
      compatibility_status: row.compatibility_status,
      short_code: row.short_code,
      selected_options: options,
      engraving_text: row.engraving_text,
    },
    gemstone: null,
    settingVariant: null,
    quote: null,
  };
}
