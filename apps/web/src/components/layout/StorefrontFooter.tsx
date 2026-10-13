import Link from 'next/link';

export function StorefrontFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="ngc-footer">
      <div className="ngc-wrap ngc-footer__grid">
        <div>
          <h2>Maihan Gems</h2>
          <p>Natural gemstones, settings, and finished jewelry. Appointment showroom and worldwide shipping.</p>
        </div>
        <div>
          <h3>Shop</h3>
          <Link href="/browse">Gemstones</Link>
          <Link href="/jewellery">Jewelry</Link>
          <Link href="/pairs">Gemstone pairs</Link>
          <Link href="/settings">Settings</Link>
          <Link href="/design-your-own">Design your own</Link>
        </div>
        <div>
          <h3>Help</h3>
          <Link href="/contact">Contact</Link>
          <Link href="/showrooms">Showroom</Link>
          <Link href="/education">Education</Link>
          <Link href="/policy/shipping">Shipping</Link>
          <Link href="/cart">Cart</Link>
        </div>
        <div>
          <h3>Visit</h3>
          <p>608 5th Avenue, 11th Floor, New York, NY 10020</p>
          <a href="tel:+12128049994">+1-212-804-9994</a>
        </div>
      </div>
      <p className="ngc-footer__legal">© {year} Maihan Gems. Unverified specifications are never shown as certified facts.</p>
    </footer>
  );
}
