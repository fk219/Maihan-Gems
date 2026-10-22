'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import {
  getBag,
  removeFromBag,
  subscribeAtelier,
  updateBagQuantity,
  type AtelierItem,
} from '../../lib/atelier-store.js';
import { itemImage } from '../../lib/atelier-item.js';
import { formatMoney } from '../../lib/currency.js';
import { useStorefront } from './StorefrontProvider.js';
import { VaultEmpty } from './VaultEmpty.js';

interface ServerCartItem {
  id: string;
  product_id: string;
  product_slug: string;
  title: string;
  configuration_id: string | null;
  quantity: number;
  unit_price: string;
  line_total: string;
}

type UnifiedBagItem = AtelierItem & {
  serverItemId?: string;
  serverCartToken?: string;
};

export function BagView({
  forceEmpty = false,
}: {
  forceEmpty?: boolean;
}) {
  const { currency, rates } = useStorefront();
  const [localItems, setLocalItems] = useState<AtelierItem[]>([]);
  const [serverItems, setServerItems] = useState<UnifiedBagItem[]>([]);

  async function loadServerCart(): Promise<void> {
    if (typeof window === 'undefined' || forceEmpty) {
      setServerItems([]);
      return;
    }
    const token = window.localStorage.getItem('maihan_cart_token');
    if (!token) {
      setServerItems([]);
      return;
    }
    try {
      const res = await fetch(`/api/v1/carts/${encodeURIComponent(token)}`);
      if (!res.ok) {
        setServerItems([]);
        return;
      }
      const body = (await res.json()) as {
        data?: { state?: string; items?: ServerCartItem[] };
      };
      if (body.data?.state !== 'ACTIVE' || !Array.isArray(body.data.items)) {
        setServerItems([]);
        return;
      }
      setServerItems(
        body.data.items.map((item) => ({
          id: item.product_id,
          slug: item.product_slug,
          title: item.title,
          kind: item.configuration_id ? 'Bespoke DYO Configuration' : 'Vault piece',
          priceUsd: Number(item.unit_price) || 0,
          quantity: item.quantity,
          image: '',
          specs: item.configuration_id ? `DYO Commission · Slug ${item.product_slug}` : undefined,
          serverItemId: item.id,
          serverCartToken: token,
        })),
      );
    } catch {
      setServerItems([]);
    }
  }

  useEffect(() => {
    if (forceEmpty) {
      setLocalItems([]);
      setServerItems([]);
      return;
    }
    const sync = () => {
      setLocalItems(getBag());
      void loadServerCart();
    };
    sync();
    return subscribeAtelier(sync);
  }, [forceEmpty]);

  const items = useMemo<UnifiedBagItem[]>(() => {
    const seenIds = new Set(serverItems.map((s) => s.id));
    const seenSlugs = new Set(serverItems.map((s) => s.slug.toLowerCase()));
    const merged: UnifiedBagItem[] = [...serverItems];
    for (const loc of localItems) {
      if (seenIds.has(loc.id) || seenSlugs.has(loc.slug.toLowerCase())) continue;
      merged.push(loc);
    }
    return merged;
  }, [serverItems, localItems]);

  async function handleUpdateQty(item: UnifiedBagItem, nextQty: number): Promise<void> {
    if (item.serverCartToken && item.serverItemId) {
      if (nextQty <= 0) {
        await handleRemoveItem(item);
        return;
      }
      await fetch(
        `/api/v1/carts/${encodeURIComponent(item.serverCartToken)}/items/${encodeURIComponent(item.serverItemId)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quantity: nextQty }),
        },
      ).catch(() => undefined);
      await loadServerCart();
    }
    updateBagQuantity(item.id, nextQty);
  }

  async function handleRemoveItem(item: UnifiedBagItem): Promise<void> {
    if (item.serverCartToken && item.serverItemId) {
      await fetch(
        `/api/v1/carts/${encodeURIComponent(item.serverCartToken)}/items/${encodeURIComponent(item.serverItemId)}`,
        { method: 'DELETE' },
      ).catch(() => undefined);
      await loadServerCart();
    }
    removeFromBag(item.id);
  }

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.priceUsd * (item.quantity ?? 1), 0),
    [items],
  );
  const totalPieceCount = useMemo(
    () => items.reduce((sum, item) => sum + (item.quantity ?? 1), 0),
    [items],
  );

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
        {items.map((item) => {
          const qty = item.quantity ?? 1;
          return (
            <li key={item.serverItemId ?? item.id} className="lx-bag__line">
              <Link href={`/product/${item.slug}`} className="lx-bag__thumb">
                <img src={itemImage(item)} alt={item.title} />
              </Link>
              <div className="lx-bag__copy">
                <p className="lx-card__meta">{item.kind}</p>
                <h2 className="lx-bag__title">
                  <Link href={`/product/${item.slug}`}>{item.title}</Link>
                </h2>
                {item.specs ? <p className="lx-card__specs">{item.specs}</p> : null}
                <div className="lx-bag__qty">
                  <button
                    type="button"
                    className="lx-text-btn"
                    aria-label={`Decrease quantity for ${item.title}`}
                    onClick={() => void handleUpdateQty(item, qty - 1)}
                  >
                    −
                  </button>
                  <span>Qty {qty}</span>
                  <button
                    type="button"
                    className="lx-text-btn"
                    aria-label={`Increase quantity for ${item.title}`}
                    onClick={() => void handleUpdateQty(item, qty + 1)}
                  >
                    +
                  </button>
                  <span aria-hidden="true">·</span>
                  <button type="button" className="lx-text-btn" onClick={() => void handleRemoveItem(item)}>
                    Remove
                  </button>
                </div>
              </div>
              <p className="lx-bag__price">{formatMoney(item.priceUsd * qty, currency, rates)}</p>
            </li>
          );
        })}
      </ul>

      <aside className="lx-summary">
        <span className="lx-kicker">Reservation</span>
        <h2 className="lx-h2">Summary</h2>
        <dl className="lx-summary__rows">
          <div>
            <dt>Subtotal · {totalPieceCount} piece{totalPieceCount === 1 ? '' : 's'}</dt>
            <dd>{formatMoney(subtotal, currency, rates)}</dd>
          </div>
          <div>
            <dt>Insured transit</dt>
            <dd>Complimentary</dd>
          </div>
          <div className="is-total">
            <dt>To reserve</dt>
            <dd>{formatMoney(subtotal, currency, rates)}</dd>
          </div>
        </dl>
        <p className="lx-summary__note">
          Prices follow your selected currency ({currency}). Final settlement and promotional codes are confirmed at checkout.
        </p>
        <Link href="/checkout/order-summary" className="lx-btn lx-btn--solid lx-btn--block">Secure checkout</Link>
        <Link href="/contact" className="lx-btn lx-btn--ghost lx-btn--block">Request concierge reservation</Link>
        <Link href="/browse" className="lx-btn lx-btn--ghost lx-btn--block">Continue in the vault</Link>
      </aside>
    </div>
  );
}
