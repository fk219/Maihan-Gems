import type { Metadata } from 'next';
import dynamicImport from 'next/dynamic';

export const metadata: Metadata = {
  title: 'Checkout | Maihan Gems',
  robots: { index: false, follow: false },
};

const CheckoutFlow = dynamicImport(() => import('@/components/mgh/checkout/CheckoutFlow'), {
  loading: () => <div className="min-h-screen bg-[#FAF8F4]" />,
});

export default function Page() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <p className="text-xs font-[family-name:var(--font-mono)] text-[#78756F]">CHECKOUT</p>
      <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold text-[#141413] mb-8">
        Vault Selection Checkout
      </h1>
      <CheckoutFlow />
    </div>
  );
}
