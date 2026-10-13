import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';

import { CategoryLanding } from '../../../components/storefront/CategoryLanding.js';
import { CollectionPage } from '../../../components/storefront/CollectionPage.js';
import { LuxuryProductCard } from '../../../components/storefront/LuxuryProductCard.js';
import { landingView } from '../../../lib/ngc/landing.js';
import { parseLandingSlug } from '../../../lib/ngc/routes.js';
import { cardMatchesBrand, storefrontBySlug } from '../../../lib/ngc/storefronts.js';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ varietySlug?: string }>;
  searchParams?: Promise<{ style?: string; page?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { varietySlug } = await params;
  const view = landingView(varietySlug);
  return { title: view ? `${view.title} | Maihan Gems` : 'Collection | Maihan Gems' };
}

export default async function VarietyPage({ params, searchParams }: PageProps) {
  const { varietySlug } = await params;
  const query = searchParams ? await searchParams : {};
  const parsed = parseLandingSlug(varietySlug);
  const view = landingView(varietySlug);
  if (!parsed || !view) notFound();
  const brand = storefrontBySlug((await headers()).get('x-maihan-storefront'));
  const style = query.style;
  let products = view.products;
  if (brand.defaultStone) {
    products = products.filter((card) => cardMatchesBrand(card, brand.defaultStone));
  }
  if (style) {
    const needle = style.toLowerCase();
    products = products.filter((card) => (card.style ?? []).some((row) => row.toLowerCase() === needle));
  }

  if (!view.showCatalog && !style) {
    return (
      <CategoryLanding
        kicker={view.kicker}
        title={view.title}
        lede={view.lede}
        cta={view.cta}
        tiles={view.tiles}
        colours={view.colours}
        heroImage={view.heroImage}
      >
        {products.length > 0 ? (
          <section>
            <h2 className="lx-h3">From this collection</h2>
            <div className="lx-grid">
              {products.slice(0, 8).map((card) => (
                <LuxuryProductCard key={card.id} product={card} />
              ))}
            </div>
          </section>
        ) : null}
      </CategoryLanding>
    );
  }

  return (
    <CollectionPage
      kicker={view.kicker}
      title={style ? `${view.title} · ${style}` : view.title}
      lede={view.lede}
      products={products}
      stoneSlug={parsed.type === 'stone' ? parsed.slug : undefined}
      cta={view.cta}
      heroImage={view.heroImage}
    />
  );
}
