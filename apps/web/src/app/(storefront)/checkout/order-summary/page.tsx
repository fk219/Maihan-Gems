/**
 * apps/web/src/app/(storefront)/checkout/order-summary/page.tsx
 *
 * `/checkout/order-summary` — checkout step 1 (target of the observed
 * /cart/order-summary 301). SoT 12.2. The RENDERED payload is the reference
 * applet's step-1 page (verbatim); the real funnel logic lives in the step
 * client, which bridges the merged bag into a real server cart, opens the
 * real checkout session (server pricing snapshot + inventory reservation)
 * and records the REAL shipping checkpoint. The step-1 URL/step ordering is
 * the repo's SEO/redirect spine — the applet markup is the payload only.
 */
import type { Metadata } from 'next';

import { CheckoutOrderSummaryClient } from '@/components/mgh/checkout/CheckoutClient';

export const metadata: Metadata = {
  title: 'Step 1: Order Summary & Insured Shipping — Checkout',
  description: 'Review your Maihan Gems vault selection and provide insured courier delivery details.',
  robots: { index: false, follow: false },
};

export default function CheckoutOrderSummaryPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 space-y-6">
      <div>
        <p className="text-xs font-[family-name:var(--font-mono)] text-[#78756F]">
          CHECKOUT · STEP 1 OF 3
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-4xl font-semibold text-[#141413]">
          Order Summary &amp; Insured Delivery
        </h1>
      </div>
      <CheckoutOrderSummaryClient />
    </div>
  );
}
