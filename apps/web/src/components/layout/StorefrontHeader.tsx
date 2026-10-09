/**
 * apps/web/src/components/layout/StorefrontHeader.tsx
 *
 * The storefront header: a Server Component that loads the taxonomy through
 * the Phase 3 service, builds the menu view model, and hands it to the ONE
 * client island (MegaMenu). No client component above this level (SoT 12.3).
 *
 * Empty/unavailable taxonomy degrades gracefully: buildMegaMenu drops empty
 * groups, so the navigation never renders broken panels; if the taxonomy
 * read itself fails the error propagates to the route error boundary — the
 * honest state, never a fabricated menu.
 */
import { catalogServer } from '../../lib/catalog-server.js';
import { assertCanonicalHrefs, buildMegaMenu } from '../../lib/mega-menu.js';
import { MegaMenu } from './MegaMenu.js';

export async function StorefrontHeader() {
  const taxonomy = (await catalogServer().getTaxonomy()).value;
  const groups = buildMegaMenu(taxonomy);
  // Guard the canonical-route contract at render time too (defence in depth;
  // the pure builder is unit-tested for this).
  assertCanonicalHrefs(groups);
  return (
    <header className="site-header">
      <a href="/" className="site-header__brand">
        Maihan Gems
      </a>
      <MegaMenu groups={groups} />
    </header>
  );
}
