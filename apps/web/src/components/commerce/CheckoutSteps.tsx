/**
 * apps/web/src/components/commerce/CheckoutSteps.tsx
 *
 * The three-step checkout rail, shared by all three routes so the funnel
 * cannot drift. Server component; the current step is marked with
 * aria-current, and completed steps remain reachable.
 */
import Link from 'next/link';

export interface CheckoutStepsProps {
  readonly current: 1 | 2 | 3;
}

const STEPS = [
  { n: 1, label: 'Order summary', href: '/checkout/order-summary' },
  { n: 2, label: 'Payment order', href: '/checkout/payment-order' },
  { n: 3, label: 'Secure payment', href: '/checkout/secure-payment' },
] as const;

export function CheckoutSteps({ current }: CheckoutStepsProps) {
  return (
    <ol className="sf-steps" aria-label="Checkout progress">
      {STEPS.map((step) => {
        const isCurrent = step.n === current;
        return (
          <li key={step.n} aria-current={isCurrent ? 'step' : undefined}>
            <span className="sf-steps__num tabular">
              {step.n < current ? '✓' : `0${step.n}`}
            </span>
            {step.n < current ? <Link href={step.href}>{step.label}</Link> : <span>{step.label}</span>}
          </li>
        );
      })}
    </ol>
  );
}
