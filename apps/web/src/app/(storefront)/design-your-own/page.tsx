import type { Metadata } from 'next';

import { ConfiguratorDock } from '../../../components/configurator/ConfiguratorDock.js';
import type { MetalFinish } from '../../../components/configurator/JewelryConfiguratorCanvas.js';
import { DyoStudio } from '../../../components/storefront/DyoStudio.js';
import { listProducts, listSettingsForDyo } from '../../../lib/storefront-data.js';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Design Your Own | Maihan Gems',
  description: 'Pair a setting with a compatible vault stone. Compatibility follows setting_accepts.',
};

const METALS: readonly MetalFinish[] = ['YELLOW_GOLD', 'WHITE_GOLD', 'ROSE_GOLD', 'PLATINUM'];

export default async function DesignYourOwnPage({
  searchParams,
}: {
  searchParams?: Promise<{ tryon?: string; metal?: string; carat?: string }>;
}) {
  const query = (await searchParams) ?? {};
  const metal = METALS.find((item) => item === query.metal) ?? 'YELLOW_GOLD';
  const parsedCarat = Number(query.carat);
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
        <ConfiguratorDock
          initialTryOn={query.tryon === '1'}
          initialMetal={metal}
          initialCarat={Number.isFinite(parsedCarat) ? parsedCarat : 1.5}
        />
        <DyoStudio settings={settings} stones={stones} />
      </div>
    </main>
  );
}
