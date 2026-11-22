'use client';

/**
 * apps/web/src/components/account/AccountVerifyEmailPanel.tsx
 *
 * The landing surface for `/account/verify-email?token=…` — the shape the
 * email adapter will eventually send people to (and the 301 target of the
 * legacy `/verify-email` route).
 *
 * The token arrives as a query string, which is the only place a browser can
 * receive it from a link. It is POSTed to the API immediately on button press
 * and never stored: not in localStorage, not in a cookie, not in component
 * state after submission.
 */
import { useState } from 'react';

import { postAuthJson, readAuthErrorMessage } from './auth-client.js';
import { AUTH_BUTTON_STYLE, AUTH_ERROR_STYLE } from './AuthShell.js';

export interface AccountVerifyEmailPanelProps {
  /** Absent when someone opens `/account/verify-email` without a link. */
  readonly token?: string;
}

export function AccountVerifyEmailPanel({
  token,
}: AccountVerifyEmailPanelProps): React.JSX.Element {
  const [busy, setBusy] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (token === undefined || token.length === 0) {
    return (
      <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.7, color: '#08121E' }}>
        Open the verification link from your email to confirm your address. If it has expired,
        request a new one from the sign-in page.
      </p>
    );
  }

  if (verified) {
    return (
      <div style={{ display: 'grid', gap: '14px' }}>
        <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.7, color: '#08121E' }}>
          Your email address is verified. You can sign in now.
        </p>
        <a
          href="/account/login"
          style={{
            display: 'inline-block',
            minHeight: '44px',
            padding: '13px 18px',
            border: '1px solid rgba(201,168,76,0.55)',
            borderRadius: '8px',
            color: '#08121E',
            textDecoration: 'none',
            fontSize: '13px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            textAlign: 'center',
          }}
        >
          Continue to sign in
        </a>
      </div>
    );
  }

  async function confirm(): Promise<void> {
    setError(null);
    setBusy(true);
    try {
      const result = await postAuthJson('/api/v1/auth/verify-email', { token });
      if (!result.ok) {
        setError(readAuthErrorMessage(result.body, 'This link is invalid or has expired.'));
        return;
      }
      setVerified(true);
    } catch {
      setError('The service is unreachable. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: '14px' }}>
      <button
        type="button"
        onClick={() => void confirm()}
        disabled={busy}
        style={AUTH_BUTTON_STYLE}
      >
        {busy ? 'Verifying…' : 'Verify my email'}
      </button>
      <p aria-live="polite" role="status" style={AUTH_ERROR_STYLE}>
        {error ?? ''}
      </p>
    </div>
  );
}
