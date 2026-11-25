/**
 * apps/web/src/components/layout/StorefrontFooter.tsx
 *
 * Institutional storefront footer.
 *
 * Design: the deepest obsidian in the palette, one gold hairline across the
 * top, five editorial columns, and a truth block that explains the two
 * invariants governing every product page. Gold is light here — the rule and
 * the labels — not a filled panel.
 *
 * Honesty: the previous copy claimed "100% Earth-Mined · Non-Destructive Lab
 * Verified" and that all listed stones "are authenticated". The platform does
 * not hold that for every record: evidence status is per field, and some SKUs
 * are derived. The footer now states the rule instead of a blanket claim, and
 * links only to routes that exist in the route map.
 */
import Link from 'next/link';

export function StorefrontFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer" aria-label="Maihan Gems institutional footer">
      <div className="site-footer__container">
        <div className="site-footer__grid">
          <div className="site-footer__brand-col">
            <h2 className="site-footer__brand-title">Maihan Gems</h2>
            <p className="site-footer__tagline">
              Natural gemstones and atelier mountings, documented one record at a time. Evidence
              statuses travel with the values they qualify.
            </p>
            <p className="site-footer__cities">
              Private appointment · Dubai · Geneva · London · Bangkok
            </p>
          </div>

          <div className="site-footer__col">
            <h3 className="site-footer__column-title">The collection</h3>
            <ul className="site-footer__links">
              <li>
                <Link href="/varieties" className="site-footer__link">
                  All gemstone varieties
                </Link>
              </li>
              <li>
                <Link href="/settings" className="site-footer__link">
                  Setting designs
                </Link>
              </li>
              <li>
                <Link href="/search" className="site-footer__link">
                  Search the catalogue
                </Link>
              </li>
              <li>
                <Link href="/design-your-own" className="site-footer__link">
                  Design your own
                </Link>
              </li>
            </ul>
          </div>

          <div className="site-footer__col">
            <h3 className="site-footer__column-title">Gemstones</h3>
            <ul className="site-footer__links">
              <li>
                <Link href="/emerald" className="site-footer__link">
                  Emerald
                </Link>
              </li>
              <li>
                <Link href="/sapphire" className="site-footer__link">
                  Sapphire
                </Link>
              </li>
              <li>
                <Link href="/ruby" className="site-footer__link">
                  Ruby
                </Link>
              </li>
              <li>
                <Link href="/spinel" className="site-footer__link">
                  Spinel
                </Link>
              </li>
              <li>
                <Link href="/tsavorite-garnet" className="site-footer__link">
                  Tsavorite garnet
                </Link>
              </li>
            </ul>
          </div>

          <div className="site-footer__col">
            <h3 className="site-footer__column-title">Atelier</h3>
            <ul className="site-footer__links">
              <li>
                <Link href="/settings" className="site-footer__link">
                  Mountings
                </Link>
              </li>
              <li>
                <Link href="/design-your-own" className="site-footer__link">
                  Configure a piece
                </Link>
              </li>
              <li>
                <Link href="/about" className="site-footer__link">
                  The atelier
                </Link>
              </li>
              <li>
                <Link href="/contact" className="site-footer__link">
                  Private consultation
                </Link>
              </li>
            </ul>
          </div>

          <div className="site-footer__col">
            <h3 className="site-footer__column-title">Client care</h3>
            <ul className="site-footer__links">
              <li>
                <Link href="/account" className="site-footer__link">
                  Your account
                </Link>
              </li>
              <li>
                <Link href="/contact" className="site-footer__link">
                  Concierge desk
                </Link>
              </li>
              <li>
                <Link href="/about" className="site-footer__link">
                  Laboratory standards
                </Link>
              </li>
              <li>
                <Link href="/policy/provenance" className="site-footer__link">
                  Provenance disclosure
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="site-footer__truth" role="group" aria-label="Evidence disclosure">
          <p>
            <span className="site-footer__inv">INV-07</span>
            <span>
              A specification is presented as verified only when its stored evidence status is
              VERIFIED. Every other status is shown beside the value it qualifies.
            </span>
          </p>
          <p>
            <span className="site-footer__inv">INV-08</span>
            <span>
              A derived identifier is not a confirmed external reference until its review state is
              APPROVED. Until then the storefront labels it as derived.
            </span>
          </p>
        </div>

        <div className="site-footer__bottom">
          <div className="site-footer__legal-bar">
            <span>© {currentYear} Maihan Gems Ltd. All rights reserved.</span>
            <div className="site-footer__legal-links">
              <Link href="/policy/terms" className="site-footer__legal-link">
                Terms of service
              </Link>
              <Link href="/policy/privacy" className="site-footer__legal-link">
                Privacy policy
              </Link>
              <Link href="/policy/provenance" className="site-footer__legal-link">
                Provenance policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
