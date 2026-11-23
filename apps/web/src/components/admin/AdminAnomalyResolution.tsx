'use client';

/**
 * apps/web/src/components/admin/AdminAnomalyResolution.tsx
 *
 * Resolve ONE certificate anomaly (Track C7 gap).
 *
 * The form only sends the resolution and a note. Whether the anomaly may still
 * be resolved (it may not, twice) is decided by the repository behind the API:
 * a second attempt is refused with 409 and the message is shown verbatim. The
 * anomaly is never deleted — the resolution is recorded next to it.
 */
import { useState } from 'react';

/** The recorded resolution codes the console offers. Free text stays in the note. */
const RESOLUTIONS = [
  { value: 'FALSE_POSITIVE', label: 'False positive — the document is correct' },
  { value: 'CORRECTED_SOURCE', label: 'Corrected the structured source data' },
  { value: 'CONFIRMED_MISMATCH', label: 'Confirmed mismatch — do not verify' },
  { value: 'SUPERSEDED_BY_NEWER_DOCUMENT', label: 'Superseded by a newer document' },
] as const;

export function AdminAnomalyResolution({
  anomalyId,
}: {
  readonly anomalyId: string;
}): React.JSX.Element {
  const [resolution, setResolution] = useState<string>(RESOLUTIONS[0].value);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(): Promise<void> {
    const text = note.trim();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/v1/admin/certificates/anomalies/${encodeURIComponent(anomalyId)}/resolve`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(text.length === 0 ? { resolution } : { resolution, note: text }),
          credentials: 'same-origin',
        },
      );
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        setError(body?.error?.message ?? 'The resolution was refused.');
        return;
      }
      window.location.reload();
    } catch {
      setError('The service is unreachable.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: '6px', minWidth: '220px' }}>
      <select
        value={resolution}
        disabled={busy}
        onChange={(event) => setResolution(event.target.value)}
        style={{ border: '1px solid rgba(8,18,30,0.2)', borderRadius: '6px', padding: '6px', fontSize: '12px' }}
      >
        {RESOLUTIONS.map((entry) => (
          <option key={entry.value} value={entry.value}>
            {entry.label}
          </option>
        ))}
      </select>
      <input
        value={note}
        disabled={busy}
        maxLength={2000}
        placeholder="Why (recorded in the audit trail)"
        onChange={(event) => setNote(event.target.value)}
        style={{ border: '1px solid rgba(8,18,30,0.2)', borderRadius: '6px', padding: '6px', fontSize: '12px' }}
      />
      <button type="button" disabled={busy} onClick={() => void submit()} style={button}>
        Record resolution
      </button>
      {error !== null && (
        <p role="alert" style={{ margin: 0, color: '#B3261E', fontSize: '12px' }}>
          {error}
        </p>
      )}
    </div>
  );
}

const button: React.CSSProperties = {
  background: '#C9A84C',
  color: '#08121E',
  border: 'none',
  borderRadius: '6px',
  padding: '7px 12px',
  fontSize: '11px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  cursor: 'pointer',
};
