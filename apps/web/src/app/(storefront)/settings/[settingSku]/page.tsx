/**
 * apps/web/src/app/(storefront)/settings/[settingSku]/page.tsx
 *
 * `/gemstone-ring-settings/<slug>` -> `/settings/{sku}` — setting variant or
 * design core detail. SoT 12.2 `settings/[sku]/page.tsx`.
 *
 * Segment name `settingSku` (not `slug`) — the identifier here is a setting
 * variant SKU, a DIFFERENT keyed entity from the product slug used by
 * /products/[productSlug]; folding both into a generic `slug` branch weakened
 * the distinction the SoT's own route map draws (products vs settings).
 */
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Setting',
};

export default function SettingDetailPage() {
  return null;
}
