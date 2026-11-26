'use client';

/**
 * apps/web/src/components/account/AccountLoginForm.tsx
 *
 * Customer sign-in, plus the always-200 password-reset request.
 *
 * Behaviour that matters:
 *   - The password is cleared on every outcome, including failure.
 *   - The server's own message is shown; the form never guesses why it failed.
 *   - An account with no administrative role lands on `/account`; an
 *     administrative actor lands on `/admin`. The role is read from the
 *     response, and a null role is a normal customer, not an error.
 *   - The reset request shares the email field and shows the same
 *     non-enumerating answer whether or not the address exists.
 */
import { useState, type FormEvent } from 'react';

import { postAuthJson, readAuthErrorMessage } from './auth-client.js';
import {
  AUTH_BUTTON_STYLE,
  AUTH_ERROR_STYLE,
  AUTH_INPUT_STYLE,
  AUTH_LABEL_STYLE,
} from './AuthShell.js';

interface LoginBody {
  user?: { role?: string | null };
}

export function AccountLoginForm(): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [resetNotice, setResetNotice] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetBusy, setResetBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const result = await postAuthJson('/api/v1/auth/login', { email, password });
      if (!result.ok) {
        setError(readAuthErrorMessage(result.body, 'Sign-in failed. Try again.'));
        return;
      }
      const role = (result.body as LoginBody | null)?.user?.role ?? null;
      window.location.assign(role === null ? '/account' : '/admin');
    } catch {
      setError('The service is unreachable. Try again.');
    } finally {
      setBusy(false);
      setPassword('');
    }
  }

  async function requestReset(): Promise<void> {
    setResetError(null);
    setResetNotice(null);
    if (email.trim().length === 0) {
      setResetError('Enter your email address above first.');
      return;
    }
    setResetBusy(true);
    try {
      const result = await postAuthJson('/api/v1/auth/request-password-reset', { email });
      if (!result.ok) {
        setResetError(readAuthErrorMessage(result.body, 'The request could not be sent.'));
        return;
      }
      // Same wording for every address: this screen must not enumerate.
      setResetNotice(
        'If an account exists for that address, a reset link has been issued. It expires in one hour.',
      );
    } catch {
      setResetError('The service is unreachable. Try again.');
    } finally {
      setResetBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: 'grid', gap: '14px' }}>
      <label style={AUTH_LABEL_STYLE}>
        <span>Email</span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          style={AUTH_INPUT_STYLE}
        />
      </label>
      <label style={AUTH_LABEL_STYLE}>
        <span>Password</span>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          style={AUTH_INPUT_STYLE}
        />
      </label>
      <p aria-live="polite" role="status" style={AUTH_ERROR_STYLE}>
        {error ?? ''}
      </p>
      <button type="submit" disabled={busy} style={AUTH_BUTTON_STYLE}>
        {busy ? 'Signing in…' : 'Sign in'}
      </button>

      <details style={{ marginTop: '4px', fontSize: '13px', color: '#5A5448' }}>
        <summary style={{ cursor: 'pointer', minHeight: '32px' }}>Forgot your password?</summary>
        <p style={{ margin: '10px 0 8px', lineHeight: 1.6 }}>
          We will use the email address above.
        </p>
        <button
          type="button"
          onClick={requestReset}
          disabled={resetBusy}
          className="mh-cta mh-cta--quiet"
        >
          {resetBusy ? 'Requesting…' : 'Email me a reset link'}
        </button>
        <p aria-live="polite" role="status" style={{ ...AUTH_ERROR_STYLE, color: '#3B362C' }}>
          {resetNotice ?? ''}
        </p>
        <p aria-live="polite" role="status" style={AUTH_ERROR_STYLE}>
          {resetError ?? ''}
        </p>
      </details>
    </form>
  );
}
