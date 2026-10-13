import { listStoneTypes } from '../../lib/storefront-data.js';
import { currentStorefront } from '../../lib/ngc/current-storefront.js';
import { LuxuryHeader } from '../storefront/LuxuryHeader.js';

export async function StorefrontHeader() {
  const stones = await listStoneTypes();
  const brand = await currentStorefront();
  return <LuxuryHeader stones={stones} brand={brand} />;
}
