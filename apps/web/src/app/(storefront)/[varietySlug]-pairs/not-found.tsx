/**
 * Not-found state for the variety-pairs route (Task 5).
 */
import { CatalogNotFoundView } from '../../../components/catalog/CatalogNotFoundView.js';

export default function VarietyPairsNotFound() {
  return <CatalogNotFoundView subject="gemstone variety" browseHref="/varieties" browseLabel="Browse varieties" />;
}
