'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, ShieldCheck, AlertTriangle, Clock } from 'lucide-react';
import { useStorefront } from '@/components/providers/StorefrontProvider';
import { formatUsd, getHeroAnchorGemstone } from '@/lib/storefront-data';

const CHECKOUT_SHIPPING_KEY = 'maihan_checkout_shipping_v1';
const CHECKOUT_PAYMENT_KEY = 'maihan_checkout_payment_v1';

export function CheckoutStepIndicator({ activeStep }: { activeStep: 1 | 2 | 3 }) {
  const steps = [
    { num: 1, label: '01 · Delivery & Summary', href: '/checkout/order-summary' },
    { num: 2, label: '02 · Settlement (Demo)', href: '/checkout/secure-payment' },
    { num: 3, label: '03 · Review & Place Order', href: '/checkout/payment-order' },
  ];

  return (
    <nav aria-label="Checkout progress" className="rounded-sm border border-[#E4DFD5] bg-white p-4">
      <ol className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {steps.map((s) => (
          <li key={s.num}>
            <Link
              href={s.href}
              aria-current={activeStep === s.num ? 'step' : undefined}
              className={`block p-3 rounded-sm border text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider font-semibold transition-colors ${
                activeStep === s.num
                  ? 'border-[#D4AF37] bg-[#0A0A0B] text-[#E6C97A]'
                  : activeStep > s.num
                  ? 'border-[#E4DFD5] bg-white text-[#166534]'
                  : 'border-[#E4DFD5]/60 bg-[#F7F5F0] text-[#76726A]'
              }`}
            >
              {s.label}
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function CheckoutOrderSummaryClient() {
  const router = useRouter();
  const { cart, cartTotal } = useStorefront();
  const fallbackAnchor = getHeroAnchorGemstone();

  const [recipient, setRecipient] = useState('Claire Moreau');
  const [email, setEmail] = useState('claire.moreau@example.ch');
  const [line1, setLine1] = useState('Avenue de Champel 24');
  const [city, setCity] = useState('Genève');
  const [postalCode, setPostalCode] = useState('1206');
  const [country, setCountry] = useState('Switzerland');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(CHECKOUT_SHIPPING_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.recipient) setRecipient(parsed.recipient);
        if (parsed.email) setEmail(parsed.email);
        if (parsed.line1) setLine1(parsed.line1);
        if (parsed.city) setCity(parsed.city);
        if (parsed.postalCode) setPostalCode(parsed.postalCode);
        if (parsed.country) setCountry(parsed.country);
      }
    } catch {
      // ignore
    }
  }, []);

  const displayItems =
    cart.length > 0
      ? cart
      : [
          {
            id: fallbackAnchor.id,
            sku: fallbackAnchor.sku,
            slug: fallbackAnchor.slug,
            name: fallbackAnchor.name,
            subtitle: `${fallbackAnchor.shape} · ${fallbackAnchor.carat} ct · ${fallbackAnchor.origin}`,
            price: fallbackAnchor.price,
            image: fallbackAnchor.images[0],
            kind: 'gemstone' as const,
            quantity: 1,
          },
        ];

  const effectiveSubtotal =
    cart.length > 0 ? cartTotal : fallbackAnchor.price;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient.trim() || !email.trim() || !line1.trim() || !city.trim() || !postalCode.trim()) {
      setError('All insured courier recipient and address fields are required.');
      return;
    }
    setError(null);
    try {
      sessionStorage.setItem(
        CHECKOUT_SHIPPING_KEY,
        JSON.stringify({ recipient, email, line1, city, postalCode, country })
      );
    } catch {
      // ignore
    }
    router.push('/checkout/secure-payment');
  };

  return (
    <div className="space-y-8">
      <CheckoutStepIndicator activeStep={1} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-7 rounded-sm border border-[#E4DFD5] bg-white p-6 space-y-5"
        >
          <div className="border-b border-[#E4DFD5] pb-3">
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[#121211]">
              Insured Courier Destination
            </h2>
            <p className="text-xs text-[#4E4C47] mt-0.5">
              Government photo ID required upon armoured courier handoff.
            </p>
          </div>

          {error && (
            <div role="alert" className="rounded-sm border border-[#991B1B] bg-[#991B1B]/10 p-3 text-xs text-[#991B1B]">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label htmlFor="ship-recipient" className="block font-medium text-[#121211] mb-1">
                Recipient Name
              </label>
              <input
                id="ship-recipient"
                type="text"
                required
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="w-full rounded-sm border border-[#E4DFD5] bg-[#F7F5F0] px-3 py-2 text-[#121211]"
              />
            </div>
            <div>
              <label htmlFor="ship-email" className="block font-medium text-[#121211] mb-1">
                Dispatch Email
              </label>
              <input
                id="ship-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-sm border border-[#E4DFD5] bg-[#F7F5F0] px-3 py-2 text-[#121211]"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="ship-line1" className="block font-medium text-[#121211] mb-1">
                Street Address &amp; Suite
              </label>
              <input
                id="ship-line1"
                type="text"
                required
                value={line1}
                onChange={(e) => setLine1(e.target.value)}
                className="w-full rounded-sm border border-[#E4DFD5] bg-[#F7F5F0] px-3 py-2 text-[#121211]"
              />
            </div>
            <div>
              <label htmlFor="ship-city" className="block font-medium text-[#121211] mb-1">
                City
              </label>
              <input
                id="ship-city"
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded-sm border border-[#E4DFD5] bg-[#F7F5F0] px-3 py-2 text-[#121211]"
              />
            </div>
            <div>
              <label htmlFor="ship-postal" className="block font-medium text-[#121211] mb-1">
                Postal Code
              </label>
              <input
                id="ship-postal"
                type="text"
                required
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className="w-full rounded-sm border border-[#E4DFD5] bg-[#F7F5F0] px-3 py-2 text-[#121211]"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="ship-country" className="block font-medium text-[#121211] mb-1">
                Country
              </label>
              <input
                id="ship-country"
                type="text"
                required
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full rounded-sm border border-[#E4DFD5] bg-[#F7F5F0] px-3 py-2 text-[#121211]"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-[#E4DFD5] flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-3 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider font-semibold gold-gradient-cta rounded-sm"
            >
              Step 02: Settlement
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </form>

        <aside className="lg:col-span-5 rounded-sm border border-[#D4AF37]/30 bg-[#0A0A0B] text-white p-6 space-y-4">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-white border-b border-white/10 pb-3">
            Vault Selection ({displayItems.length})
          </h2>

          <ul className="divide-y divide-white/10 text-xs">
            {displayItems.map((item) => (
              <li key={item.id} className="py-3 flex justify-between gap-4">
                <div>
                  <p className="font-[family-name:var(--font-mono)] text-[#D4AF37]">{item.sku}</p>
                  <p className="font-semibold text-white">{item.name}</p>
                  <p className="text-[#C8C3B8]">{item.subtitle}</p>
                </div>
                <span className="font-[family-name:var(--font-mono)] tabular-nums font-semibold text-[#E6C97A]">
                  {formatUsd(item.price * item.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <div className="border-t border-white/10 pt-3 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-[#C8C3B8]">Armoured Malca-Amit Dispatch</span>
              <span className="font-[family-name:var(--font-mono)] text-[#E6C97A]">Included</span>
            </div>
            <div className="flex justify-between text-sm font-semibold text-[#E6C97A] pt-2 border-t border-white/10">
              <span>Fixed Total</span>
              <span className="font-[family-name:var(--font-mono)] tabular-nums">
                {formatUsd(effectiveSubtotal)}
              </span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export function CheckoutSecurePaymentClient() {
  const router = useRouter();
  const [method, setMethod] = useState<'SWISS_WIRE_DEMO' | 'ESCROW_CARD_DEMO'>('SWISS_WIRE_DEMO');
  const [referenceNote, setReferenceNote] = useState('DEMO-SETTLEMENT-2026');

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      sessionStorage.setItem(
        CHECKOUT_PAYMENT_KEY,
        JSON.stringify({ method, referenceNote })
      );
    } catch {
      // ignore
    }
    router.push('/checkout/payment-order');
  };

  return (
    <div className="space-y-8">
      <CheckoutStepIndicator activeStep={2} />

      <div className="rounded-sm border border-[#D4AF37]/30 bg-[#0A0A0B] text-white p-5 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-[#D4AF37] shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-semibold text-[#E6C97A]">
            Simulated Payment Provider (Demo Mode)
          </p>
          <p className="text-[#C8C3B8]">
            No live card or banking credentials are collected. Orders log in{' '}
            <code className="font-[family-name:var(--font-mono)] text-white">PENDING_PAYMENT</code>{' '}
            until treasury reconciliation.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleContinue}
        className="rounded-sm border border-[#E4DFD5] bg-white p-6 space-y-6 max-w-3xl"
      >
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[#121211] border-b border-[#E4DFD5] pb-3">
          Select Settlement Instrument
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            aria-pressed={method === 'SWISS_WIRE_DEMO'}
            onClick={() => setMethod('SWISS_WIRE_DEMO')}
            className={`p-4 rounded-sm border text-left text-xs transition-colors ${
              method === 'SWISS_WIRE_DEMO'
                ? 'border-[#D4AF37] bg-[#0A0A0B] text-white'
                : 'border-[#E4DFD5] bg-white text-[#121211]'
            }`}
          >
            <p className="font-semibold">
              Geneva Bank Wire (Demo IBAN Hold)
            </p>
            <p className={`mt-1 ${method === 'SWISS_WIRE_DEMO' ? 'text-[#C8C3B8]' : 'text-[#4E4C47]'}`}>
              48-hour vault reservation pending wire reconciliation.
            </p>
          </button>

          <button
            type="button"
            aria-pressed={method === 'ESCROW_CARD_DEMO'}
            onClick={() => setMethod('ESCROW_CARD_DEMO')}
            className={`p-4 rounded-sm border text-left text-xs transition-colors ${
              method === 'ESCROW_CARD_DEMO'
                ? 'border-[#D4AF37] bg-[#0A0A0B] text-white'
                : 'border-[#E4DFD5] bg-white text-[#121211]'
            }`}
          >
            <p className="font-semibold">
              Vault Escrow Authorization (Demo)
            </p>
            <p className={`mt-1 ${method === 'ESCROW_CARD_DEMO' ? 'text-[#C8C3B8]' : 'text-[#4E4C47]'}`}>
              Simulated escrow pre-authorization in PENDING_PAYMENT state.
            </p>
          </button>
        </div>

        <div className="text-xs">
          <label htmlFor="demo-ref-note" className="block font-medium text-[#121211] mb-1">
            Reference Memo
          </label>
          <input
            id="demo-ref-note"
            type="text"
            value={referenceNote}
            onChange={(e) => setReferenceNote(e.target.value)}
            className="w-full rounded-sm border border-[#E4DFD5] bg-[#F7F5F0] px-3 py-2 font-[family-name:var(--font-mono)] text-[#121211]"
          />
        </div>

        <div className="pt-4 border-t border-[#E4DFD5] flex justify-between">
          <Link
            href="/checkout/order-summary"
            className="px-4 py-2.5 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider border border-[#E4DFD5] rounded-sm"
          >
            ← Step 01
          </Link>
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-6 py-3 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider font-semibold gold-gradient-cta rounded-sm"
          >
            Step 03: Review Order
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

export function CheckoutPaymentOrderClient() {
  const router = useRouter();
  const { cart, cartTotal, clearCart } = useStorefront();
  const fallbackAnchor = getHeroAnchorGemstone();

  const [shipping, setShipping] = useState({
    recipient: 'Claire Moreau',
    email: 'claire.moreau@example.ch',
    line1: 'Avenue de Champel 24',
    city: 'Genève',
    postalCode: '1206',
    country: 'Switzerland',
  });
  const [payment, setPayment] = useState({
    method: 'SWISS_WIRE_DEMO',
    referenceNote: 'DEMO-SETTLEMENT-2026',
  });

  useEffect(() => {
    try {
      const s = sessionStorage.getItem(CHECKOUT_SHIPPING_KEY);
      if (s) setShipping(JSON.parse(s));
      const p = sessionStorage.getItem(CHECKOUT_PAYMENT_KEY);
      if (p) setPayment(JSON.parse(p));
    } catch {
      // ignore
    }
  }, []);

  const effectiveTotal = cart.length > 0 ? cartTotal : fallbackAnchor.price;

  const handlePlaceOrder = () => {
    clearCart();
    const targetOrderId = effectiveTotal === 2480 ? 'ORD-2026-9012' : `ORD-LIVE-${effectiveTotal}`;
    router.push(`/checkout/confirmation/${encodeURIComponent(targetOrderId)}`);
  };

  return (
    <div className="space-y-8">
      <CheckoutStepIndicator activeStep={3} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 rounded-sm border border-[#E4DFD5] bg-white p-6 space-y-6">
          <div className="border-b border-[#E4DFD5] pb-4">
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[#121211]">
              Final Verification
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
            <div className="rounded-sm border border-[#E4DFD5] bg-[#F7F5F0] p-4 space-y-1">
              <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-[#9A7B2C]">
                RECIPIENT
              </p>
              <p className="font-semibold text-[#121211]">{shipping.recipient}</p>
              <p className="text-[#4E4C47]">{shipping.line1}</p>
              <p className="text-[#4E4C47]">
                {shipping.postalCode} {shipping.city}, {shipping.country}
              </p>
              <p className="text-[#76726A] pt-1">{shipping.email}</p>
            </div>

            <div className="rounded-sm border border-[#E4DFD5] bg-[#F7F5F0] p-4 space-y-1">
              <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-[#9A7B2C]">
                SETTLEMENT INSTRUMENT
              </p>
              <p className="font-semibold text-[#121211]">{payment.method}</p>
              <p className="text-[#4E4C47]">Memo: {payment.referenceNote}</p>
              <p className="text-[#9A3412] pt-1 flex items-center gap-1 font-[family-name:var(--font-mono)]">
                <Clock className="h-3.5 w-3.5" />
                Initial state: PENDING_PAYMENT
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E4DFD5] flex items-center justify-between">
            <Link
              href="/checkout/secure-payment"
              className="px-4 py-2.5 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider border border-[#E4DFD5] rounded-sm"
            >
              ← Step 02
            </Link>

            <button
              type="button"
              onClick={handlePlaceOrder}
              data-testid="place-order-button"
              className="inline-flex items-center gap-2 px-6 py-3 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider font-semibold gold-gradient-cta rounded-sm"
            >
              <ShieldCheck className="h-4 w-4" />
              Place Vault Order ({formatUsd(effectiveTotal)})
            </button>
          </div>
        </div>

        <aside className="lg:col-span-4 rounded-sm border border-[#D4AF37]/30 bg-[#0A0A0B] text-white p-6 space-y-3 text-xs">
          <h3 className="font-[family-name:var(--font-display)] text-xl font-semibold text-[#E6C97A] border-b border-white/10 pb-2">
            Reconciliation Standard
          </h3>
          <p className="text-[#C8C3B8] leading-relaxed">
            New orders record in <code className="font-[family-name:var(--font-mono)] text-white">PENDING_PAYMENT</code>{' '}
            status until Geneva treasury settlement.
          </p>
        </aside>
      </div>
    </div>
  );
}
