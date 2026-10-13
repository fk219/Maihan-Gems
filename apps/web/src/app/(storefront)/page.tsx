import type { Metadata } from 'next';
import Link from 'next/link';

import { HeroSearch } from '../../components/storefront/HeroSearch.js';
import { ProductGrid } from '../../components/storefront/LuxuryProductCard.js';
import { getFeaturedHome, listProducts } from '../../lib/storefront-data.js';
import { COLLECTION_TILES, HERO_IMAGE } from '../../lib/storefront-images.js';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Maihan Gems — Rare Earth Gemstones & Haute Joaillerie',
  description:
    'A private vault of natural gemstones, matched pairs and master settings. Search in your own words.',
};

export default async function HomePage() {
  const [{ gemstones, settings, jewelry }, pairs] = await Promise.all([
    getFeaturedHome(),
    listProducts({ kind: 'gemstone', quantityType: 'pair', limit: 4 }),
  ]);

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
              <img src={COLLECTION_TILES.gemstones} alt="" />
              <div className="lx-tile__veil" />
              <div className="lx-tile__copy">
                <span className="lx-kicker">Loose stones</span>
                <h3>Gemstones</h3>
                <p>Sapphires, rubies, emeralds and more</p>
              </div>
            </Link>
            <Link href="/pairs" className="lx-tile">
              <img src={COLLECTION_TILES.pairs} alt="" />
              <div className="lx-tile__veil" />
              <div className="lx-tile__copy">
                <span className="lx-kicker">Earrings</span>
                <h3>Matched pairs</h3>
                <p>Kept together for colour and cut</p>
              </div>
            </Link>
            <Link href="/jewellery" className="lx-tile">
              <img src={COLLECTION_TILES.jewellery} alt="" />
              <div className="lx-tile__veil" />
              <div className="lx-tile__copy">
                <span className="lx-kicker">Finished pieces</span>
                <h3>Jewellery</h3>
                <p>Rings, earrings, pendants</p>
              </div>
            </Link>
            <Link href="/design-your-own" className="lx-tile">
              <img src={COLLECTION_TILES.dyo} alt="" />
              <div className="lx-tile__veil" />
              <div className="lx-tile__copy">
                <span className="lx-kicker">Atelier</span>
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

      {pairs.length > 0 ? (
        <section className="lx-section lx-section--studio" aria-labelledby="featured-pairs">
          <div className="lx-wrap">
            <div className="lx-section__head">
              <div>
                <span className="lx-kicker">Kept together</span>
                <h2 id="featured-pairs" className="lx-h2">Matched pairs</h2>
              </div>
              <Link className="lx-more" href="/pairs">View all</Link>
            </div>
            <ProductGrid products={pairs} />
          </div>
        </section>
      ) : null}

      <section className="lx-section lx-section--studio" aria-labelledby="featured-settings">
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
