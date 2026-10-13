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
    listSettingsForDyo(12),
    listProducts({ kind: 'gemstone', limit: 32 }),
  ]);

  return (
    <main className="lx-section">
      <div className="lx-wrap">
        <span className="lx-kicker">Bespoke atelier</span>
        <h1 className="lx-h2">Design your own</h1>
        <p className="lx-lede">
          Three steps: a ring, pendant or earring mounting, a stone the head will take, then metal and size. Combined price follows your currency.
        </p>
        <DyoStudio settings={settings} stones={stones} />
      </div>
    </main>
  );
}
