'use client';

/**
 * apps/web/src/components/admin/AdminDerivedIdentityActions.tsx
 *
 * Approve or reject ONE derived identity (INV-08). Approval records the review
 * decision; it never creates a source SKU and never changes the INFERRED
 * evidence status. Rejection requires a reason and never deletes the row.
 * Both decisions are single-use: the server refuses a second one.
 */
import { useState } from 'react';

export function AdminDerivedIdentityActions({
  productId,
  reviewState,
}: {
  readonly productId: string;
  readonly reviewState: string;
}): React.JSX.Element {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // PENDING is migration 0022's "awaiting review" state; an unqueued row
  // projects as UNREVIEWED. Only a recorded decision is terminal.
  const decided = reviewState === 'APPROVED' || reviewState === 'REJECTED';

  async function decide(decision: 'approve' | 'reject'): Promise<void> {
    const text = note.trim();
    if (decision === 'reject' && text.length === 0) {
      setError('A reason is required to reject.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/v1/admin/derived-identities/${encodeURIComponent(productId)}/${decision}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(
            decision === 'approve'
              ? (text.length === 0 ? {} : { note: text })
              : { reason: text },
          ),
          credentials: 'same-origin',
        },
      );
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: { message?: string }; message?: string }
          | null;
        setError(body?.error?.message ?? body?.message ?? `The ${decision} was refused.`);
        return;
      }
      window.location.reload();
    } catch {
      setError('The service is unreachable.');
    } finally {
      setBusy(false);
    }
  }

  if (decided) {
    return <span style={{ fontSize: '12px', color: '#5A5448' }}>Decision recorded</span>;
  }

  return (
    <span style={{ display: 'inline-flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
      <input
        aria-label="Review note or rejection reason"
        placeholder="Note / reason"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        maxLength={1000}
        style={input}
      />
      <button type="button" disabled={busy} onClick={() => void decide('approve')} style={primary}>
        Approve
      </button>
      <button type="button" disabled={busy} onClick={() => void decide('reject')} style={secondary}>
        Reject
      </button>
      {error !== null && (
        <span role="alert" style={{ color: '#B3261E', fontSize: '12px' }}>
          {error}
        </span>
      )}
    </span>
  );
}

const input: React.CSSProperties = {
  border: '1px solid rgba(8,18,30,0.2)',
  borderRadius: '6px',
  padding: '6px 8px',
  fontSize: '12px',
  minWidth: '120px',
};

const primary: React.CSSProperties = {
  background: '#C9A84C',
  color: '#08121E',
  border: 'none',
  borderRadius: '6px',
  padding: '7px 12px',
  fontSize: '11px',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  cursor: 'pointer',
};

const secondary: React.CSSProperties = {
  background: 'transparent',
  color: '#08121E',
  border: '1px solid rgba(8,18,30,0.25)',
  borderRadius: '6px',
  padding: '6px 10px',
  fontSize: '11px',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  cursor: 'pointer',
};
