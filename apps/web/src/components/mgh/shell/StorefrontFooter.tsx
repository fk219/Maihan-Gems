/**
 * apps/web/src/components/mgh/shell/StorefrontFooter.tsx
 *
 * The back cover of the house, compact: the wordmark and one line about how
 * the house publishes a record, four link groups, the evidence note and the
 * base row.
 *
 * On a phone the four groups are native disclosures, so the footer opens at
 * about half the height of four stacked columns and needs no script. From the
 * tablet breakpoint up the same groups render as four columns and the
 * disclosure summaries become their headings. The mobile and desktop groups
 * are separate nodes because a <details> panel cannot be forced open across
 * browsers; only one set is displayed at a time, so only one is in the
 * accessibility tree.
 *
 * The address and telephone are the observed organization identity already
 * emitted in the Organization JSON-LD. Every link resolves to a route in the
 * application. There is no newsletter form and no gold fill.
 */
import Link from 'next/link';
import { DemoLoginButton } from '../../auth/DemoLoginButton.js';
import { isDemoLoginEnabled } from '../../../lib/demo-login.js';
import { ORGANIZATION_EVIDENCE } from '../../../lib/jsonld.js';

interface FooterGroup {
  id: string;
  title: string;
  links: readonly { label: string; href: string }[];
}

const GROUPS: readonly FooterGroup[] = [
  {
    id: 'collection',
    title: 'The collection',
    links: [
      { label: 'Gemstones', href: '/varieties' },
      { label: 'Fine jewellery', href: '/jewellery' },
      { label: 'Settings', href: '/settings' },
      { label: 'Design your own', href: '/design-your-own' },
      { label: 'Matched pairs', href: '/pairs' },
      { label: 'Search the catalogue', href: '/search' },
    ],
  },
  {
    id: 'house',
    title: 'The house',
    links: [
      { label: 'About Maihan Gems', href: '/about' },
      { label: 'The atelier', href: '/about/atelier' },
      { label: 'Provenance', href: '/about/provenance' },
      { label: 'The Journal', href: '/blog' },
      { label: 'Reading room', href: '/education' },
      { label: 'Salons', href: '/showrooms' },
    ],
  },
  {
    id: 'care',
    title: 'Client care',
    links: [
      { label: 'Your account', href: '/account' },
      { label: 'Your bag', href: '/cart' },
      { label: 'Saved pieces', href: '/favorites' },
      { label: 'Comparison', href: '/compare' },
      { label: 'Contact the house', href: '/contact' },
    ],
  },
  {
    id: 'service',
    title: 'Service',
    links: [
      { label: 'Private viewings', href: '/showrooms' },
      { label: 'AI gemologist', href: '/concierge' },
      { label: 'Delivery & returns', href: '/policy/shipping-and-returns' },
      { label: 'Treatment disclosure', href: '/policy/treatment-disclosure' },
      { label: 'Understand your record', href: '/education' },
    ],
  },
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
    <footer
      className="mh12-footer"
      data-section="footer"
      data-surface="paper"
      aria-label="Maihan Gems footer"
    >
      <div className="mh12-footer__inner">
        <div className="mh12-footer__brand">
          <Link href="/" className="mh12-footer__wordmark">
            Maihan Gems
          </Link>
          <p className="mh12-footer__tagline">
            Natural gemstones and atelier mountings. What a record carries is shown; what it does
            not carry is left open.
          </p>
          <address className="mh12-footer__address">
            {identity.streetAddress}
            <br />
            {identity.addressLocality}, {identity.addressRegion} {identity.postalCode}
            <br />
            <a href={`tel:${identity.telephone.replace(/[^+\d]/g, '')}`}>{identity.telephone}</a>
          </address>
        </div>

        <div className="mh12-footer__accordions">
          {GROUPS.map((group) => (
            <details className="mh12-fcol" key={group.id}>
              <summary className="mh12-fcol__summary">
                <span className="mh12-label">{group.title}</span>
                <span aria-hidden="true" className="mh12-fcol__mark" />
              </summary>
              <nav aria-label={group.title}>
                <ul className="mh12-footer__list">
                  {group.links.map((link) => (
                    <li key={`${group.id}-${link.href}`}>
                      <Link href={link.href}>{link.label}</Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </details>
          ))}
        </div>

        <div className="mh12-footer__columns">
          {GROUPS.map((group) => (
            <nav aria-label={group.title} key={`${group.id}-wide`} className="mh12-fcol-wide">
              <h2 className="mh12-label mh12-fcol-wide__title">{group.title}</h2>
              <ul className="mh12-footer__list">
                {group.links.map((link) => (
                  <li key={`${group.id}-wide-${link.href}`}>
                    <Link href={link.href}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <p className="mh12-footer__note">
          <strong>Evidence, not adjectives.</strong> Every specification is shown with the
          evidence status its record carries (INV-07).
        </p>

        <div className="mh12-footer__base">
          <p>&copy; {currentYear} Maihan Gems</p>
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
