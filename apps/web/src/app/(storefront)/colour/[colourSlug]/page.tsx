/**
 * apps/web/src/app/(storefront)/colour/[colourSlug]/page.tsx
 *
 * `/padparadscha-gemstones` — colour-family listing.
 * SoT 12.2 `colour/[colour]/page.tsx`; target of the 60 observed
 * `/{colour}-gemstones` source routes (SoT 13.1, 301). Segment name
 * `colourSlug` is distinct from `varietySlug` by manifest contract.
 */
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Colour',
};

export default function ColourIndexPage() {
  return null;
}
