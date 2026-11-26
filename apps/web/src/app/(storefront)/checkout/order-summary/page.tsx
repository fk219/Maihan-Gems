import type { Metadata } from 'next';
import dynamicImport from 'next/dynamic';
import { ClientThemeToggle } from '@/components/mgh/providers/ClientSurface';

export const metadata: Metadata = {
  title: 'Checkout | Maihan Gems',
  robots: { index: false, follow: false },
};

const CheckoutFlow = dynamicImport(() => import('@/components/mgh/checkout/CheckoutFlow'), {
  loading: () => <div className="min-h-screen bg-[#F4F2EE]" />,
});

export default function Page() {
  return (
    <div>
      <div className="checkout-head" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <p className="portal-kicker">Checkout</p>
          <h1 className="portal-page-title">Vault Selection Checkout</h1>
          <p className="portal-page-sub">Three quiet steps: your selection, the address, then settlement.</p>
        </div>
        <ClientThemeToggle />
      </div>
      <CheckoutFlow />
    </div>
  );
}
