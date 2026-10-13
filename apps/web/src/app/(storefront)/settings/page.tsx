import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { CategoryLanding } from '../../../components/storefront/CategoryLanding.js';
import { CollectionBrowser } from '../../../components/storefront/CollectionFilters.js';
import { landingView } from '../../../lib/ngc/landing.js';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Settings | Maihan Gems' };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ for?: string }>;
}) {
  const { for: settingFor } = await searchParams;
  const slug =
    settingFor === 'earrings'
      ? 'gemstone-earring-settings'
      : settingFor === 'pendant'
        ? 'gemstone-necklace-pendant-settings'
        : settingFor === 'bracelet'
          ? 'gemstone-bracelet-settings'
          : 'gemstone-ring-settings';
  const view = landingView(slug);
  if (!view) notFound();
  return (
    <CategoryLanding kicker={view.kicker} title={view.title} lede={view.lede} cta={view.cta} tiles={view.tiles}>
      <CollectionBrowser products={view.products} />
    </CategoryLanding>
  );
}
