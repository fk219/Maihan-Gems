import type { ReactNode } from 'react';
import Link from 'next/link';

import { EmptyState } from '../design-system/EmptyState.js';
import type { StorefrontCard } from '../../lib/storefront-types.js';
import { CollectionBrowser } from './CollectionFilters.js';
import { VaultReveal } from './VaultReveal.js';

const FACET_LINKS = [
  { suffix: '', label: 'Stones' },
  { suffix: '-pairs', label: 'Pairs' },
  { suffix: '-rings', label: 'Rings' },
  { suffix: '-earrings', label: 'Earrings' },
  { suffix: '-pendants', label: 'Pendants' },
  { suffix: '-settings', label: 'Settings' },
] as const;

export function CollectionPage({
  kicker,
  title,
  lede,
  products,
  stoneSlug,
  chips,
  cta,
  heroImage,
}: {
  kicker: string;
  title: string;
  lede?: string;
  products: StorefrontCard[];
  stoneSlug?: string;
  chips?: ReactNode;
  cta?: { href: string; label: string };
  heroImage?: string | null;
}) {
  return (
    <main className="ngc-page">
      <header className="lx-page-hero">
        {heroImage ? <img className="lx-page-hero__photo" src={heroImage} alt="" /> : null}
        <div className="lx-page-hero__veil" />
        <div className="lx-wrap lx-page-hero__copy">
          <nav className="lx-crumb lx-crumb--on-hero" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span aria-hidden="true">/</span>
            <span>{title}</span>
          </nav>
          <span className="lx-kicker">{kicker}</span>
          <h1 className="lx-h1">{title}</h1>
          {lede ? <p className="lx-lede">{lede}</p> : null}
          {cta ? (
            <p>
              <Link href={cta.href} className="lx-btn lx-btn--solid">
                {cta.label}
              </Link>
            </p>
          ) : null}
        </div>
      </header>
      <div className="lx-section">
        <div className="lx-wrap lx-wrap--wide">
          <VaultReveal stagger={60}>
            {stoneSlug ? (
              <nav className="lx-facets" aria-label="Collection facets">
                {FACET_LINKS.map((link) => (
                  <Link key={link.suffix || 'stone'} href={`/${stoneSlug}${link.suffix}`}>
                    {link.label}
                  </Link>
                ))}
              </nav>
            ) : null}
            {chips ? <nav className="lx-facets" aria-label="Stone types">{chips}</nav> : null}
          </VaultReveal>
          {products.length > 0 ? (
            <CollectionBrowser products={products} />
          ) : (
            <EmptyState
              title="Nothing in this drawer just now."
              action={
                <Link href="/browse" className="lx-btn lx-btn--solid">
                  Browse the vault
                </Link>
              }
            >
              <p>Browse another facet, or search the full catalogue.</p>
            </EmptyState>
          )}
        </div>
      </div>
    </main>
  );
}
