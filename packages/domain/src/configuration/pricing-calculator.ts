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

import { fromCents, toCents } from '../commerce/cart.js';

function numToCents(value: number | undefined | null): bigint {
  if (value === null || value === undefined || !Number.isFinite(value)) return 0n;
  return toCents(value.toFixed(2));
}

function centsToNum(cents: bigint): number {
  return Number(fromCents(cents));
}

export function calculateDyoPrice(input: PricingInput): PricingSnapshotResult {
  const currency = input.currency ?? 'USD';
  const pricingRuleVersion = input.pricingRuleVersion ?? 'v1.0.0-deterministic';

  let gemstoneCents = 0n;
  if (input.gemstoneBasePrice != null && input.gemstoneBasePrice > 0) {
    gemstoneCents = numToCents(input.gemstoneBasePrice);
  } else if (input.gemstonePerCarat != null && input.gemstonePerCarat > 0) {
    const perCaratCents = numToCents(input.gemstonePerCarat);
    if (input.isPair && input.perStoneWeightsCt && input.perStoneWeightsCt.length > 0) {
      // Millicarats integer math: sum(weight * 1000) * perCaratCents / 1000
      const sumMillicarats = input.perStoneWeightsCt.reduce(
        (acc, w) => acc + BigInt(Math.round((w || 0) * 1000)),
        0n,
      );
      gemstoneCents = (perCaratCents * sumMillicarats + 500n) / 1000n;
    } else if (input.gemstoneWeightCt != null) {
      const millicarats = BigInt(Math.round(input.gemstoneWeightCt * 1000));
      gemstoneCents = (perCaratCents * millicarats + 500n) / 1000n;
    }
  }

  const settingCents = numToCents(input.settingBasePrice);
  const sideStoneCents = numToCents(input.sideStonePrice);
  const makingCents = numToCents(input.makingFee);
  const discountCents = numToCents(input.discountAmount);
  const taxCents = numToCents(input.taxAmount);

  const rawTotalCents =
    gemstoneCents + settingCents + sideStoneCents + makingCents - discountCents + taxCents;
  const totalCents = rawTotalCents > 0n ? rawTotalCents : 0n;

  const gemstoneComponent = centsToNum(gemstoneCents);
  const settingComponent = centsToNum(settingCents);
  const sideStoneComponent = centsToNum(sideStoneCents);
  const makingComponent = centsToNum(makingCents);
  const discountComponent = centsToNum(discountCents);
  const taxComponent = centsToNum(taxCents);
  const total = centsToNum(totalCents);

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
