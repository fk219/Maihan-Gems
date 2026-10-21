/**
 * packages/domain/src/commerce/tax-rules.ts
 *
 * P2-3 (executable half): server-authoritative tax. Mirrors shipping-rules —
 * the client never supplies a tax amount; the checkout computes tax from the
 * APPROVED rate table keyed by the shipping destination country. Until the
 * client ratifies rates (ADR pending), the table is the narrow, honest
 * fallback: only jurisdictions with an explicitly configured rate are charged;
 * everywhere else tax_total stays '0.00' AND the snapshot carries
 * `tax_evidence: 'UNCONFIGURED'` so a production operator can see that tax
 * was not applied — never silently assumed away.
 */

export interface TaxRule {
  readonly countryCode: string;
  /** Inclusive VAT/GST/Sales-tax rate as an exact decimal string (e.g. '0.05'). */
  readonly rate: string;
  readonly label: string;
}

export const TAX_RATE_TABLE: readonly TaxRule[] = [
  { countryCode: 'AE', rate: '0.05', label: 'UAE VAT 5%' },
  { countryCode: 'TH', rate: '0.07', label: 'Thailand VAT 7%' },
  { countryCode: 'GB', rate: '0.20', label: 'UK VAT 20%' },
];

export function findTaxRule(countryCode: string | null | undefined): TaxRule | undefined {
  if (!countryCode) return undefined;
  const cc = countryCode.trim().toUpperCase();
  return TAX_RATE_TABLE.find((r) => r.countryCode === cc);
}

export type TaxAssessment =
  | { readonly evidence: 'APPLIED'; readonly rate: string; readonly label: string; readonly taxTotal: string }
  | { readonly evidence: 'ZERO_RATE'; readonly rate: '0.00'; readonly label: string; readonly taxTotal: '0.00' }
  | { readonly evidence: 'UNCONFIGURED'; readonly taxTotal: '0.00' };

/**
 * Assesses tax for a taxable subtotal (goods + shipping, exclusive of tax).
 * Pure integer-cents arithmetic — no float.
 */
export function assessTax(
  countryCode: string | null | undefined,
  taxableSubtotalCents: bigint,
): TaxAssessment {
  const rule = findTaxRule(countryCode);
  if (!rule) return { evidence: 'UNCONFIGURED', taxTotal: '0.00' };
  const rateNum = Number(rule.rate);
  if (!Number.isFinite(rateNum) || rateNum < 0) {
    return { evidence: 'UNCONFIGURED', taxTotal: '0.00' };
  }
  if (rateNum === 0) {
    return { evidence: 'ZERO_RATE', rate: '0.00', label: rule.label, taxTotal: '0.00' };
  }
  // Round half-up on integer cents: (subtotal * rate) with +0.5 bias.
  const taxCents = (taxableSubtotalCents * BigInt(Math.round(rateNum * 100)) + 50n) / 100n;
  const whole = taxCents / 100n;
  const frac = taxCents % 100n;
  return {
    evidence: 'APPLIED',
    rate: rule.rate,
    label: rule.label,
    taxTotal: `${whole}.${String(frac).padStart(2, '0')}`,
  };
}
