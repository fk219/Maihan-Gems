/**
 * apps/web/src/app/(storefront)/[varietySlug]/not-found.tsx
 *
 * Not-found state for the variety route (Task 5, replacing the Task 1
 * structural stub). The SoT 12.2 line `[variety]/not-found.tsx` now carries
 * the real recovery navigation.
 */
import { CatalogNotFoundView } from '../../../components/catalog/CatalogNotFoundView.js';

export default function VarietyNotFound() {
  return <CatalogNotFoundView subject="gemstone variety" browseHref="/varieties" browseLabel="Browse varieties" />;
}
