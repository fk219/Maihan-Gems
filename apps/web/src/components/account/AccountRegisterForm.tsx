'use client';

/**
 * apps/web/src/components/account/AccountRegisterForm.tsx
 *
 * Customer registration.
 *
 * The server is the authority on the password policy; this form only makes the
 * rule visible before submission (12 characters, not a common password) and
 * checks that the confirmation matches. Nothing is validated twice in a way
 * that could disagree: the browser never decides whether a password is
 * acceptable, it only relays the server's answer.
 *
 * Success is shown in place rather than redirecting, because the next step
 * depends on the environment: with no email provider wired, a development
 * build receives `devVerificationToken` and offers a one-click verify; a
 * production build tells the customer the link has been issued and that they
 * may sign in meanwhile.
 */
import { useState, type FormEvent } from 'react';

import { postAuthJson, readAuthErrorMessage } from './auth-client.js';
import {
  AUTH_BUTTON_STYLE,
  AUTH_ERROR_STYLE,
  AUTH_INPUT_STYLE,
  AUTH_LABEL_STYLE,
} from './AuthShell.js';

interface RegisterBody {
  user?: { email?: string };
  devVerificationToken?: string;
}

interface Registered {
  readonly email: string;
  readonly devToken: string | null;
}

export function AccountRegisterForm(): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [registered, setRegistered] = useState<Registered | null>(null);
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    if (password !== confirmation) {
      setError('The two passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const result = await postAuthJson('/api/v1/auth/register', {
        email,
        displayName,
        password,
      });
      if (!result.ok) {
        setError(readAuthErrorMessage(result.body, 'Registration failed. Try again.'));
        return;
      }
      const body = (result.body ?? {}) as RegisterBody;
      setRegistered({
        email: body.user?.email ?? email,
        devToken: body.devVerificationToken ?? null,
      });
    } catch {
      setError('The service is unreachable. Try again.');
    } finally {
      setBusy(false);
      // The password never stays in component state after a submit attempt.
      setPassword('');
      setConfirmation('');
    }
  }

  async function verifyNow(token: string): Promise<void> {
    setVerifyError(null);
    setVerifyBusy(true);
    try {
      const result = await postAuthJson('/api/v1/auth/verify-email', { token });
      if (!result.ok) {
        setVerifyError(readAuthErrorMessage(result.body, 'Verification failed.'));
        return;
      }
      window.location.assign('/account/login?verified=1');
    } catch {
      setVerifyError('The service is unreachable. Try again.');
    } finally {
      setVerifyBusy(false);
    }
  }

  if (registered !== null) {
    const devToken = registered.devToken;
    return (
      <div style={{ display: 'grid', gap: '14px' }}>
        <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.6, color: '#08121E' }}>
          Your account is created for <strong>{registered.email}</strong>.
        </p>
        <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.6, color: '#5A5448' }}>
          A verification link has been issued for that address. You can sign in now; the
          address is marked verified when the link is opened.
        </p>
        {devToken === null ? null : (
          <div
            style={{
              display: 'grid',
              gap: '10px',
              border: '1px solid rgba(201,168,76,0.35)',
              borderRadius: '8px',
              padding: '12px',
              background: '#FBF8EF',
            }}
          >
            <p style={{ margin: 0, fontSize: '12px', lineHeight: 1.6, color: '#5A5448' }}>
              Email delivery is not connected in this environment, so the development token is
              returned here instead of being sent.
            </p>
            <button
              type="button"
              onClick={() => void verifyNow(devToken)}
              disabled={verifyBusy}
              className="mh-cta"
            >
              {verifyBusy ? 'Verifying…' : 'Verify this email now'}
            </button>
            <p aria-live="polite" role="status" style={AUTH_ERROR_STYLE}>
              {verifyError ?? ''}
            </p>
          </div>
        )}
        <a
          href="/account/login"
          className="mh-cta mh-cta--quiet"
          style={{ display: 'inline-flex', justifyContent: 'center' }}
        >
          Continue to sign in
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} style={{ display: 'grid', gap: '14px' }}>
      <label style={AUTH_LABEL_STYLE}>
        <span>Full name</span>
        <input
          type="text"
          name="displayName"
          autoComplete="name"
          required
          maxLength={120}
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          style={AUTH_INPUT_STYLE}
        />
      </label>
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
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={200}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-describedby="password-rule"
          style={AUTH_INPUT_STYLE}
        />
      </label>
      <p id="password-rule" style={{ margin: 0, fontSize: '12px', lineHeight: 1.6, color: '#6B6455' }}>
        At least 12 characters. The most commonly used passwords are rejected.
      </p>
      <label style={AUTH_LABEL_STYLE}>
        <span>Confirm password</span>
        <input
          type="password"
          name="confirmPassword"
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={200}
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          style={AUTH_INPUT_STYLE}
        />
      </label>
      <p aria-live="polite" role="status" style={AUTH_ERROR_STYLE}>
        {error ?? ''}
      </p>
      <button type="submit" disabled={busy} style={AUTH_BUTTON_STYLE}>
        {busy ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  );
}
