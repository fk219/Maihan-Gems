import type { Metadata } from 'next';
import Link from 'next/link';

import { HeroSearch } from '../../components/storefront/HeroSearch.js';
import { StoneMarquee } from '../../components/storefront/StoneMarquee.js';
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
      <section className="home-hero" aria-label="Start here">
        <p className="home-hero__kicker">Two ways in</p>
        <h1>Design the piece, or describe it.</h1>
        <div className="home-hero__grid">
          <Link href="/design-your-own" className="home-journey">
            <img src="/media/jew-sapphire-ring.jpg" alt="" />
            <div>
              <span>01</span>
              <h2>Design your own jewellery</h2>
              <p>Choose a setting, a stone it will hold, then metal and size.</p>
            </div>
          </Link>
          <div className="home-journey home-journey--search">
            <div>
              <span>02</span>
              <h2>Ask in plain English</h2>
              <p>Find a stone, a setting, or a finished piece. Open it, compare it, or add it to your bag.</p>
            </div>
            <HeroSearch />
          </div>
        </div>
      </section>

      <section className="ngc-block" aria-labelledby="shop-gems">
        <div className="ngc-wrap">
          <div className="home-head">
            <h2 id="shop-gems">Shop Gemstones</h2>
            <p>One continuous row. It moves on its own, and stops when you point at it or use the arrows.</p>
          </div>
        </div>
        <StoneMarquee
          tiles={NGC_STONE_TILES.map((stone) => ({
            name: stone.name,
            href: stone.href,
            img: media(stone.img),
          }))}
        />
      </section>

      <section className="ngc-block home-pack" aria-labelledby="packaging">
        <div className="ngc-wrap">
          <div className="home-head">
            <h2 id="packaging">Presentation</h2>
            <p>Boxes, pouches, and reports that travel with the piece.</p>
          </div>
          <div className="home-pack__row">
            {PACKAGING.map((item) => (
              <figure key={item.src}>
                <img src={item.src} alt={item.alt} />
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="home-types" aria-labelledby="jewelry">
        <h2 id="jewelry">Gemstone Jewelry</h2>
        <div className="home-types__row">
          {[
            ['Rings', '/jewellery?type=ring', '/media/jew-sapphire-ring.jpg'],
            ['Earrings', '/jewellery?type=earrings', '/media/jew-sapphire-studs.jpg'],
            ['Necklaces & Pendants', '/jewellery?type=pendant', '/media/jew-sapphire-pendant.jpg'],
            ['Bracelets', '/jewellery?type=bracelet', '/media/jew-tennis-bracelet.jpg'],
            ["Men's Rings", '/jewellery?type=ring', '/media/jew-ruby-ring.jpg'],
          ].map(([label, href, src]) => (
            <Link key={label} href={href} className="home-type">
              <span><img src={src} alt="" /></span>
              {label}
            </Link>
          ))}
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
