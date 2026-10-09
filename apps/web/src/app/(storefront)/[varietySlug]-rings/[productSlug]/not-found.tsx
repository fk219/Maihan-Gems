/**
 * Not-found state for the product detail route (Task 5).
 */
import { CatalogNotFoundView } from '../../../../components/catalog/CatalogNotFoundView.js';

export default function ProductNotFound() {
  return <CatalogNotFoundView subject="gemstone" browseHref="/search" browseLabel="Search gemstones" />;
}
