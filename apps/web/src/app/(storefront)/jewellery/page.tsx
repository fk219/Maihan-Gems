import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { CategoryLanding } from '../../../components/storefront/CategoryLanding.js';
import { CollectionBrowser } from '../../../components/storefront/CollectionFilters.js';
import { landingView } from '../../../lib/ngc/landing.js';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Jewellery | Maihan Gems' };

export default async function JewelleryPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const slug =
    type === 'earrings'
      ? 'gemstone-earrings'
      : type === 'pendant'
        ? 'gemstone-necklaces-pendants'
        : type === 'bracelet'
          ? 'gemstone-bracelets-bangles'
          : 'gemstone-rings';
  const view = landingView(slug);
  if (!view) notFound();
  return (
    <CategoryLanding kicker={view.kicker} title={view.title} lede={view.lede} cta={view.cta} tiles={view.tiles}>
      <CollectionBrowser products={view.products} />
    </CategoryLanding>
  );
}
