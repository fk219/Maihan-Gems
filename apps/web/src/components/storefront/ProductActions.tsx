'use client';

import { useEffect, useState } from 'react';

import { addToBag, getBag, isCompared, isFav, subscribeAtelier, toggleCompare, toggleFav, type AtelierItem } from '../../lib/atelier-store.js';
import { formatMoney } from '../../lib/currency.js';
import { useStorefront } from './StorefrontProvider.js';

export function ProductActions({ item }: { item: AtelierItem }) {
  const { currency, rates } = useStorefront();
  const [fav, setFav] = useState(false);
  const [compared, setCompared] = useState(false);
  const [held, setHeld] = useState(false);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const sync = () => {
      setFav(isFav(item.id));
      setCompared(isCompared(item.id));
      setHeld(getBag().some((row) => row.id === item.id));
    };
    sync();
    return subscribeAtelier(sync);
  }, [item.id]);

  return (
    <div className="lx-pdp-actions">
      <p className="lx-pdp-price">{formatMoney(item.priceUsd, currency, rates)}</p>
      <p className="lx-card__specs">
        {formatMoney(item.priceUsd, 'USD', rates)} · {formatMoney(item.priceUsd, 'AED', rates)} · {formatMoney(item.priceUsd, 'THB', rates)}
      </p>
      <div className="lx-pdp-actions__row" style={{ alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <label htmlFor={`qty-${item.id}`} className="lx-card__meta" style={{ margin: 0 }}>
          Qty
        </label>
        <select
          id={`qty-${item.id}`}
          aria-label="Quantity"
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
          style={{
            padding: '0.55rem 0.75rem',
            border: '1px solid var(--hairline-border)',
            background: '#fff',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.85rem',
          }}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="lx-btn lx-btn--solid"
          onClick={() => {
            addToBag(item, quantity);
            setHeld(true);
          }}
        >
          {held ? 'Held in bag (+add)' : 'Add to bag'}
        </button>
        <button type="button" className="lx-btn lx-btn--ghost" onClick={() => setFav(toggleFav(item))}>
          {fav ? 'Saved' : 'Favourite'}
        </button>
        <button type="button" className="lx-text-btn" onClick={() => setCompared(toggleCompare(item))}>
          {compared ? 'In compare' : 'Compare'}
        </button>
      </div>
    </div>
  );
}
