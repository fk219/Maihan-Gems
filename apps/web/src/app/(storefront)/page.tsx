import type { Metadata } from 'next';
import Link from 'next/link';

import { HeroSearch } from '../../components/storefront/HeroSearch.js';
import { NGC_MEDIA, NGC_STONE_TILES } from '../../lib/ngc-home.js';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Maihan Gems — Gemstone Rings & Jewelry',
  description: 'Create your dream design. Shop natural gemstones, jewelry, and settings.',
};

const media = (path: string) => `${NGC_MEDIA}${path}`;

const PACKAGING = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({
  src: media(`/images/hi-res-webp/packaging/package${n}@2x.webp`),
  alt: `Presentation packaging ${n}`,
}));

export default function HomePage() {
  return (
    <main id="main-content" className="ngc-home">
      <section className="ngc-hero" aria-label="Create your dream design">
        <img
          className="ngc-hero__photo"
          src={media('/images/hi-res-webp/landingPage/home/hero/woman@2x.webp')}
          alt="Gemstone jewelry"
        />
        <div className="ngc-hero__card">
          <h1>Create Your Dream Design</h1>
          <p>
            Experience the joy of creating bespoke gemstone jewelry with our design-your-own service,
            where your dreams become reality through personalized craftsmanship.
          </p>
          <HeroSearch />
          <div className="ngc-hero__actions">
            <Link className="ngc-btn" href="/design-your-own">Design your own</Link>
            <Link className="ngc-btn ngc-btn--ghost" href="/browse">Shop gemstones</Link>
          </div>
        </div>
      </section>

      <section className="ngc-block" aria-labelledby="shop-gems">
        <div className="ngc-wrap">
          <h2 id="shop-gems">Shop Gemstones</h2>
          <p className="ngc-lede">
            Explore our diverse selection of semi precious gemstones to match your unique style and preferences.
          </p>
          <div className="ngc-stones">
            {NGC_STONE_TILES.map((stone) => (
              <Link key={stone.href} href={stone.href} className="ngc-stone">
                <img src={media(stone.img)} alt={stone.name} />
                <span>{stone.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="ngc-block ngc-block--tint" aria-labelledby="jewelry">
        <div className="ngc-wrap">
          <h2 id="jewelry">Gemstone Jewelry</h2>
          <p className="ngc-lede">Beauty is in the details. Packaging, reports, and documentation travel with every piece.</p>
          <div className="ngc-pack">
            {PACKAGING.map((item) => (
              <figure key={item.src} className="ngc-pack__card">
                <img src={item.src} alt={item.alt} />
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="ngc-block" aria-labelledby="dyo">
        <div className="ngc-wrap">
          <h2 id="dyo">Design Your Own Gemstone Jewelry</h2>
          <Link className="ngc-more" href="/design-your-own">How does it work?</Link>
          <div className="ngc-dyo">
            <Link href="/settings?for=ring" className="ngc-dyo__card">
              <img src={media('/images/hi-res-webp/details/ring@2x.webp')} alt="" />
              <span>Rings</span>
            </Link>
            <Link href="/settings?for=earrings" className="ngc-dyo__card">
              <img src={media('/images/hi-res-webp/mainMenu/settings/dyo-jewelry@2x.webp')} alt="" />
              <span>Earrings</span>
            </Link>
            <Link href="/settings?for=bracelet" className="ngc-dyo__card">
              <img src={media('/images/hi-res-webp/mainMenu/settingsType/bracelets@2x.webp')} alt="" />
              <span>Bracelets</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="ngc-trust" aria-label="Shop with peace of mind">
        <div className="ngc-wrap ngc-trust__grid">
          <article>
            <h3>Free Shipping Worldwide*</h3>
            <p>For deliveries in the U.S., and for orders over $300 anywhere in the world.</p>
          </article>
          <article>
            <h3>14 Day Returns*</h3>
            <p>For loose gemstones, ready-to-ship jewelry, and most custom jewelry and bands.</p>
          </article>
          <article>
            <h3>Extend Protection Plan</h3>
            <p>If your jewelry breaks, we repair it. If we cannot repair it, we replace it.</p>
          </article>
        </div>
      </section>

      <section className="ngc-block" aria-labelledby="mining">
        <div className="ngc-wrap">
          <h2 id="mining">Learn About Gemstone Mining</h2>
          <p className="ngc-lede">
            From river mining to the marketplace — the path a stone takes before it reaches the bench.
          </p>
          <div className="ngc-videos">
            {[
              ['River Mining', '/images/hi-res-webp/homePage/mining/video-1@2x.webp'],
              ['Shaft Mining', '/images/hi-res-webp/homePage/mining/video-2@2x.webp'],
              ['Marketplace', '/images/hi-res-webp/homePage/mining/video-3@2x.webp'],
            ].map(([label, src]) => (
              <Link key={label} href="/education" className="ngc-video">
                <img src={media(src)} alt={label} />
                <span className="ngc-play" aria-hidden>▶</span>
                <span>{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="ngc-block ngc-block--tint" aria-labelledby="showroom">
        <div className="ngc-wrap">
          <h2 id="showroom">Visit Our New York City Showroom</h2>
          <p className="ngc-lede">608 5th Avenue, 11th Floor Penthouse, New York, NY 10020. Appointment required.</p>
          <div className="ngc-showroom">
            <img src={media('/images/hi-res-webp/homePage/showroom/left@2x.webp')} alt="Showroom left" />
            <img src={media('/images/hi-res-webp/homePage/showroom/center@2x.webp')} alt="Showroom center" />
            <img src={media('/images/hi-res-webp/homePage/showroom/right@2x.webp')} alt="Showroom right" />
          </div>
          <Link className="ngc-btn" href="/showrooms">Launch the showroom gallery</Link>
        </div>
      </section>

      <section className="ngc-help">
        <div className="ngc-wrap">
          <h2>We’re here to help</h2>
          <p>Mon–Fri 10:00 am – 6:00 pm ET</p>
          <div className="ngc-hero__actions">
            <Link className="ngc-btn" href="/contact">Send us a message</Link>
            <Link className="ngc-btn ngc-btn--ghost" href="/showrooms">Book showroom appointment</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
