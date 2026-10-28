'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, ShieldCheck, AlertTriangle, Clock } from 'lucide-react';
import { formatUsd } from '@/lib/mgh/storefront-data';
import { useStorefront } from '@/components/mgh/providers/StorefrontProvider';
import {
  CHECKOUT_SHIPPING_KEY,
  CHECKOUT_PAYMENT_KEY,
  getCheckoutSession,
  listProductAddons,
  normalizeCountryCode,
  placeOrder,
  recordSettlementMethod,
  startCheckout,
  useMergedBag,
  validateDiscount,
  type CheckoutSession,
  type ValidatedDiscount,
} from '@/lib/mgh/adapters/commerce';

/**
 * M4 — the reference checkout steps rendered over the repo's REAL funnel.
 *
 * Markup, classes, fonts and animation vocabulary are the reference applet's
 * own (M1 copy, unchanged); every action wires into the real commerce seam
 * through `lib/mgh/adapters/commerce` and every displayed figure is the
 * server's. Deviations are limited to DATA SEAMS:
 *   - the applet's fake anchor item ($2,480 pre-selected stone) is gone:
 *     empty trays render the applet's empty-state visual instead of a
 *     fabricated selection;
 *   - the demo payment instrument names (SWISS_WIRE_DEMO / ESCROW_CARD_DEMO)
 *     never render — the settlement card shows the REAL provider state (dev
 *     settles through the sandbox TEST provider; card/escrow rails are a
 *     pending backend decision and stay disabled);
 *   - the applet's `ORD-LIVE-…` fake order build is gone: placing the order
 *     runs the real confirm checkpoint + POST /api/v1/orders and lands on
 *     the real confirmation page, which shows the authoritative state.
 */

export function CheckoutStepIndicator({ activeStep }: { activeStep: 1 | 2 | 3 }) {
  const steps = [
    { num: 1, label: '01 · Delivery & Summary', href: '/checkout/order-summary' },
    // The step hrefs follow the repo's REAL funnel ordering (review →
    // settlement → final review & placement). The labels stay the applet's.
    { num: 2, label: '02 · Settlement (Demo)', href: '/checkout/payment-order' },
    { num: 3, label: '03 · Review & Place Order', href: '/checkout/secure-payment' },
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

/* -----------------------------------------------------------------------
 * Step 1 — order summary + insured courier destination. The form submits
 * THROUGH the real bridge (server cart → session → shipping checkpoint).
 * ----------------------------------------------------------------------- */

export function CheckoutOrderSummaryClient() {
  const router = useRouter();
  const { clearCart } = useStorefront();
  const bag = useMergedBag();

  // The reference applet prefilled a demo recipient/person; a real storefront
  // cannot ship from fabricated demographics, so the seam leaves these empty.
  const [recipient, setRecipient] = useState('');
  const [email, setEmail] = useState('');
  const [line1, setLine1] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [discountCode, setDiscountCode] = useState('');
  const [validatedDiscount, setValidatedDiscount] = useState<ValidatedDiscount | null>(null);
  const [discountMessage, setDiscountMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(CHECKOUT_SHIPPING_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Record<string, string>;
        if (parsed['recipient']) setRecipient(parsed['recipient']);
        if (parsed['email']) setEmail(parsed['email']);
        if (parsed['line1']) setLine1(parsed['line1']);
        if (parsed['city']) setCity(parsed['city']);
        if (parsed['postalCode']) setPostalCode(parsed['postalCode']);
        if (parsed['country']) setCountry(parsed['country']);
      }
    } catch {
      // ignore
    }
  }, []);

  const displayItems = bag.items;
  const effectiveSubtotal = bag.subtotal;

  const handleValidatePromo = async () => {
    const code = discountCode.trim().toUpperCase();
    setDiscountMessage(null);
    if (!code) {
      setValidatedDiscount(null);
      return;
    }
    const validated = await validateDiscount(code, effectiveSubtotal);
    if (!validated) {
      setValidatedDiscount(null);
      setDiscountMessage('Promotional code is invalid or inapplicable.');
      return;
    }
    setValidatedDiscount(validated);
    setDiscountMessage(`Applied ${validated.name}: −${formatUsd(Number(validated.discount_amount))}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient.trim() || !email.trim() || !line1.trim() || !city.trim() || !postalCode.trim()) {
      setError('All insured courier recipient and address fields are required.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email — order correspondence and payment confirmation are sent there.');
      return;
    }
    const countryCode = normalizeCountryCode(country);
    if (!countryCode) {
      setError('Country must be a two-letter country code (e.g. CH for Switzerland).');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const session = await startCheckout({
        email: email.trim(),
        discountCode: validatedDiscount?.code ?? (discountCode.trim().toUpperCase() || null),
        shipping: {
          full_name: recipient.trim(),
          line1: line1.trim(),
          city: city.trim(),
          postal_code: postalCode.trim(),
          country_code: countryCode,
        },
        candidates: bag.items,
      });
      try {
        sessionStorage.setItem(
          CHECKOUT_SHIPPING_KEY,
          JSON.stringify({ recipient, email, line1, city, postalCode, country })
        );
      } catch {
        // ignore
      }
      // The server cart + session now own the funnel — the browser tray empties
      // exactly like the replaced bridge did on success.
      clearCart();
      router.push(`/checkout/payment-order?session=${encodeURIComponent(session.id)}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Checkout could not be started.');
    } finally {
      setBusy(false);
    }
  };

  if (bag.loading && displayItems.length === 0) {
    return <p aria-busy="true" className="text-xs text-[#4E4C47] font-[family-name:var(--font-mono)]">Loading your vault tray…</p>;
  }

  if (displayItems.length === 0) {
    return (
      <div className="rounded-sm border border-[#E4DFD5] bg-white p-12 text-center space-y-4">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[#121211]">
          Your vault tray is empty.
        </h2>
        <div className="pt-2 flex justify-center gap-3">
          <Link
            href="/browse"
            className="px-5 py-2.5 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider font-semibold gold-gradient-cta rounded-sm"
          >
            Browse Gemstones
          </Link>
          <Link
            href="/design-your-own"
            className="px-5 py-2.5 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider font-medium border border-[#E4DFD5] bg-white text-[#121211] rounded-sm hover:bg-[#EFECE6]"
          >
            Atelier DYO
          </Link>
        </div>
      </div>
    );
  }

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
                maxLength={2}
                minLength={2}
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full rounded-sm border border-[#E4DFD5] bg-[#F7F5F0] px-3 py-2 text-[#121211]"
              />
            </div>
          </div>

          {/*
            DATA SEAM — the replaced step-1 island validated optional
            promotional codes against the real discounts endpoint before the
            session applies them; the feature survives with the applet's own
            field/button vocabulary.
          */}
          <div className="text-xs border border-[#E4DFD5] bg-[#F7F5F0] p-4 space-y-2">
            <label htmlFor="ck-promo-code" className="block font-medium text-[#121211]">
              Promotional Code (Optional)
            </label>
            <div className="flex gap-3">
              <input
                id="ck-promo-code"
                type="text"
                placeholder="e.g. WELCOME10"
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                className="flex-1 rounded-sm border border-[#E4DFD5] bg-white px-3 py-2 text-[#121211]"
              />
              <button
                type="button"
                onClick={() => void handleValidatePromo()}
                className="px-5 py-2.5 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider font-medium border border-[#E4DFD5] bg-white text-[#121211] rounded-sm hover:bg-[#EFECE6]"
              >
                Apply code
              </button>
            </div>
            {discountMessage ? (
              <p className="text-[#4E4C47]" role="status">
                {discountMessage}
              </p>
            ) : null}
          </div>

          <div className="pt-4 border-t border-[#E4DFD5] flex justify-end">
            <button
              type="submit"
              disabled={busy}
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
              <li key={item.serverItemId ?? item.id} className="py-3 flex justify-between gap-4">
                <div>
                  <p className="font-[family-name:var(--font-mono)] text-[#D4AF37]">{item.sku}</p>
                  <p className="font-semibold text-white">{item.name}</p>
                  {item.subtitle ? <p className="text-[#C8C3B8]">{item.subtitle}</p> : null}
                </div>
                <span className="font-[family-name:var(--font-mono)] tabular-nums font-semibold text-[#E6C97A]">
                  {formatUsd(item.price * (item.quantity ?? 1))}
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

/* -----------------------------------------------------------------------
 * Step 2 — settlement. The REAL payment checkpoint; the instruments shown
 * are the provider state the backend actually has (test provider in dev,
 * card/escrow pending). The demo banner copy is the applet's and states the
 * truth for this environment, so it stays verbatim.
 * ----------------------------------------------------------------------- */

function NoSessionState(): React.ReactElement {
  return (
    <div className="rounded-sm border border-[#E4DFD5] bg-white p-12 text-center space-y-4">
      <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[#121211]">
        No checkout session in progress.
      </h2>
      <div className="pt-2 flex justify-center">
        <Link
          href="/checkout/order-summary"
          className="px-5 py-2.5 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider font-semibold gold-gradient-cta rounded-sm"
        >
          Start checkout
        </Link>
      </div>
    </div>
  );
}

function SessionErrorState({ message, retryHref }: { message: string; retryHref: string }): React.ReactElement {
  return (
    <div className="space-y-4">
      <div role="alert" className="rounded-sm border border-[#991B1B] bg-[#991B1B]/10 p-4 text-xs text-[#991B1B]">
        {message}
      </div>
      <Link
        href={retryHref}
        className="inline-flex items-center justify-center px-5 py-2.5 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider font-semibold gold-gradient-cta rounded-sm"
      >
        Restart checkout
      </Link>
    </div>
  );
}

export function CheckoutSecurePaymentClient({ sessionId }: { sessionId: string | null }) {
  const router = useRouter();
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [method, setMethod] = useState<'TEST'>('TEST');
  const [referenceNote, setReferenceNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!sessionId) return;
    void (async () => {
      try {
        const loaded = await getCheckoutSession(sessionId);
        if (!cancelled) setSession(loaded);
      } catch (cause) {
        if (!cancelled) setLoadError(cause instanceof Error ? cause.message : 'This checkout session could not be loaded.');
      }
    })();
    return () => { cancelled = true; };
  }, [sessionId]);

  if (!sessionId) return <NoSessionState />;
  if (loadError) {
    return <SessionErrorState message={loadError} retryHref="/checkout/order-summary" />;
  }
  if (!session) {
    return <p aria-busy="true" className="text-xs text-[#4E4C47] font-[family-name:var(--font-mono)]">Loading your checkout session…</p>;
  }

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await recordSettlementMethod(sessionId);
      try {
        sessionStorage.setItem(
          CHECKOUT_PAYMENT_KEY,
          JSON.stringify({ method, referenceNote })
        );
      } catch {
        // ignore
      }
      router.push(`/checkout/secure-payment?session=${encodeURIComponent(sessionId)}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The settlement method was not accepted. Please try again.');
    } finally {
      setBusy(false);
    }
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

        {/*
          HONESTY SEAM — the applet's two demo instruments (fake wire/escrow
          products) do not render. The selectable card is the provider that
          REALLY settles this funnel in development; the live rails card is
          shown (applet classes) but disabled while decision ADR-024-class
          backend integration is pending, because recording it would lie.
        */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            aria-pressed={method === 'TEST'}
            onClick={() => setMethod('TEST')}
            className={`p-4 rounded-sm border text-left text-xs transition-colors ${
              method === 'TEST'
                ? 'border-[#D4AF37] bg-[#0A0A0B] text-white'
                : 'border-[#E4DFD5] bg-white text-[#121211]'
            }`}
          >
            <p className="font-semibold">
              Test Provider Settlement (Development)
            </p>
            <p className={`mt-1 ${method === 'TEST' ? 'text-[#C8C3B8]' : 'text-[#4E4C47]'}`}>
              Sandbox settlement rails; orders log in PENDING_PAYMENT until reconciliation.
            </p>
          </button>

          <button
            type="button"
            disabled
            aria-pressed={false}
            className="p-4 rounded-sm border text-left text-xs transition-colors border-[#E4DFD5] bg-white text-[#76726A] cursor-not-allowed"
          >
            <p className="font-semibold">
              Card &amp; Escrow Rails (Live Provider Pending)
            </p>
            <p className="mt-1 text-[#76726A]">
              Card acquirer, 3-D Secure and escrow are a pending backend decision — not available yet.
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
          <p className="text-[#4E4C47] mt-1">Optional — carried onto the order as the customer note.</p>
        </div>

        {error && (
          <div role="alert" className="rounded-sm border border-[#991B1B] bg-[#991B1B]/10 p-3 text-xs text-[#991B1B]">
            {error}
          </div>
        )}

        <div className="pt-4 border-t border-[#E4DFD5] flex justify-between">
          <Link
            href="/checkout/order-summary"
            className="px-4 py-2.5 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider border border-[#E4DFD5] rounded-sm"
          >
            ← Step 01
          </Link>
          <button
            type="submit"
            disabled={busy}
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

/* -----------------------------------------------------------------------
 * Step 3 — final review + REAL order placement. The recipient/instrument
 * cards render the REAL recorded session; the placement runs
 * confirm → POST /api/v1/orders and lands on the real confirmation page
 * with the server's own order id and state.
 * ----------------------------------------------------------------------- */

export function CheckoutPaymentOrderClient({ sessionId }: { sessionId: string | null }) {
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [addons, setAddons] = useState<{ id: string; name: string; addon_type: string; price: string }[]>([]);
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [shippingMemo, setShippingMemo] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!sessionId) return;
    void (async () => {
      try {
        const [loaded, addonList] = await Promise.all([
          getCheckoutSession(sessionId),
          listProductAddons(),
        ]);
        if (cancelled) return;
        setSession(loaded);
        setAddons(addonList);
        try {
          const stored = sessionStorage.getItem(CHECKOUT_PAYMENT_KEY);
          if (stored) {
            const parsed = JSON.parse(stored) as { method?: string; referenceNote?: string };
            setShippingMemo(parsed['referenceNote'] ?? '');
          }
        } catch {
          // ignore
        }
      } catch (cause) {
        if (!cancelled) setLoadError(cause instanceof Error ? cause.message : 'This checkout session could not be loaded.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useEffect(() => {
    // Real parity with the replaced confirm island: a session that already
    // completed routes to the authoritative confirmation of that order.
    if (session?.completed_order_id) {
      window.location.href = `/checkout/confirmation/${session.completed_order_id}`;
    }
  }, [session]);

  function toggleAddon(id: string) {
    setSelectedAddonIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  if (!sessionId) return <NoSessionState />;
  if (loadError) {
    return <SessionErrorState message={loadError} retryHref="/checkout/order-summary" />;
  }
  if (!session) {
    return <p aria-busy="true" className="text-xs text-[#4E4C47] font-[family-name:var(--font-mono)]">Loading your checkout session…</p>;
  }

  const recipient = session.shipping_address;
  const methodRecorded = Boolean(session.payment_intent_id);

  const handlePlaceOrder = async () => {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const orderId = await placeOrder(sessionId, selectedAddonIds, shippingMemo);
      window.location.href = `/checkout/confirmation/${encodeURIComponent(orderId)}`;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The order could not be placed.');
      setBusy(false);
    }
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
              {recipient ? (
                <>
                  <p className="font-semibold text-[#121211]">{recipient['full_name']}</p>
                  <p className="text-[#4E4C47]">{recipient['line1']}</p>
                  <p className="text-[#4E4C47]">
                    {recipient['postal_code']} {recipient['city']}, {recipient['country_code']}
                  </p>
                  <p className="text-[#76726A] pt-1">{session.email}</p>
                </>
              ) : (
                <p className="text-[#4E4C47]">Insured courier destination not recorded yet.</p>
              )}
            </div>

            <div className="rounded-sm border border-[#E4DFD5] bg-[#F7F5F0] p-4 space-y-1">
              <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-[#9A7B2C]">
                SETTLEMENT INSTRUMENT
              </p>
              <p className="font-semibold text-[#121211]">
                {methodRecorded ? 'Test Provider Settlement (Development)' : 'Not recorded yet'}
              </p>
              {shippingMemo ? <p className="text-[#4E4C47]">Memo: {shippingMemo}</p> : null}
              <p className="text-[#9A3412] pt-1 flex items-center gap-1 font-[family-name:var(--font-mono)]">
                <Clock className="h-3.5 w-3.5" />
                Initial state: PENDING_PAYMENT
              </p>
            </div>
          </div>

          {addons.length > 0 ? (
            <div className="border border-[#E4DFD5] bg-[#F7F5F0] p-4 space-y-2 text-xs">
              <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-[#9A7B2C]">
                OPTIONAL PROTECTION &amp; FINANCING
              </p>
              <div className="space-y-1.5">
                {addons.map((addon) => {
                  const checked = selectedAddonIds.includes(addon.id);
                  return (
                    <label
                      key={addon.id}
                      className="flex items-center justify-between gap-3 text-[#121211] cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleAddon(addon.id)}
                        />
                        {addon.name} ({addon.addon_type})
                      </span>
                      <span className="font-[family-name:var(--font-mono)] tabular-nums">+{formatUsd(Number(addon.price))}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : null}

          {error && (
            <div role="alert" className="rounded-sm border border-[#991B1B] bg-[#991B1B]/10 p-3 text-xs text-[#991B1B]">
              {error}
            </div>
          )}

          <div className="pt-4 border-t border-[#E4DFD5] flex items-center justify-between">
            <Link
              href={`/checkout/payment-order?session=${encodeURIComponent(sessionId)}`}
              className="px-4 py-2.5 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider border border-[#E4DFD5] rounded-sm"
            >
              ← Step 02
            </Link>

            <button
              type="button"
              onClick={() => void handlePlaceOrder()}
              disabled={busy}
              data-testid="place-order-button"
              className="inline-flex items-center gap-2 px-6 py-3 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider font-semibold gold-gradient-cta rounded-sm"
            >
              <ShieldCheck className="h-4 w-4" />
              Place Vault Order ({formatUsd(Number(session.pricing_snapshot.grand_total))})
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
