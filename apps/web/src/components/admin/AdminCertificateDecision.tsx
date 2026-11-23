'use client';

/**
 * apps/web/src/components/admin/AdminCertificateDecision.tsx
 *
 * The human verification decision for ONE certificate (Track C7).
 *
 * The buttons only send a decision. Whether the document may be verified is
 * decided by the domain state machine behind the API: below the 0.90
 * whole-document threshold the server refuses with the domain reason and this
 * panel shows it verbatim. The UI never pre-empts the rule.
 */
import { useState } from 'react';

export function AdminCertificateDecision({
  certificateId,
}: {
  readonly certificateId: string;
}): React.JSX.Element {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: 'APPROVE' | 'REJECT'): Promise<void> {
    const text = note.trim();
    if (decision === 'REJECT' && text.length === 0) {
      setError('A reason is required to reject.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/v1/admin/certificates/${encodeURIComponent(certificateId)}/decide`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(text.length === 0 ? { decision } : { decision, note: text }),
          credentials: 'same-origin',
        },
      );
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        setError(body?.error?.message ?? 'The decision was refused.');
        return;
      }
      window.location.href = '/admin/certificates';
    } catch {
      setError('The service is unreachable.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: '10px' }}>
      <label style={{ fontSize: '12px', color: '#5A5448' }}>
        Review note / rejection reason
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={2000}
          rows={3}
          style={{
            display: 'block',
            width: '100%',
            marginTop: '6px',
            border: '1px solid rgba(8,18,30,0.2)',
            borderRadius: '6px',
            padding: '8px',
            fontSize: '13px',
            fontFamily: 'inherit',
          }}
        />
      </label>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button type="button" disabled={busy} onClick={() => void decide('APPROVE')} style={primary}>
          Approve and verify
        </button>
        <button type="button" disabled={busy} onClick={() => void decide('REJECT')} style={danger}>
          Reject
        </button>
      </div>
      <p style={{ margin: 0, fontSize: '12px', color: '#5A5448' }}>
        Approval is refused unless every material field is at or above 0.90 and no
        ERROR anomaly is open. Verification is a whole-document decision.
      </p>
      {error !== null && (
        <p role="alert" style={{ margin: 0, color: '#B3261E', fontSize: '12px' }}>
          {error}
        </p>
      )}
    </div>
  );
}

const primary: React.CSSProperties = {
  background: '#C9A84C',
  color: '#08121E',
  border: 'none',
  borderRadius: '6px',
  padding: '9px 16px',
  fontSize: '11px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  cursor: 'pointer',
};

const danger: React.CSSProperties = {
  background: 'transparent',
  color: '#B3261E',
  border: '1px solid rgba(179,38,30,0.5)',
  borderRadius: '6px',
  padding: '8px 14px',
  fontSize: '11px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  cursor: 'pointer',
};
