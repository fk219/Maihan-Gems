/**
 * Not-found state for the settings hub variants: shared recovery navigation.
 */
import { CatalogNotFoundView } from '../../../components/catalog/CatalogNotFoundView.js';

export default function SettingsNotFound() {
  return <CatalogNotFoundView subject="setting" browseHref="/settings" browseLabel="All settings" />;
}
