'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import {
  addToBag,
  getFavs,
  removeFav,
  subscribeAtelier,
  type AtelierItem,
} from '../../lib/atelier-store.js';
import { itemImage } from '../../lib/atelier-item.js';
import { formatMoney } from '../../lib/currency.js';
import { useStorefront } from './StorefrontProvider.js';
import { VaultEmpty } from './VaultEmpty.js';

export function FavoritesView({
  forceEmpty = false,
}: {
  forceEmpty?: boolean;
}) {
  const { currency, rates } = useStorefront();
  const [items, setItems] = useState<AtelierItem[]>([]);

  useEffect(() => {
    if (forceEmpty) {
      setItems([]);
      return;
    }
    const sync = () => {
      const localFavs = getFavs();
      setItems(localFavs);
      if (typeof fetch === 'function') {
        void fetch('/api/v1/favorites')
          .then((r) => (r.ok ? r.json() : null))
          .then(
            (
              body: {
                data?: {
                  items?: Array<{
                    product_id: string;
                    slug: string;
                    title: string;
                    kind: string;
                    price_amount: string | null;
                    primary_image_url: string | null;
                  }>;
                };
              } | null,
            ) => {
              const serverList = body?.data?.items;
              if (!Array.isArray(serverList) || serverList.length === 0) return;
              const seen = new Set(localFavs.map((f) => f.id));
              const merged = [...localFavs];
              for (const s of serverList) {
                if (seen.has(s.product_id)) continue;
                seen.add(s.product_id);
                merged.push({
                  id: s.product_id,
                  slug: s.slug,
                  title: s.title,
                  kind: s.kind,
                  priceUsd: Number(s.price_amount ?? 0),
                  image: s.primary_image_url ?? '',
                });
              }
              setItems(merged);
            },
          )
          .catch(() => undefined);
      }
    };
    sync();
    return subscribeAtelier(sync);
  }, [forceEmpty]);

  async function handleRemoveFav(id: string): Promise<void> {
    removeFav(id);
    if (typeof fetch === 'function') {
      await fetch(`/api/v1/favorites/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => undefined);
    }
  }

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
            <img src={itemImage(item)} alt={item.title} />
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
              <button type="button" className="lx-text-btn" onClick={() => void handleRemoveFav(item.id)}>
                Remove
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
