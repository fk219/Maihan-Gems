import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { CategoryLanding } from '../../../components/storefront/CategoryLanding.js';
import { CollectionPage } from '../../../components/storefront/CollectionPage.js';
import { landingView } from '../../../lib/ngc/landing.js';
import { parseLandingSlug } from '../../../lib/ngc/routes.js';

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

export default async function VarietyPage({ params }: PageProps) {
  const { varietySlug } = await params;
  const parsed = parseLandingSlug(varietySlug);
  const view = landingView(varietySlug);
  if (!parsed || !view) notFound();

  if (!view.showCatalog) {
    return (
      <CategoryLanding
        kicker={view.kicker}
        title={view.title}
        lede={view.lede}
        cta={view.cta}
        tiles={view.tiles}
        colours={view.colours}
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
      stoneSlug={parsed.type === 'stone' ? parsed.slug : undefined}
      cta={view.cta}
      heroImage={view.heroImage}
    />
  );
}
