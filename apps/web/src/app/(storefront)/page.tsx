import type { Metadata } from 'next';
import Link from 'next/link';

import { HeroSearch } from '../../components/storefront/HeroSearch.js';
import { ProductGrid } from '../../components/storefront/LuxuryProductCard.js';
import { getFeaturedHome } from '../../lib/storefront-data.js';
import { HERO_IMAGE } from '../../lib/storefront-images.js';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Maihan Gems — Rare Earth Gemstones & Haute Joaillerie',
  description:
    'A private vault of natural gemstones, matched pairs and master settings. Search in your own words.',
};

export default async function HomePage() {
  const { gemstones, settings, jewelry } = await getFeaturedHome();

  return (
    <main id="main-content">
      <section className="lx-hero" aria-label="Hero">
        <div className="lx-hero__media">
          <img src={HERO_IMAGE} alt="High jewellery on dark silk" />
          <div className="lx-hero__veil" />
        </div>
        <div className="lx-hero__copy">
          <span className="lx-hero__eyebrow">The Private Vault</span>
          <h1 className="lx-hero__title">Rare earth, set with restraint.</h1>
          <p className="lx-hero__lede">
            Natural stones, matched pairs and atelier settings — described in your own words, found in the vault.
          </p>
          <HeroSearch />
        </div>
      </section>

      <section className="lx-section" style={{ paddingBottom: '3rem' }}>
        <div className="lx-wrap">
          <div className="lx-collections">
            <Link href="/browse" className="lx-tile">
              <img src="https://images.unsplash.com/photo-1611955167811-4711904bb9f8?auto=format&fit=crop&w=1200&q=80" alt="" />
              <div className="lx-tile__veil" />
              <div className="lx-tile__copy">
                <span className="lx-kicker" style={{ color: '#e8c96a' }}>Loose stones</span>
                <h3>Gemstones</h3>
                <p>Sapphires, rubies, emeralds and more</p>
              </div>
            </Link>
            <Link href="/jewellery" className="lx-tile">
              <img src="https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=1200&q=80" alt="" />
              <div className="lx-tile__veil" />
              <div className="lx-tile__copy">
                <span className="lx-kicker" style={{ color: '#e8c96a' }}>Finished pieces</span>
                <h3>Jewellery</h3>
                <p>Rings, earrings, pendants</p>
              </div>
            </Link>
            <Link href="/design-your-own" className="lx-tile">
              <img src="https://images.unsplash.com/photo-1603561591411-07134e71a2a9?auto=format&fit=crop&w=1200&q=80" alt="" />
              <div className="lx-tile__veil" />
              <div className="lx-tile__copy">
                <span className="lx-kicker" style={{ color: '#e8c96a' }}>Atelier</span>
                <h3>Design Your Own</h3>
                <p>Setting first, or stone first</p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      <section className="lx-section" aria-labelledby="featured-gems">
        <div className="lx-wrap">
          <div className="lx-section__head">
            <div>
              <span className="lx-kicker">The vault</span>
              <h2 id="featured-gems" className="lx-h2">Featured gemstones</h2>
            </div>
            <Link className="lx-more" href="/browse">View all</Link>
          </div>
          <ProductGrid products={gemstones} />
        </div>
      </section>

      <section className="lx-section" style={{ background: '#fff' }} aria-labelledby="featured-settings">
        <div className="lx-wrap">
          <div className="lx-section__head">
            <div>
              <span className="lx-kicker">Atelier mountings</span>
              <h2 id="featured-settings" className="lx-h2">Settings</h2>
            </div>
            <Link className="lx-more" href="/settings">View all</Link>
          </div>
          <ProductGrid products={settings} />
        </div>
      </section>

      <section className="lx-section" aria-labelledby="featured-jewelry">
        <div className="lx-wrap">
          <div className="lx-section__head">
            <div>
              <span className="lx-kicker">Haute joaillerie</span>
              <h2 id="featured-jewelry" className="lx-h2">Jewellery</h2>
            </div>
            <Link className="lx-more" href="/jewellery">View all</Link>
          </div>
          <ProductGrid products={jewelry} />
        </div>
      </section>
    </main>
  );
}
