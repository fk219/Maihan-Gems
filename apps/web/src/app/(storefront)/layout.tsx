import { cookies } from 'next/headers';

import '../storefront-luxury.css';

import { StorefrontHeader } from '../../components/layout/StorefrontHeader.js';
import { StorefrontFooter } from '../../components/layout/StorefrontFooter.js';
import { StorefrontProvider } from '../../components/storefront/StorefrontProvider.js';
import { parseCurrency } from '../../lib/currency.js';
import { getFxRates } from '../../lib/storefront-data.js';

export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const [rates, cookieStore] = await Promise.all([getFxRates(), cookies()]);
  const initialCurrency = parseCurrency(cookieStore.get('maihan_currency')?.value) ?? 'USD';
  return (
    <StorefrontProvider rates={rates} initialCurrency={initialCurrency}>
      <StorefrontHeader />
      {children}
      <StorefrontFooter />
    </StorefrontProvider>
  );
}
