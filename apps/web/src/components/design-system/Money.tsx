/**
 * apps/web/src/components/design-system/Money.tsx
 *
 * Design-system primitive: Money (doc 08 design-system list includes Price
 * and Money). Formats a contract amount + ISO-4217 currency with
 * Intl.NumberFormat — no pricing logic lives here (the amount arrives from
 * the Phase 3 read model verbatim; this is display only). Server-compatible
 * and deterministic on the server (explicit locale).
 */
export interface MoneyProps {
  readonly amount: number;
  readonly currency: string;
}

export function Money({ amount, currency }: MoneyProps) {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
  return (
    <span className="money">
      {formatted}
      <span className="visually-hidden"> {currency}</span>
    </span>
  );
}
