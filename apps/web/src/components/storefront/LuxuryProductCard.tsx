'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { addToBag, getBag, isCompared, isFav, subscribeAtelier, toggleCompare, toggleFav } from '../../lib/atelier-store.js';
import { cardSpecs, cardToAtelier } from '../../lib/atelier-item.js';
import { formatMoney } from '../../lib/currency.js';
import type { StorefrontCard } from '../../lib/storefront-types.js';
import { isRepresentativeImage, productImage } from '../../lib/storefront-images.js';
import { useStorefront } from './StorefrontProvider.js';

export function LuxuryProductCard({ product }: { product: StorefrontCard }) {
  const { currency, rates } = useStorefront();
  const representative = isRepresentativeImage({
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
  const hover = product.hoverImageUrl && product.hoverImageUrl !== image ? product.hoverImageUrl : null;
  const [fav, setFav] = useState(false);
  const [compared, setCompared] = useState(false);
  const [held, setHeld] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const sync = () => {
      setFav(isFav(product.id));
      setCompared(isCompared(product.id));
      setHeld(getBag().some((item) => item.id === product.id));
    };
    sync();
    return subscribeAtelier(sync);
  }, [product.id]);

  const item = cardToAtelier(product);

  return (
    <>
      <article className="lx-card">
        <div className="lx-card__media">
          <Link href={`/product/${product.slug}`}>
            <img src={image} alt={representative ? `Representative image — ${product.title}` : product.title} />
            {hover ? <img src={hover} alt="" className="lx-card__hover" /> : null}
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
          <button
            type="button"
            className={`lx-compare-icon${compared ? ' is-on' : ''}`}
            aria-label={compared ? 'Remove from compare' : 'Add to compare'}
            onClick={() => setCompared(toggleCompare(item))}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M7 4v16M12 9v11M17 13v7" />
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
          <div className="lx-card__actions">
            <button
              type="button"
              className="lx-text-btn"
              onClick={() => {
                addToBag(item);
                setHeld(true);
              }}
            >
              {held ? 'Held in bag' : 'Add to bag'}
            </button>
            <Link href={`/product/${product.slug}`} className="lx-text-btn lx-card__view">
              View
            </Link>
          </div>
        </div>
      </article>

      {open ? (
        <div className="lx-modal" role="dialog" aria-modal="true" onClick={() => setOpen(false)}>
          <div className="lx-modal__panel" onClick={(e) => e.stopPropagation()}>
            <img src={image} alt={representative ? `Representative image — ${product.title}` : product.title} />
            <div className="lx-modal__copy">
              <p className="lx-kicker">{product.kind}</p>
              <h3 className="lx-h2" style={{ fontSize: '2rem' }}>{product.title}</h3>
              <p className="lx-card__specs">{cardSpecs(product)}</p>
              <p className="lx-card__price" style={{ fontSize: '1.15rem', margin: '1rem 0 1.4rem' }}>
                {formatMoney(product.priceUsd, currency, rates)}
              </p>
              <button
                type="button"
                className="lx-btn lx-btn--solid"
                onClick={() => {
                  addToBag(item);
                  setOpen(false);
                }}
              >
                Add to bag
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

export function ProductGrid({
  products,
  view = 'grid',
}: {
  products: StorefrontCard[];
  view?: 'grid' | 'list';
}) {
  return (
    <div className={`lx-grid${view === 'list' ? ' is-list' : ''}`}>
      {products.map((product) => (
        <LuxuryProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
