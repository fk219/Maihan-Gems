/**
 * Not-found state for the variety-rings route (Task 5).
 */
import { CatalogNotFoundView } from '../../../components/catalog/CatalogNotFoundView.js';

export default function VarietyRingsNotFound() {
  return <CatalogNotFoundView subject="gemstone variety" browseHref="/varieties" browseLabel="Browse varieties" />;
}
