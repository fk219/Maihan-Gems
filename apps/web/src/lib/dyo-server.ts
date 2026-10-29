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

export async function loadDyoReviewModel(code: string): Promise<DyoReviewModel | null> {
  void code; // configurations ledger lands with F3-commerce; honest miss today
  return null;
}
