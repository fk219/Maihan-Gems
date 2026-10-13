import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { CollectionPage } from '../../../components/storefront/CollectionPage.js';
import { landingView } from '../../../lib/ngc/landing.js';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Gemstones | Maihan Gems' };

export default async function BrowsePage() {
  const view = landingView('all-natural-gemstones');
  if (!view) notFound();
  return (
    <CollectionPage
      kicker={view.kicker}
      title={view.title}
      lede={view.lede}
      products={view.products}
    />
  );
}
