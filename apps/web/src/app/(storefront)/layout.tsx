import '../storefront-luxury.css';

import { StorefrontHeader } from '../../components/layout/StorefrontHeader.js';
import { StorefrontFooter } from '../../components/layout/StorefrontFooter.js';
import { StorefrontProvider } from '../../components/storefront/StorefrontProvider.js';
import { getFxRates } from '../../lib/storefront-data.js';

export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const rates = await getFxRates();
  return (
    <StorefrontProvider rates={rates}>
      <StorefrontHeader />
      {children}
      <StorefrontFooter />
    </StorefrontProvider>
  );
}
