import { STOREFRONT_CONTACT } from '@maihan/config';
import Link from 'next/link';

import { currentStorefront } from '../../lib/ngc/current-storefront.js';
import { withPrefix } from '../../lib/ngc/storefronts.js';

export async function StorefrontFooter() {
  const year = new Date().getFullYear();
  const brand = await currentStorefront();
  const href = (path: string) => withPrefix(path, brand.pathPrefix);
  return (
    <footer className="home-footer">
      <div className="home-footer__top">
        <div>
          <p>{brand.name}</p>
          <h2>Natural stones, set with care.</h2>
        </div>
        <Link href={href('/design-your-own')} className="home-footer__cta">
          Design Your Own
        </Link>
      </div>
      <div className="home-footer__grid">
        <div>
          <h3>Shop</h3>
          <Link href={href('/browse')}>Gemstones</Link>
          <Link href={href('/jewellery')}>Jewellery</Link>
          <Link href={href('/settings')}>Settings</Link>
          <Link href={href('/design-your-own')}>Design your own</Link>
        </div>
        <div>
          <h3>Client care</h3>
          <Link href={href('/contact')}>Contact</Link>
          <Link href={href('/showrooms')}>Showroom</Link>
          <Link href={href('/cart')}>Bag</Link>
          <Link href={href('/compare')}>Compare</Link>
        </div>
        <div>
          <h3>The house</h3>
          <Link href={href('/about')}>About us</Link>
          <Link href={href('/education')}>Education</Link>
          <Link href={href('/account')}>Account</Link>
          <Link href={href('/search')}>Vault search</Link>
        </div>
        <div>
          <h3>Visit</h3>
          <p>{STOREFRONT_CONTACT.addressLine}</p>
          <p>{STOREFRONT_CONTACT.hours}</p>
          <a href={STOREFRONT_CONTACT.phoneHref}>{STOREFRONT_CONTACT.phoneDisplay}</a>
          <a href={`mailto:${STOREFRONT_CONTACT.email}`}>{STOREFRONT_CONTACT.email}</a>
        </div>
      </div>
      <p className="home-footer__legal">
        © {year} {brand.name}. Unverified specifications are never shown as certified facts.
      </p>
    </footer>
  );
}
