'use client';

/**
 * apps/web/src/components/account/OrderDetailActions.tsx
 *
 * Customer post-purchase order actions:
 * - Order cancellation (when state === PENDING_PAYMENT or PAID)
 * - Return / Refund request (when state === PAID, IN_FULFILLMENT, or FULFILLED)
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function OrderDetailActions({
  orderId,
  orderState,
  grandTotal,
}: {
  orderId: string;
  orderState: string;
  grandTotal: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showRefundForm, setShowRefundForm] = useState(false);
  const [refundAmount, setRefundAmount] = useState(grandTotal);
  const [refundReason, setRefundReason] = useState('');

  const canCancel = orderState === 'PENDING_PAYMENT';
  const canRequestRefund =
    orderState === 'PAID' || orderState === 'IN_FULFILLMENT' || orderState === 'FULFILLED';

  async function handleCancel() {
    if (typeof window !== 'undefined' && !window.confirm('Cancel this order?')) {
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/v1/orders/${encodeURIComponent(orderId)}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Cancelled by customer from account portal' }),
      });
      const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      if (!res.ok) {
        setError(body?.error?.message ?? 'Order could not be cancelled.');
        return;
      }
      setMessage('Order has been cancelled.');
      router.refresh();
    } catch {
      setError('Order service is currently unreachable.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRefundRequest(e: React.FormEvent) {
    e.preventDefault();
    const amountNum = Number(refundAmount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setError('Enter a valid positive refund amount.');
      return;
    }
    if (!refundReason.trim()) {
      setError('Please provide a reason for your return or refund request.');
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/v1/orders/${encodeURIComponent(orderId)}/refunds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amountNum,
          reason: refundReason.trim(),
        }),
      });
      const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      if (!res.ok) {
        setError(body?.error?.message ?? 'Refund request could not be submitted.');
        return;
      }
      setMessage('Return / refund request submitted and queued for review.');
      setShowRefundForm(false);
      router.refresh();
    } catch {
      setError('Refund service is currently unreachable.');
    } finally {
      setBusy(false);
    }
  }

  if (!canCancel && !canRequestRefund) {
    return null;
  }

  return (
    <section className="lx-account-card" aria-labelledby="order-actions-title">
      <h2 className="lx-account-card__title" id="order-actions-title">
        Order actions
      </h2>
      {error ? (
        <p className="lx-account-error" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="lx-account-success" role="status">
          {message}
        </p>
      ) : null}

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        {canCancel ? (
          <button
            type="button"
            className="lx-btn lx-btn--ghost"
            disabled={busy}
            onClick={() => void handleCancel()}
          >
            {busy ? 'Cancelling…' : 'Cancel order'}
          </button>
        ) : null}
        {canRequestRefund && !showRefundForm ? (
          <button
            type="button"
            className="lx-btn lx-btn--ghost"
            disabled={busy}
            onClick={() => setShowRefundForm(true)}
          >
            Request return / refund
          </button>
        ) : null}
      </div>

      {showRefundForm ? (
        <form className="lx-account-form" onSubmit={handleRefundRequest}>
          <div className="lx-account-form__row lx-account-form__row--two">
            <div className="lx-account-field">
              <label htmlFor="rf-amount">Refund amount (USD, max {grandTotal})</label>
              <input
                id="rf-amount"
                type="number"
                step="0.01"
                min="0.01"
                max={grandTotal}
                required
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
              />
            </div>
            <div className="lx-account-field">
              <label htmlFor="rf-reason">Reason for return / refund</label>
              <input
                id="rf-reason"
                required
                placeholder="Describe your return or adjustment request"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button type="submit" className="lx-btn lx-btn--solid" disabled={busy}>
              {busy ? 'Submitting…' : 'Submit refund request'}
            </button>
            <button
              type="button"
              className="lx-btn lx-btn--ghost"
              onClick={() => setShowRefundForm(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
