'use client';

/**
 * apps/web/src/components/checkout/CheckoutPayment.tsx
 *
 * Checkout steps 2–3 — delivery details + settlement method, against the
 * REAL checkpoint endpoints (`submitShipping`, `submitPayment`). The server
 * validates every checkpoint in order and rejects skipped steps with 422 —
 * that behaviour is surfaced verbatim.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface CheckoutSession {
  id: string;
  current_step: string;
  email: string | null;
  shipping_address: Record<string, string | null> | null;
  shipping_method: Record<string, string | number | null> | null;
  pricing_snapshot: {
    currency: string;
    subtotal: string;
    discount_total: string;
    shipping_total: string;
    tax_total: string;
    grand_total: string;
  };
  reservation_expires_at: string;
}

function money(amount: string | number): string {
  const n = Number(amount);
  return Number.isFinite(n)
    ? n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
    : String(amount);
}

export function CheckoutPayment({ sessionId }: { sessionId: string }) {
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [address, setAddress] = useState({
    full_name: '',
    line1: '',
    line2: '',
    city: '',
    region: '',
    postal_code: '',
    country_code: 'AE',
    phone: '',
  });
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'address' | 'method'>('address');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch(`/api/v1/checkout/sessions/${encodeURIComponent(sessionId)}`);
      if (cancelled) return;
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
        setLoadError(body?.error?.message ?? 'This checkout session could not be loaded.');
        return;
      }
      const body = (await res.json()) as { data?: CheckoutSession };
      if (!body.data) {
        setLoadError('This checkout session could not be loaded.');
        return;
      }
      setSession(body.data);
      if (body.data.email) setEmail(body.data.email);
      if (body.data.shipping_address) {
        const a = body.data.shipping_address;
        setAddress({
          full_name: a['full_name'] ?? '',
          line1: a['line1'] ?? '',
          line2: a['line2'] ?? '',
          city: a['city'] ?? '',
          region: a['region'] ?? '',
          postal_code: a['postal_code'] ?? '',
          country_code: a['country_code'] ?? 'AE',
          phone: a['phone'] ?? '',
        });
        if (body.data.current_step !== 'SHIPPING') setStep('method');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  async function post(path: string, body: unknown): Promise<CheckoutSession | null> {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = (await res.json()) as { data?: CheckoutSession };
        if (data.data) {
          setSession(data.data);
          return data.data;
        }
      }
      const errBody = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null;
      setError(errBody?.error?.message ?? 'The checkpoint was not accepted. Please try again.');
      return null;
    } catch {
      setError('The checkout service is unreachable. Please try again.');
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function handleAddress(event: React.FormEvent) {
    event.preventDefault();
    const updated = await post(`/api/v1/checkout/sessions/${encodeURIComponent(sessionId)}/shipping`, {
      shipping_address: {
        full_name: address.full_name,
        line1: address.line1,
        line2: address.line2.length > 0 ? address.line2 : undefined,
        city: address.city,
        region: address.region.length > 0 ? address.region : undefined,
        postal_code: address.postal_code,
        country_code: address.country_code,
        phone: address.phone.length > 0 ? address.phone : undefined,
      },
    });
    if (updated) setStep('method');
  }

  async function handleMethod(methodType: 'TEST' | 'FINANCING' | 'WALLET' | 'CARD') {
    const updated = await post(`/api/v1/checkout/sessions/${encodeURIComponent(sessionId)}/payment`, {
      method_type: methodType,
    });
    if (updated) {
      window.location.href = `/checkout/secure-payment?session=${encodeURIComponent(sessionId)}`;
    }
  }

  if (loadError) {
    return (
      <div className="lx-account-card" role="alert">
        <p className="lx-account-note">{loadError}</p>
        <Link href="/checkout/order-summary" className="lx-btn lx-btn--solid">Restart checkout</Link>
      </div>
    );
  }

  if (!session) {
    return <p className="lx-account-note" aria-busy="true">Loading your checkout session…</p>;
  }

  return (
    <div className="lx-account-form">
      <div className="lx-account-field">
        <label htmlFor="ck-email">Email for order correspondence</label>
        <input id="ck-email" type="email" value={email} readOnly disabled />
      </div>

      {step === 'address' ? (
        <form onSubmit={handleAddress} className="lx-account-card">
          <h2 className="lx-account-card__title">Delivery address</h2>
          <div className="lx-account-form">
            <div className="lx-account-field">
              <label htmlFor="ck-name">Full name</label>
              <input id="ck-name" required value={address.full_name} onChange={(e) => setAddress({ ...address, full_name: e.target.value })} />
            </div>
            <div className="lx-account-field">
              <label htmlFor="ck-line1">Address line 1</label>
              <input id="ck-line1" required value={address.line1} onChange={(e) => setAddress({ ...address, line1: e.target.value })} />
            </div>
            <div className="lx-account-field">
              <label htmlFor="ck-line2">Address line 2</label>
              <input id="ck-line2" value={address.line2} onChange={(e) => setAddress({ ...address, line2: e.target.value })} />
            </div>
            <div className="lx-account-form__row lx-account-form__row--two">
              <div className="lx-account-field">
                <label htmlFor="ck-city">City</label>
                <input id="ck-city" required value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} />
              </div>
              <div className="lx-account-field">
                <label htmlFor="ck-region">Region</label>
                <input id="ck-region" value={address.region} onChange={(e) => setAddress({ ...address, region: e.target.value })} />
              </div>
            </div>
            <div className="lx-account-form__row lx-account-form__row--two">
              <div className="lx-account-field">
                <label htmlFor="ck-postal">Postal code</label>
                <input id="ck-postal" required value={address.postal_code} onChange={(e) => setAddress({ ...address, postal_code: e.target.value })} />
              </div>
              <div className="lx-account-field">
                <label htmlFor="ck-country">Country code</label>
                <input id="ck-country" required maxLength={2} minLength={2} value={address.country_code} onChange={(e) => setAddress({ ...address, country_code: e.target.value.toUpperCase() })} />
              </div>
            </div>
            <div className="lx-account-field">
              <label htmlFor="ck-phone">Phone</label>
              <input id="ck-phone" type="tel" value={address.phone} onChange={(e) => setAddress({ ...address, phone: e.target.value })} />
            </div>
            {error ? <p className="lx-account-error" role="alert">{error}</p> : null}
            <button type="submit" className="lx-btn lx-btn--solid" disabled={busy}>
              {busy ? 'Saving…' : 'Continue to settlement'}
            </button>
          </div>
        </form>
      ) : (
        <div className="lx-account-card">
          <h2 className="lx-account-card__title">Settlement method</h2>
          <p className="lx-account-note">
            Held total: <strong>{money(session.pricing_snapshot.grand_total)}</strong> ({session.pricing_snapshot.currency}) —
            confirmed by the server, not by this page.
          </p>
          <p className="lx-account-note">
            The live payment-provider integration (card acquirer, 3-D Secure, escrow) is a pending backend
            decision. Development runs settle through the test provider, which is stated here rather than
            dressed up as a live gateway.
          </p>
          {error ? <p className="lx-account-error" role="alert">{error}</p> : null}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button type="button" className="lx-btn lx-btn--solid" disabled={busy} onClick={() => void handleMethod('TEST')}>
              {busy ? 'Recording…' : 'Record settlement method (test provider)'}
            </button>
            <button type="button" className="lx-btn lx-btn--ghost" onClick={() => setStep('address')}>
              Edit delivery address
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
