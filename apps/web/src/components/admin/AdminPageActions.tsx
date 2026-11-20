'use client';

/**
 * apps/web/src/components/admin/AdminPageActions.tsx
 *
 * The publish and archive actions for one CMS page. A thin client because the
 * mutation must carry the session cookie; the authorisation decision is made
 * server-side by the same gate every other admin endpoint uses.
 */
import { useState } from 'react';

export function AdminPageActions({
  pageId,
  status,
}: {
  readonly pageId: string;
  readonly status: string;
}): React.JSX.Element {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function act(action: 'publish' | 'archive'): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/admin/cms/pages/${pageId}/${action}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: action === 'archive' ? JSON.stringify({ reason: 'Archived from console' }) : '{}',
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
    <span style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
      {status !== 'PUBLISHED' && (
        <button type="button" disabled={busy} onClick={() => void act('publish')} style={primary}>
          Publish
        </button>
      )}
      {status !== 'ARCHIVED' && (
        <button type="button" disabled={busy} onClick={() => void act('archive')} style={secondary}>
          Archive
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
