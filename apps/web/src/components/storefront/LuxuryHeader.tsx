'use client';

import Link from 'next/link';
import { useState } from 'react';

import { CURRENCIES, type StorefrontCurrency } from '../../lib/currency.js';
import { NGC_MEDIA } from '../../lib/ngc-home.js';
import { useStorefront } from './StorefrontProvider.js';

export interface LuxuryHeaderProps {
  readonly stones: readonly { stoneType: string; pairCount: number }[];
}

interface NavLink {
  readonly label: string;
  readonly href: string;
  readonly img?: string;
}

interface NavColumn {
  readonly title: string;
  readonly links: readonly NavLink[];
}

interface NavGroup {
  readonly id: string;
  readonly label: string;
  readonly href: string;
  readonly columns: readonly NavColumn[];
}

const IMG = (path: string) => `${NGC_MEDIA}${path}`;

const GROUPS: readonly NavGroup[] = [
  {
    id: 'gemstones',
    label: 'Gemstones',
    href: '/browse',
    columns: [
      {
        title: 'Shop Gemstones by Type',
        links: [
          { label: 'Garnet', href: '/garnet', img: '/images/normal/mainMenu/stones/garnet.png' },
          { label: 'Moonstone', href: '/moonstone', img: '/images/normal/mainMenu/stones/moonstone.png' },
          { label: 'Quartz', href: '/quartz', img: '/images/normal/mainMenu/stones/quartz.png' },
          { label: 'Spinel', href: '/spinel', img: '/images/normal/mainMenu/stones/spinel.png' },
          { label: 'Tourmaline', href: '/tourmaline', img: '/images/normal/mainMenu/stones/tourmaline.png' },
          { label: 'View More', href: '/browse' },
        ],
      },
      {
        title: 'Shop Gemstones by Color',
        links: [
          { label: 'Blue', href: '/colour/blue' },
          { label: 'Green', href: '/colour/green' },
          { label: 'Pink', href: '/colour/pink' },
          { label: 'Purple', href: '/colour/purple' },
          { label: 'Yellow', href: '/colour/yellow' },
          { label: 'View More', href: '/browse' },
        ],
      },
    ],
  },
  {
    id: 'dyo',
    label: 'Design Your Own',
    href: '/design-your-own',
    columns: [
      {
        title: 'Create Your Dream Design',
        links: [
          { label: 'Start with a Gemstone', href: '/browse' },
          { label: 'Start with a Setting', href: '/settings' },
          { label: 'How it works', href: '/design-your-own' },
        ],
      },
    ],
  },
  {
    id: 'rings',
    label: 'Rings',
    href: '/jewellery?type=ring',
    columns: [
      {
        title: 'Shop Rings by Gemstone',
        links: [
          { label: 'Garnet rings', href: '/garnet' },
          { label: 'Moonstone rings', href: '/moonstone' },
          { label: 'Opal rings', href: '/opal' },
          { label: 'Spinel rings', href: '/spinel' },
          { label: 'Tanzanite rings', href: '/tanzanite' },
          { label: 'Tourmaline rings', href: '/tourmaline' },
          { label: 'All rings', href: '/jewellery?type=ring' },
        ],
      },
      {
        title: 'Shop Ring Settings by Style',
        links: [
          { label: 'Solitaire', href: '/settings?for=ring' },
          { label: 'Halo', href: '/settings?for=ring' },
          { label: 'Pavé', href: '/settings?for=ring' },
          { label: 'Three stone', href: '/settings?for=ring' },
          { label: 'Antique', href: '/settings?for=ring' },
          { label: 'All settings', href: '/settings?for=ring' },
        ],
      },
    ],
  },
  {
    id: 'jewelry',
    label: 'Jewelry',
    href: '/jewellery',
    columns: [
      {
        title: 'Shop Jewelry by Type',
        links: [
          { label: 'Rings', href: '/jewellery?type=ring' },
          { label: 'Earrings', href: '/jewellery?type=earrings' },
          { label: 'Necklaces & Pendants', href: '/jewellery?type=pendant' },
          { label: 'Bracelets & Bangles', href: '/jewellery?type=bracelet' },
          { label: "Men's Rings", href: '/jewellery?type=ring' },
        ],
      },
      {
        title: 'Popular Gemstones',
        links: [
          { label: 'Amethyst', href: '/amethyst' },
          { label: 'Aquamarine', href: '/aquamarine' },
          { label: 'Opal', href: '/opal' },
          { label: 'Tanzanite', href: '/tanzanite' },
          { label: 'Topaz', href: '/topaz' },
          { label: 'Tourmaline', href: '/tourmaline' },
        ],
      },
    ],
  },
  {
    id: 'pairs',
    label: 'Gemstone Pairs',
    href: '/pairs',
    columns: [
      {
        title: 'Matched pairs',
        links: [
          { label: 'All pairs', href: '/pairs' },
          { label: 'Tourmaline pairs', href: '/tourmaline' },
          { label: 'Garnet pairs', href: '/garnet' },
          { label: 'Spinel pairs', href: '/spinel' },
        ],
      },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    href: '/settings',
    columns: [
      {
        title: 'Shop Settings by Type',
        links: [
          { label: 'Rings', href: '/settings?for=ring', img: '/images/normal/mainMenu/settingsType/rings.png' },
          { label: "Men's Rings", href: '/settings?for=ring', img: '/images/normal/mainMenu/settingsType/mens-rings.png' },
          { label: 'Earrings', href: '/settings?for=earrings', img: '/images/normal/mainMenu/settingsType/earrings.png' },
          { label: 'Necklaces & Pendants', href: '/settings?for=pendant', img: '/images/normal/mainMenu/settingsType/necklaces-pendants.png' },
          { label: 'Bracelets', href: '/settings?for=bracelet', img: '/images/normal/mainMenu/settingsType/bracelets.png' },
        ],
      },
    ],
  },
  {
    id: 'education',
    label: 'Education',
    href: '/education',
    columns: [
      {
        title: 'Learn',
        links: [
          { label: 'Beginner’s guide', href: '/education' },
          { label: 'Gemstone types', href: '/varieties' },
          { label: 'Mining', href: '/education' },
          { label: 'Blog', href: '/blog' },
        ],
      },
    ],
  },
  {
    id: 'about',
    label: 'About',
    href: '/about',
    columns: [
      {
        title: 'The house',
        links: [
          { label: 'About us', href: '/about' },
          { label: 'Showroom', href: '/showrooms' },
          { label: 'Contact', href: '/contact' },
          { label: 'FAQ', href: '/policy/shipping' },
        ],
      },
    ],
  },
];

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
        <button className="ngc-burger" type="button" aria-label="Menu" onClick={() => setDrawer((v) => !v)}>
          <span />
          <span />
          <span />
        </button>
        <Link href="/" className="ngc-logo" aria-label="Maihan Gems">
          MAIHAN
          <small>Gems</small>
        </Link>
        <nav className="ngc-nav" aria-label="Primary" onMouseLeave={() => setOpen(null)}>
          {GROUPS.map((group) => (
            <div
              key={group.id}
              className={`ngc-nav__item${open === group.id ? ' is-open' : ''}`}
              onMouseEnter={() => setOpen(group.id)}
            >
              <Link href={group.href} className="ngc-nav__link" onClick={() => setOpen(null)}>
                {group.label}
              </Link>
              <div className="ngc-drop" hidden={open !== group.id}>
                {group.columns.map((col) => (
                  <div key={col.title} className="ngc-drop__col">
                    <p className="ngc-drop__title">{col.title}</p>
                    <ul>
                      {col.links.map((link) => (
                        <li key={link.label}>
                          <Link href={link.href} onClick={() => setOpen(null)}>
                            {link.img ? <img src={IMG(link.img)} alt="" width={36} height={36} /> : null}
                            <span>{link.label}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="ngc-tools">
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
          {GROUPS.map((group) => (
            <div key={group.id}>
              <Link href={group.href} onClick={() => setDrawer(false)}>{group.label}</Link>
              {group.columns.flatMap((col) => col.links).slice(0, 4).map((link) => (
                <Link key={link.label} href={link.href} className="ngc-drawer__sub" onClick={() => setDrawer(false)}>
                  {link.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
      ) : null}
    </header>
  );
}
