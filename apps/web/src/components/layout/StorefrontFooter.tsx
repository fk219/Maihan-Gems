/**
 * apps/web/src/components/layout/StorefrontFooter.tsx
 *
 * The footer is the back cover of the catalogue, not a sitemap with a logo.
 * One dark field, one gold rule, three link columns, the observed salon
 * address, and the evidence rule that governs every product record.
 *
 * Evidence discipline:
 *   - The address and telephone are the source-observed identity already
 *     emitted in Organization JSON-LD (`ORGANIZATION_EVIDENCE`), not a set of
 *     invented international salons.
 *   - No trust badges, certification logos, shipping promises or payment
 *     marks are rendered. None of them are supported by the record.
 *   - Every link points at a route that exists in the application.
 */
import Link from 'next/link';

import { ORGANIZATION_EVIDENCE } from '../../lib/jsonld.js';

export function StorefrontFooter() {
  const currentYear = new Date().getFullYear();
  const a = ORGANIZATION_EVIDENCE;

  return (
    <footer className="sf-footer" aria-label="Maihan Gems footer">
      <div className="sf-footer__top">
        <div>
          <p className="sf-footer__brand">Maihan Gems</p>
          <p className="sf-footer__tagline">
            Natural gemstones and atelier mountings, recorded one record at a time. What a
            record carries is shown; what it does not carry is left open.
          </p>
          <address className="sf-footer__address">
            {a.streetAddress}
            <br />
            {a.addressLocality}, {a.addressRegion} {a.postalCode}
            <br />
            <a href={`tel:${a.telephone.replace(/[^+\d]/g, '')}`}>{a.telephone}</a>
          </address>
        </div>

        <nav aria-labelledby="sf-footer-collection">
          <h2 className="sf-footer__title" id="sf-footer-collection">
            The collection
          </h2>
          <ul className="sf-footer__list">
            <li>
              <Link href="/varieties">Gemstone varieties</Link>
            </li>
            <li>
              <Link href="/search">Search the catalogue</Link>
            </li>
            <li>
              <Link href="/settings">Setting designs</Link>
            </li>
            <li>
              <Link href="/design-your-own">Design your own</Link>
            </li>
          </ul>
        </nav>

        <nav aria-labelledby="sf-footer-atelier">
          <h2 className="sf-footer__title" id="sf-footer-atelier">
            The atelier
          </h2>
          <ul className="sf-footer__list">
            <li>
              <Link href="/contact">Private appointment</Link>
            </li>
            <li>
              <Link href="/showrooms">The salon</Link>
            </li>
            <li>
              <Link href="/education">Reading room</Link>
            </li>
            <li>
              <Link href="/blog">Journal</Link>
            </li>
          </ul>
        </nav>

        <nav aria-labelledby="sf-footer-care">
          <h2 className="sf-footer__title" id="sf-footer-care">
            Client care
          </h2>
          <ul className="sf-footer__list">
            <li>
              <Link href="/account">Your account</Link>
            </li>
            <li>
              <Link href="/cart">Your bag</Link>
            </li>
            <li>
              <Link href="/favorites">Saved pieces</Link>
            </li>
            <li>
              <Link href="/compare">Comparison</Link>
            </li>
          </ul>
        </nav>
      </div>

      <div className="sf-footer__note">
        <p>
          <strong>Evidence, not adjectives.</strong> Every specification on this site is shown
          with the evidence status the record carries. A field that is not verified is never
          presented as verified truth.
        </p>
        <p>
          Prices, availability and stone attributes appear only where the record contains them.
          A missing value is stated as missing, never filled with a plausible guess.
        </p>
      </div>

      <div className="sf-footer__bottom">
        <span>© {currentYear} Maihan Gems</span>
        <div className="sf-footer__legal">
          <Link href="/policy/terms">Terms</Link>
          <Link href="/policy/privacy">Privacy</Link>
          <Link href="/policy/provenance">Provenance</Link>
        </div>
      </div>
    </footer>
  );
}
