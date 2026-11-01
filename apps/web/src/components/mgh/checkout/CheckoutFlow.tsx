'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useStorefront } from '@/components/mgh/providers/StorefrontProvider';
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Lock, ShieldCheck } from 'lucide-react';

interface CartLine {
  id: number; product_ref: string; product_name: string; product_kind: string;
  quantity: number; unit_price: number; line_total: number; currency: string;
}
interface CartData {
  token: string; items: CartLine[]; subtotal: number; currency: string;
}
interface OrderResult {
  order_number: string; access_token: string; totals: { subtotal: number; discount: number; tax: number; tax_label: string; shipping: number; grand_total: number; currency: string };
}
interface CartQuote {
  subtotal: number; discount: number; tax: number; tax_label: string; shipping: number; grand_total: number; currency: string;
}

const STEPS = [
  { num: 1, label: 'Summary & Address' },
  { num: 2, label: 'Secure Payment' },
  { num: 3, label: 'Confirmation' },
] as const;

export default function CheckoutFlow() {
  const { cart: bag, clearCart } = useStorefront();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [cart, setCart] = useState<CartData | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [placedOrder, setPlacedOrder] = useState<OrderResult | null>(null);
  const [paid, setPaid] = useState(false);
  const [paying, setPaying] = useState(false);
  const [orderDetail, setOrderDetail] = useState<Record<string, unknown> | null>(null);
  const [quote, setQuote] = useState<CartQuote | null>(null);

  const [address, setAddress] = useState({
    recipient: '', line1: '', line2: '', city: '', region: '', postal_code: '', country: 'AE', phone: '',
  });
  const [email, setEmail] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [savedAddresses, setSavedAddresses] = useState<Array<{ id: number; label: string; recipient: string; line1: string; line2: string | null; city: string; region: string | null; postal_code: string; country: string; phone: string | null }>>([]);

  useEffect(() => {
    void (async () => {
      const response = await fetch('/api/fresh/auth/addresses', { cache: 'no-store' });
      if (response.ok) {
        setSavedAddresses((await response.json()) as typeof savedAddresses);
      }
    })();
  }, []);

  const syncCart = useCallback(async () => {
    if (!bag.length) return;
    setSyncing(true);
    try {
      const createRes = await fetch('/api/fresh/carts', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: sessionStorage.getItem('maihan_checkout_token') || undefined }),
      });
      const { token } = (await createRes.json()) as { token: string };
      sessionStorage.setItem('maihan_checkout_token', token);
      for (const item of bag) {
        if (item.kind === 'dyo' && item.configurationCode) continue;
        await fetch(`/api/fresh/carts/${token}/items`, {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ref: item.sku || item.id, quantity: item.quantity }),
        });
      }
      const cartRes = await fetch(`/api/fresh/carts/${token}`, { cache: 'no-store' });
      if (cartRes.ok) setCart((await cartRes.json()) as CartData);
    } catch { setError('Failed to sync your selection. Please try again.'); }
    setSyncing(false);
  }, [bag]);

  useEffect(() => { void syncCart(); }, [syncCart]);

  useEffect(() => {
    if (!cart?.token) return;
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({ country: address.country });
      if (discountCode) params.set('discount', discountCode);
      fetch(`/api/fresh/carts/${cart.token}/quote?${params.toString()}`, { cache: 'no-store' })
        .then((response) => response.ok ? response.json() : null)
        .then((data) => { if (data) setQuote(data as CartQuote); })
        .catch(() => undefined);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [cart?.token, address.country, discountCode]);

  const placeOrder = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setSyncing(true);
    if (!cart?.token) { setError('Cart not ready'); setSyncing(false); return; }
    try {
      const response = await fetch(`/api/fresh/carts/${cart.token}/checkout`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email, shipping_address: address, discount_code: discountCode || undefined,
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? 'checkout failed');
      }
      const order = (await response.json()) as OrderResult;
      setPlacedOrder(order);
      setStep(2);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Checkout failed');
    }
    setSyncing(false);
  };

  const payNow = async () => {
    if (!placedOrder) return;
    setPaying(true); setError('');
    try {
      const response = await fetch(`/api/fresh/orders/${placedOrder.order_number}/pay`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}',
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? 'payment failed');
      }
      setPaid(true); setStep(3);
      clearCart();
      const detail = await fetch(`/api/fresh/orders/${placedOrder.order_number}?token=${encodeURIComponent(placedOrder.access_token)}`, { cache: 'no-store' });
      if (detail.ok) setOrderDetail((await detail.json()) as Record<string, unknown>);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Payment failed');
      setPaying(false);
    }
  };

  const fmt = (value: number, currency = 'USD') => value === 0
    ? '—'
    : new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value);

  if (!syncing && !bag.length && !cart && step === 1) {
    return (
      <div className="portal-card portal-empty">
        <div className="portal-empty__mark"><Lock /></div>
        <p className="portal-empty__title">Your tray is empty</p>
        <p className="portal-empty__sub">Browse the vault to add stones and pieces before checkout.</p>
        <Link href="/browse" className="portal-btn portal-btn--gold" style={{ marginTop: 16 }}>Browse the vault</Link>
      </div>
    );
  }

  return (
    <div className="portal-section">
      <div className="checkout-progress" aria-label="Checkout progress">
        {STEPS.map((item, index) => (
          <div key={item.num} className="checkout-progress__item">
            {index > 0 ? <span className="checkout-progress__rule" /> : null}
            <span className={`checkout-progress__step ${step >= item.num ? 'is-active' : ''} ${step > item.num ? 'is-done' : ''}`}>
              <span className="checkout-progress__dot">{step > item.num ? '✓' : item.num}</span>
              <span className="checkout-progress__label">{item.label}</span>
            </span>
          </div>
        ))}
      </div>

      {error ? (
        <div className="portal-card portal-card--pad" style={{ borderColor: 'var(--p-bad)', background: 'var(--p-bad-soft)' }}>
          <p className="portal-notice" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle style={{ width: 16, height: 16 }} /> {error}
          </p>
        </div>
      ) : null}

      {step === 1 ? (
        <form onSubmit={placeOrder} className="checkout-grid">
          <div className="checkout-stack">
            <section className="portal-card portal-card--pad">
              <header className="portal-card__head">
                <div>
                  <h2 className="portal-card__title">Your selection</h2>
                  <p className="portal-card__sub">{cart?.items.length ?? bag.length} piece(s) held for this order</p>
                </div>
                <Lock style={{ width: 16, height: 16, color: 'var(--p-accent-deep)' }} />
              </header>
              <div className="checkout-stack">
                {cart?.items.length ? cart.items.map((item) => (
                  <div key={item.id} className="checkout-item">
                    <div>
                      <p className="checkout-item__name">{item.product_name}</p>
                      <p className="checkout-item__sub">{item.product_ref} · qty {item.quantity}</p>
                    </div>
                    <p className="checkout-item__amount">{fmt(item.line_total, item.currency)}</p>
                  </div>
                )) : bag.map((item, index) => (
                  <div key={index} className="checkout-item">
                    <div>
                      <p className="checkout-item__name">{item.name}</p>
                      <p className="checkout-item__sub">{item.sku || item.id}</p>
                    </div>
                    <p className="checkout-item__amount">{item.price > 0 ? fmt(item.price, 'USD') : '—'}</p>
                  </div>
                ))}
                {syncing ? <p className="portal-card__sub">Syncing your selection with the vault…</p> : null}
              </div>
            </section>

            <section className="portal-card portal-card--pad">
              <header className="portal-card__head">
                <div>
                  <h2 className="portal-card__title">Delivery address</h2>
                  <p className="portal-card__sub">Where the atelier sends your order</p>
                </div>
              </header>

              {savedAddresses.length > 0 ? (
                <div style={{ marginBottom: 14 }}>
                  <label className="portal-label" htmlFor="saved-address">Use a saved address</label>
                  <select
                    id="saved-address"
                    className="portal-select"
                    defaultValue=""
                    onChange={(event) => {
                      const chosen = savedAddresses.find((entry) => String(entry.id) === event.target.value);
                      if (chosen) {
                        setAddress({
                          recipient: chosen.recipient, line1: chosen.line1, line2: chosen.line2 ?? '',
                          city: chosen.city, region: chosen.region ?? '', postal_code: chosen.postal_code,
                          country: chosen.country, phone: chosen.phone ?? '',
                        });
                      }
                    }}
                  >
                    <option value="">Enter a new address below</option>
                    {savedAddresses.map((entry) => (
                      <option key={entry.id} value={entry.id}>{entry.label} — {entry.line1}, {entry.city}</option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="portal-label" htmlFor="checkout-recipient">Recipient</label>
                  <input id="checkout-recipient" className="portal-input" required value={address.recipient} onChange={(event) => setAddress((value) => ({ ...value, recipient: event.target.value }))} placeholder="Full name" />
                </div>
                <div className="col-span-2">
                  <label className="portal-label" htmlFor="checkout-line1">Address line 1</label>
                  <input id="checkout-line1" className="portal-input" required value={address.line1} onChange={(event) => setAddress((value) => ({ ...value, line1: event.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="portal-label" htmlFor="checkout-line2">Address line 2 (optional)</label>
                  <input id="checkout-line2" className="portal-input" value={address.line2} onChange={(event) => setAddress((value) => ({ ...value, line2: event.target.value }))} />
                </div>
                <div>
                  <label className="portal-label" htmlFor="checkout-city">City</label>
                  <input id="checkout-city" className="portal-input" required value={address.city} onChange={(event) => setAddress((value) => ({ ...value, city: event.target.value }))} />
                </div>
                <div>
                  <label className="portal-label" htmlFor="checkout-country">Country</label>
                  <select id="checkout-country" className="portal-select" value={address.country} onChange={(event) => setAddress((value) => ({ ...value, country: event.target.value }))}>
                    <option value="AE">United Arab Emirates</option><option value="TH">Thailand</option>
                    <option value="GB">United Kingdom</option><option value="US">United States</option>
                    <option value="IN">India</option><option value="SG">Singapore</option>
                  </select>
                </div>
                <div>
                  <label className="portal-label" htmlFor="checkout-email">Email</label>
                  <input id="checkout-email" type="email" className="portal-input" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
                </div>
                <div>
                  <label className="portal-label" htmlFor="checkout-discount">Discount code (optional)</label>
                  <input id="checkout-discount" className="portal-input" value={discountCode} onChange={(event) => setDiscountCode(event.target.value)} placeholder="SAVE10" />
                </div>
              </div>
            </section>
          </div>

          <aside className="portal-card portal-card--pad checkout-summary">
            <header className="portal-card__head">
              <div>
                <h2 className="portal-card__title">Order summary</h2>
                <p className="portal-card__sub">Held while you complete the address</p>
              </div>
            </header>

            <div className="checkout-totals">
              <div className="checkout-total-row"><span>Subtotal</span><span>{fmt(quote?.subtotal ?? cart?.subtotal ?? bag.reduce((total, item) => total + item.price, 0), quote?.currency ?? 'USD')}</span></div>
              {quote && quote.discount > 0 ? <div className="checkout-total-row"><span>Discount</span><span>−{fmt(quote.discount, quote.currency)}</span></div> : null}
              <div className="checkout-total-row"><span>Tax {quote ? `(${quote.tax_label})` : ''}</span><span>{quote ? fmt(quote.tax, quote.currency) : 'Calculated at placement'}</span></div>
              <div className="checkout-total-row"><span>Insured courier</span><span>{quote ? (quote.shipping === 0 ? 'Included' : fmt(quote.shipping, quote.currency)) : 'Calculated at placement'}</span></div>
              <div className="checkout-total-row checkout-total-row--grand"><span>Due</span><span>{fmt(quote?.grand_total ?? cart?.subtotal ?? bag.reduce((total, item) => total + item.price, 0), quote?.currency ?? 'USD')}</span></div>
            </div>

            <button type="submit" disabled={syncing || !cart?.items.length} className="portal-btn portal-btn--gold w-full" style={{ marginTop: 14 }}>
              Place order <ArrowRight />
            </button>

            <div className="checkout-security" style={{ marginTop: 12 }}>
              <ShieldCheck />
              <span>Placing the order reserves your stones for 24 hours. Payment is the next step.</span>
            </div>
          </aside>
        </form>
      ) : null}

      {step === 2 && placedOrder ? (
        <div className="client-auth" style={{ maxWidth: 520 }}>
          <div className="portal-card portal-card--pad">
            <div style={{ textAlign: 'center' }}>
              <span className="portal-empty__mark" style={{ margin: '0 auto 14px' }}><ShieldCheck /></span>
              <h2 className="portal-card__title" style={{ fontSize: 'var(--p-fs-2xl)' }}>Secure payment</h2>
              <p className="portal-card__sub">Order <span className="portal-mono">{placedOrder.order_number}</span></p>
            </div>

            <div className="checkout-totals" style={{ marginTop: 16 }}>
              <div className="checkout-total-row"><span>Subtotal</span><span>{fmt(placedOrder.totals.subtotal, placedOrder.totals.currency)}</span></div>
              {placedOrder.totals.discount > 0 ? <div className="checkout-total-row"><span>Discount</span><span>−{fmt(placedOrder.totals.discount, placedOrder.totals.currency)}</span></div> : null}
              <div className="checkout-total-row"><span>Tax ({placedOrder.totals.tax_label})</span><span>{fmt(placedOrder.totals.tax, placedOrder.totals.currency)}</span></div>
              <div className="checkout-total-row"><span>Shipping</span><span>{fmt(placedOrder.totals.shipping, placedOrder.totals.currency)}</span></div>
              <div className="checkout-total-row checkout-total-row--grand"><span>Grand total</span><span>{fmt(placedOrder.totals.grand_total, placedOrder.totals.currency)}</span></div>
            </div>

            <div className="checkout-security" style={{ marginTop: 14, background: 'var(--p-warn-bg)' }}>
              <AlertTriangle />
              <span><b>Test instrument.</b> Dev mode captures a test payment without moving real money. The live PSP is owner-gated.</span>
            </div>

            <button type="button" onClick={() => void payNow()} disabled={paying} className="portal-btn portal-btn--gold w-full" style={{ marginTop: 16, padding: '12px 18px' }}>
              {paying ? 'Processing…' : `Pay ${fmt(placedOrder.totals.grand_total, placedOrder.totals.currency)}`}
            </button>
            <button type="button" onClick={() => { setStep(1); setPlacedOrder(null); }} className="portal-btn portal-btn--ghost portal-btn--sm" style={{ margin: '10px auto 0' }}>
              <ArrowLeft /> Back to summary
            </button>
          </div>
        </div>
      ) : null}

      {step === 3 && placedOrder ? (
        <div className="checkout-confirm">
          <span className="checkout-confirm__mark"><CheckCircle2 /></span>
          <h2 className="checkout-confirm__title">Order confirmed</h2>
          <p className="checkout-confirm__sub">
            Order <span className="portal-mono">{placedOrder.order_number}</span> {paid ? 'is paid' : 'is pending payment'}.
          </p>

          {orderDetail ? (
            <div className="portal-card portal-card--pad" style={{ marginTop: 20, textAlign: 'left' }}>
              {(orderDetail['items'] as Array<{ description: string; quantity: number; line_total: string }>)?.map((item, index) => (
                <div key={index} className="checkout-total-row" style={{ padding: '4px 0' }}>
                  <span>{item.quantity}× {item.description}</span>
                  <span>{item.line_total}</span>
                </div>
              ))}
              <div className="checkout-total-row checkout-total-row--grand" style={{ marginTop: 8 }}>
                <span>Total</span>
                <span>{fmt(placedOrder.totals.grand_total, placedOrder.totals.currency)}</span>
              </div>
            </div>
          ) : null}

          <div className="portal-inline" style={{ justifyContent: 'center', marginTop: 20 }}>
            <Link href={`/checkout/confirmation/${placedOrder.order_number}?token=${encodeURIComponent(placedOrder.access_token)}`} className="portal-btn portal-btn--gold">
              View order dossier
            </Link>
            <Link href="/" className="portal-btn portal-btn--ghost">Return to the collection</Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
