import type { Metadata } from 'next';
import Link from 'next/link';

import { VaultReveal } from '../../components/storefront/VaultReveal.js';

import { HeroSearch } from '../../components/storefront/HeroSearch.js';
import { NGC_MEDIA } from '../../lib/ngc-home.js';
import { currentStorefront } from '../../lib/ngc/current-storefront.js';
import { withPrefix } from '../../lib/ngc/storefronts.js';

/* Vault vitrine hero piece — real evidence fields from the compiled NGC
   research fixture (K11733). No invented values: every fact on the plate is
   verbatim from the source record. */
const VITRINE_PIECE = {
  id: 'K11733',
  name: '1.31 ct violetish blue tanzanite',
  facts: 'Round · VSI · Heat treated (disclosed) · Tanzania',
  origin: 'Tanzania',
  treatment: 'Heat treated — disclosed',
  clarity: 'Very slightly included',
  carat: '1.31 ct',
  image:
    'https://images.thenaturalsapphirecompany.com/stone/k11733/image/certified-natural-untreated-tanzania-round-violetishblue-tanzanite-1.3100-cts-k11733-1.jpg?v=20250306070308',
};

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Maihan Gems — Natural Gemstones & Fine Jewellery',
  description:
    'A private vault of earth-mined gemstones, matched pairs, master settings and bespoke atelier jewellery.',
};

const GEMS: readonly { name: string; href: string; img: string }[] = [
  { name: 'Sapphire', href: '/sapphire', img: '/media/stone-sapphire.jpg' },
  { name: 'Ruby', href: '/ruby', img: '/media/stone-ruby.jpg' },
  { name: 'Emerald', href: '/emerald', img: '/media/stone-emerald.jpg' },
  { name: 'Spinel', href: '/spinel', img: '/media/stone-spinel-blue.jpg' },
  { name: 'Tanzanite', href: '/tanzanite', img: '/media/stone-tanzanite.jpg' },
  { name: 'Paraíba', href: '/paraiba-tourmaline', img: '/media/stone-paraiba.jpg' },
  { name: 'Padparadscha', href: '/padparadscha', img: '/media/stone-padparadscha.jpg' },
  { name: 'Tsavorite', href: '/tsavorite-garnet', img: '/media/stone-tsavorite.jpg' },
  { name: 'Alexandrite', href: '/alexandrite', img: '/media/stone-alexandrite.jpg' },
  { name: 'Opal', href: '/opal', img: '/media/stone-opal.jpg' },
  { name: 'Aquamarine', href: '/aquamarine', img: '/media/stone-aquamarine.jpg' },
  { name: 'Morganite', href: '/morganite', img: '/media/stone-morganite.jpg' },
  { name: 'Pearl', href: '/pearl', img: '/media/stone-pearl.jpg' },
  { name: 'Explore All', href: '/all-natural-gemstones', img: '/media/stone-diamond.jpg' },
];

const JEWELLERY: readonly { label: string; href: string; img: string }[] = [
  { label: 'Rings', href: '/jewellery?type=ring', img: '/media/jew-sapphire-ring.jpg' },
  { label: 'Earrings', href: '/jewellery?type=earrings', img: '/media/jew-sapphire-studs.jpg' },
  { label: 'Pendants & Necklaces', href: '/jewellery?type=pendant', img: '/media/jew-sapphire-pendant.jpg' },
  { label: 'Bracelets', href: '/jewellery?type=bracelet', img: '/media/jew-tennis-bracelet.jpg' },
];

const SETTINGS: readonly { label: string; href: string; meta: string; img: string }[] = [
  { label: 'Ring settings', href: '/gemstone-ring-settings', meta: 'Solitaire, halo & three-stone', img: '/media/setting-ring.jpg' },
  { label: 'Earring settings', href: '/gemstone-earring-settings', meta: 'Studs, drops & hoops', img: '/media/setting-earrings.jpg' },
  { label: 'Pendant settings', href: '/gemstone-necklace-pendant-settings', meta: 'Bails, bezels & slides', img: '/media/setting-pendant.jpg' },
  { label: 'Bracelet settings', href: '/gemstone-bracelet-settings', meta: 'Tennis & bangle seats', img: '/media/setting-ring.jpg' },
];

const PACKAGING: readonly { src: string; alt: string }[] = [1, 2, 3, 4, 5].map((n) => ({
  src: `${NGC_MEDIA}/images/hi-res-webp/packaging/package${n}@2x.webp`,
  alt: `Maihan presentation packaging ${n}`,
}));

const HISTORY: readonly { eyebrow: string; title: string; text: string; img: string }[] = [
  {
    eyebrow: 'The Origin',
    title: 'Sourcing at the mine',
    text: 'We buy at the source — river terraces, pit heads and cutting houses — where a stone’s character is set long before it reaches the bench.',
    img: '/media/stone-rubellite.jpg',
  },
  {
    eyebrow: 'The House',
    title: 'A private vault',
    text: 'Thousands of earth-mined stones, matched pairs and master settings, each disclosed as it is: origin, treatment and laboratory papers.',
    img: '/media/stone-sapphire-pink.jpg',
  },
  {
    eyebrow: 'The Craft',
    title: 'The atelier',
    text: 'Master goldsmiths pair setting to stone — or stone to setting — keeping the composition honest, and finish every jewel by hand.',
    img: '/media/jew-ruby-band.jpg',
  },
];

const PEACE: readonly { title: string; body: string; icon: 'truck' | 'returns' | 'shield' | 'financing' }[] = [
  {
    title: 'Free Shipping Worldwide',
    body: 'Free for all U.S. deliveries, and insured for orders over $300 anywhere in the world.',
    icon: 'truck',
  },
  {
    title: '14 Day Returns',
    body: 'For loose gemstones, ready-to-ship jewellery, and most custom jewellery.',
    icon: 'returns',
  },
  {
    title: 'Extend Protection Plan',
    body: 'If your jewellery breaks, we repair it. If we cannot repair it, we replace it.',
    icon: 'shield',
  },
  {
    title: 'Special Financing Available',
    body: 'Flexible monthly instalments make the piece you want attainable today.',
    icon: 'financing',
  },
];

const TESTIMONIALS: readonly { quote: string; name: string; role: string }[] = [
  {
    quote:
      'The stone arrived even finer than its photographs — and the provenance held up to my own gemologist without a single question.',
    name: 'A. K.',
    role: 'Collector · Dubai',
  },
  {
    quote:
      'I was guided through every step of the design. The finished ring now lives in its presentation case, and I in a small state of disbelief.',
    name: 'D. R.',
    role: 'Bespoke client · London',
  },
  {
    quote:
      'Papers above and beyond, an advisor who answered before I asked, and a piece I now never take off.',
    name: 'P. S.',
    role: 'Private client · New York',
  },
];

const CHARITY: readonly { title: string; text: string }[] = [
  { title: 'Education', text: 'Lapidary and gem-cutting schools at the source.' },
  { title: 'Clean Water', text: 'Wells and clean-water access for mining communities.' },
  { title: 'Safe Mining', text: 'Fair wages and certified working conditions.' },
];

function PeaceIcon({ kind }: { kind: 'truck' | 'returns' | 'shield' | 'financing' }) {
  if (kind === 'truck') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 7h11v10H3zM14 10h4l3 3v4h-7z" />
        <circle cx="7.5" cy="18.5" r="1.6" />
        <circle cx="17" cy="18.5" r="1.6" />
      </svg>
    );
  }
  if (kind === 'returns') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 9V5m0 4h4M4 9a8 8 0 1 1-1 6" />
        <path d="M9 13l2 2 4-4" />
      </svg>
    );
  }
  if (kind === 'shield') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3l7 3v5c0 4.6-3 8.6-7 10-4-1.4-7-5.4-7-10V6z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18M7 15h6" />
    </svg>
  );
}

function houseNoun(stone: string): string {
  if (stone === 'ruby') return 'rubies';
  if (stone === 'sapphire') return 'sapphires';
  if (stone === 'emerald') return 'emeralds';
  return `${stone}s`;
}

function gemsFor(stone: string | null) {
  if (!stone) return GEMS;
  return GEMS.filter(
    (gem) =>
      gem.name.toLowerCase() === stone
      || (stone === 'sapphire' && gem.name === 'Padparadscha')
      || gem.name === 'Explore All',
  );
}

function index(n: number): string {
  return String(n + 1).padStart(2, '0');
}

export default async function HomePage({
  brand: brandProp,
}: {
  brand?: Awaited<ReturnType<typeof currentStorefront>>;
} = {}) {
  const brand = brandProp ?? (await currentStorefront());
  const prefix = brand.pathPrefix;
  const href = (path: string) => withPrefix(path, prefix);
  const sister = Boolean(brand.defaultStone);
  const gems = gemsFor(brand.defaultStone);
  const sisterHero =
    brand.defaultStone === 'ruby'
      ? { main: '/media/jew-ruby-ring.jpg', small: '/media/stone-ruby.jpg' }
      : brand.defaultStone === 'emerald'
        ? { main: '/media/jew-emerald-necklace.jpg', small: '/media/stone-emerald.jpg' }
        : brand.defaultStone === 'sapphire'
          ? { main: '/media/jew-sapphire-ring.jpg', small: '/media/stone-sapphire.jpg' }
          : { main: '/media/jew-sapphire-ring.jpg', small: '/media/stone-sapphire-pair.jpg' };
  const heroMain = sisterHero.main;
  const featured = TESTIMONIALS[0];
  const restQuotes = TESTIMONIALS.slice(1);

  return (
    <main id="main-content" className="mgh">
      {/* Hero — the vitrine (one orchestrated reveal) */}
      <section className="mgh-hero" aria-label={brand.name}>
        <div className="vault-hero__grid">
          <div className="vault-hero__copy">
            <p className="mgh-eyebrow vault-hero__eyebrow">
              {sister ? brand.kicker : 'Natural Gemstones · Matched Pairs · Fine Jewellery'}
            </p>
            <h1 className="mgh-hero__title vault-hero__title">
              {sister ? (
                <>{`The world\u2019s finest natural ${houseNoun(brand.defaultStone!)}, set by hand`}</>
              ) : (
                <>{'The world\u2019s finest '}<em>natural gemstones</em>{', set by hand'}</>
              )}
            </h1>
            <p className="mgh-hero__sub vault-hero__lede">
              {sister
                ? brand.lede
                : 'Thousands of earth-mined stones, master settings and finished jewels. Choose a work from the vault — or design your own, from the stone up.'}
            </p>
            <div className="mgh-hero__actions vault-hero__actions">
              <Link href={href('/natural-gemstones')} className="mgh-btn mgh-btn--gold">
                Shop Gemstones
              </Link>
              <Link href={href('/design-your-own')} className="mgh-btn mgh-btn--ghost">
                Design Your Own
              </Link>
            </div>
            <div className="mgh-hero__search vault-hero__search">
              <HeroSearch />
            </div>
          </div>
          <figure className="vault-vitrine">
            <img
              className="vault-vitrine__img"
              src={sister ? heroMain : VITRINE_PIECE.image}
              alt={
                sister
                  ? `Finished ${houseNoun(brand.defaultStone!)} from the sister house`
                  : `${VITRINE_PIECE.id} — ${VITRINE_PIECE.name}, ${VITRINE_PIECE.facts}`
              }
              loading="eager"
            />
            <figcaption className="vault-vitrine__plate">
              <span className="vault-vitrine__plate-id">
                {sister ? `${brand.name} · House reserve` : `${VITRINE_PIECE.id} · Vault reservation`}
              </span>
              <span className="vault-vitrine__plate-name">
                {sister ? `${brand.name} — the house collection` : VITRINE_PIECE.name}
              </span>
              <span className="vault-vitrine__plate-facts">
                {sister ? 'Origin and treatment disclosed on every house record' : VITRINE_PIECE.facts}
              </span>
            </figcaption>
            {!sister ? (
              <dl className="vault-evidence">
                <div><dt>Origin</dt><dd>{VITRINE_PIECE.origin}</dd></div>
                <div><dt>Treatment</dt><dd>{VITRINE_PIECE.treatment}</dd></div>
                <div><dt>Clarity</dt><dd>{VITRINE_PIECE.clarity}</dd></div>
                <div><dt>Carat</dt><dd>{VITRINE_PIECE.carat}</dd></div>
              </dl>
            ) : null}
          </figure>
        </div>
      </section>

      {/* Gemstones — cabinet rail */}
      <section className="mgh-section mgh-gems" aria-labelledby="mgh-gems-h">
        <div className="mgh-wrap">
          <div className="mgh-head">
            <div>
              <p className="mgh-eyebrow">The Vault</p>
              <h2 id="mgh-gems-h" className="mgh-h2">Gemstones</h2>
              <p className="mgh-lede">
                Earth-mined and disclosed as they are — every stone carries its origin, treatment
                status and laboratory papers.
              </p>
            </div>
            <Link href={href('/natural-gemstones')} className="mgh-link">View all gemstones →</Link>
          </div>
          <VaultReveal className="mgh-gems__grid" stagger={70}>
            {gems.map((gem, i) => (
              <Link key={gem.name} href={href(gem.href)} className="mgh-gem">
                <span className="mgh-gem__index" aria-hidden="true">{index(i)}</span>
                <span className="mgh-gem__frame">
                  <img src={gem.img} alt="" />
                </span>
                <span className="mgh-gem__name">{gem.name}</span>
              </Link>
            ))}
          </VaultReveal>
        </div>
      </section>

      {/* Gemstone Jewellery — sticky rail + mosaic */}
      <section className="mgh-section mgh-jewellery" aria-labelledby="mgh-jewellery-h">
        <div className="mgh-wrap mgh-jewellery__layout">
          <div className="mgh-jewellery__rail">
            <p className="mgh-eyebrow mgh-eyebrow--light">Finished Works</p>
            <h2 id="mgh-jewellery-h" className="mgh-h2 mgh-h2--light">Gemstone Jewellery</h2>
            <p className="mgh-lede mgh-lede--light">
              Ready-to-ship jewels set by master goldsmiths — or the same pieces, made yours.
            </p>
            <Link href={href('/gemstone-rings')} className="mgh-btn mgh-btn--gold">View all jewellery</Link>
          </div>
          <VaultReveal className="mgh-jewellery__grid" stagger={90}>
            {JEWELLERY.map((item) => (
              <Link key={item.label} href={href(item.href)} className="mgh-jew">
                <img src={item.img} alt={`Finished ${item.label.toLowerCase()}`} />
                <span className="mgh-jew__label">
                  {item.label} <em aria-hidden="true">→</em>
                </span>
              </Link>
            ))}
          </VaultReveal>
        </div>
      </section>

      {/* Settings — numbered ledger */}
      <section className="mgh-section mgh-set" aria-labelledby="mgh-set-h">
        <div className="mgh-wrap">
          <div className="mgh-head">
            <div>
              <p className="mgh-eyebrow">Mountings</p>
              <h2 id="mgh-set-h" className="mgh-h2">Settings</h2>
              <p className="mgh-lede">Ring, earring, pendant and bracelet seats, waiting for a stone.</p>
            </div>
            <Link href={href('/gemstone-ring-settings')} className="mgh-link">View all settings →</Link>
          </div>
          <VaultReveal as="ol" className="mgh-set__ledger" stagger={80}>
            {SETTINGS.map((item, i) => (
              <li key={item.href}>
                <Link href={href(item.href)} className="mgh-set__row">
                  <span className="mgh-set__num" aria-hidden="true">{index(i)}</span>
                  <span className="mgh-set__label">{item.label}</span>
                  <span className="mgh-set__meta">{item.meta}</span>
                  <span className="mgh-set__thumb" aria-hidden="true">
                    <img src={item.img} alt="" loading="lazy" />
                  </span>
                </Link>
              </li>
            ))}
          </VaultReveal>
        </div>
      </section>

      {/* Packaging — ceremony strip */}
      <section className="mgh-section mgh-pack" aria-labelledby="mgh-pack-h">
        <div className="mgh-wrap">
          <div className="mgh-head">
            <div>
              <p className="mgh-eyebrow">The Ceremony</p>
              <h2 id="mgh-pack-h" className="mgh-h2">Our Packaging</h2>
            </div>
            <p className="mgh-lede">
              Every piece travels with the full ceremony — lacquered presentation cases, satin
              pouches, grading papers and certificates.
            </p>
          </div>
          <div className="mgh-pack__row">
            {PACKAGING.map((item) => (
              <figure key={item.src} className="mgh-pack__item">
                <img src={item.src} alt={item.alt} loading="lazy" />
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Design Your Own — gradient atelier panel */}
      <section className="mgh-section mgh-dyo" aria-labelledby="mgh-dyo-h">
        <div className="mgh-wrap">
          <div className="mgh-dyo__panel">
            <div className="mgh-dyo__copy">
              <p className="mgh-eyebrow">The Atelier</p>
              <h2 id="mgh-dyo-h" className="mgh-h2">Design Your Own Gemstone Piece</h2>
              <p className="mgh-lede">
                Three steps between you and a jewel that exists for no one else. Our goldsmiths take
                over from the review — and the result is unmistakably yours.
              </p>
              <Link href={href('/design-your-own')} className="mgh-btn mgh-btn--dark">
                Begin Designing
              </Link>
            </div>
            <div className="mgh-dyo__side">
              <ol className="mgh-steps">
                <li><span aria-hidden="true">1</span> Start with a Setting</li>
                <li><span aria-hidden="true">2</span> Select a Gemstone</li>
                <li><span aria-hidden="true">3</span> Review Your Design</li>
              </ol>
              <div className="mgh-dyo__media" aria-hidden="true">
                <img className="mgh-dyo__img-back" src="/media/setting-ring.jpg" alt="" loading="lazy" />
                <img className="mgh-dyo__img-front" src="/media/stone-sapphire.jpg" alt="" loading="lazy" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our History — gold timeline */}
      <section className="mgh-section mgh-history" aria-labelledby="mgh-history-h">
        <div className="mgh-wrap">
          <div className="mgh-head mgh-head--center">
            <p className="mgh-eyebrow">Since the First Stone</p>
            <h2 id="mgh-history-h" className="mgh-h2">Our History</h2>
            <p className="mgh-lede mgh-lede--center">
              From the mines to the marketplace — the path a stone takes before it reaches the bench.
            </p>
          </div>
          <ol className="mgh-history__timeline">
            {HISTORY.map((entry) => (
              <li key={entry.eyebrow}>
                <article className="mgh-history__card">
                  <img src={entry.img} alt="" loading="lazy" />
                  <p className="mgh-eyebrow">{entry.eyebrow}</p>
                  <h3>{entry.title}</h3>
                  <p className="mgh-history__text">{entry.text}</p>
                </article>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Shop with Peace in Mind — hairline strip */}
      <section className="mgh-peace" aria-labelledby="mgh-peace-h">
        <div className="mgh-wrap">
          <h2 id="mgh-peace-h" className="mgh-h2 mgh-h2--light">Shop with Peace in Mind</h2>
          <div className="mgh-peace__grid">
            {PEACE.map((item) => (
              <article key={item.title} className="mgh-peace__card">
                <i className="mgh-peace__icon" aria-hidden="true">
                  <PeaceIcon kind={item.icon} />
                </i>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* About Us — editorial with offset frame */}
      <section className="mgh-section mgh-about" aria-labelledby="mgh-about-h">
        <div className="mgh-wrap mgh-about__grid">
          <div className="mgh-about__media" aria-hidden="true">
            <img src="/media/jew-sapphire-pendant.jpg" alt="" loading="lazy" />
          </div>
          <div className="mgh-about__copy">
            <p className="mgh-eyebrow">The House</p>
            <h2 id="mgh-about-h" className="mgh-h2">About Us</h2>
            <p className="mgh-lede">
              Maihan is a private vault of earth-mined gemstones, matched pairs and master
              settings. Stones are disclosed as they are — origin, treatment and laboratory
              papers — never dressed as something they are not.
            </p>
            <p className="mgh-lede">
              The atelier pairs a setting to a stone, or the reverse, and keeps the composition
              honest from first sketch to finished piece.
            </p>
            <Link href={href('/about')} className="mgh-btn mgh-btn--outline">Our Story</Link>
          </div>
        </div>
      </section>

      {/* Charity Work — inline band */}
      <section className="mgh-charity" aria-labelledby="mgh-charity-h">
        <div className="mgh-wrap">
          <p className="mgh-eyebrow mgh-eyebrow--gold">Giving Back</p>
          <h2 id="mgh-charity-h" className="mgh-h2">Charity Work</h2>
          <p className="mgh-lede">
            A portion of every sale returns to the places our stones come from — supporting the
            communities and landscapes that make this work possible.
          </p>
          <ul className="mgh-charity__row">
            {CHARITY.map((cause) => (
              <li key={cause.title}>
                <h3>{cause.title}</h3>
                <p>{cause.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Customer Feedback — featured quote + stack */}
      <section className="mgh-section mgh-feedback" aria-labelledby="mgh-feedback-h">
        <div className="mgh-wrap">
          <div className="mgh-head">
            <div>
              <p className="mgh-eyebrow">Client Words</p>
              <h2 id="mgh-feedback-h" className="mgh-h2">Customer Feedback</h2>
            </div>
            <Link href={href('/contact')} className="mgh-link">Speak with our advisors →</Link>
          </div>
          <div className="mgh-feedback__layout">
            {featured && (
              <figure className="mgh-quote mgh-quote--feature">
                <blockquote>
                  <p>&ldquo;{featured.quote}&rdquo;</p>
                </blockquote>
                <figcaption>
                  <strong>{featured.name}</strong>
                  <span>{featured.role}</span>
                </figcaption>
              </figure>
            )}
            <div className="mgh-feedback__stack">
              {restQuotes.map((t) => (
                <figure key={t.name} className="mgh-quote">
                  <blockquote>
                    <p>&ldquo;{t.quote}&rdquo;</p>
                  </blockquote>
                  <figcaption>
                    <strong>{t.name}</strong>
                    <span>{t.role}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mgh-cta" aria-labelledby="mgh-cta-h">
        <div className="mgh-wrap">
          <p className="mgh-eyebrow mgh-eyebrow--light">The Vault Awaits</p>
          <h2 id="mgh-cta-h" className="mgh-h2 mgh-h2--light">
            Find the stone that <em>finds you</em>.
          </h2>
          <p className="mgh-lede mgh-lede--light mgh-lede--center">
            Browse the vault as it stands today, or sit with our advisors and design the piece
            that does not exist yet.
          </p>
          <div className="mgh-cta__actions">
            <Link href={href('/natural-gemstones')} className="mgh-btn mgh-btn--gold">
              Enter the Vault
            </Link>
            <Link href={href('/design-your-own')} className="mgh-btn mgh-btn--ghost">
              Design Your Own
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
