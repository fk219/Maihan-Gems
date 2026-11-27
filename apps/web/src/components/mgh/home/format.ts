import type { EvidencePlate } from '@/lib/mgh/fixtures';

/**
 * Presentation helpers for the homepage. They only format what a record
 * already carries: nothing here computes a price, infers an origin or
 * manufactures a certificate reference.
 */
export function formatUsd(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return 'Price on request';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCarat(value: number): string {
  return Number.isFinite(value) && value > 0 ? `${value.toFixed(2)} ct` : 'Weight not recorded';
}

/** The short reference shown in the provenance rail. */
export function certificateReference(evidence: EvidencePlate): string {
  const number = evidence.reportNumber?.trim();
  return number ? number : 'Certificate not recorded';
}

/** The full certificate line shown in the record table. */
export function certificateLine(evidence: EvidencePlate): string {
  const lab = evidence.laboratory?.trim();
  const number = evidence.reportNumber?.trim();
  if (lab && number && lab.includes(number)) return lab;
  if (lab && number) return `${lab} · ${number}`;
  if (number) return number;
  if (lab) return lab;
  return 'Not recorded';
}
