import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { GalleryCarousel } from '../../components/ui/gallery-carousel.js';
import { TextReveal } from '../../components/ui/text-reveal.js';
import { ngcCards } from '../../lib/ngc/catalog.js';
import { currentStorefront } from '../../lib/ngc/current-storefront.js';
import { withPrefix } from '../../lib/ngc/storefronts.js';

const HERO_PUBLIC =
  'maihan/products/K11733/01_image_certified-natural-untreated-tanzania-round-violetishblue-tanzanite-1.3100-cts-k11733-1.jpg';

function cloudinary(width: number): string {
  return `https://res.cloudinary.com/o1zwhvbi/image/upload/f_auto,q_auto,w_${width},c_limit/${HERO_PUBLIC}`;
}

const STONES: readonly { name: string; href: string; slug: string; fallback: string }[] = [
  { name: 'Sapphire', href: '/sapphire', slug: 'sapphire', fallback: '/media/stone-sapphire.jpg' },
  { name: 'Ruby', href: '/ruby', slug: 'ruby', fallback: '/media/stone-ruby.jpg' },
  { name: 'Emerald', href: '/emerald', slug: 'emerald', fallback: '/media/stone-emerald.jpg' },
  { name: 'Spinel', href: '/spinel', slug: 'spinel', fallback: '/media/stone-spinel-blue.jpg' },
  { name: 'Tanzanite', href: '/tanzanite', slug: 'tanzanite', fallback: '/media/stone-tanzanite.jpg' },
  { name: 'Paraíba', href: '/paraiba-tourmaline', slug: 'paraiba-tourmaline', fallback: '/media/stone-paraiba.jpg' },
  { name: 'Padparadscha', href: '/padparadscha-gemstones', slug: 'padparadscha', fallback: '/media/stone-padparadscha.jpg' },
  { name: 'Tsavorite', href: '/tsavorite-garnet', slug: 'tsavorite-garnet', fallback: '/media/stone-tsavorite.jpg' },
  { name: 'Alexandrite', href: '/alexandrite', slug: 'alexandrite', fallback: '/media/stone-alexandrite.jpg' },
  { name: 'Opal', href: '/opal', slug: 'opal', fallback: '/media/stone-opal.jpg' },
  { name: 'Aquamarine', href: '/aquamarine', slug: 'aquamarine', fallback: '/media/stone-aquamarine.jpg' },
  { name: 'Morganite', href: '/morganite', slug: 'morganite', fallback: '/media/stone-morganite.jpg' },
  { name: 'Pearl', href: '/pearl', slug: 'pearl', fallback: '/media/stone-pearl.jpg' },
  { name: 'Explore all', href: '/all-natural-gemstones', slug: 'diamond', fallback: '/media/stone-diamond.jpg' },
];

function houseNoun(stone: string): string {
  if (stone === 'ruby') return 'rubies';
  if (stone === 'sapphire') return 'sapphires';
  if (stone === 'emerald') return 'emeralds';
  return `${stone}s`;
}

function editorial(url: string): string {
  if (!url.includes('res.cloudinary.com')) return url;
  return url
    .replace('e_background_removal,', '')
    .replace(/c_pad,b_rgb:[0-9A-Fa-f]+,w_\d+,h_\d+,?/g, 'c_fill,g_auto,w_1400,h_1800,');
}

function stonePortrait(slug: string, fallback: string): string {
  try {
    const card = ngcCards({ kind: 'loose_stone', stoneSlug: slug, limit: 8 }).find((row) =>
      Boolean(row.imageUrl && row.imageUrl.includes('res.cloudinary.com')),
    );
    return card?.imageUrl ? editorial(card.imageUrl) : fallback;
  } catch {
    return fallback;
  }
}

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Maihan Gems | Natural Gemstones & Fine Jewellery',
  description:
    'A private vault of earth-mined gemstones, matched pairs, master settings and bespoke atelier jewellery.',
};

export default async function HomePage({
  brand: brandProp,
}: {
  brand?: Awaited<ReturnType<typeof currentStorefront>>;
} = {}) {
  const brand = brandProp ?? (await currentStorefront());
  const href = (path: string) => withPrefix(path, brand.pathPrefix);
  const sister = Boolean(brand.defaultStone);
  const sisterHero =
    brand.defaultStone === 'ruby'
      ? '/media/jew-ruby-ring.jpg'
      : brand.defaultStone === 'emerald'
        ? '/media/jew-emerald-necklace.jpg'
        : '/media/jew-sapphire-ring.jpg';
  const heroLine = sister
    ? `The world's finest natural ${houseNoun(brand.defaultStone!)}, set by hand`
    : "The world's finest natural gemstones, set by hand";

  const stones = sister
    ? STONES.filter(
        (gem) =>
          gem.slug === brand.defaultStone
          || (brand.defaultStone === 'sapphire' && gem.slug === 'padparadscha')
          || gem.name === 'Explore all',
      )
    : STONES;

  let signatures: { title: string; button: string; src: string; href: string }[] = [];
  let storyImage = '/media/jew-sapphire-pendant.jpg';
  try {
    const jewels = ngcCards({ kind: 'jewelry', limit: 24 }).filter((row) =>
      Boolean(row.imageUrl && row.imageUrl.includes('res.cloudinary.com')),
    );
    signatures = jewels.slice(0, 8).map((row) => ({
      title: row.title,
      button: 'View the piece',
      src: row.imageUrl ?? '',
      href: href(`/product/${row.slug}`),
    }));
    if (jewels[0]?.imageUrl) storyImage = editorial(jewels[0].imageUrl);
  } catch {
    signatures = [];
  }

  const heroSrc = sister ? sisterHero : cloudinary(1600);

  return (
    <main id="main-content" className="mgh">
      <section className="vitrine" aria-label={brand.name}>
        <div className="vitrine__copy">
          <h1 className="mgh-hero__title">{heroLine}</h1>
          <Link className="ink-cta" href={href('/natural-gemstones')}>
            Explore the vault
          </Link>
        </div>
        <figure className="vitrine__stone">
          <img
            className="vault-vitrine__img"
            data-parallax="6"
            src={heroSrc}
            srcSet={sister ? undefined : `${cloudinary(800)} 800w, ${cloudinary(1400)} 1400w, ${cloudinary(1800)} 1800w`}
            sizes={sister ? undefined : '(max-width: 800px) 100vw, 50vw'}
            width={1400}
            height={1750}
            alt={
              sister
                ? `Finished ${houseNoun(brand.defaultStone!)} from the sister house`
                : 'K11733, 1.31 ct violetish blue tanzanite, round, very slightly included, heat treated, Tanzania'
            }
          />
        </figure>
      </section>

      <section className="atelier-stones mgh-gems" aria-labelledby="mgh-gems-h">
        <div className="atelier-stones__head">
          <div>
            <p className="atelier-label">The vault</p>
            <h2 id="mgh-gems-h">Gemstones</h2>
          </div>
          <Link href={href('/natural-gemstones')} className="line-link">
            View all gemstones
          </Link>
        </div>
        <div className="atelier-stones__grid">
          {stones.map((gem) => {
            const src = stonePortrait(gem.slug, gem.fallback);
            const remote = src.startsWith('https://');
            return (
              <Link key={gem.name} href={href(gem.href)} className="mgh-gem">
                {remote ? (
                  <Image src={src} alt="" width={900} height={1200} sizes="(max-width: 800px) 50vw, 25vw" />
                ) : (
                  <img src={src} alt="" />
                )}
                <span className="mgh-gem__name">{gem.name}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="atelier-pieces" aria-labelledby="atelier-pieces-h">
        <GalleryCarousel
          layout="strip"
          titleId="atelier-pieces-h"
          title="Signature pieces"
          slides={signatures}
        />
      </section>

      <section className="atelier-story" aria-labelledby="atelier-story-h">
        <figure className="atelier-story__photo">
          {storyImage.startsWith('https://') ? (
            <Image src={storyImage} alt="" fill sizes="50vw" style={{ objectFit: 'cover' }} />
          ) : (
            <img src={storyImage} alt="" />
          )}
        </figure>
        <div className="atelier-story__copy">
          <p className="atelier-label">Origin</p>
          <h2 id="atelier-story-h">Cut, disclosed, set.</h2>
          <TextReveal>
            Maihan keeps a private vault of earth-mined gemstones, matched pairs and master settings. Each stone is disclosed as it is: origin, treatment and laboratory papers.
          </TextReveal>
        </div>
      </section>

      <section className="atelier-dyo mgh-dyo" aria-labelledby="mgh-dyo-h">
        <div className="atelier-dyo__copy">
          <p className="atelier-label">The atelier</p>
          <h2 id="mgh-dyo-h">Design your own</h2>
          <p>A mounting, a stone it can hold, then a finish. The goldsmiths take the composition from there.</p>
          <Link href={href('/design-your-own')} className="ink-cta">
            Begin designing
          </Link>
        </div>
        <figure className="atelier-dyo__photo">
          <img src="/media/setting-ring.jpg" alt="" />
        </figure>
      </section>
    </main>
  );
}
