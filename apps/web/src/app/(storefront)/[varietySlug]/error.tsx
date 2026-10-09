'use client';

/**
 * apps/web/src/app/(storefront)/[varietySlug]/error.tsx
 *
 * Route-level error boundary (Task 5): shared CatalogErrorView with the
 * varieties hub as the contextual recovery path.
 */
import { CatalogErrorView } from '../../../components/catalog/CatalogErrorView.js';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <CatalogErrorView error={error} reset={reset} backHref="/varieties" backLabel="Browse varieties" />;
}
