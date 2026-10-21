import { cookies } from 'next/headers';

import '../storefront-luxury.css';
import '../../styles/vault-vitrine.css';
import '../../styles/vault-premium.css';
import '../../styles/vault-composition.css';
import '../../styles/vault-motion.css';

import { AiConciergeLauncher } from '../../components/ai/AiConciergeLauncher.js';
import { StorefrontHeader } from '../../components/layout/StorefrontHeader.js';
import { StorefrontFooter } from '../../components/layout/StorefrontFooter.js';
import { StorefrontProvider } from '../../components/storefront/StorefrontProvider.js';
import { parseCurrency } from '../../lib/currency.js';
import { loadNgcCatalog } from '../../lib/ngc/catalog.js';
import { getFxRates, isCatalogueOffline } from '../../lib/storefront-data.js';

export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const [rates, cookieStore] = await Promise.all([getFxRates(), cookies()]);
  const initialCurrency = parseCurrency(cookieStore.get('maihan_currency')?.value) ?? 'USD';
  const offline = isCatalogueOffline() && loadNgcCatalog().length === 0;
  return (
    <StorefrontProvider rates={rates} initialCurrency={initialCurrency}>
      <StorefrontHeader />
      {offline ? (
        <p className="ngc-offline">
          Catalogue database is empty or not set up. Run: docker compose up -d, then pnpm storefront:db:setup
        </p>
      ) : null}
      <div className="ngc-pages">{children}</div>
      <StorefrontFooter />
      {/* P1-29: mount the (formerly unreachable) concierge drawer. */}
      <AiConciergeLauncher />
    </StorefrontProvider>
  );
}
