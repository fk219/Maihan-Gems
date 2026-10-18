'use client';

/**
 * apps/web/src/components/checkout/CheckoutConfirm.tsx
 *
 * Checkout step 4 — review and order placement against the REAL endpoints:
 * `POST …/confirm` (final checkpoint) then `POST /api/v1/orders`. The order
 * number and state come from the server response; this island never declares
 * success on its own. A rejected confirm/place (409 PRICE_CHANGED, 422,
 * session loss) renders the server message with the right recovery path.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface CheckoutSession {
  id: string;
  current_step: string;
  completed_order_id: string | null;
  pricing_snapshot: {
    currency: string;
    subtotal: string;
    discount_total: string;
    shipping_total: string;
    tax_total: string;
    grand_total: string;
    item_count: number;
  };
  reservation_expires_at: string;
}

function money(amount: string | number): string {
  const n = Number(amount);
  return Number.isFinite(n)
    ? n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
    : String(amount);
}

export function CheckoutConfirm({ sessionId }: { sessionId: string }) {
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch(`/api/v1/checkout/sessions/${encodeURIComponent(sessionId)}`);
      if (cancelled) return;
      if (!res.ok) {
        setLoadError('This checkout session could not be loaded.');
        return;
      }
      const body = (await res.json()) as { data?: CheckoutSession };
      if (!body.data) {
        setLoadError('This checkout session could not be loaded.');
        return;
      }
      setSession(body.data);
      if (body.data.completed_order_id) {
        window.location.href = `/checkout/confirmation/${body.data.completed_order_id}`;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  async function place(): Promise<void> {
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      const idempotencyKey = `order_${session.id}_${Date.now()}`;
      const confirmRes = await fetch(`/api/v1/checkout/sessions/${encodeURIComponent(sessionId)}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idempotency_key: idempotencyKey }),
      });
      if (!confirmRes.ok) {
        const body = (await confirmRes.json().catch(() => null)) as { error?: { message?: string } } | null;
        throw new Error(body?.error?.message ?? 'The final confirmation was not accepted.');
      }
      const orderRes = await fetch('/api/v1/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkout_session_id: session.id,
          idempotency_key: idempotencyKey,
        }),
      });
      if (!orderRes.ok) {
        const body = (await orderRes.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null;
        throw new Error(body?.error?.message ?? 'The order could not be placed.');
      }
      const body = (await orderRes.json()) as { data?: { id?: string } };
      const orderId = body.data?.id ?? '';
      if (!orderId) throw new Error('The order response was incomplete.');
      window.location.href = `/checkout/confirmation/${orderId}`;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The order could not be placed.');
      setBusy(false);
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
    <div className="lx-account-card">
      <h2 className="lx-account-card__title">Final review</h2>
      <dl className="lx-account-rows">
        <div><dt>Pieces</dt><dd>{session.pricing_snapshot.item_count}</dd></div>
        <div><dt>Subtotal</dt><dd>{money(session.pricing_snapshot.subtotal)}</dd></div>
        <div><dt>Discounts</dt><dd>{money(session.pricing_snapshot.discount_total)}</dd></div>
        <div><dt>Shipping</dt><dd>{money(session.pricing_snapshot.shipping_total)}</dd></div>
        <div><dt>Tax</dt><dd>{money(session.pricing_snapshot.tax_total)}</dd></div>
        <div className="is-total"><dt>Total ({session.pricing_snapshot.currency})</dt><dd>{money(session.pricing_snapshot.grand_total)}</dd></div>
      </dl>
      <p className="lx-account-note">
        Settlement state is confirmed by the payment provider webhook — this page shows the server-authoritative
        state only and never marks an order paid on its own.
      </p>
      {error ? <p className="lx-account-error" role="alert">{error}</p> : null}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <button type="button" className="lx-btn lx-btn--solid" disabled={busy} onClick={() => void place()}>
          {busy ? 'Placing order…' : 'Place the order'}
        </button>
        <Link href={`/checkout/payment-order?session=${encodeURIComponent(sessionId)}`} className="lx-btn lx-btn--ghost">
          Back
        </Link>
      </div>
    </div>
  );
}
