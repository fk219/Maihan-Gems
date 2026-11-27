'use client';

/**
 * apps/web/src/components/vendor/VendorLoginForm.tsx
 *
 * D1 — vendor sign-in reuses the ONE session endpoint (ADR-027). After the
 * cookie is set, the form asks `/api/v1/vendor/me` whether the account is an
 * approved vendor member. Signing in successfully is not the same as being a
 * vendor, so the redirect only happens after the membership check passes.
 *
 * Accessibility: labelled inputs, aria-live status, disabled submit while in
 * flight, and the password is cleared after every attempt.
 */
import { useState, type FormEvent } from 'react';

interface VendorError {
  code?: string;
  message?: string;
}

export function VendorLoginForm(): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const login = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'same-origin',
      });
      if (!login.ok) {
        const body = (await login.json().catch(() => null)) as { error?: VendorError } | null;
        setError(body?.error?.message ?? 'Sign-in failed.');
        return;
      }

      // The cookie now exists. Membership and vendor state are a separate
      // decision, made by the API gate, not by the login response.
      const check = await fetch('/api/v1/vendor/me', {
        credentials: 'same-origin',
        headers: { accept: 'application/json' },
      });
      if (!check.ok) {
        const body = (await check.json().catch(() => null)) as { error?: VendorError } | null;
        const code = body?.error?.code;
        if (code === 'VENDOR_MEMBERSHIP_REQUIRED') {
          setError('This account is not linked to a vendor. Ask the platform to add you.');
        } else if (code === 'VENDOR_NOT_APPROVED') {
          setError(
            body?.error?.message ??
              'This vendor is not approved yet. Listing stock requires approval.',
          );
        } else {
          setError(body?.error?.message ?? 'The vendor portal refused this account.');
        }
        return;
      }

      window.location.assign('/vendor');
    } catch {
      setError('The service is unreachable. Try again.');
    } finally {
      setBusy(false);
      setPassword('');
    }
  }

  return (
    <form onSubmit={onSubmit} className="mh-auth__form">
      <label className="mh-auth__field">
        <span className="mh-auth__label">Email</span>
        <input
          className="mh-auth__input"
          type="email"
          name="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>
      <label className="mh-auth__field">
        <span className="mh-auth__label">Password</span>
        <input
          className="mh-auth__input"
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      <p aria-live="polite" role="status" className="mh-auth__status">
        {error ?? ''}
      </p>
      <button type="submit" className="mh-auth__submit" disabled={busy}>
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
