import type { ReactNode } from 'react';
import { cookies } from 'next/headers';

import '../storefront-luxury.css';
import '../../styles/vault-vitrine.css';
import '../../styles/vault-premium.css';
import '../../styles/vault-composition.css';
import '../../styles/vault-motion.css';
import '../../styles/maison.css';
import '../../styles/routes-salon.css';
import '../../styles/operator.css';
import '../../styles/cloth.css';
import '../../styles/mgh-applet.css';
import { Toaster } from '../../components/ui/sonner.js';

import { AiConciergeLauncher } from '../../components/ai/AiConciergeLauncher.js';
import { StorefrontProvider } from '../../components/storefront/StorefrontProvider.js';
import { parseCurrency } from '../../lib/currency.js';
import { loadNgcCatalog } from '../../lib/ngc/catalog.js';
import { getFxRates, isCatalogueOffline } from '../../lib/storefront-data.js';

/* M2 — the migrated shell is the MaihanGems (applet) chrome, reproduced
   1:1: golden-cloud gallery wrapper, StorefrontHeader, MotionWrapper, the
   #main-content main landmark, ScrollToTopButton and StorefrontFooter. The
   repo's own provider still wraps the tree so the not-yet-migrated pages
   keep their FX/currency context; the applet's provider is mounted at the
   root layout (as in the reference app). */
import { StorefrontHeader } from '../../components/mgh/shell/StorefrontHeader.js';
import { StorefrontFooter } from '../../components/mgh/shell/StorefrontFooter.js';
import { StorefrontMotionWrapper } from '../../components/mgh/shell/StorefrontMotionWrapper.js';
import { ScrollToTopButton } from '../../components/mgh/shell/ScrollToTopButton.js';
import CartDrawer from '../../components/mgh/shell/CartDrawer.js';

export default async function StorefrontLayout({ children }: { children: ReactNode }) {
  const [rates, cookieStore] = await Promise.all([getFxRates(), cookies()]);
  const initialCurrency = parseCurrency(cookieStore.get('maihan_currency')?.value) ?? 'USD';
  const offline = isCatalogueOffline() && loadNgcCatalog().length === 0;
  return (
    <StorefrontProvider rates={rates} initialCurrency={initialCurrency}>
      <div className="relative min-h-screen flex flex-col golden-cloud-gallery">
        <StorefrontHeader />
        {offline ? (
          <p className="ngc-offline">
            Catalogue database is empty or not set up. Run: docker compose up -d, then pnpm storefront:db:setup
          </p>
        ) : null}
        <StorefrontMotionWrapper />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <ScrollToTopButton />
        <CartDrawer />
        <Toaster />
        <StorefrontFooter />
        {/* P1-29: mount the (formerly unreachable) concierge drawer. */}
        <AiConciergeLauncher />
      </div>
    </StorefrontProvider>
  );
}
