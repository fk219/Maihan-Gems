/**
 * apps/web/src/app/(storefront)/checkout/payment-order/page.tsx
 *
 * `/checkout/payment-order` — checkout step 2 (target of the observed
 * /cart/payment-order 301). SoT 12.2. The RENDERED payload is the reference
 * applet's settlement step (its "secure payment" visual), wired through the
 * adapter to the REAL payment checkpoint: the settlement instrument shows
 * the provider state the backend actually has (sandbox TEST provider in dev;
 * card/escrow are a pending backend decision and render disabled), and the
 * server's 422 for skipped steps surfaces verbatim. URL structure stays the
 * repo's; the applet checkout markup is the payload only.
 */
import type { Metadata } from 'next';

import { CheckoutSecurePaymentClient } from '@/components/mgh/checkout/CheckoutClient';

export const metadata: Metadata = {
  title: 'Step 2: Secure Payment (Demo Mode) — Checkout',
  description: 'Simulation-safe settlement step for Maihan Gems vault reservation.',
  robots: { index: false, follow: false },
};

export default async function CheckoutPaymentOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const { session } = await searchParams;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 space-y-6">
      <div>
        <p className="text-xs font-[family-name:var(--font-mono)] text-[#78756F]">
          CHECKOUT · STEP 2 OF 3
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-4xl font-semibold text-[#141413]">
          Secure Payment (Simulated Demo Provider)
        </h1>
      </div>
      <CheckoutSecurePaymentClient sessionId={session ?? null} />
    </div>
  );
}
