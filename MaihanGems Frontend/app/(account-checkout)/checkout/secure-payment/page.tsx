import React from 'react';
import type { Metadata } from 'next';
import { CheckoutSecurePaymentClient } from '@/components/checkout/CheckoutClient';

export const metadata: Metadata = {
  title: 'Step 2: Secure Payment (Demo Mode) — Checkout',
  description: 'Simulated payment provider step for Maihan Gems vault reservation.',
  robots: { index: false, follow: false },
};

export default function CheckoutSecurePaymentPage() {
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
      <CheckoutSecurePaymentClient />
    </div>
  );
}
