/**
 * apps/web/src/app/(storefront)/checkout/secure-payment/page.tsx
 *
 * `/checkout/secure-payment` — checkout step 3 (target of the observed
 * /cart/secure-payment 301). SoT 12.2. The RENDERED payload is the reference
 * applet's final-review step (its "review & place order" visual), wired
 * through the adapter to the REAL checkpoint + order endpoints — placing the
 * order is idempotent and lands on the authoritative confirmation page.
 * URL structure stays the repo's; the applet checkout markup is the payload
 * only, and no `ORD-LIVE-…` surrogate order is ever fabricated.
 */
import type { Metadata } from 'next';

import { CheckoutPaymentOrderClient } from '@/components/mgh/checkout/CheckoutClient';

export const metadata: Metadata = {
  title: 'Step 3: Review & Place Vault Order — Checkout',
  description: 'Final review of specimen selection and shipping details before placing order.',
  robots: { index: false, follow: false },
};

export default async function CheckoutSecurePaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const { session } = await searchParams;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 space-y-6">
      <div>
        <p className="text-xs font-[family-name:var(--font-mono)] text-[#78756F]">
          CHECKOUT · STEP 3 OF 3
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-4xl font-semibold text-[#141413]">
          Review &amp; Place Vault Order
        </h1>
      </div>
      <CheckoutPaymentOrderClient sessionId={session ?? null} />
    </div>
  );
}
