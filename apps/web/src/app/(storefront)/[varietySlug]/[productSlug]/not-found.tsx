/**
 * Not-found state for the resource route: shared recovery navigation.
 */
import { CatalogNotFoundView } from '../../../../components/catalog/CatalogNotFoundView.js';

export default function ResourceNotFound() {
  return <CatalogNotFoundView subject="piece" browseHref="/browse" browseLabel="Browse the vault" />;
}
