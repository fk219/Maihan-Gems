'use client';

import Link from 'next/link';
import { useState } from 'react';

import { displayStoneName, stoneTypeToSlug } from '../../lib/search-parser.js';
import { CURRENCIES, type StorefrontCurrency } from '../../lib/currency.js';
import { useStorefront } from './StorefrontProvider.js';

export interface LuxuryHeaderProps {
  readonly stones: readonly { stoneType: string; pairCount: number }[];
}

export function LuxuryHeader({ stones }: LuxuryHeaderProps) {
  const { currency, setCurrency, bagCount, favCount } = useStorefront();
  const [open, setOpen] = useState(false);

  return (
    <header className="lx-header">
      <div className="lx-header__bar">
        <button className="lx-icon lx-burger" type="button" aria-label="Menu" onClick={() => setOpen((v) => !v)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>

        <Link href="/" className="lx-brand" aria-label="Maihan Gems">
          <span className="lx-brand__mark">MAIHAN</span>
          <span className="lx-brand__sub">Gems</span>
        </Link>

        <nav className="lx-nav" aria-label="Primary">
          <div className="lx-nav__item">
            <Link className="lx-nav__link" href="/browse">Gemstones</Link>
            <div className="lx-mega">
              <Link href="/browse">All gemstones</Link>
              {stones.map((s) => (
                <Link key={s.stoneType} href={`/${stoneTypeToSlug(s.stoneType)}`}>
                  {displayStoneName(s.stoneType)}
                </Link>
              ))}
            </div>
          </div>
          <div className="lx-nav__item">
            <Link className="lx-nav__link" href="/pairs">Pairs</Link>
            <div className="lx-mega">
              <Link href="/pairs">All matched pairs</Link>
              {stones.filter((s) => s.pairCount > 0).map((s) => (
                <Link key={s.stoneType} href={`/${stoneTypeToSlug(s.stoneType)}-pairs`}>
                  {displayStoneName(s.stoneType)} pairs
                </Link>
              ))}
            </div>
          </div>
          <div className="lx-nav__item">
            <Link className="lx-nav__link" href="/jewellery">Jewellery</Link>
            <div className="lx-mega">
              <Link href="/jewellery">All jewellery</Link>
              <Link href="/jewellery?type=ring">Rings</Link>
              <Link href="/jewellery?type=earrings">Earrings</Link>
              <Link href="/jewellery?type=pendant">Pendants</Link>
              <Link href="/jewellery?type=bracelet">Bracelets</Link>
              <Link href="/jewellery?type=necklace">Necklaces</Link>
            </div>
          </div>
          <div className="lx-nav__item">
            <Link className="lx-nav__link" href="/settings">Settings</Link>
            <div className="lx-mega">
              <Link href="/settings">All settings</Link>
              <Link href="/settings?for=ring">Ring settings</Link>
              <Link href="/settings?for=earrings">Earring settings</Link>
              <Link href="/settings?for=pendant">Pendant settings</Link>
              <Link href="/design-your-own">Design your own</Link>
            </div>
          </div>
          <Link className="lx-nav__link" href="/design-your-own">Design Your Own</Link>
          <Link className="lx-nav__link" href="/about">About</Link>
        </nav>

        <div className="lx-tools">
          <select
            className="lx-fx"
            aria-label="Currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value as StorefrontCurrency)}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <Link href="/search" className="lx-icon" aria-label="Search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
          </Link>
          <Link href="/compare" className="lx-icon" aria-label="Compare">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M6 4v16M12 8v12M18 12v8" />
            </svg>
          </Link>
          <Link href="/favorites" className="lx-icon" aria-label="Favourites">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.6-7 10-7 10z" />
            </svg>
            {favCount > 0 ? <span className="lx-badge">{favCount}</span> : null}
          </Link>
          <Link href="/cart" className="lx-icon" aria-label="Bag">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M6 8h12l-1 13H7L6 8z" />
              <path d="M9 8V7a3 3 0 0 1 6 0v1" />
            </svg>
            {bagCount > 0 ? <span className="lx-badge">{bagCount}</span> : null}
          </Link>
        </div>
      </div>

      <div className={`lx-drawer${open ? ' is-open' : ''}`}>
        <Link href="/browse" onClick={() => setOpen(false)}>Gemstones</Link>
        <Link href="/pairs" onClick={() => setOpen(false)}>Pairs</Link>
        <Link href="/jewellery" onClick={() => setOpen(false)}>Jewellery</Link>
        <Link href="/settings" onClick={() => setOpen(false)}>Settings</Link>
        <Link href="/design-your-own" onClick={() => setOpen(false)}>Design Your Own</Link>
        <Link href="/about" onClick={() => setOpen(false)}>About</Link>
        {stones.slice(0, 8).map((s) => (
          <Link key={s.stoneType} href={`/${stoneTypeToSlug(s.stoneType)}`} onClick={() => setOpen(false)}>
            {displayStoneName(s.stoneType)}
          </Link>
        ))}
      </div>
    </header>
  );
}
