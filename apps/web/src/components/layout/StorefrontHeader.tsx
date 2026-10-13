import { headers } from 'next/headers';

import { listStoneTypes } from '../../lib/storefront-data.js';
import { storefrontBySlug } from '../../lib/ngc/storefronts.js';
import { LuxuryHeader } from '../storefront/LuxuryHeader.js';

export async function StorefrontHeader() {
  const stones = await listStoneTypes();
  const brand = storefrontBySlug((await headers()).get('x-maihan-storefront'));
  return <LuxuryHeader stones={stones} brand={brand} />;
}
