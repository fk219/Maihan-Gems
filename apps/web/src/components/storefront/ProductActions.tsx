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
      <div className="lx-pdp-actions__row">
        <button
          type="button"
          className="lx-btn lx-btn--solid"
          onClick={() => {
            addToBag(item);
            setHeld(true);
          }}
        >
          {held ? 'Held in bag' : 'Add to bag'}
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
