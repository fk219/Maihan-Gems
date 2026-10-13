import Link from 'next/link';

export function StorefrontFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="home-footer">
      <div className="home-footer__top">
        <div>
          <p>Maihan Gems</p>
          <h2>Natural stones, set with care.</h2>
        </div>
        <Link href="/design-your-own" className="home-footer__cta">
          Design Your Own
        </Link>
      </div>
      <div className="home-footer__grid">
        <div>
          <h3>Shop</h3>
          <Link href="/browse">Gemstones</Link>
          <Link href="/jewellery">Jewellery</Link>
          <Link href="/settings">Settings</Link>
          <Link href="/design-your-own">Design your own</Link>
        </div>
        <div>
          <h3>Client care</h3>
          <Link href="/contact">Contact</Link>
          <Link href="/showrooms">Showroom</Link>
          <Link href="/cart">Bag</Link>
          <Link href="/compare">Compare</Link>
        </div>
        <div>
          <h3>The house</h3>
          <Link href="/about">About us</Link>
          <Link href="/education">Education</Link>
          <Link href="/account">Account</Link>
          <Link href="/search">Vault search</Link>
        </div>
        <div>
          <h3>Visit</h3>
          <p>608 5th Avenue, 11th Floor<br />New York, NY 10020</p>
          <p>Mon–Fri, 10:00–18:00 ET</p>
          <a href="tel:+12128049994">+1 212 804 9994</a>
        </div>
      </div>
      <p className="home-footer__legal">
        © {year} Maihan Gems. Unverified specifications are never shown as certified facts.
      </p>
    </footer>
  );
}
