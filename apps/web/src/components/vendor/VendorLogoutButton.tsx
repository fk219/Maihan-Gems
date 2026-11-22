'use client';

/**
 * apps/web/src/components/vendor/VendorLogoutButton.tsx
 *
 * Posts the shared logout endpoint, then leaves the portal. A client component
 * because a plain form POST would render the JSON envelope as a page.
 */
import { useState } from 'react';

export function VendorLogoutButton(): React.JSX.Element {
  const [busy, setBusy] = useState(false);

  async function signOut(): Promise<void> {
    setBusy(true);
    try {
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
      });
    } finally {
      window.location.assign('/vendor/login');
    }
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={busy}
      style={{
        background: 'transparent',
        border: '1px solid rgba(250,250,248,0.35)',
        color: '#FAFAF8',
        borderRadius: '6px',
        padding: '6px 12px',
        fontSize: '12px',
        cursor: busy ? 'default' : 'pointer',
      }}
    >
      {busy ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
