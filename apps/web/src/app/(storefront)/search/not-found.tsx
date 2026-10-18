/**
 * Not-found state for the search route: shared recovery navigation.
 */
import { CatalogNotFoundView } from '../../../components/catalog/CatalogNotFoundView.js';

export default function SearchNotFound() {
  return <CatalogNotFoundView subject="search" browseHref="/browse" browseLabel="Browse the vault" />;
}
