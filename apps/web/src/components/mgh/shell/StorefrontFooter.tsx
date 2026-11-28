/**
 * apps/web/src/components/mgh/shell/StorefrontFooter.tsx
 *
 * The back cover of the house, rebuilt to the measured spec: paper (the
 * default surface), a four-item service row, four link columns, the brand
 * block with the evidence statement, and the base row. 520–680 px at 1440.
 *
 * Evidence discipline:
 *   - The address and telephone are the observed organization identity already
 *     emitted in the Organization JSON-LD, not invented salons.
 *   - The service row makes no promise the business has not decided: delivery
 *     and returns say the terms publish when settled, the certificate states
 *     what the records actually do, and the viewing says how it is arranged.
 *   - Every link resolves to a route in the application. No "#" targets.
 *   - No gold fill: the footer carries no gold at all.
 */
import Link from 'next/link';
import { DemoLoginButton } from '../../auth/DemoLoginButton.js';
import { isDemoLoginEnabled } from '../../../lib/demo-login.js';
import { ORGANIZATION_EVIDENCE } from '../../../lib/jsonld.js';
import { FooterJournalForm } from './FooterJournalForm';

const SERVICE = [
  {
    label: 'Delivery',
    line: 'Published when settled.',
    href: '/policy/shipping-and-returns',
  },
  {
    label: 'Returns',
    line: 'No window until one is decided.',
    href: '/policy/shipping-and-returns',
  },
  {
    label: 'Certificate',
    line: 'Only where the record holds one.',
    href: '/policy/treatment-disclosure',
  },
  {
    label: 'Private viewing',
    line: 'Arranged personally.',
    href: '/showrooms',
  },
];

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

const SERVICE_CONTACT = [
  { label: 'Contact the house', href: '/contact' },
  { label: 'Private viewings', href: '/showrooms' },
  { label: 'AI gemologist', href: '/concierge' },
  { label: 'Delivery & returns', href: '/policy/shipping-and-returns' },
  { label: 'Treatment disclosure', href: '/policy/treatment-disclosure' },
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
  const demoEnabled = isDemoLoginEnabled();

  return (
    <footer className="mh12-footer" data-section="footer" data-surface="paper" aria-label="Maihan Gems footer">
      <div className="mh12-footer__inner">
        <ul className="mh12-footer__service" role="list">
          {SERVICE.map((item) => (
            <li key={item.label}>
              <Link href={item.href}>
                <span className="mh12-label mh12-footer__service-label">{item.label}</span>
                <span className="mh12-price mh12-footer__service-line">{item.line}</span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mh12-footer__top">
          <div className="mh12-footer__brand">
            <Link href="/" className="mh12-footer__wordmark">
              Maihan Gems
            </Link>
            <p className="mh12-footer__tagline">
              Natural gemstones and atelier mountings. What a record carries is shown; what it
              does not carry is left open.
            </p>
            <div className="mh12-footer__journal">
              <FooterJournalForm />
            </div>
            <address className="mh12-footer__address">
              {identity.streetAddress}
              <br />
              {identity.addressLocality}, {identity.addressRegion} {identity.postalCode}
              <br />
              <a href={`tel:${identity.telephone.replace(/[^+\d]/g, '')}`}>{identity.telephone}</a>
            </address>
          </div>

          <nav aria-labelledby="mh12-footer-collection" className="mh12-footer__col">
            <h3 className="mh12-footer__col-title" id="mh12-footer-collection">
              The collection
            </h3>
            <ul className="mh12-footer__list">
              {COLLECTION.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-labelledby="mh12-footer-house" className="mh12-footer__col">
            <h3 className="mh12-footer__col-title" id="mh12-footer-house">
              The house
            </h3>
            <ul className="mh12-footer__list">
              {HOUSE.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-labelledby="mh12-footer-care" className="mh12-footer__col">
            <h3 className="mh12-footer__col-title" id="mh12-footer-care">
              Client care
            </h3>
            <ul className="mh12-footer__list">
              {CARE.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-labelledby="mh12-footer-service" className="mh12-footer__col">
            <h3 className="mh12-footer__col-title" id="mh12-footer-service">
              Service &amp; contact
            </h3>
            <ul className="mh12-footer__list">
              {SERVICE_CONTACT.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <p className="mh12-footer__note">
          <strong>Evidence, not adjectives.</strong> Every specification is shown with the
          evidence status its record carries: a field that is not verified is never presented
          as verified truth (INV-07), and an inferred identifier is never treated as a
          confirmed reference without approval (INV-08). Prices and availability appear only
          where the record contains them.
        </p>

        <div className="mh12-footer__base">
          <p>© {currentYear} Maihan Gems</p>
          <div className="mh12-footer__base-end">
            {demoEnabled ? (
              <DemoLoginButton surface="customer" redirectTo="/account" quiet />
            ) : null}
            <ul className="mh12-footer__legal">
              {LEGAL.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
