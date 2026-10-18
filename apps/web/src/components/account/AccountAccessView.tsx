'use client';

/**
 * apps/web/src/components/account/AccountAccessView.tsx
 *
 * The honest identity gate. There is no session/password backend yet, so
 * this screen explains exactly what it does: it verifies a client reference
 * against the REAL `/api/v1/account/profile` endpoint and, only on a 200,
 * opens the portfolio. It never fakes success, never reveals whether a
 * reference exists beyond what the API already returns (404 is rendered as
 * the same neutral message), and never pretends to be a login form.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { openPortfolio } from '../../app/(storefront)/account/actions.js';

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export function AccountAccessView({ embedded = false }: { embedded?: boolean }) {
  const router = useRouter();
  const [reference, setReference] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const value = reference.trim();
    if (!UUID_RE.test(value)) {
      setError('Enter the full client reference exactly as shown on your advisory documents.');
      return;
    }
    setBusy(true);
    setError(null);
    const outcome = await openPortfolio(value);
    setBusy(false);
    if (outcome === 'ok') {
      router.push('/account');
      router.refresh();
      return;
    }
    // 401/404 and every other failure render the same neutral message.
    setError('No portfolio opened for that reference. Check the reference or contact the advisory desk.');
  }

  return (
    <section className="lx-account-card" aria-labelledby="account-access-title">
      {!embedded ? (
        <>
          <span className="lx-kicker">Private portfolio</span>
          <h1 className="lx-h2" id="account-access-title">Open your portfolio</h1>
        </>
      ) : (
        <h2 className="lx-account-card__title" id="account-access-title">Open your portfolio</h2>
      )}
      <p className="lx-account-note">
        Enter the client reference issued with your advisory documents. The reference is verified against
        the account service before your portfolio opens.
      </p>
      <form className="lx-account-form" onSubmit={handleSubmit}>
        <div className="lx-account-field">
          <label htmlFor="client-ref">Client reference</label>
          <input
            id="client-ref"
            name="clientRef"
            type="text"
            autoComplete="off"
            spellCheck={false}
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            required
          />
        </div>
        {error ? (
          <p className="lx-account-error" role="alert">
            {error}
          </p>
        ) : null}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button type="submit" className="lx-btn lx-btn--solid" disabled={busy}>
            {busy ? 'Verifying…' : 'Open portfolio'}
          </button>
          <a href="/contact" className="lx-btn lx-btn--ghost">
            Request a reference
          </a>
        </div>
      </form>
      <p className="lx-account-note" style={{ marginTop: '1.5rem' }}>
        Full account sign-in (email verification, password recovery, sessions) is a pending identity-provider
        integration and is not simulated here.
      </p>
    </section>
  );
}
