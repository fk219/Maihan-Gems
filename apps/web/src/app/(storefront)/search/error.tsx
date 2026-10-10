'use client';

/**
 * apps/web/src/app/(storefront)/search/error.tsx
 *
 * Route-level error boundary: shared CatalogErrorView with clear recovery
 * action back to the search root or varieties hub.
 */
import { CatalogErrorView } from '../../../components/catalog/CatalogErrorView.js';

export default function Error({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}) {
  return (
    <CatalogErrorView
      error={error}
      reset={reset}
      backHref="/search"
      backLabel="Reset search"
    />
  );
}
