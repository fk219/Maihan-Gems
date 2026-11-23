'use client';

/**
 * apps/web/src/components/admin/AdminConflictResolution.tsx
 *
 * Resolve ONE staging conflict. The two sides are shown by the server
 * component; this form only records the human's decision. It deliberately
 * offers no default: a resolution is either an explicit side or typed text,
 * and the API refuses an empty value. Nothing is auto-picked, and the server
 * refuses a second decision for the same conflict.
 */
import { useState } from 'react';

export function AdminConflictResolution({
  conflictId,
  valueA,
  valueB,
}: {
  readonly conflictId: string;
  readonly valueA: string | null;
  readonly valueB: string | null;
}): React.JSX.Element {
  const [resolution, setResolution] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const chosen = resolution.trim();
    if (chosen.length === 0) {
      setError('Choose side A, side B, or type a resolution.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/v1/admin/conflicts/${encodeURIComponent(conflictId)}/resolve`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            resolution: chosen,
            ...(note.trim().length === 0 ? {} : { note: note.trim() }),
          }),
          credentials: 'same-origin',
        },
      );
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: { message?: string }; message?: string }
          | null;
        setError(body?.error?.message ?? body?.message ?? 'The resolution was refused.');
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
    <form onSubmit={(event) => void submit(event)} style={form}>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        <button
          type="button"
          disabled={busy || valueA === null}
          onClick={() => setResolution(valueA ?? '')}
          style={secondary}
        >
          Use side A
        </button>
        <button
          type="button"
          disabled={busy || valueB === null}
          onClick={() => setResolution(valueB ?? '')}
          style={secondary}
        >
          Use side B
        </button>
      </div>
      <input
        aria-label="Resolution value"
        placeholder="Resolution"
        value={resolution}
        onChange={(event) => setResolution(event.target.value)}
        maxLength={2000}
        style={input}
      />
      <input
        aria-label="Resolution note"
        placeholder="Why (optional)"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        maxLength={1000}
        style={input}
      />
      <button type="submit" disabled={busy} style={primary}>
        {busy ? 'Saving…' : 'Resolve once'}
      </button>
      {error !== null && (
        <span role="alert" style={{ color: '#B3261E', fontSize: '12px' }}>
          {error}
        </span>
      )}
    </form>
  );
}

const form: React.CSSProperties = {
  display: 'flex',
  gap: '6px',
  flexWrap: 'wrap',
  alignItems: 'center',
  minWidth: '260px',
};

const input: React.CSSProperties = {
  border: '1px solid rgba(8,18,30,0.2)',
  borderRadius: '6px',
  padding: '6px 8px',
  fontSize: '12px',
  minWidth: '120px',
  flex: '1 1 120px',
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
  cursor: 'pointer',
};
