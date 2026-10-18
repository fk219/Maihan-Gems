'use client';

/**
 * apps/web/src/components/account/AuthFlowView.tsx
 *
 * Complete customer & vendor authentication frontend:
 * - Sign in (/account/sign-in, /account/login)
 * - Register (/account/register, /account/sign-up) — Customer or Vendor partner
 * - Email verification (/account/verify-email)
 * - Forgot password (/account/forgot-password)
 * - Reset password (/account/reset-password)
 */
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export type AuthMode =
  | 'sign-in'
  | 'register'
  | 'verify-email'
  | 'forgot-password'
  | 'reset-password';

export function AuthFlowView({
  initialMode = 'sign-in',
  initialToken = '',
}: {
  initialMode?: AuthMode;
  initialToken?: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'CUSTOMER' | 'VENDOR'>('CUSTOMER');
  const [vendorName, setVendorName] = useState('');
  const [vendorCountry, setVendorCountry] = useState('AE');
  const [vendorCity, setVendorCity] = useState('Dubai');
  const [token, setToken] = useState(initialToken);
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [sandboxToken, setSandboxToken] = useState<string | null>(null);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const body = (await res.json().catch(() => null)) as {
        data?: { actor?: { role?: string } };
        error?: { message?: string };
      } | null;
      if (!res.ok) {
        setError(body?.error?.message ?? 'Invalid email or password.');
        return;
      }
      const actorRole = body?.data?.actor?.role;
      if (actorRole === 'VENDOR') {
        router.push('/vendor');
      } else if (actorRole && actorRole !== 'CUSTOMER') {
        router.push('/admin');
      } else {
        router.push('/account');
      }
      router.refresh();
    } catch {
      setError('Authentication service is currently unreachable.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSuccessMessage(null);
    setSandboxToken(null);
    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          first_name: firstName.trim() || undefined,
          last_name: lastName.trim() || undefined,
          phone: phone.trim() || undefined,
          role,
          vendor_name: role === 'VENDOR' ? vendorName.trim() || undefined : undefined,
          vendor_country: role === 'VENDOR' ? vendorCountry.trim() || 'AE' : undefined,
          vendor_city: role === 'VENDOR' ? vendorCity.trim() || 'Dubai' : undefined,
        }),
      });
      const body = (await res.json().catch(() => null)) as {
        data?: { actor?: { role?: string }; verification_token?: string };
        error?: { message?: string };
      } | null;
      if (!res.ok) {
        setError(body?.error?.message ?? 'Registration could not be completed.');
        return;
      }
      if (body?.data?.verification_token) {
        setSandboxToken(body.data.verification_token);
        setToken(body.data.verification_token);
      }
      if (role === 'VENDOR') {
        router.push('/vendor');
      } else {
        router.push('/account');
      }
      router.refresh();
    } catch {
      setError('Authentication service is currently unreachable.');
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await fetch('/api/v1/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim() }),
      });
      const body = (await res.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      if (!res.ok) {
        setError(body?.error?.message ?? 'Verification token is invalid or expired.');
        return;
      }
      setSuccessMessage('Your email address has been verified.');
      router.refresh();
    } catch {
      setError('Verification service is currently unreachable.');
    } finally {
      setBusy(false);
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSuccessMessage(null);
    setSandboxToken(null);
    try {
      const res = await fetch('/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const body = (await res.json().catch(() => null)) as {
        data?: { message?: string; reset_token_for_sandbox?: string };
        error?: { message?: string };
      } | null;
      if (!res.ok) {
        setError(body?.error?.message ?? 'Could not process password recovery request.');
        return;
      }
      setSuccessMessage(
        body?.data?.message ??
          'If an account exists for that email, a password reset link has been issued.',
      );
      if (body?.data?.reset_token_for_sandbox) {
        setSandboxToken(body.data.reset_token_for_sandbox);
        setToken(body.data.reset_token_for_sandbox);
      }
    } catch {
      setError('Password recovery service is currently unreachable.');
    } finally {
      setBusy(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await fetch('/api/v1/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim(), new_password: newPassword }),
      });
      const body = (await res.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      if (!res.ok) {
        setError(body?.error?.message ?? 'Reset token is invalid or expired.');
        return;
      }
      setSuccessMessage('Password updated and previous sessions revoked. You may now sign in.');
      setMode('sign-in');
      setPassword('');
    } catch {
      setError('Password reset service is currently unreachable.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="lx-account-card" aria-labelledby="auth-flow-heading">
      <div className="lx-account-nav" style={{ marginTop: 0 }}>
        <button
          type="button"
          className={`lx-text-btn ${mode === 'sign-in' ? 'is-on' : ''}`}
          onClick={() => {
            setMode('sign-in');
            setError(null);
            setSuccessMessage(null);
          }}
        >
          Sign in
        </button>
        <button
          type="button"
          className={`lx-text-btn ${mode === 'register' ? 'is-on' : ''}`}
          onClick={() => {
            setMode('register');
            setError(null);
            setSuccessMessage(null);
          }}
        >
          Create account
        </button>
        <button
          type="button"
          className={`lx-text-btn ${mode === 'verify-email' ? 'is-on' : ''}`}
          onClick={() => {
            setMode('verify-email');
            setError(null);
            setSuccessMessage(null);
          }}
        >
          Verify email
        </button>
        <button
          type="button"
          className={`lx-text-btn ${mode === 'forgot-password' || mode === 'reset-password' ? 'is-on' : ''}`}
          onClick={() => {
            setMode('forgot-password');
            setError(null);
            setSuccessMessage(null);
          }}
        >
          Password recovery
        </button>
      </div>

      {error ? (
        <p className="lx-account-error" role="alert">
          {error}
        </p>
      ) : null}
      {successMessage ? (
        <p className="lx-account-success" role="status">
          {successMessage}
        </p>
      ) : null}

      {mode === 'sign-in' && (
        <form className="lx-account-form" onSubmit={handleSignIn}>
          <h2 className="lx-account-card__title" id="auth-flow-heading">
            Sign in to Maihan Gems
          </h2>
          <p className="lx-account-note">
            Access your private client portfolio, saved addresses, order history, or partner vendor console.
          </p>
          <div className="lx-account-field">
            <label htmlFor="auth-login-email">Email address</label>
            <input
              id="auth-login-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="lx-account-field">
            <label htmlFor="auth-login-password">Password</label>
            <input
              id="auth-login-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button type="submit" className="lx-btn lx-btn--solid" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
            <button
              type="button"
              className="lx-text-btn"
              onClick={() => setMode('forgot-password')}
            >
              Forgot password?
            </button>
          </div>
        </form>
      )}

      {mode === 'register' && (
        <form className="lx-account-form" onSubmit={handleRegister}>
          <h2 className="lx-account-card__title" id="auth-flow-heading">
            Create your Maihan Gems account
          </h2>
          <div className="lx-account-form__row lx-account-form__row--two">
            <div className="lx-account-field">
              <label htmlFor="reg-first">First name</label>
              <input
                id="reg-first"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="lx-account-field">
              <label htmlFor="reg-last">Last name</label>
              <input
                id="reg-last"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>
          <div className="lx-account-form__row lx-account-form__row--two">
            <div className="lx-account-field">
              <label htmlFor="reg-email">Email address</label>
              <input
                id="reg-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="lx-account-field">
              <label htmlFor="reg-phone">Phone</label>
              <input
                id="reg-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>
          <div className="lx-account-form__row lx-account-form__row--two">
            <div className="lx-account-field">
              <label htmlFor="reg-password">Password (minimum 8 characters)</label>
              <input
                id="reg-password"
                type="password"
                minLength={8}
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="lx-account-field">
              <label htmlFor="reg-role">Account type</label>
              <select
                id="reg-role"
                value={role}
                onChange={(e) => setRole(e.target.value as 'CUSTOMER' | 'VENDOR')}
              >
                <option value="CUSTOMER">Private Client (Customer)</option>
                <option value="VENDOR">Trade Partner / Bourse Dealer (Vendor)</option>
              </select>
            </div>
          </div>

          {role === 'VENDOR' && (
            <div className="lx-account-form__row lx-account-form__row--two">
              <div className="lx-account-field">
                <label htmlFor="reg-vendor-name">Maison / Trade Business Name</label>
                <input
                  id="reg-vendor-name"
                  required
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                />
              </div>
              <div className="lx-account-field">
                <label htmlFor="reg-vendor-city">Primary Bourse City &amp; Country</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    id="reg-vendor-city"
                    placeholder="Dubai / Bangkok"
                    value={vendorCity}
                    onChange={(e) => setVendorCity(e.target.value)}
                  />
                  <input
                    aria-label="Vendor country code"
                    maxLength={2}
                    style={{ width: '4.5rem' }}
                    value={vendorCountry}
                    onChange={(e) => setVendorCountry(e.target.value.toUpperCase())}
                  />
                </div>
              </div>
            </div>
          )}

          <button type="submit" className="lx-btn lx-btn--solid" disabled={busy}>
            {busy ? 'Creating account…' : role === 'VENDOR' ? 'Apply as Trade Vendor' : 'Create Client Account'}
          </button>
        </form>
      )}

      {mode === 'verify-email' && (
        <form className="lx-account-form" onSubmit={handleVerifyEmail}>
          <h2 className="lx-account-card__title" id="auth-flow-heading">
            Verify your email address
          </h2>
          <p className="lx-account-note">
            Enter the single-use verification token sent to your email (also visible in your account notifications).
          </p>
          <div className="lx-account-field">
            <label htmlFor="verify-token">Verification token</label>
            <input
              id="verify-token"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
          </div>
          <button type="submit" className="lx-btn lx-btn--solid" disabled={busy}>
            {busy ? 'Verifying…' : 'Verify email'}
          </button>
        </form>
      )}

      {mode === 'forgot-password' && (
        <form className="lx-account-form" onSubmit={handleForgotPassword}>
          <h2 className="lx-account-card__title" id="auth-flow-heading">
            Recover your password
          </h2>
          <p className="lx-account-note">
            Enter your account email to receive a single-use 30-minute password reset token.
          </p>
          <div className="lx-account-field">
            <label htmlFor="forgot-email">Email address</label>
            <input
              id="forgot-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button type="submit" className="lx-btn lx-btn--solid" disabled={busy}>
              {busy ? 'Issuing token…' : 'Send reset token'}
            </button>
            <button
              type="button"
              className="lx-btn lx-btn--ghost"
              onClick={() => setMode('reset-password')}
            >
              I already have a reset token
            </button>
          </div>
          {sandboxToken ? (
            <div className="lx-account-success" style={{ marginTop: '0.75rem' }}>
              Sandbox reset token issued: <code>{sandboxToken}</code>{' '}
              <button
                type="button"
                className="lx-text-btn"
                onClick={() => setMode('reset-password')}
              >
                Proceed to reset password →
              </button>
            </div>
          ) : null}
        </form>
      )}

      {mode === 'reset-password' && (
        <form className="lx-account-form" onSubmit={handleResetPassword}>
          <h2 className="lx-account-card__title" id="auth-flow-heading">
            Set a new password
          </h2>
          <p className="lx-account-note">
            Completing a password reset immediately revokes all active sessions for your account.
          </p>
          <div className="lx-account-field">
            <label htmlFor="reset-token">Reset token</label>
            <input
              id="reset-token"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
          </div>
          <div className="lx-account-field">
            <label htmlFor="reset-new-password">New password (minimum 8 characters)</label>
            <input
              id="reset-new-password"
              type="password"
              minLength={8}
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="lx-btn lx-btn--solid" disabled={busy}>
            {busy ? 'Resetting…' : 'Update password'}
          </button>
        </form>
      )}

      <p className="lx-account-note" style={{ marginTop: '1.5rem' }}>
        Need advisory assistance? <Link href="/contact">Contact Private Client Advisory</Link>.
      </p>
    </section>
  );
}
