'use client';

/**
 * apps/web/src/components/commerce/CheckoutBag.tsx
 *
 * The order-summary step reads the same cart token and endpoint as the bag.
 * It deliberately does not offer a "place order" action: no payment provider
 * is configured in this environment, and a button that cannot complete would
 * be worse than an explicit state.
 *
 * Failure is stated, never disguised as an empty bag: a network error is
 * different from "you have nothing in the bag".
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';

import { Money } from '../design-system/Money.js';

interface BagLine {
  readonly id: string;
  readonly title: string;
  readonly sku: string;
  readonly unitPriceCents: number;
  readonly quantity: number;
}

type State =
  | { readonly kind: 'loading' }
  | { readonly kind: 'error' }
  | { readonly kind: 'empty' }
  | { readonly kind: 'ready'; readonly items: readonly BagLine[] };

export function CheckoutBag() {
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    const token =
      typeof window !== 'undefined' ? localStorage.getItem('maihan_cart_token') : null;
    if (token === null || token === '') {
      setState({ kind: 'empty' });
      return;
    }

    let cancelled = false;
    const run = async (): Promise<void> => {
      try {
        const response = await fetch('/api/v1/cart', { headers: { 'x-cart-token': token } });
        if (!response.ok) throw new Error('cart read failed');
        const payload: unknown = await response.json();
        const items = (payload as { data?: { cart?: { items?: BagLine[] } } })?.data?.cart?.items;
        if (cancelled) return;
        if (!Array.isArray(items) || items.length === 0) {
          setState({ kind: 'empty' });
          return;
        }
        setState({ kind: 'ready', items });
      } catch {
        if (!cancelled) setState({ kind: 'error' });
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.kind === 'loading') {
    return (
      <div className="sf-checkout__panel" aria-busy="true" aria-live="polite">
        <p className="sf-fine-print">Reading your bag…</p>
      </div>
    );
  }

  if (state.kind === 'error') {
    return (
      <div className="sf-checkout__panel" role="alert">
        <h2>Your bag could not be read.</h2>
        <p>
          The catalogue is still available. Try again, or return to the bag; nothing has been
          charged and no order has been created.
        </p>
        <div className="sf-checkout__actions">
          <Link className="mh-cta" href="/cart">
            Return to the bag
          </Link>
        </div>
      </div>
    );
  }

  if (state.kind === 'empty') {
    return (
      <div className="sf-checkout__panel">
        <h2>Your bag is empty.</h2>
        <p>
          There is nothing to summarise. Choose a stone or a mounting first; the summary will
          then list exactly what the bag contains.
        </p>
        <div className="sf-checkout__actions">
          <Link className="mh-cta" href="/search">
            Search the catalogue
            <span aria-hidden="true">→</span>
          </Link>
          <Link className="mh-cta mh-cta--quiet" href="/settings">
            Browse settings
          </Link>
        </div>
      </div>
    );
  }

  const subtotal = state.items.reduce(
    (sum, item) => sum + item.unitPriceCents * item.quantity,
    0,
  );

  return (
    <div className="sf-checkout__panel">
      <h2>Your order</h2>
      <ul className="mh-cart__list">
        {state.items.map((item) => (
          <li className="mh-cart__item" key={item.id}>
            <div>
              <p className="mh-cart__title">{item.title}</p>
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
      <div className="mh-cart__row">
        <span>Subtotal</span>
        <span>
          <Money amount={subtotal / 100} currency="USD" />
        </span>
      </div>
      <p className="sf-fine-print">
        Shipping, duties and documentation are quoted when an order is agreed. Nothing is added
        silently, and this page does not take a payment.
      </p>
    </div>
  );
}
