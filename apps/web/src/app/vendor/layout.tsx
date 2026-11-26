/**
 * apps/web/src/app/vendor/layout.tsx
 *
 * Vendor portal route group layout. The portal shell is develop's own
 * (`components/mgh/operator/VendorPortalApp`), which renders its sidebar and
 * header inside the page. This layout therefore contributes only the
 * non-indexable metadata: no storefront chrome, no second portal header.
 *
 * BUILD_BACKLOG Track D / ADR-026: the vendor portal is an operator surface
 * for vendors, not a shop window.
 */
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Vendor portal — Maihan Gems',
  description: 'Vendor stock, orders and statements for Maihan Gems partners.',
  robots: { index: false, follow: false, nocache: true },
};

export default function VendorLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <>{children}</>;
}
