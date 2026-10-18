/**
 * Not-found state for the collection route: shared recovery navigation.
 */
import { CatalogNotFoundView } from '../../../components/catalog/CatalogNotFoundView.js';

export default function CollectionNotFound() {
  return <CatalogNotFoundView subject="collection" browseHref="/browse" browseLabel="Browse the vault" />;
}
