/**
 * apps/web/src/app/(storefront)/varieties/[varietySlug]/page.tsx
 *
 * `/varieties/<slug>` — legacy/nested variety URL.
 *
 * The catalogue's canonical variety landing is the top-level `/<slug>` route
 * (the ONE dynamic route every variety renders through). This nested route
 * previously returned `null`, which is a blank page under a live HTTP 200 —
 * worse than a redirect. It now sends the visitor to the canonical landing,
 * preserving the variety identity. No editorial content is invented.
 */
import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ varietySlug: string }>;
}

export default async function VarietyEditorialPage({ params }: PageProps) {
  const { varietySlug } = await params;
  redirect(`/${varietySlug}`);
}
