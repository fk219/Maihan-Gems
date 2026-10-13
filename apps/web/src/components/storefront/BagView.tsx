'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import {
  getBag,
  removeFromBag,
  subscribeAtelier,
  type AtelierItem,
} from '../../lib/atelier-store.js';
import { itemImage } from '../../lib/atelier-item.js';
import { formatMoney } from '../../lib/currency.js';
import { useStorefront } from './StorefrontProvider.js';
import { VaultEmpty } from './VaultEmpty.js';

export function BagView({
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
    setItems(getBag());
    return subscribeAtelier(() => setItems(getBag()));
  }, [forceEmpty]);

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.priceUsd, 0), [items]);
  const duty = subtotal * 0.05;

  if (items.length === 0) {
    return (
      <VaultEmpty
        kicker="The atelier bag"
        title="Your bag is at rest."
        copy="Reserve a stone, a matched pair or a mounting. Pieces stay held for private viewing."
        primaryHref="/browse"
        primaryLabel="Browse the vault"
        secondaryHref="/design-your-own"
        secondaryLabel="Design a piece"
      />
    );
  }

  return (
    <div className="lx-bag">
      <ul className="lx-bag__lines">
        {items.map((item) => (
          <li key={item.id} className="lx-bag__line">
            <Link href={`/product/${item.slug}`} className="lx-bag__thumb">
              <img src={itemImage(item)} alt={item.title} />
            </Link>
            <div className="lx-bag__copy">
              <p className="lx-card__meta">{item.kind}</p>
              <h2 className="lx-bag__title">
                <Link href={`/product/${item.slug}`}>{item.title}</Link>
              </h2>
              {item.specs ? <p className="lx-card__specs">{item.specs}</p> : null}
              <button type="button" className="lx-text-btn" onClick={() => removeFromBag(item.id)}>
                Remove
              </button>
            </div>
            <p className="lx-bag__price">{formatMoney(item.priceUsd, currency, rates)}</p>
          </li>
        ))}
      </ul>

      <aside className="lx-summary">
        <span className="lx-kicker">Reservation</span>
        <h2 className="lx-h2" style={{ fontSize: '1.8rem', marginBottom: '1.4rem' }}>Summary</h2>
        <dl className="lx-summary__rows">
          <div>
            <dt>Subtotal · {items.length} piece{items.length === 1 ? '' : 's'}</dt>
            <dd>{formatMoney(subtotal, currency, rates)}</dd>
          </div>
          <div>
            <dt>Estimated duty (5%)</dt>
            <dd>{formatMoney(duty, currency, rates)}</dd>
          </div>
          <div>
            <dt>Insured transit</dt>
            <dd>Complimentary</dd>
          </div>
          <div className="is-total">
            <dt>To reserve</dt>
            <dd>{formatMoney(subtotal + duty, currency, rates)}</dd>
          </div>
        </dl>
        <p className="lx-summary__note">
          Prices follow your selected currency ({currency}). Final settlement is confirmed by concierge.
        </p>
        <Link href="/contact" className="lx-btn lx-btn--solid lx-btn--block">Request reservation</Link>
        <Link href="/browse" className="lx-btn lx-btn--ghost lx-btn--block">Continue in the vault</Link>
      </aside>
    </div>
  );
}
