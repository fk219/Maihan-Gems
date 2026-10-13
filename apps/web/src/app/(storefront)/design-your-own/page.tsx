import type { Metadata } from 'next';

import { DyoStudio } from '../../../components/storefront/DyoStudio.js';
import { listProducts, listSettingsForDyo } from '../../../lib/storefront-data.js';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Design Your Own | Maihan Gems',
  description: 'Pair a setting with a compatible vault stone. Compatibility follows setting_accepts.',
};

export default async function DesignYourOwnPage() {
  const [settings, stones] = await Promise.all([
    listSettingsForDyo(40),
    listProducts({ kind: 'gemstone', limit: 80 }),
  ]);

  return (
    <main className="atelier-page">
      <DyoStudio settings={settings} stones={stones} />
    </main>
  );
}
