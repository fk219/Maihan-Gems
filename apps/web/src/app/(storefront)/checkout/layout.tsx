import type { ReactNode } from 'react';
import '../../../styles/portal-premium.css';
import { ClientSurface } from '@/components/mgh/providers/ClientSurface';

export default function CheckoutLayout({ children }: { children: ReactNode }) {
  return (
    <ClientSurface>
      <div className="checkout-frame">{children}</div>
    </ClientSurface>
  );
}
