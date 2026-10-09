/**
 * Not-found state for the colour route (Task 5).
 */
import { CatalogNotFoundView } from '../../../../components/catalog/CatalogNotFoundView.js';

export default function ColourNotFound() {
  return <CatalogNotFoundView subject="colour collection" browseHref="/" browseLabel="Browse gemstones" />;
}
