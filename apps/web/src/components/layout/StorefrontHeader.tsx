import { currentStorefront } from '../../lib/ngc/current-storefront.js';
import { LuxuryHeader } from '../storefront/LuxuryHeader.js';

export async function StorefrontHeader() {
  const brand = await currentStorefront();
  return <LuxuryHeader stones={[]} brand={brand} />;
}
