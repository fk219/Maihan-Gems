import type { ReactNode } from 'react';
import '../../../styles/portal-premium.css';
import { PortalSurface } from '@/components/mgh/providers/PortalSurface';

export default function CheckoutLayout({ children }: { children: ReactNode }) {
  return (
    <div className="portal-theme">
      <PortalSurface />
      <div className="checkout-frame">{children}</div>
    </div>
  );
}
