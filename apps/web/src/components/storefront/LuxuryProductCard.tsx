'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { addToBag, isCompared, isFav, toggleCompare, toggleFav } from '../../lib/atelier-store.js';
import { cardSpecs, cardToAtelier } from '../../lib/atelier-item.js';
import { formatMoney } from '../../lib/currency.js';
import { productImage } from '../../lib/storefront-images.js';
import type { StorefrontCard } from '../../lib/storefront-types.js';
import { useStorefront } from './StorefrontProvider.js';

export function LuxuryProductCard({ product }: { product: StorefrontCard }) {
  const { currency, rates } = useStorefront();
  const image = productImage({
    kind: product.kind,
    stoneType: product.stoneType,
    jewelryType: product.jewelryType,
    settingFor: product.settingFor,
    style: product.style,
    title: product.title,
    colorHue: product.colorHue,
    variety: product.variety,
    quantityType: product.quantityType,
    imageUrl: product.imageUrl,
  });
  const [fav, setFav] = useState(false);
  const [compared, setCompared] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setFav(isFav(product.id));
    setCompared(isCompared(product.id));
  }, [product.id]);

  const item = cardToAtelier(product);

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
          <div className="lx-card__specs">{cardSpecs(product)}</div>
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
              <p className="lx-card__specs">{cardSpecs(product)}</p>
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
                <button type="button" className="lx-text-btn" onClick={() => setCompared(toggleCompare(item))}>
                  {compared ? 'Remove from compare' : 'Add to compare'}
                </button>
                {' · '}
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
