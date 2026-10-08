/**
 * apps/web/src/app/(storefront)/varieties/[varietySlug]/page.tsx
 *
 * `/varieties/<slug>` — variety editorial detail (SoT 13.2).
 *
 * Bracketed segment `varietySlug` is nested inside the `varieties/` folder
 * (so it is NOT a sibling of the top-level [varietySlug] all-catch route);
 * distinct naming is enforced by the manifest regardless of nesting depth.
 */
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Variety guide',
};

export default function VarietyEditorialPage() {
  return null;
}
