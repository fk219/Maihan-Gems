'use client';

/**
 * apps/web/src/components/checkout/CheckoutReview.tsx
 *
 * Checkout step 1 — review + orderable bridge. The guest bag lives in the
 * browser (atelier-store). This island bridges it into a REAL server cart
 * (`POST /api/v1/carts` + items) and creates the REAL checkout session
 * (`POST /api/v1/checkout/sessions`), then displays the AUTHORITATIVE
 * pricing snapshot returned by the server. The browser is never the price
 * authority; a mismatch is a 409 PRICE_CHANGED rendered verbatim.
 *
 * Pieces whose id is not yet an orderable catalogue UUID are skipped with an
 * honest inline note — they are never invented into the server cart.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';

import { getBag, clearBag, subscribeAtelier, type AtelierItem } from '../../lib/atelier-store.js';
import { itemImage } from '../../lib/atelier-item.js';

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

interface PricingSnapshot {
  currency: string;
  subtotal: string;
  discount_total: string;
  shipping_total: string;
  tax_total: string;
  grand_total: string;
  item_count: number;
}

interface CheckoutSession {
  id: string;
  current_step: string;
  pricing_snapshot: PricingSnapshot;
  reservation_expires_at: string;
}

function money(amount: string | number): string {
  const n = Number(amount);
  return Number.isFinite(n)
    ? n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
    : String(amount);
}

export function CheckoutReview() {
  const [items, setItems] = useState<AtelierItem[]>([]);
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setItems(getBag());
    return subscribeAtelier(() => setItems(getBag()));
  }, []);

  async function bridgeAndStart(): Promise<void> {
    const emailValue = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
      setError('Enter a valid email — order correspondence and payment confirmation are sent there.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // 1. Create the server cart.
      const cartRes = await fetch('/api/v1/carts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      if (!cartRes.ok) {
        const body = (await cartRes.json().catch(() => null)) as { error?: { message?: string } } | null;
        throw new Error(body?.error?.message ?? 'The bag could not be opened on the server.');
      }
      const cartBody = (await cartRes.json()) as { data?: { cart_token?: string } };
      const cartToken = cartBody.data?.cart_token ?? '';
      if (!cartToken) throw new Error('The server did not return a bag token.');

      // 2. Bridge the orderable pieces (UUID ids resolve directly; other
      // items resolve by their public slug — the catalogue's public key).
      const notOrderable: string[] = [];
      for (const item of items) {
        const body: Record<string, unknown> = {
          quantity: item.quantity ?? 1,
          expected_unit_price: item.priceUsd ? item.priceUsd.toFixed(2) : undefined,
        };
        if (UUID_RE.test(item.id)) body['product_id'] = item.id;
        else body['product_slug'] = item.slug || item.id;
        const addRes = await fetch(`/api/v1/carts/${encodeURIComponent(cartToken)}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!addRes.ok) {
          const body = (await addRes.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null;
          if (body?.error?.code === 'PRICE_CHANGED') {
            throw new Error('The price of one of your pieces changed on the server. Refresh the bag and review the updated price.');
          }
          throw new Error(body?.error?.message ?? `This piece could not be reserved for checkout: ${item.title}`);
        }
      }
      setSkipped(notOrderable);

      // 3. Create the checkout session (server freezes price + reserves stock).
      const sessionRes = await fetch('/api/v1/checkout/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cart_token: cartToken, email: emailValue }),
      });
      if (!sessionRes.ok) {
        const body = (await sessionRes.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null;
        throw new Error(body?.error?.message ?? 'Checkout could not be started.');
      }
      const sessionBody = (await sessionRes.json()) as { data?: CheckoutSession };
      if (!sessionBody.data) throw new Error('Checkout session response was incomplete.');
      setSession(sessionBody.data);
      clearBag();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Checkout could not be started.');
    } finally {
      setBusy(false);
    }
  }

  if (session) {
    return (
      <div className="lx-account-card">
        <h2 className="lx-account-card__title">Server-confirmed reservation</h2>
        <p className="lx-account-note">
          Session {session.id.slice(0, 8)}… · stock held until{' '}
          {new Date(session.reservation_expires_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}.
        </p>
        <dl className="lx-account-rows">
          <div><dt>Subtotal</dt><dd>{money(session.pricing_snapshot.subtotal)}</dd></div>
          <div><dt>Discounts</dt><dd>{money(session.pricing_snapshot.discount_total)}</dd></div>
          <div><dt>Shipping</dt><dd>{money(session.pricing_snapshot.shipping_total)}</dd></div>
          <div><dt>Tax</dt><dd>{money(session.pricing_snapshot.tax_total)}</dd></div>
          <div className="is-total"><dt>Total ({session.pricing_snapshot.currency})</dt><dd>{money(session.pricing_snapshot.grand_total)}</dd></div>
        </dl>
        {skipped.length > 0 ? (
          <p className="lx-account-note" role="status">
            Not included — still awaiting catalogue entry: {skipped.join(', ')}. Concierge can reserve these with you directly.
          </p>
        ) : null}
        <Link href={`/checkout/payment-order?session=${encodeURIComponent(session.id)}`} className="lx-btn lx-btn--solid lx-btn--block">
          Continue to delivery details
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="lx-account-card">
        <p className="lx-account-note">Your bag is empty. Reserve pieces from the vault first.</p>
        <Link href="/browse" className="lx-btn lx-btn--solid">Browse the vault</Link>
      </div>
    );
  }

  return (
    <div className="lx-account-form">
      <div className="lx-account-field">
        <label htmlFor="ck-review-email">Email for order correspondence</label>
        <input
          id="ck-review-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      <ul className="lx-order-items">
        {items.map((item) => (
          <li key={item.id}>
            <span className="lx-order-items__title">
              <img src={itemImage(item)} alt="" width={44} height={44} style={{ verticalAlign: 'middle', marginRight: '0.6rem', objectFit: 'cover' }} />
              {item.title}
            </span>
            <span className="lx-order-items__qty">×{item.quantity ?? 1}</span>
            <span className="lx-order-items__total">{money(item.priceUsd * (item.quantity ?? 1))}</span>
          </li>
        ))}
      </ul>
      {error ? <p className="lx-account-error" role="alert">{error}</p> : null}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <button type="button" className="lx-btn lx-btn--solid" disabled={busy} onClick={() => void bridgeAndStart()}>
          {busy ? 'Reserving…' : 'Start secure checkout'}
        </button>
        <Link href="/cart" className="lx-btn lx-btn--ghost">Return to bag</Link>
      </div>
      <p className="lx-account-note">
        Starting checkout opens a server-side session: prices are re-confirmed and 1-of-1 stock is reserved for
        30 minutes by the atelier system — the browser never sets the price.
      </p>
    </div>
  );
}
