'use client';

/**
 * apps/web/src/components/commerce/CartView.tsx
 *
 * The storefront shopping bag.
 *
 * This is the only client island touched by the storefront design pass: the
 * bag token lives in localStorage and the contents are fetched at runtime, so
 * it cannot be a Server Component. It stays small and adds no dependency.
 *
 * Design honesty: the previous totals block asserted complimentary armored
 * delivery and an included appraisal certificate. Neither is in the cart
 * response, so both are removed. The summary states the subtotal and says that
 * shipping, duties and documentation are quoted at checkout — nothing is
 * invented, nothing is added silently.
 *
 * `initialItems` is an SSR/preview seam: the storefront route passes nothing
 * and reads the token exactly as before; the design-test harness can render a
 * populated bag without fabricating a runtime fetch.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';

import { Money } from '../design-system/Money.js';

export interface CartItem {
  id: string;
  productId: string;
  title: string;
  sku: string;
  unitPriceCents: number;
  quantity: number;
}

export interface CartViewProps {
  /** Preview state for SSR screenshots/tests. Omit in the storefront. */
  readonly initialItems?: readonly CartItem[];
}

export function CartView({ initialItems }: CartViewProps = {}) {
  const isPreview = initialItems !== undefined;
  const [items, setItems] = useState<CartItem[]>(() =>
    initialItems !== undefined ? [...initialItems] : [],
  );
  const [loading, setLoading] = useState<boolean>(initialItems === undefined);

  useEffect(() => {
    if (isPreview) return;

    const fetchCart = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('maihan_cart_token') : null;
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/v1/cart', {
          headers: { 'x-cart-token': token },
        });
        if (res.ok) {
          const data = await res.json();
          const cartItems = data?.data?.cart?.items || [];
          setItems(cartItems);
        }
      } catch {
        // A failed read leaves the bag empty rather than showing a guess.
      } finally {
        setLoading(false);
      }
    };

    fetchCart();
  }, [isPreview]);

  const subtotalCents = items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0);

  if (loading) {
    return (
      <div className="mh-cart mh-cart--state" aria-busy="true">
        <p className="mh-cart__loading">Opening your bag…</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mh-cart mh-cart--state">
        <p className="mh-masthead__eyebrow">Acquisition bag</p>
        <h1>Your bag is empty</h1>
        <p className="mh-cart__lead">
          Browse loose stones, matched pairs and atelier mountings. Nothing is held until you add it.
        </p>
        <div className="mh-cart__actions">
          <Link href="/design-your-own" className="mh-cta">
            Design your own piece
            <span aria-hidden="true">→</span>
          </Link>
          <Link href="/search" className="mh-cta mh-cta--quiet">
            Explore the collection
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mh-cart">
      <header className="mh-cart__head">
        <p className="mh-masthead__eyebrow">Acquisition bag</p>
        <h1>Your bag</h1>
        <p className="mh-cart__count">
          <span className="tabular">{items.length}</span> {items.length === 1 ? 'piece' : 'pieces'}
        </p>
      </header>

      <div className="mh-cart__layout">
        <div className="mh-cart__main">
          <ul className="mh-cart__list">
            {items.map((item) => (
              <li key={item.id} className="mh-cart__item">
                <div className="mh-cart__item-main">
                  <h2 className="mh-cart__title">{item.title}</h2>
                  <p className="mh-cart__sku">
                    Reference <span className="tabular">{item.sku}</span>
                  </p>
                </div>

                <p className="mh-cart__qty">
                  <span className="mh-cart__label">Qty</span>{' '}
                  <span className="tabular">{item.quantity}</span>
                </p>

                <p className="mh-cart__amount">
                  <Money amount={(item.unitPriceCents * item.quantity) / 100} currency="USD" />
                </p>
              </li>
            ))}
          </ul>

          <Link href="/design-your-own" className="mh-cart__continue">
            <span aria-hidden="true">←</span> Continue designing
          </Link>
        </div>

        <section className="mh-cart__summary" aria-labelledby="mh-cart-summary-heading">
          <h2 id="mh-cart-summary-heading">Summary</h2>

          <div className="mh-cart__row">
            <span>Subtotal</span>
            <span>
              <Money amount={subtotalCents / 100} currency="USD" />
            </span>
          </div>

          <p className="mh-cart__note">
            Shipping, duties and documentation are quoted at checkout. Nothing is added silently.
          </p>

          <Link href="/checkout/payment-order" className="mh-cta mh-cart__checkout">
            Proceed to secure checkout
            <span aria-hidden="true">→</span>
          </Link>
        </section>
      </div>
    </div>
  );
}
