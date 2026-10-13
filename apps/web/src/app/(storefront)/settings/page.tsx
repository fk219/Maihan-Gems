import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { CategoryLanding } from '../../../components/storefront/CategoryLanding.js';
import { CollectionPage } from '../../../components/storefront/CollectionPage.js';
import { landingView, settingsHub } from '../../../lib/ngc/landing.js';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Settings | Maihan Gems' };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ for?: string }>;
}) {
  const { for: settingFor } = await searchParams;
  if (!settingFor) {
    const view = settingsHub();
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
