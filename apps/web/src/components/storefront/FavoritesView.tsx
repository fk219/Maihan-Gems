'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import {
  addToBag,
  getFavs,
  removeFav,
  seedListIfEmpty,
  subscribeAtelier,
  type AtelierItem,
} from '../../lib/atelier-store.js';
import { formatMoney } from '../../lib/currency.js';
import { useStorefront } from './StorefrontProvider.js';
import { VaultEmpty } from './VaultEmpty.js';

export function FavoritesView({
  demoItems,
  forceEmpty = false,
}: {
  demoItems: AtelierItem[];
  forceEmpty?: boolean;
}) {
  const { currency, rates } = useStorefront();
  const [items, setItems] = useState<AtelierItem[]>([]);

  useEffect(() => {
    if (forceEmpty) {
      setItems([]);
      return;
    }
    setItems(seedListIfEmpty('favs', demoItems));
    return subscribeAtelier(() => setItems(getFavs()));
  }, [demoItems, forceEmpty]);

  if (items.length === 0) {
    return (
      <VaultEmpty
        kicker="The private portfolio"
        title="Nothing saved yet."
        copy="Heart a stone, pair or mounting from the vault. Favourites stay on this device until you reserve them."
        primaryHref="/browse"
        primaryLabel="Explore gemstones"
        secondaryHref="/pairs"
        secondaryLabel="View matched pairs"
      />
    );
  }

  return (
    <ul className="lx-favs">
      {items.map((item) => (
        <li key={item.id} className="lx-fav">
          <Link href={`/product/${item.slug}`} className="lx-fav__media">
            <img src={item.image} alt={item.title} />
          </Link>
          <div className="lx-fav__body">
            <p className="lx-card__meta">{item.originCountry ?? item.kind}</p>
            <h2 className="lx-card__title">
              <Link href={`/product/${item.slug}`}>{item.title}</Link>
            </h2>
            {item.specs ? <p className="lx-card__specs">{item.specs}</p> : null}
            <p className="lx-card__price">{formatMoney(item.priceUsd, currency, rates)}</p>
            <div className="lx-fav__actions">
              <button type="button" className="lx-btn lx-btn--solid" onClick={() => addToBag(item)}>
                Add to bag
              </button>
              <button type="button" className="lx-text-btn" onClick={() => removeFav(item.id)}>
                Remove
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
