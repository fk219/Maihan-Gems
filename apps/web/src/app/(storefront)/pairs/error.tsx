'use client';

/**
 * Route-level error boundary: shared CatalogErrorView with the vault as the
 * contextual recovery path.
 */
import { CatalogErrorView } from '../../../components/catalog/CatalogErrorView.js';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <CatalogErrorView error={error} reset={reset} backHref="/browse" backLabel="Browse the vault" />;
}
