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

export function CheckoutReview() {
  const [localItems, setLocalItems] = useState<AtelierItem[]>([]);
  const [serverCartToken, setServerCartToken] = useState<string | null>(null);
  const [serverCartItems, setServerCartItems] = useState<ServerCartItem[]>([]);
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [email, setEmail] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [validatedDiscount, setValidatedDiscount] = useState<{
    code: string;
    name: string;
    discount_amount: string;
    final_subtotal: string;
  } | null>(null);
  const [discountMessage, setDiscountMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLocalItems(getBag());
      if (typeof window === 'undefined') return;
      const cached = window.localStorage.getItem('maihan_cart_token');
      if (!cached) {
        setServerCartToken(null);
        setServerCartItems([]);
        return;
      }
      try {
        const res = await fetch(`/api/v1/carts/${encodeURIComponent(cached)}`);
        if (!res.ok) {
          setServerCartToken(null);
          setServerCartItems([]);
          return;
        }
        const body = (await res.json()) as {
          data?: { state?: string; cart_token?: string; items?: ServerCartItem[] };
        };
        if (body.data?.state === 'ACTIVE') {
          setServerCartToken(body.data.cart_token ?? cached);
          setServerCartItems(body.data.items ?? []);
        } else {
          setServerCartToken(null);
          setServerCartItems([]);
        }
      } catch {
        setServerCartToken(null);
        setServerCartItems([]);
      }
    };
    void load();
    return subscribeAtelier(() => void load());
  }, []);

  const combinedItems: AtelierItem[] = (() => {
    const serverIds = new Set(serverCartItems.map((i) => i.product_id));
    const serverSlugs = new Set(serverCartItems.map((i) => i.product_slug.toLowerCase()));
    const fromServer: AtelierItem[] = serverCartItems.map((i) => ({
      id: i.product_id,
      slug: i.product_slug,
      title: i.title,
      kind: i.configuration_id ? 'Bespoke DYO Configuration' : 'Vault piece',
      priceUsd: Number(i.unit_price) || 0,
      quantity: i.quantity,
      image: '',
    }));
    const fromLocal = localItems.filter(
      (l) => !serverIds.has(l.id) && !serverSlugs.has((l.slug || l.id).toLowerCase()),
    );
    return [...fromServer, ...fromLocal];
  })();

  const estimatedSubtotal = combinedItems.reduce(
    (sum, item) => sum + item.priceUsd * (item.quantity ?? 1),
    0,
  );

  async function handleValidatePromo(): Promise<void> {
    const code = discountCode.trim().toUpperCase();
    setDiscountMessage(null);
    if (!code) {
      setValidatedDiscount(null);
      return;
    }
    try {
      const res = await fetch('/api/v1/discounts/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, subtotal: estimatedSubtotal }),
      });
      const body = (await res.json().catch(() => null)) as {
        data?: {
          valid?: boolean;
          discount?: { code?: string; name?: string };
          discount_amount?: string;
          final_subtotal?: string;
        };
        error?: { message?: string };
      } | null;
      if (!res.ok || !body?.data?.valid) {
        setValidatedDiscount(null);
        setDiscountMessage(body?.error?.message ?? 'Promotional code is invalid or inapplicable.');
        return;
      }
      setValidatedDiscount({
        code: body.data.discount?.code ?? code,
        name: body.data.discount?.name ?? code,
        discount_amount: body.data.discount_amount ?? '0.00',
        final_subtotal: body.data.final_subtotal ?? estimatedSubtotal.toFixed(2),
      });
      setDiscountMessage(
        `Applied ${body.data.discount?.name ?? code}: −${money(body.data.discount_amount ?? '0.00')}`,
      );
    } catch {
      setDiscountMessage('Could not validate promotional code.');
    }
  }

  async function bridgeAndStart(): Promise<void> {
    const emailValue = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
      setError('Enter a valid email — order correspondence and payment confirmation are sent there.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // 1. Reuse existing active server cart (preserving DYO quote-bound lines) or create a new one.
      let cartToken = serverCartToken ?? '';
      if (!cartToken) {
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
        cartToken = cartBody.data?.cart_token ?? '';
        if (!cartToken) throw new Error('The server did not return a bag token.');
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('maihan_cart_token', cartToken);
        }
      }

      // 2. Bridge any browser bag items not already in the server cart.
      const serverIds = new Set(serverCartItems.map((i) => i.product_id));
      const serverSlugs = new Set(serverCartItems.map((i) => i.product_slug.toLowerCase()));
      const unbridgedLocal = localItems.filter(
        (l) => !serverIds.has(l.id) && !serverSlugs.has((l.slug || l.id).toLowerCase()),
      );

      const notOrderable: string[] = [];
      for (const item of unbridgedLocal) {
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
          const errBody = (await addRes.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null;
          if (errBody?.error?.code === 'PRICE_CHANGED') {
            throw new Error('The price of one of your pieces changed on the server. Refresh the bag and review the updated price.');
          }
          throw new Error(errBody?.error?.message ?? `This piece could not be reserved for checkout: ${item.title}`);
        }
      }
      setSkipped(notOrderable);

      // 3. Create the checkout session (server freezes price + applies discount + reserves stock).
      const sessionPayload: Record<string, unknown> = {
        cart_token: cartToken,
        email: emailValue,
      };
      const codeToApply = validatedDiscount?.code || discountCode.trim().toUpperCase();
      if (codeToApply) {
        sessionPayload['discount_code'] = codeToApply;
      }

      const sessionRes = await fetch('/api/v1/checkout/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionPayload),
      });
      if (!sessionRes.ok) {
        const body = (await sessionRes.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null;
        throw new Error(body?.error?.message ?? 'Checkout could not be started.');
      }
      const sessionBody = (await sessionRes.json()) as { data?: CheckoutSession };
      if (!sessionBody.data) throw new Error('Checkout session response was incomplete.');
      setSession(sessionBody.data);
      clearBag();
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('maihan_cart_token');
      }
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

  if (combinedItems.length === 0) {
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
      <div className="lx-account-field">
        <label htmlFor="ck-promo-code">Promotional Code (Optional)</label>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <input
            id="ck-promo-code"
            type="text"
            placeholder="e.g. WELCOME10"
            value={discountCode}
            onChange={(event) => setDiscountCode(event.target.value.toUpperCase())}
            style={{ flex: 1 }}
          />
          <button
            type="button"
            className="lx-btn lx-btn--ghost"
            onClick={() => void handleValidatePromo()}
          >
            Apply code
          </button>
        </div>
        {discountMessage ? (
          <p className="lx-account-note" role="status" style={{ marginTop: '0.35rem' }}>
            {discountMessage}
          </p>
        ) : null}
      </div>
      <ul className="lx-order-items">
        {combinedItems.map((item) => (
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
