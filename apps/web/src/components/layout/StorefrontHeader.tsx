import { listStoneTypes } from '../../lib/storefront-data.js';
import { LuxuryHeader } from '../storefront/LuxuryHeader.js';

export async function StorefrontHeader() {
  const stones = await listStoneTypes();
  return <LuxuryHeader stones={stones} />;
}
