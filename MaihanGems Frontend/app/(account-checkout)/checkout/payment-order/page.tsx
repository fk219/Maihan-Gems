import React from 'react';
import type { Metadata } from 'next';
import { CheckoutPaymentOrderClient } from '@/components/checkout/CheckoutClient';

export const metadata: Metadata = {
  title: 'Step 3: Review & Place Vault Order — Checkout',
  description: 'Final review of specimen selection and shipping details before placing order.',
  robots: { index: false, follow: false },
};

export default function CheckoutPaymentOrderPage() {
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
      <CheckoutPaymentOrderClient />
    </div>
  );
}
