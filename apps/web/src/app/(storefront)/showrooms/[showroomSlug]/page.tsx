/**
 * apps/web/src/app/(storefront)/showrooms/[showroomSlug]/page.tsx
 *
 * `/showrooms/<slug>` — showroom preview target (observed /showroom/preview
 * 301s into this space). SoT 12.2 `showrooms/[slug]/page.tsx`.
 */
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Showroom',
};

export default function ShowroomDetailPage() {
  return null;
}
