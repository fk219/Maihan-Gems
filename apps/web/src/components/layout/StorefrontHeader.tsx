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
      <div className="site-header__container">
        {/* Zone 1: Brand Wordmark in Cormorant Garamond */}
        <a href="/" className="site-header__brand" aria-label="Maihan Gems Atelier Homepage">
          <span className="site-header__wordmark">MAIHAN GEMS</span>
          <span className="site-header__divider" aria-hidden="true" />
          <span className="site-header__submark">Atelier</span>
        </a>

        {/* Zone 2: Navigation Links + MegaMenu Island */}
        <div className="site-header__nav-zone">
          <MegaMenu groups={groups} />
        </div>

        {/* Zone 3: Direct Utilities & Primary Action */}
        <div className="site-header__actions">
          <a href="/search" className="site-header__utility-btn" aria-label="Search Gemstone Vault">
            <svg
              className="site-header__icon"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              width="16"
              height="16"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="site-header__utility-label">Search</span>
          </a>
          <a href="/cart" className="site-header__utility-btn" aria-label="Shopping Bag">
            <svg
              className="site-header__icon"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              width="16"
              height="16"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <span className="site-header__utility-label">Bag</span>
          </a>
          <a href="/design-your-own" className="site-header__cta-btn">
            Bespoke Atelier
          </a>
        </div>
      </div>
    </header>
  );
}
