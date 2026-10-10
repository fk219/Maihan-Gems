/**
 * apps/web/src/components/layout/StorefrontFooter.tsx
 *
 * Institutional Storefront Footer for Maihan Gems (Design.md Section 2.1 #12).
 *
 * Server-compatible Server Component. Renders deep obsidian navy surface (#08121E)
 * with top gold hairline accent, brand mark, private client advisory disclosures,
 * navigation hubs across gemstones, settings, gemmology, and client care.
 *
 * Strict invariants honoured:
 *   - INV-07 / INV-08: Explicit disclosure that unverified specifications are never
 *     presented as certified facts.
 *   - Real canonical route links only (no broken or fabricated destinations).
 */
import Link from 'next/link';

export function StorefrontFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer" role="contentinfo" aria-label="Maihan Gems institutional footer">
      <div className="site-footer__container">
        <div className="site-footer__grid">
          {/* Brand Identity & Private Client Presence */}
          <div className="site-footer__brand-col">
            <h2 className="site-footer__brand-title">Maihan Gems</h2>
            <p className="site-footer__tagline">
              Sovereign Natural Gemstone Trading &amp; Bespoke Haute Joaillerie.
              Direct-source untreated mineral treasures verified under rigorous gemmological standards.
            </p>
            <div className="site-footer__cities">
              Private Appointment · Dubai · Geneva · London · Bangkok
            </div>
            <div className="site-footer__badge">
              <span>✦</span>
              <span>100% Earth-Mined · Non-Destructive Lab Verified</span>
            </div>
          </div>

          {/* Column 1: Natural Gemstones */}
          <div className="site-footer__col">
            <h3 className="site-footer__column-title">Natural Gemstones</h3>
            <ul className="site-footer__links">
              <li>
                <Link href="/emerald" className="site-footer__link">
                  Zambian &amp; Panjshir Emeralds
                </Link>
              </li>
              <li>
                <Link href="/sapphire" className="site-footer__link">
                  Ceylon &amp; Kashmir Sapphires
                </Link>
              </li>
              <li>
                <Link href="/ruby" className="site-footer__link">
                  Burmese &amp; Mozambique Rubies
                </Link>
              </li>
              <li>
                <Link href="/spinel" className="site-footer__link">
                  Cobalt &amp; Red Spinels
                </Link>
              </li>
              <li>
                <Link href="/tsavorite-garnet" className="site-footer__link">
                  Tsavorite Garnets
                </Link>
              </li>
              <li>
                <Link href="/varieties" className="site-footer__link">
                  View All 70+ Varieties →
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Fine Mountings & Settings */}
          <div className="site-footer__col">
            <h3 className="site-footer__column-title">Fine Mountings</h3>
            <ul className="site-footer__links">
              <li>
                <Link href="/settings" className="site-footer__link">
                  All Ring &amp; Setting Designs
                </Link>
              </li>
              <li>
                <Link href="/settings" className="site-footer__link">
                  Classic Solitaire Mountings
                </Link>
              </li>
              <li>
                <Link href="/settings" className="site-footer__link">
                  Halo &amp; Three-Stone Mountings
                </Link>
              </li>
              <li>
                <Link href="/varieties" className="site-footer__link">
                  Matched Earring Pairs
                </Link>
              </li>
              <li>
                <Link href="/design-your-own" className="site-footer__link">
                  Design Your Own Piece
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Gemmological Assurance */}
          <div className="site-footer__col">
            <h3 className="site-footer__column-title">Gemmology &amp; Standards</h3>
            <ul className="site-footer__links">
              <li>
                <Link href="/about" className="site-footer__link">
                  Independent Laboratory Standards
                </Link>
              </li>
              <li>
                <Link href="/about" className="site-footer__link">
                  GIA, Gübelin &amp; SSEF Verification
                </Link>
              </li>
              <li>
                <Link href="/about" className="site-footer__link">
                  Raman &amp; FTIR Spectroscopy
                </Link>
              </li>
              <li>
                <Link href="/about" className="site-footer__link">
                  Zero-Tolerance Synthetic Policy
                </Link>
              </li>
              <li>
                <Link href="/about" className="site-footer__link">
                  Ethical Provenance Custody
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Private Client Advisory */}
          <div className="site-footer__col">
            <h3 className="site-footer__column-title">Private Client Care</h3>
            <ul className="site-footer__links">
              <li>
                <Link href="/contact" className="site-footer__link">
                  Bespoke Consultation
                </Link>
              </li>
              <li>
                <Link href="/about" className="site-footer__link">
                  Insured Armored Global Transit
                </Link>
              </li>
              <li>
                <Link href="/about" className="site-footer__link">
                  Segregated Vault Custody
                </Link>
              </li>
              <li>
                <Link href="/orders" className="site-footer__link">
                  Order Tracking &amp; History
                </Link>
              </li>
              <li>
                <Link href="/contact" className="site-footer__link">
                  Concierge Desk
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Legal & Invariant Compliance Bar */}
        <div className="site-footer__bottom">
          <p className="site-footer__disclosure">
            Maihan Gems upholds deterministic gemmological custody. All loose gemstones and jewellery
            settings listed are authenticated with transparent treatment disclosures. In accordance with
            institutional protocol, unverified specifications are never presented as certified facts.
          </p>
          <div className="site-footer__legal-bar">
            <span>© {currentYear} Maihan Gems Ltd. All rights reserved.</span>
            <div className="site-footer__legal-links">
              <Link href="/terms" className="site-footer__legal-link">
                Terms of Service
              </Link>
              <Link href="/privacy" className="site-footer__legal-link">
                Privacy Policy
              </Link>
              <Link href="/provenance" className="site-footer__legal-link">
                Provenance Disclosure
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
