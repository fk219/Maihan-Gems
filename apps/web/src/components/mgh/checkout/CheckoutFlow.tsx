'use client';

/**
 * F3-commerce — the full storefront checkout flow over fresh-api.
 * 3 steps: Order Summary (bag→cart + address) → Payment (test instrument)
 * → Confirmation (real order status). The applet bag in localStorage is
 * converted to a server cart on mount; the quoted prices are the server's.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useStorefront } from '@/components/mgh/providers/StorefrontProvider';
import { CheckCircle2, ShieldCheck, AlertTriangle, ArrowLeft, ArrowRight } from 'lucide-react';

const input = 'w-full rounded-lg border border-[#E5D4B3] bg-white px-3 py-2.5 text-sm text-[#1A1612] placeholder-[#9A9385] focus:border-[#D4AF37] focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/30 transition-colors';
const label = 'block text-[11px] font-medium text-[#5C4E3C] mb-1.5 tracking-wide';
const card = 'bg-white rounded-xl border border-[#E8DFCE] shadow-[0_2px_8px_rgba(185,150,75,0.06)]';
const btnPrimary = 'rounded-lg bg-gradient-to-r from-[#F3DFA2] via-[#D4AF37] to-[#9A7B2C] text-white font-medium py-2.5 px-5 text-sm hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer';
const stepDot = (active: boolean, done: boolean) =>
  `w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-medium ${done ? 'bg-[#D4AF37] text-white' : active ? 'border-2 border-[#D4AF37] text-[#9A7B2C]' : 'border border-[#E5D4B3] text-[#9A9385]'}`;

interface CartLine {
  id: number; product_ref: string; product_name: string; product_kind: string;
  quantity: number; unit_price: number; line_total: number; currency: string;
}
interface CartData {
  token: string; items: CartLine[]; subtotal: number; currency: string;
}
interface OrderResult {
  order_number: string; totals: { subtotal: number; discount: number; tax: number; tax_label: string; shipping: number; grand_total: number; currency: string };
}

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

  const [address, setAddress] = useState({
    recipient: '', line1: '', line2: '', city: '', region: '', postal_code: '', country: 'AE', phone: '',
  });
  const [email, setEmail] = useState('');
  const [discountCode, setDiscountCode] = useState('');

  // sync bag → server cart on mount
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
        if (item.kind === 'dyo' && item.configurationCode) continue; // DYO lines come via review page
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

  const placeOrder = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSyncing(true);
    if (!cart?.token) { setError('Cart not ready'); setSyncing(false); return; }
    try {
      const res = await fetch(`/api/fresh/carts/${cart.token}/checkout`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email, shipping_address: address, discount_code: discountCode || undefined,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? 'checkout failed');
      }
      const order = (await res.json()) as OrderResult;
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
      const res = await fetch(`/api/fresh/orders/${placedOrder.order_number}/pay`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}',
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? 'payment failed');
      }
      setPaid(true); setStep(3);
      clearCart();
      const detail = await fetch(`/api/fresh/orders/${placedOrder.order_number}`, { cache: 'no-store' });
      if (detail.ok) setOrderDetail((await detail.json()) as Record<string, unknown>);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Payment failed');
      setPaying(false);
    }
  };

  const fmt = (v: number, _cur?: string) => v === 0 ? '—' : `$${v.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  // empty bag
  if (!syncing && !bag.length && !cart && step === 1) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#9A7B2C]">Your tray is empty</p>
        <h2 className="font-serif text-2xl text-[#1A1612]">Browse our vault to add stones and pieces.</h2>
        <Link href="/browse" className="inline-block mt-4 px-8 py-3 gold-gradient-cta text-sm">Browse the Vault</Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* step indicator */}
      <div className="flex items-center justify-center gap-6">
        {[
          { num: 1, label: 'Summary & Address' },
          { num: 2, label: 'Secure Payment' },
          { num: 3, label: 'Confirmation' },
        ].map((s, i) => (
          <div key={s.num} className="flex items-center gap-3">
            {i > 0 ? <div className={`w-12 h-px ${step > s.num ? 'bg-[#D4AF37]' : 'bg-[#E5D4B3]'}`} /> : null}
            <div className="flex items-center gap-2">
              <div className={stepDot(step >= s.num, step > s.num)}>{step > s.num ? '✓' : s.num}</div>
              <span className={`text-xs font-medium ${step >= s.num ? 'text-[#1A1612]' : 'text-[#9A9385]'}`}>{s.label}</span>
            </div>
          </div>
        ))}
      </div>

      {error ? (
        <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-lg p-4 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-[#991B1B] shrink-0 mt-0.5" />
          <p className="text-sm text-[#991B1B]">{error}</p>
        </div>
      ) : null}

      {/* ============ STEP 1: SUMMARY + ADDRESS ============ */}
      {step === 1 ? (
        <form onSubmit={placeOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* items */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="font-serif text-xl text-[#1A1612]">Your Selection</h2>
            {cart?.items.length ? cart.items.map((item) => (
              <div key={item.id} className={card + ' p-4 flex items-center justify-between'}>
                <div>
                  <p className="font-serif text-base text-[#1A1612]">{item.product_name}</p>
                  <p className="text-xs font-mono text-[#9A9385]">{item.product_ref} · qty {item.quantity}</p>
                </div>
                <p className="font-medium text-[#9A7B2C] tabular-nums">{fmt(item.line_total, item.currency)}</p>
              </div>
            )) : bag.map((b, i) => (
              <div key={i} className={card + ' p-4 flex items-center justify-between'}>
                <div>
                  <p className="font-serif text-base text-[#1A1612]">{b.name}</p>
                  <p className="text-xs font-mono text-[#9A9385]">{b.sku || b.id}</p>
                </div>
                <p className="font-medium text-[#9A7B2C] tabular-nums">{b.price > 0 ? `$${b.price.toLocaleString()}` : '—'}</p>
              </div>
            ))}
            <h2 className="font-serif text-xl text-[#1A1612] pt-4">Delivery Address</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><label className={label}>Recipient</label>
                <input className={input} required value={address.recipient} onChange={(e) => setAddress((a) => ({ ...a, recipient: e.target.value }))} placeholder="Full name" /></div>
              <div className="col-span-2"><label className={label}>Address line 1</label>
                <input className={input} required value={address.line1} onChange={(e) => setAddress((a) => ({ ...a, line1: e.target.value }))} /></div>
              <div className="col-span-2"><label className={label}>Address line 2 (optional)</label>
                <input className={input} value={address.line2} onChange={(e) => setAddress((a) => ({ ...a, line2: e.target.value }))} /></div>
              <div><label className={label}>City</label>
                <input className={input} required value={address.city} onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))} /></div>
              <div><label className={label}>Country</label>
                <select className={input + ' cursor-pointer'} value={address.country} onChange={(e) => setAddress((a) => ({ ...a, country: e.target.value }))}>
                  <option value="AE">United Arab Emirates</option><option value="TH">Thailand</option>
                  <option value="GB">United Kingdom</option><option value="US">United States</option>
                  <option value="IN">India</option><option value="SG">Singapore</option>
                </select></div>
              <div><label className={label}>Email</label>
                <input type="email" className={input} required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></div>
              <div><label className={label}>Discount code (optional)</label>
                <input className={input} value={discountCode} onChange={(e) => setDiscountCode(e.target.value)} placeholder="SAVE10" /></div>
            </div>
          </div>

          {/* summary sidebar */}
          <div className={card + ' p-6 h-fit sticky top-8 space-y-4'}>
            <h3 className="font-serif text-lg text-[#1A1612]">Order Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-[#5C4E3C]">Subtotal</span>
                <span className="tabular-nums">{fmt(cart?.subtotal ?? bag.reduce((a, b) => a + b.price, 0), 'USD')}</span></div>
            </div>
            <button type="submit" disabled={syncing || !cart?.items.length} className={btnPrimary + ' w-full flex items-center justify-center gap-2'}>
              Place Order <ArrowRight className="h-4 w-4" />
            </button>
            <p className="text-[10px] text-[#9A9385] font-[family-name:var(--font-mono)]">
              Placing the order reserves your stones for 24 hours. Payment is the next step.
            </p>
          </div>
        </form>
      ) : null}

      {/* ============ STEP 2: PAYMENT ============ */}
      {step === 2 && placedOrder ? (
        <div className="max-w-lg mx-auto space-y-6">
          <div className={card + ' p-6 space-y-4 text-center'}>
            <ShieldCheck className="h-10 w-10 text-[#D4AF37] mx-auto" />
            <h2 className="font-serif text-xl text-[#1A1612]">Secure Payment</h2>
            <p className="text-sm text-[#5C4E3C]">
              Order <span className="font-mono text-[#9A7B2C]">{placedOrder.order_number}</span>
            </p>
            <div className="bg-[#FAF8F4] rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-[#5C4E3C]">Subtotal</span><span className="tabular-nums">{fmt(placedOrder.totals.subtotal, placedOrder.totals.currency)}</span></div>
              {placedOrder.totals.discount > 0 ? <div className="flex justify-between text-[#166534]"><span>Discount</span><span className="tabular-nums">−{fmt(placedOrder.totals.discount, placedOrder.totals.currency)}</span></div> : null}
              <div className="flex justify-between"><span className="text-[#5C4E3C]">Tax ({placedOrder.totals.tax_label})</span><span className="tabular-nums">{fmt(placedOrder.totals.tax, placedOrder.totals.currency)}</span></div>
              <div className="flex justify-between"><span className="text-[#5C4E3C]">Shipping</span><span className="tabular-nums">{fmt(placedOrder.totals.shipping, placedOrder.totals.currency)}</span></div>
              <div className="flex justify-between font-semibold text-[#1A1612] border-t border-[#E5D4B3] pt-2"><span>Grand Total</span><span className="tabular-nums">{fmt(placedOrder.totals.grand_total, placedOrder.totals.currency)}</span></div>
            </div>
            <div className="bg-[#FEFCE8] border border-[#FDE68A] rounded-lg p-3 text-left">
              <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-[#92400E]">
                <AlertTriangle className="h-3 w-3" /> Test Instrument
              </p>
              <p className="text-xs text-[#5C4E3C] mt-1">
                Dev mode: this captures a test payment without moving real money. The live PSP is owner-gated.
              </p>
            </div>
            <button onClick={payNow} disabled={paying} className={btnPrimary + ' w-full text-base py-3.5 disabled:opacity-50'}>
              {paying ? 'Processing…' : `Pay ${fmt(placedOrder.totals.grand_total, placedOrder.totals.currency)}`}
            </button>
            <button onClick={() => { setStep(1); setPlacedOrder(null); }} className="text-xs text-[#9A7B2C] hover:text-[#1A1612] cursor-pointer flex items-center gap-1 mx-auto">
              <ArrowLeft className="h-3 w-3" /> Back to summary
            </button>
          </div>
        </div>
      ) : null}

      {/* ============ STEP 3: CONFIRMATION ============ */}
      {step === 3 && placedOrder ? (
        <div className="max-w-lg mx-auto space-y-6 text-center">
          <CheckCircle2 className="h-16 w-16 text-[#166534] mx-auto" />
          <h2 className="font-serif text-3xl text-[#1A1612]">Order Confirmed</h2>
          <p className="text-sm text-[#5C4E3C]">
            Order <span className="font-mono text-[#9A7B2C]">{placedOrder.order_number}</span>
            {paid ? ' is PAID' : ' is PENDING_PAYMENT'}
          </p>
          {orderDetail ? (
            <div className={card + ' p-6 space-y-3 text-left'}>
              {(orderDetail['items'] as Array<{ description: string; quantity: number; line_total: string }>)?.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-[#5C4E3C]">{item.quantity}× {item.description}</span>
                  <span className="tabular-nums">{item.line_total}</span>
                </div>
              ))}
              <div className="border-t border-[#E5D4B3] pt-2 flex justify-between font-semibold">
                <span className="text-[#1A1612]">Total</span>
                <span className="tabular-nums">{placedOrder.totals.currency} {placedOrder.totals.grand_total.toFixed(2)}</span>
              </div>
            </div>
          ) : null}
          <Link href="/" className="inline-block px-8 py-3 gold-gradient-cta text-sm">Return to the Collection</Link>
        </div>
      ) : null}
    </div>
  );
}
