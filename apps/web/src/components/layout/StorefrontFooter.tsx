import { STOREFRONT_CONTACT, publishedEmail, publishedPhone } from '@maihan/config';
import Link from 'next/link';

import { currentStorefront } from '../../lib/ngc/current-storefront.js';
import { withPrefix } from '../../lib/ngc/storefronts.js';

export async function StorefrontFooter() {
  const year = new Date().getFullYear();
  const brand = await currentStorefront();
  const href = (path: string) => withPrefix(path, brand.pathPrefix);
  const phone = publishedPhone();
  const email = publishedEmail();
  return (
    <footer className="home-footer">
      <form className="atelier-note" action={href('/contact')}>
        <p className="atelier-label">Correspondence</p>
        <h2>A private note</h2>
        <p>The house does not keep a public mailing list. Write when you want a stone brought out.</p>
        <button className="ink-cta" type="submit">Write to the house</button>
      </form>
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
          <Link href={href('/about')}>About</Link>
          <Link href={href('/education')}>Education</Link>
          <Link href={href('/account')}>Account</Link>
          <Link href={href('/search')}>Search</Link>
        </div>
        <div>
          <h3>Visit</h3>
          <p>{STOREFRONT_CONTACT.appointmentLabel}</p>
          <p>{STOREFRONT_CONTACT.hours}</p>
          <p>{STOREFRONT_CONTACT.city}</p>
          {phone ? <a href={phone.href}>{phone.display}</a> : null}
          {email ? <a href={`mailto:${email}`}>{email}</a> : null}
        </div>
      </div>
      <p className="home-footer__legal">
        © {year} {brand.name}. Unverified specifications are never shown as certified facts.
      </p>
    </footer>
  );
}
