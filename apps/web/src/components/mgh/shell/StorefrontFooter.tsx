/**
 * apps/web/src/components/mgh/shell/StorefrontFooter.tsx
 *
 * The back cover of the house: one obsidian field, one gold hairline, four
 * editorial columns, the observed salon identity, and the line the page has
 * been building towards. It is not a sitemap with a logo.
 *
 * Evidence discipline:
 *   - The address and telephone are the observed organization identity already
 *     emitted in the Organization JSON-LD, not invented salons.
 *   - The salons line links to the showroom index; it does not promise a city
 *     the application cannot show.
 *   - INV-07 / INV-08 are stated in plain language in the note.
 *   - Every link resolves to a route in the application. No "#" targets.
 */
import Link from 'next/link';
import { ORGANIZATION_EVIDENCE } from '../../../lib/jsonld.js';
import { FooterJournalForm } from './FooterJournalForm';

const COLLECTION = [
  { label: 'Gemstones', href: '/varieties' },
  { label: 'Fine jewellery', href: '/jewellery' },
  { label: 'Settings', href: '/settings' },
  { label: 'Design your own', href: '/design-your-own' },
  { label: 'Matched pairs', href: '/pairs' },
  { label: 'Search the catalogue', href: '/search' },
];

const HOUSE = [
  { label: 'About Maihan Gems', href: '/about' },
  { label: 'The atelier', href: '/about/atelier' },
  { label: 'Provenance', href: '/about/provenance' },
  { label: 'The Journal', href: '/blog' },
  { label: 'Reading room', href: '/education' },
  { label: 'Salons', href: '/showrooms' },
];

const CARE = [
  { label: 'Your account', href: '/account' },
  { label: 'Your bag', href: '/cart' },
  { label: 'Saved pieces', href: '/favorites' },
  { label: 'Comparison', href: '/compare' },
  { label: 'Unsubscribe', href: '/unsubscribe' },
];

const LEGAL = [
  { label: 'Policies', href: '/policy' },
  { label: 'Privacy', href: '/policy/privacy' },
  { label: 'Terms', href: '/policy/terms' },
  { label: 'Treatment disclosure', href: '/policy/treatment-disclosure' },
];

export function StorefrontFooter() {
  const currentYear = new Date().getFullYear();
  const identity = ORGANIZATION_EVIDENCE;

  return (
    <footer className="mh6-footer" aria-label="Maihan Gems footer">
      <div className="mh6-footer__inner">
        <div className="mh6-footer__top">
          <div className="mh6-footer__brand">
            <Link href="/" className="mh6-footer__wordmark">
              Maihan Gems
            </Link>
            <p className="mh6-footer__tagline">
              Natural gemstones and atelier mountings. What a record carries is shown; what it
              does not carry is left open.
            </p>
            <address className="mh6-footer__address">
              {identity.streetAddress}
              <br />
              {identity.addressLocality}, {identity.addressRegion} {identity.postalCode}
              <br />
              <a href={`tel:${identity.telephone.replace(/[^+\d]/g, '')}`}>
                {identity.telephone}
              </a>
            </address>
            <Link href="/showrooms" className="mh6-footer__salons">
              New York · Geneva · London
            </Link>
          </div>

          <nav aria-labelledby="mh6-footer-collection" className="mh6-footer__col">
            <h3 className="mh6-footer__col-title" id="mh6-footer-collection">
              The collection
            </h3>
            <ul className="mh6-footer__list">
              {COLLECTION.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-labelledby="mh6-footer-house" className="mh6-footer__col">
            <h3 className="mh6-footer__col-title" id="mh6-footer-house">
              The house
            </h3>
            <ul className="mh6-footer__list">
              {HOUSE.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-labelledby="mh6-footer-care" className="mh6-footer__col">
            <h3 className="mh6-footer__col-title" id="mh6-footer-care">
              Client care
            </h3>
            <ul className="mh6-footer__list">
              {CARE.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mh6-footer__statement">
          <p className="mh6-footer__line">
            The stone comes first.
            <br />
            The record follows.
          </p>
          <FooterJournalForm />
        </div>

        <p className="mh6-footer__note">
          <strong>Evidence, not adjectives.</strong> Every specification is shown with the
          evidence status its record carries: a field that is not verified is never presented
          as verified truth (INV-07), and an inferred identifier is never treated as a
          confirmed reference without approval (INV-08). Prices and availability appear only
          where the record contains them.
        </p>

        <div className="mh6-footer__base">
          <p>© {currentYear} Maihan Gems</p>
          <ul className="mh6-footer__legal">
            {LEGAL.map((link) => (
              <li key={link.href}>
                <Link href={link.href}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
