import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { CategoryLanding } from '../../../components/storefront/CategoryLanding.js';
import { CollectionPage } from '../../../components/storefront/CollectionPage.js';
import { LuxuryProductCard } from '../../../components/storefront/LuxuryProductCard.js';
import { jewelleryHub, landingView } from '../../../lib/ngc/landing.js';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Jewellery | Maihan Gems',
  description: 'Ready-to-ship jewels and custom designs built from a setting and a stone.',
};

export default async function JewelleryPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  if (!type) {
    const view = jewelleryHub();
    return (
      <CategoryLanding
        kicker={view.kicker}
        title={view.title}
        lede={view.lede}
        cta={view.cta}
        tiles={view.tiles}
        heroImage={view.heroImage}
      >
        {view.products.length > 0 ? (
          <section>
            <h2 className="lx-h3">From the atelier</h2>
            <div className="lx-grid">
              {view.products.map((card) => (
                <LuxuryProductCard key={card.id} product={card} />
              ))}
            </div>
          </section>
        ) : null}
      </CategoryLanding>
    );
  }
  const slug =
    type === 'earrings'
      ? 'gemstone-earrings'
      : type === 'pendant'
        ? 'gemstone-necklaces-pendants'
        : type === 'bracelet'
          ? 'gemstone-bracelets-bangles'
          : 'all-gemstone-rings';
  const view = landingView(slug);
  if (!view) notFound();
  if (!view.showCatalog) {
    return (
      <CategoryLanding
        kicker={view.kicker}
        title={view.title}
        lede={view.lede}
        cta={view.cta}
        tiles={view.tiles}
        heroImage={view.heroImage}
      />
    );
  }
  return (
    <CollectionPage
      kicker={view.kicker}
      title={view.title}
      lede={view.lede}
      products={view.products}
      cta={view.cta}
      heroImage={view.heroImage}
    />
  );
}
