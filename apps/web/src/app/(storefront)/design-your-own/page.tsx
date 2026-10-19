import type { Metadata } from 'next';

import { DyoStudio } from '../../../components/storefront/DyoStudio.js';
import { ngcCards } from '../../../lib/ngc/catalog.js';
import { listProducts, listSettingsForDyo } from '../../../lib/storefront-data.js';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Design Your Own | Maihan Gems',
  description: 'Pair a setting with a compatible vault stone. Compatibility follows setting_accepts.',
};

export default async function DesignYourOwnPage(
  props: {
    searchParams?: Promise<{ setting?: string; stone?: string; tryon?: string }>;
  } = {},
) {
  const query = props.searchParams ? await props.searchParams : {};
  // DB-first (live vault rows); the compiled research fixture is the offline
  // fallback, never the primary surface.
  const [settings, dbStones] = await Promise.all([
    listSettingsForDyo(48),
    listProducts({ kind: 'gemstone', limit: 120 }),
  ]);
  const stones = dbStones.length > 0 ? dbStones : ngcCards({ kind: ['loose_stone', 'stone_pair'], limit: 120 });

  return (
    <main className="atelier-page">
      <DyoStudio
        settings={settings}
        stones={stones}
        initialSettingId={query.setting ?? null}
        initialStoneId={query.stone ?? null}
        initialTryOn={query.tryon === '1'}
      />
    </main>
  );
}
