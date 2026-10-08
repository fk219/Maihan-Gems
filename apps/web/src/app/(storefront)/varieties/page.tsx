/**
 * apps/web/src/app/(storefront)/varieties/page.tsx
 *
 * `/varieties` — variety editorial hub. SoT 13.2 new target-only routes.
 *
 * NOTE: SoT 12.2 does not draw an explicit `/varieties` index line in the
 * tree even though 13.2 declares `/varieties` and `/varieties/{slug}` as new
 * target-only routes; both authority lines are implemented together here.
 */
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Varieties',
};

export default function VarietiesIndexPage() {
  return null;
}
