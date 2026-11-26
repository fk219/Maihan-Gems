'use client';

/**
 * apps/web/src/components/account/AccountSignOutButton.tsx
 *
 * Sign-out as a POST, because a GET must never mutate a session (a prefetched
 * link or a crawler would sign people out). The server clears the cookie; the
 * browser then navigates to the sign-in page rather than leaving a profile
 * shell that no longer has a session behind it.
 */
import { useState } from 'react';

import { postAuthJson } from './auth-client.js';

export function AccountSignOutButton(): React.JSX.Element {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signOut(): Promise<void> {
    setError(null);
    setBusy(true);
    try {
      const result = await postAuthJson('/api/v1/auth/logout', {});
      if (!result.ok) {
        setError('Sign-out failed. Try again.');
        return;
      }
      window.location.assign('/account/login');
    } catch {
      setError('The service is unreachable. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: '8px' }}>
      <button
        type="button"
        onClick={() => void signOut()}
        disabled={busy}
        className="mh-cta mh-cta--quiet"
      >
        {busy ? 'Signing out…' : 'Sign out'}
      </button>
      <p
        aria-live="polite"
        role="status"
        style={{ margin: 0, minHeight: '16px', fontSize: '12px', color: '#B3261E' }}
      >
        {error ?? ''}
      </p>
    </div>
  );
}
