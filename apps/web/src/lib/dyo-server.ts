/**
 * F4 honest stub — the configurations ledger is a runtime feature that lands
 * with F3-commerce. Lookup always misses → the review page renders its
 * honest not-found path. Nothing is invented.
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

const FRESH_API_URL = process.env['FRESH_API_URL'] ?? 'http://127.0.0.1:3010';

/**
 * F3-commerce: the configuration dossier from the fresh `configurations`
 * table — REAL setting + gemstone rows, quoted server-side. Null when the
 * code is unknown (honest not-found, never fabricated).
 */
export async function loadDyoReviewModel(code: string): Promise<DyoReviewModel | null> {
  try {
    const res = await fetch(
      `${FRESH_API_URL}/api/v1/configurations/${encodeURIComponent(code.trim().toUpperCase())}`,
      { cache: 'no-store' },
    );
    if (!res.ok) return null;
    const d = (await res.json()) as {
      code: string;
      short_code: string;
      state: string;
      compatibility_status: string;
      selected_options: Record<string, string>;
      setting: { name: string; sku: string; variantSku: string; designCode: string; metal: string; metalCode: string | null; basePrice: number } | null;
      gemstone: { name: string; gemRef: string; carat: number; variety: string; colour: string; clarity: string; origin: string; shape: string | null; treatment: string | null; totalWeightCt: number; priceAmount: number | null } | null;
      quote: { total: number; currency: string; gemstoneComponent: number; settingComponent: number; sideStoneComponent: number | null; makingComponent: number | null; taxComponent: number | null; pricingRuleVersion: string | null } | null;
    };
    if (!d?.setting || !d?.gemstone) return null;
    return {
      configurationCode: d.code,
      configuration: {
        state: d.state,
        compatibility_status: d.compatibility_status,
        short_code: d.short_code,
        selected_options: d.selected_options ?? {},
        engraving_text: null,
      },
      gemstone: {
        name: d.gemstone.name,
        carat: d.gemstone.carat,
        gemRef: d.gemstone.gemRef,
        variety: d.gemstone.variety,
        colour: d.gemstone.colour,
        clarity: d.gemstone.clarity,
        origin: d.gemstone.origin,
        shape: d.gemstone.shape,
        treatment: d.gemstone.treatment,
        totalWeightCt: String(d.gemstone.totalWeightCt),
        priceAmount: d.gemstone.priceAmount == null ? null : String(d.gemstone.priceAmount),
      },
      settingVariant: {
        name: d.setting.name,
        metal: d.setting.metal,
        metalCode: d.setting.metalCode,
        sku: d.setting.sku,
        variantSku: d.setting.variantSku,
        designCode: d.setting.designCode,
        basePrice: String(d.setting.basePrice),
      },
      quote: d.quote
        ? {
            total: d.quote.total.toFixed(2),
            currency: d.quote.currency,
            gemstoneComponent: d.quote.gemstoneComponent.toFixed(2),
            settingComponent: d.quote.settingComponent.toFixed(2),
            sideStoneComponent: null,
            makingComponent: null,
            taxComponent: null,
            pricingRuleVersion: null,
          }
        : null,
    };
  } catch {
    return null;
  }
}
