import type { ReactNode } from 'react';
import Link from 'next/link';

import { swatchFor } from '../../lib/ngc/colors.js';

export interface LandingTile {
  readonly href: string;
  readonly label: string;
  readonly image?: string | null;
  readonly count?: number;
  readonly swatch?: string;
}

export function CategoryLanding({
  kicker,
  title,
  lede,
  cta,
  tiles,
  colours,
  heroImage,
  children,
}: {
  kicker: string;
  title: string;
  lede: string;
  cta: { href: string; label: string };
  tiles: readonly LandingTile[];
  colours?: readonly { name: string; href: string }[];
  heroImage?: string | null;
  children?: ReactNode;
}) {
  return (
    <main className="ngc-page">
      <header className="lx-page-hero">
        {heroImage ? <img className="lx-page-hero__photo" src={heroImage} alt="" /> : null}
        <div className="lx-page-hero__veil" />
        <div className="lx-wrap lx-page-hero__copy">
          <p className="lx-kicker">{kicker}</p>
          <h1 className="lx-h1">{title}</h1>
          <p className="lx-lede">{lede}</p>
          <p>
            <Link href={cta.href} className="lx-btn lx-btn--solid">
              {cta.label}
            </Link>
          </p>
        </div>
      </header>
      <div className="lx-section">
        <div className="lx-wrap">
          {tiles.length > 0 ? (
            <div className="lx-landing-grid">
              {tiles.map((tile) => (
                <Link key={tile.href} href={tile.href} className="lx-landing-tile">
                  <span className="lx-landing-tile__media">
                    {tile.image ? <img src={tile.image} alt="" /> : <span className="lx-skel" />}
                  </span>
                  <span className="lx-landing-tile__name">{tile.label}</span>
                  {tile.count != null ? <span className="lx-landing-tile__meta">{tile.count}</span> : null}
                </Link>
              ))}
            </div>
          ) : null}
          {colours && colours.length > 0 ? (
            <section className="lx-colour-row" aria-label="Shop by colour">
              <h2 className="lx-h3">By colour</h2>
              <ul>
                {colours.map((color) => (
                  <li key={color.name}>
                    <Link href={color.href}>
                      <i style={{ background: swatchFor(color.name) }} />
                      {color.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {children}
        </div>
      </div>
    </main>
  );
}
