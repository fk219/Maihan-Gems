'use client';

/**
 * apps/web/src/components/admin/AdminProductActions.tsx
 *
 * Publish / unpublish one product. The server decides whether the transition is
 * legal; this component only reports the outcome.
 */
import { useState } from 'react';

export function AdminProductActions({
  productId,
  state,
}: {
  readonly productId: string;
  readonly state: string;
}): React.JSX.Element {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function act(action: 'publish' | 'unpublish'): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/admin/products/${productId}/${action}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
        credentials: 'same-origin',
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        setError(body?.error?.message ?? `${action} failed.`);
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
    <span style={{ display: 'inline-flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
      {state === 'ACTIVE' ? (
        <button type="button" disabled={busy} onClick={() => void act('unpublish')} style={secondary}>
          Unpublish
        </button>
      ) : (
        <button type="button" disabled={busy} onClick={() => void act('publish')} style={primary}>
          Publish
        </button>
      )}
      {error !== null && <span style={{ color: '#B3261E', fontSize: '12px' }}>{error}</span>}
    </span>
  );
}

const primary: React.CSSProperties = {
  background: '#C9A84C',
  color: '#08121E',
  border: 'none',
  borderRadius: '6px',
  padding: '7px 14px',
  fontSize: '12px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  cursor: 'pointer',
};

const secondary: React.CSSProperties = {
  background: 'transparent',
  color: '#08121E',
  border: '1px solid rgba(8,18,30,0.25)',
  borderRadius: '6px',
  padding: '7px 14px',
  fontSize: '12px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  cursor: 'pointer',
};
