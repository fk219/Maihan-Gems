'use client';

import Link from 'next/link';
import { useState } from 'react';

import { CURRENCIES, type StorefrontCurrency } from '../../lib/currency.js';
import { NGC_MEDIA } from '../../lib/ngc-home.js';
import { useStorefront } from './StorefrontProvider.js';

export interface LuxuryHeaderProps {
  readonly stones: readonly { stoneType: string; pairCount: number }[];
}

const IMG = (path: string) => `${NGC_MEDIA}${path}`;

const NAV = [
  { id: 'dyo', label: 'Design Your Own', href: '/design-your-own' },
  { id: 'gemstones', label: 'Gemstones', href: '/browse' },
  { id: 'jewellery', label: 'Jewellery', href: '/jewellery' },
  { id: 'settings', label: 'Settings', href: '/settings' },
] as const;

type NavId = (typeof NAV)[number]['id'];

function Tile({ href, label, img, close }: { href: string; label: string; img?: string; close: () => void }) {
  return (
    <Link href={href} className="mega-tile" onClick={close}>
      <span>{img ? <img src={IMG(img)} alt="" /> : <b>{label.slice(0, 1)}</b>}</span>
      {label}
    </Link>
  );
}

function More({ href, close }: { href: string; close: () => void }) {
  return <Link href={href} className="mega-more" onClick={close}>View More</Link>;
}

function Promo({ close }: { close: () => void }) {
  return (
    <Link href="/design-your-own" className="mega-promo" onClick={close}>
      <img src="/media/jew-sapphire-ring.jpg" alt="" />
      <div>
        <p>Design Your Own</p>
        <strong>Unique jewellery</strong>
        <ol>
          <li>Start with a Setting</li>
          <li>Select a Gemstone</li>
          <li>Review Your Design</li>
        </ol>
        <em>Start designing</em>
      </div>
    </Link>
  );
}

const STONE = (slug: string) => `/images/normal/mainMenu/stones/${slug}.png`;
const SETTING = (slug: string) => `/images/normal/mainMenu/settingsType/${slug}.png`;

const GEM_COLORS: readonly { label: string; hex: string; href: string }[] = [
  { label: 'Bi Color', hex: '#7eb6d6', href: '/browse' },
  { label: 'Blue', hex: '#3b6fd8', href: '/colour/blue' },
  { label: 'Brown', hex: '#8a5a32', href: '/browse' },
  { label: 'Color Change', hex: '#7a4ea3', href: '/browse' },
  { label: 'Green', hex: '#3d8c4a', href: '/colour/green' },
  { label: 'Grey', hex: '#8d8d8d', href: '/browse' },
  { label: 'Multi Color', hex: '#e07a3d', href: '/browse' },
  { label: 'Orange', hex: '#e07a20', href: '/browse' },
  { label: 'Peach', hex: '#e7a08a', href: '/browse' },
  { label: 'Pink', hex: '#e48bb5', href: '/colour/pink' },
  { label: 'Purple', hex: '#7a4bd0', href: '/colour/purple' },
  { label: 'Red', hex: '#d23b3b', href: '/browse' },
  { label: 'White', hex: '#f4f4f4', href: '/browse' },
  { label: 'Yellow', hex: '#e2c04a', href: '/colour/yellow' },
];

function MenuPanel({ id, close }: { id: NavId; close: () => void }) {
  if (id === 'dyo') {
    return (
      <div className="mega-panel">
        <div className="mega-split">
          <Link href="/browse" onClick={close}><span>◇</span> Start with a Gemstone</Link>
          <span className="mega-or">or</span>
          <Link href="/settings" onClick={close}><span>○</span> Start with a Setting</Link>
          <button type="button" aria-label="Close menu" onClick={close}>×</button>
        </div>
        <div className="mega-cols">
          <div>
            <p>Shop Gemstones by Type</p>
            <div className="mega-tiles">
              {([['Garnet', 'garnet'], ['Moonstone', 'moonstone'], ['Quartz', 'quartz'], ['Spinel', 'spinel'], ['Tourmaline', 'tourmaline']] as const).map(([label, slug]) => (
                <Tile key={slug} href={`/${slug}`} label={label} img={STONE(slug)} close={close} />
              ))}
              <More href="/browse" close={close} />
            </div>
            <p>Shop Gemstones by Color</p>
            <div className="mega-tiles">
              {['Blue', 'Green', 'Pink', 'Purple', 'Yellow'].map((label) => (
                <Tile key={label} href={`/colour/${label.toLowerCase()}`} label={label} img={`/images/normal/mainMenu/stoneColor/${label.toLowerCase()}.png`} close={close} />
              ))}
              <More href="/browse" close={close} />
            </div>
          </div>
          <div>
            <p>Shop Settings by Type</p>
            <div className="mega-tiles">
              <Tile href="/settings?for=ring" label="Rings" img={SETTING('rings')} close={close} />
              <Tile href="/settings?for=ring" label="Men's Rings" img={SETTING('mens-rings')} close={close} />
              <Tile href="/settings?for=earrings" label="Earrings" img={SETTING('earrings')} close={close} />
              <Tile href="/settings?for=pendant" label="Necklaces & Pendants" img={SETTING('necklaces-pendants')} close={close} />
              <Tile href="/settings?for=bracelet" label="Bracelets" img={SETTING('bracelets')} close={close} />
            </div>
            <p>Shop Ring Settings by Style</p>
            <div className="mega-styles">
              {['Antique', 'Halo', 'Pave', 'Solitaire', 'Three Stone', 'Wedding Set'].map((label) => (
                <Link key={label} href="/settings?for=ring" onClick={close}>{label}</Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (id === 'gemstones') {
    const types = ['Amethyst', 'Aquamarine', 'Alexandrite', 'Citrine', 'Coral', 'Garnet', 'Kunzite', 'Moonstone', 'Opal', 'Spinel', 'Tanzanite', 'Topaz', 'Tourmaline', 'Turquoise', 'Zircon'];
    return (
      <div className="mega-panel mega-panel--stones">
        <button type="button" className="mega-x" aria-label="Close menu" onClick={close}>×</button>
        <div>
          <p>Shop Gemstones by Type</p>
          <div className="mega-tiles">
            {types.map((label) => (
              <Tile key={label} href={`/${label.toLowerCase().replace(/ /g, '-')}`} label={label} img={STONE(label.toLowerCase().replace(/ /g, '-'))} close={close} />
            ))}
            <More href="/browse" close={close} />
          </div>
        </div>
        <div>
          <p>Shop Gemstones by Color</p>
          <ul className="mega-colors">
            {GEM_COLORS.map((color) => (
              <li key={color.label}><Link href={color.href} onClick={close}><i style={{ background: color.hex }} />{color.label}</Link></li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  const jewellery = id === 'jewellery';
  const tiles: readonly (readonly [string, string, string])[] = jewellery
    ? [
        ['Rings', '/jewellery?type=ring', 'rings'],
        ['Earrings', '/jewellery?type=earrings', 'earrings'],
        ['Necklaces & Pendants', '/jewellery?type=pendant', 'necklaces-pendants'],
        ['Bracelets & Bangles', '/jewellery?type=bracelet', 'bracelets'],
        ["Men's Rings", '/jewellery?type=ring', 'mens-rings'],
      ]
    : [
        ['Rings', '/settings?for=ring', 'rings'],
        ["Men's Rings", '/settings?for=ring', 'mens-rings'],
        ['Earrings', '/settings?for=earrings', 'earrings'],
        ['Necklaces & Pendants', '/settings?for=pendant', 'necklaces-pendants'],
        ['Bracelets', '/settings?for=bracelet', 'bracelets'],
      ];
  return (
    <div className="mega-panel mega-panel--shop">
      <button type="button" className="mega-x" aria-label="Close menu" onClick={close}>×</button>
      <div>
        <p>{jewellery ? 'Shop Jewellery by Type' : 'Shop Settings by Type'}</p>
        <div className="mega-tiles mega-tiles--wide">
          {tiles.map(([label, href, slug]) => (
            <Tile key={label} href={href} label={label} img={SETTING(slug)} close={close} />
          ))}
        </div>
      </div>
      <Promo close={close} />
    </div>
  );
}

export function LuxuryHeader({ stones: _stones }: LuxuryHeaderProps) {
  const { currency, setCurrency, bagCount, favCount } = useStorefront();
  const [open, setOpen] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);

  return (
    <header className="ngc-header">
      <div className="ngc-top">
        <div className="ngc-top__inner">
          <span>Showroom appointment · Mon–Fri 10:00–18:00</span>
          <a href="tel:+12128049994">USA +1-212-804-9994</a>
          <Link href="/showrooms">Make appointment</Link>
          <Link href="/contact">Contact us</Link>
        </div>
      </div>
      <div className="ngc-bar">
        <button className="ngc-burger" type="button" aria-label="Menu" aria-expanded={drawer} onClick={() => setDrawer((v) => !v)}>
          <span />
          <span />
          <span />
        </button>
        <Link href="/" className="ngc-logo" aria-label="Maihan Gems">
          <span className="ngc-logo__word">MAIHAN</span>
          <span className="ngc-logo__sub">GEMS · Atelier</span>
        </Link>
        <nav className="ngc-nav" aria-label="Primary" onMouseLeave={() => setOpen(null)}>
          {NAV.map((item) => (
            <div
              key={item.id}
              className={`ngc-nav__item${open === item.id ? ' is-open' : ''}`}
              onMouseEnter={() => setOpen(item.id)}
            >
              <Link href={item.href} className="ngc-nav__link" onClick={() => setOpen(null)}>
                {item.label}
              </Link>
              {open === item.id ? <MenuPanel id={item.id} close={() => setOpen(null)} /> : null}
            </div>
          ))}
        </nav>
        <div className="ngc-tools">
          <Link href="/design-your-own" className="ngc-cta">
            Bespoke Atelier
          </Link>
          <select
            className="ngc-currency"
            aria-label="Currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value as StorefrontCurrency)}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <Link href="/search" className="ngc-iconbtn" aria-label="Search">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4 4" /></svg>
          </Link>
          <Link href="/favorites" className="ngc-iconbtn" aria-label={favCount > 0 ? `Favourites, ${favCount}` : 'Favourites'}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19s-7-4.4-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.6-7 9-7 9z" /></svg>
            {favCount > 0 ? <em>{favCount}</em> : null}
          </Link>
          <Link href="/compare" className="ngc-iconbtn" aria-label="Compare">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4v16M12 9v11M17 13v7" /></svg>
          </Link>
          <Link href="/cart" className="ngc-iconbtn" aria-label={bagCount > 0 ? `Bag, ${bagCount}` : 'Bag'}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8h12l-1 12H7L6 8z" /><path d="M9 8V7a3 3 0 0 1 6 0v1" /></svg>
            {bagCount > 0 ? <em>{bagCount}</em> : null}
          </Link>
          <Link href="/account" className="ngc-iconbtn" aria-label="Account">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.2" /><path d="M5 19c1.4-3 3.8-4.5 7-4.5S17.6 16 19 19" /></svg>
          </Link>
        </div>
      </div>
      {drawer ? (
        <div className="ngc-drawer">
          {NAV.map((item) => (
            <Link key={item.id} href={item.href} onClick={() => setDrawer(false)}>{item.label}</Link>
          ))}
          <Link href="/design-your-own" className="ngc-drawer__cta" onClick={() => setDrawer(false)}>
            Bespoke Atelier
          </Link>
        </div>
      ) : null}
    </header>
  );
}
