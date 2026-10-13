import type { Metadata } from 'next';

import { CollectionPage } from '../../../components/storefront/CollectionPage.js';
import { listProducts } from '../../../lib/storefront-data.js';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Settings | Maihan Gems' };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ for?: string }>;
}) {
  const { for: settingFor } = await searchParams;
  const allowed = settingFor === 'ring' || settingFor === 'pendant' || settingFor === 'earrings'
    ? settingFor
    : undefined;
  const products = await listProducts({
    kind: 'setting',
    settingFor: allowed,
    settingForIn: allowed ? undefined : ['ring', 'pendant', 'earrings'],
    limit: 32,
  });
  return (
    <CollectionPage
      kicker="Atelier mountings"
      title="Settings"
      lede="Ring, earring and pendant mountings, priced without the centre stone."
      products={products}
    />
  );
}
