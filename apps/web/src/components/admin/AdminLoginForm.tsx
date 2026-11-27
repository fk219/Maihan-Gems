'use client';

/**
 * apps/web/src/components/admin/AdminLoginForm.tsx
 *
 * ADR-027 — the sign-in surface.
 *
 * Accessibility: labelled inputs, an aria-live error region, a disabled submit
 * while the request is in flight, and no password value retained after submit.
 * Presentation is the shared console-auth frame, so the admin and vendor doors
 * keep one visual system.
 */
import { useState, type FormEvent } from 'react';

export function AdminLoginForm(): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'same-origin',
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        setError(body?.error?.message ?? 'Sign-in failed.');
        return;
      }
      const body = (await response.json()) as {
        data?: { user?: { role?: string | null } };
        user?: { role?: string | null };
      };
      // The success envelope wraps payloads in `data`; accept either shape so a
      // transport change cannot silently break sign-in again.
      const role = body?.data?.user?.role ?? body?.user?.role ?? null;
      if (role === null || role === undefined) {
        setError('This account has no administrative role.');
        return;
      }
      window.location.assign('/admin');
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
