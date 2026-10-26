import React from 'react';
import type { Metadata } from 'next';
import { CheckoutOrderSummaryClient } from '@/components/checkout/CheckoutClient';

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
