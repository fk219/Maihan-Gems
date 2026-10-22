import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { CategoryLanding } from '../../../components/storefront/CategoryLanding.js';
import { CollectionPage } from '../../../components/storefront/CollectionPage.js';
import { LuxuryProductCard } from '../../../components/storefront/LuxuryProductCard.js';
import { EmptyState } from '../../../components/design-system/EmptyState.js';
import { loadCollectionView } from '../../../lib/collection-route.js';
import { currentStorefront } from '../../../lib/ngc/current-storefront.js';
import { landingView } from '../../../lib/ngc/landing.js';
import { parseLandingSlug } from '../../../lib/ngc/routes.js';
import { cardMatchesBrand, SISTER_SLUGS, storefrontBySlug } from '../../../lib/ngc/storefronts.js';
import HomePage from '../page.js';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ varietySlug?: string }>;
  searchParams?: Promise<{ style?: string; page?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { varietySlug } = await params;
  if (varietySlug && (SISTER_SLUGS as readonly string[]).includes(varietySlug)) {
    const house = storefrontBySlug(varietySlug);
    return { title: house.name, description: house.lede };
  }
  const view = landingView(varietySlug);
  if (!view) {
    return {
      title: 'Not found | Maihan Gems',
      description: 'This page is not in the vault.',
    };
  }
  return {
    title: `${view.title} | Maihan Gems`,
    description: view.lede,
  };
}

export default async function VarietyPage({ params, searchParams }: PageProps) {
  const { varietySlug } = await params;
  const query = searchParams ? await searchParams : {};
  if (varietySlug && (SISTER_SLUGS as readonly string[]).includes(varietySlug) && !query.style) {
    return HomePage({ brand: storefrontBySlug(varietySlug) });
  }

  // Suffix collections ({variety}-pairs / -rings / -earrings / -pendants /
  // -bracelets / -necklaces / -settings) parse INSIDE this route — suffix
  // folders crash Next.js. DB-backed collection when the suffix parses.
  if (varietySlug && /-(pairs|earrings|pendants|bracelets|necklaces|rings|settings)$/.test(varietySlug)) {
    const collection = await loadCollectionView(varietySlug);
    if (collection) {
      return (
        <CollectionPage
          kicker={collection.kicker}
          title={collection.title}
          lede={collection.lede}
          products={collection.products}
          stoneSlug={collection.stoneSlug}
        />
      );
    }
  }

  const parsed = parseLandingSlug(varietySlug);
  const view = landingView(varietySlug);
  if (!parsed || !view) notFound();
  const brand = await currentStorefront();
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
        ) : (
          <EmptyState
            title="No pieces from this collection are in the vault right now."
            action={
              <a href="/browse" className="lx-btn lx-btn--solid">
                Browse the vault
              </a>
            }
          />
        )}
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
