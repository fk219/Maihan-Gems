import type { Metadata } from 'next';
import Link from 'next/link';

import { HeroSearch } from '../../components/storefront/HeroSearch.js';
import { NGC_MEDIA } from '../../lib/ngc-home.js';

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
  { name: 'Explore All', href: '/browse', img: '/media/stone-diamond.jpg' },
];

const JEWELLERY: readonly { label: string; href: string; img: string }[] = [
  { label: 'Rings', href: '/jewellery?type=ring', img: '/media/jew-sapphire-ring.jpg' },
  { label: 'Earrings', href: '/jewellery?type=earrings', img: '/media/jew-sapphire-studs.jpg' },
  { label: 'Pendants & Necklaces', href: '/jewellery?type=pendant', img: '/media/jew-sapphire-pendant.jpg' },
  { label: 'Bracelets', href: '/jewellery?type=bracelet', img: '/media/jew-tennis-bracelet.jpg' },
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

export default function HomePage() {
  return (
    <main id="main-content" className="mgh">
      {/* Hero */}
      <section className="mgh-hero" aria-label="Maihan Gems">
        <div className="mgh-hero__inner">
          <div className="mgh-hero__copy">
            <p className="mgh-eyebrow mgh-eyebrow--gold">Natural Gemstones · Matched Pairs · Fine Jewellery</p>
            <h1 className="mgh-hero__title">
              The world&rsquo;s finest natural gemstones, set by hand
            </h1>
            <p className="mgh-hero__sub">
              Thousands of earth-mined stones, master settings and finished jewels. Choose a work
              from the vault — or design your own, from the stone up.
            </p>
            <div className="mgh-hero__actions">
              <Link href="/browse" className="mgh-btn mgh-btn--gold">
                Shop Gemstones
              </Link>
              <Link href="/jewellery" className="mgh-btn mgh-btn--ghost">
                Gemstone Jewellery
              </Link>
              <Link href="/design-your-own" className="mgh-btn mgh-btn--outline-dark">
                Design Your Own
              </Link>
            </div>
            <div className="mgh-hero__search">
              <HeroSearch />
            </div>
          </div>
          <div className="mgh-hero__media" aria-hidden="true">
            <img className="mgh-hero__img-main" src="/media/jew-ruby-ring.jpg" alt="" />
            <img className="mgh-hero__img-small" src="/media/stone-sapphire-pair.jpg" alt="" />
          </div>
        </div>
      </section>

      {/* Gemstones */}
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
            <Link href="/browse" className="mgh-link">Browse all varieties →</Link>
          </div>
          <div className="mgh-gems__grid">
            {GEMS.map((gem) => (
              <Link key={gem.name} href={gem.href} className="mgh-gem">
                <span className="mgh-gem__frame">
                  <img src={gem.img} alt="" />
                </span>
                <span className="mgh-gem__name">{gem.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Gemstone Jewellery */}
      <section className="mgh-section mgh-jewellery" aria-labelledby="mgh-jewellery-h">
        <div className="mgh-wrap">
          <div className="mgh-head mgh-head--split">
            <div>
              <p className="mgh-eyebrow">Finished Works</p>
              <h2 id="mgh-jewellery-h" className="mgh-h2">Gemstone Jewellery</h2>
              <p className="mgh-lede">
                Ready-to-ship jewels set by master goldsmiths — or the same pieces, made yours.
              </p>
            </div>
            <Link href="/jewellery" className="mgh-link mgh-link--light">View all jewellery →</Link>
          </div>
          <div className="mgh-jewellery__grid">
            {JEWELLERY.map((item) => (
              <Link key={item.label} href={item.href} className="mgh-jew">
                <img src={item.img} alt={`Finished ${item.label.toLowerCase()}`} />
                <span className="mgh-jew__label">
                  {item.label} <em aria-hidden="true">→</em>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Packaging */}
      <section className="mgh-section mgh-pack" aria-labelledby="mgh-pack-h">
        <div className="mgh-wrap">
          <div className="mgh-head mgh-head--center">
            <p className="mgh-eyebrow">The Ceremony</p>
            <h2 id="mgh-pack-h" className="mgh-h2">Our Packaging</h2>
            <p className="mgh-lede mgh-lede--center">
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

      {/* Design Your Own */}
      <section className="mgh-section mgh-dyo" aria-labelledby="mgh-dyo-h">
        <div className="mgh-wrap mgh-dyo__grid">
          <div className="mgh-dyo__copy">
            <p className="mgh-eyebrow mgh-eyebrow--gold">The Atelier</p>
            <h2 id="mgh-dyo-h" className="mgh-h2">Design Your Own Gemstone Piece</h2>
            <p className="mgh-lede">
              Three steps between you and a jewel that exists for no one else. Our goldsmiths take
              over from the review — and the result is unmistakably yours.
            </p>
            <ol className="mgh-steps">
              <li><span>1</span> Start with a Setting</li>
              <li><span>2</span> Select a Gemstone</li>
              <li><span>3</span> Review Your Design</li>
            </ol>
            <Link href="/design-your-own" className="mgh-btn mgh-btn--gold">
              Begin Designing
            </Link>
          </div>
          <div className="mgh-dyo__media" aria-hidden="true">
            <img className="mgh-dyo__img-back" src="/media/setting-ring.jpg" alt="" />
            <img className="mgh-dyo__img-front" src="/media/stone-sapphire.jpg" alt="" />
          </div>
        </div>
      </section>

      {/* Our History */}
      <section className="mgh-section mgh-history" aria-labelledby="mgh-history-h">
        <div className="mgh-wrap">
          <div className="mgh-head mgh-head--split">
            <div>
              <p className="mgh-eyebrow">Since the First Stone</p>
              <h2 id="mgh-history-h" className="mgh-h2">Our History</h2>
              <p className="mgh-lede">
                From the mines to the marketplace — the path a stone takes before it reaches the bench.
              </p>
            </div>
            <Link href="/about" className="mgh-link mgh-link--light">Read our story →</Link>
          </div>
          <div className="mgh-history__grid">
            {HISTORY.map((entry) => (
              <article key={entry.eyebrow} className="mgh-history__card">
                <img src={entry.img} alt="" />
                <p className="mgh-eyebrow">{entry.eyebrow}</p>
                <h3>{entry.title}</h3>
                <p className="mgh-history__text">{entry.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Shop with Peace in Mind */}
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

      {/* About Us */}
      <section className="mgh-section mgh-about" aria-labelledby="mgh-about-h">
        <div className="mgh-wrap mgh-about__grid">
          <div className="mgh-about__media" aria-hidden="true">
            <img src="/media/jew-sapphire-pendant.jpg" alt="" />
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
            <Link href="/about" className="mgh-btn mgh-btn--outline">Our Story</Link>
          </div>
        </div>
      </section>

      {/* Charity Work */}
      <section className="mgh-section mgh-charity" aria-labelledby="mgh-charity-h">
        <div className="mgh-wrap">
          <div className="mgh-head mgh-head--center">
            <p className="mgh-eyebrow">Giving Back</p>
            <h2 id="mgh-charity-h" className="mgh-h2">Charity Work</h2>
            <p className="mgh-lede mgh-lede--center">
              A portion of every sale returns to the places our stones come from — supporting the
              communities and landscapes that make this work possible.
            </p>
          </div>
          <div className="mgh-charity__grid">
            {CHARITY.map((cause) => (
              <article key={cause.title} className="mgh-charity__card">
                <h3>{cause.title}</h3>
                <p>{cause.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Customer Feedback */}
      <section className="mgh-section mgh-feedback" aria-labelledby="mgh-feedback-h">
        <div className="mgh-wrap">
          <div className="mgh-head mgh-head--split">
            <div>
              <p className="mgh-eyebrow">Client Words</p>
              <h2 id="mgh-feedback-h" className="mgh-h2">Customer Feedback</h2>
            </div>
            <Link href="/contact" className="mgh-link">Speak with our advisors →</Link>
          </div>
          <div className="mgh-feedback__grid">
            {TESTIMONIALS.map((t) => (
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
      </section>
    </main>
  );
}
