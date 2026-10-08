/**
 * apps/web/src/app/(storefront)/ar/[assetId]/page.tsx
 *
 * `/ar/<assetId>` — WebAR, isolated (SoT 12.2: "AR route, isolated" — this
 * whole subtree ships `ssr:false` when the AR bundle lands, doc 02
 * implementation constraint 4). Route structure only; AR is Phase 11 and
 * disabled entry point but no functionality.
 */
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AR viewer',
  robots: { index: false, follow: false },
};

export default function ArViewerPage() {
  return null;
}
