/**
 * packages/domain/src/configuration/pricing-calculator.ts
 *
 * Authority: technical_design/14_DYO_ARCHITECTURE.md section 7 ("Pricing")
 *
 * Pricing Formula:
 *   total = gemstoneComponent + settingComponent + sideStoneComponent
 *         + makingComponent + discountComponent + taxComponent
 *
 * For a pair:
 *   gemstoneComponent = price_per_carat * SUM(per-stone weights)
 *
 * Reproducibility:
 *   - Pure, deterministic arithmetic.
 *   - Snapshot records the exact components, currency, pricing rule version, and breakdown JSON.
 */

export interface PricingInput {
  readonly gemstoneBasePrice?: number;
  readonly gemstonePerCarat?: number;
  readonly gemstoneWeightCt?: number;
  readonly isPair?: boolean;
  readonly perStoneWeightsCt?: readonly number[];
  readonly settingBasePrice?: number;
  readonly sideStonePrice?: number;
  readonly makingFee?: number;
  readonly discountAmount?: number;
  readonly taxAmount?: number;
  readonly currency?: string;
  readonly pricingRuleVersion?: string;
}

export interface PricingSnapshotResult {
  readonly gemstoneComponent: number;
  readonly settingComponent: number;
  readonly sideStoneComponent: number;
  readonly makingComponent: number;
  readonly discountComponent: number;
  readonly taxComponent: number;
  readonly total: number;
  readonly currency: string;
  readonly pricingRuleVersion: string;
  readonly breakdown: Readonly<Record<string, unknown>>;
}

export function calculateDyoPrice(input: PricingInput): PricingSnapshotResult {
  const currency = input.currency ?? 'USD';
  const pricingRuleVersion = input.pricingRuleVersion ?? 'v1.0.0-deterministic';

  let gemstoneComponent = 0;
  if (input.gemstoneBasePrice != null && input.gemstoneBasePrice > 0) {
    gemstoneComponent = Number(input.gemstoneBasePrice.toFixed(2));
  } else if (input.gemstonePerCarat != null && input.gemstonePerCarat > 0) {
    if (input.isPair && input.perStoneWeightsCt && input.perStoneWeightsCt.length > 0) {
      const sumWeight = input.perStoneWeightsCt.reduce((acc, w) => acc + w, 0);
      gemstoneComponent = Number((input.gemstonePerCarat * sumWeight).toFixed(2));
    } else if (input.gemstoneWeightCt != null) {
      gemstoneComponent = Number((input.gemstonePerCarat * input.gemstoneWeightCt).toFixed(2));
    }
  }

  const settingComponent = Number((input.settingBasePrice ?? 0).toFixed(2));
  const sideStoneComponent = Number((input.sideStonePrice ?? 0).toFixed(2));
  const makingComponent = Number((input.makingFee ?? 0).toFixed(2));
  const discountComponent = Number((input.discountAmount ?? 0).toFixed(2));
  const taxComponent = Number((input.taxAmount ?? 0).toFixed(2));

  const total = Number(
    Math.max(
      0,
      gemstoneComponent + settingComponent + sideStoneComponent + makingComponent - discountComponent + taxComponent,
    ).toFixed(2),
  );

  return {
    gemstoneComponent,
    settingComponent,
    sideStoneComponent,
    makingComponent,
    discountComponent,
    taxComponent,
    total,
    currency,
    pricingRuleVersion,
    breakdown: {
      gemstone: gemstoneComponent,
      setting: settingComponent,
      sideStones: sideStoneComponent,
      makingFee: makingComponent,
      discount: discountComponent,
      tax: taxComponent,
      currency,
    },
  };
}
