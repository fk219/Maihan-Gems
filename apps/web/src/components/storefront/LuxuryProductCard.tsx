'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { addToBag, isFav, toggleFav, type AtelierItem } from '../../lib/atelier-store.js';
import { formatMoney } from '../../lib/currency.js';
import { productImage } from '../../lib/storefront-images.js';
import type { StorefrontCard } from '../../lib/storefront-types.js';
import { useStorefront } from './StorefrontProvider.js';

function specs(product: StorefrontCard): string {
  const parts: string[] = [];
  if (product.caratTotal) parts.push(`${product.caratTotal} ct`);
  if (product.shape) parts.push(product.shape.replace(/_/g, ' '));
  if (product.originCountry) parts.push(product.originCountry);
  if (product.settingFor) parts.push(product.settingFor);
  if (product.jewelryType) parts.push(product.jewelryType);
  if (product.metalColor) parts.push(product.metalColor);
  return parts.join(' · ');
}

function toItem(product: StorefrontCard, image: string): AtelierItem {
  return {
    id: product.id,
    slug: product.slug,
    title: product.title,
    kind: product.kind,
    priceUsd: product.priceUsd,
    image,
    specs: specs(product),
  };
}

export function LuxuryProductCard({ product }: { product: StorefrontCard }) {
  const { currency, rates } = useStorefront();
  const image = productImage({
    kind: product.kind,
    stoneType: product.stoneType,
    jewelryType: product.jewelryType,
    settingFor: product.settingFor,
    style: product.style,
    title: product.title,
  });
  const [fav, setFav] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setFav(isFav(product.id));
  }, [product.id]);

  const item = toItem(product, image);

  return (
    <>
      <article className="lx-card">
        <div className="lx-card__media">
          <Link href={`/product/${product.slug}`}>
            <img src={image} alt={product.title} />
          </Link>
          <button
            type="button"
            className={`lx-heart${fav ? ' is-on' : ''}`}
            aria-label={fav ? 'Remove favourite' : 'Save favourite'}
            onClick={() => setFav(toggleFav(item))}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill={fav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.7">
              <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.6-7 10-7 10z" />
            </svg>
          </button>
          <button type="button" className="lx-quick" onClick={() => setOpen(true)}>
            Quick view
          </button>
        </div>
        <div className="lx-card__body">
          <div className="lx-card__meta">
            {(product.originCountry ?? product.kind).replace(/_/g, ' ')}
            {product.treatment ? ` · ${product.treatment.replace(/_/g, ' ')}` : ''}
          </div>
          <h3 className="lx-card__title">
            <Link href={`/product/${product.slug}`}>{product.title}</Link>
          </h3>
          <div className="lx-card__specs">{specs(product)}</div>
          <div className="lx-card__price">{formatMoney(product.priceUsd, currency, rates)}</div>
        </div>
      </article>

      {open ? (
        <div className="lx-modal" role="dialog" aria-modal="true" onClick={() => setOpen(false)}>
          <div className="lx-modal__panel" onClick={(e) => e.stopPropagation()}>
            <img src={image} alt={product.title} />
            <div className="lx-modal__copy">
              <p className="lx-kicker">{product.kind}</p>
              <h3 className="lx-h2" style={{ fontSize: '2rem' }}>{product.title}</h3>
              <p className="lx-card__specs">{specs(product)}</p>
              <p className="lx-card__price" style={{ fontSize: '1.15rem', margin: '1rem 0 1.4rem' }}>
                {formatMoney(product.priceUsd, currency, rates)}
              </p>
              <button
                type="button"
                className="lx-search__box"
                style={{ display: 'inline-flex', padding: 0 }}
                onClick={() => {
                  addToBag(item);
                  setOpen(false);
                }}
              >
                <span style={{ padding: '0.9rem 1.4rem', letterSpacing: '0.16em', textTransform: 'uppercase', fontSize: '0.68rem', background: '#08121e', color: '#fff' }}>
                  Add to bag
                </span>
              </button>
              <p style={{ marginTop: '1rem' }}>
                <Link href={`/product/${product.slug}`}>View full details</Link>
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function ProductGrid({ products }: { products: StorefrontCard[] }) {
  return (
    <div className="lx-grid">
      {products.map((product) => (
        <LuxuryProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
