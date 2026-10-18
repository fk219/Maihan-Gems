'use client';

/**
 * apps/web/src/components/account/ProfileForm.tsx
 *
 * Personal information editor. Submits to the REAL
 * `PATCH /api/v1/account/profile` endpoint; never marks success on a
 * non-2xx response, and server validation errors are rendered verbatim.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';

import type { CustomerProfileDto, UpdateCustomerProfileInput } from '@maihan/contracts';

const CURRENCIES = ['USD', 'AED', 'THB'] as const;

export function ProfileForm({ profile }: { profile: CustomerProfileDto }) {
  const router = useRouter();
  const [values, setValues] = useState<UpdateCustomerProfileInput>({
    first_name: profile.first_name ?? '',
    last_name: profile.last_name ?? '',
    phone: profile.phone ?? '',
    preferred_currency: profile.preferred_currency ?? 'USD',
    birth_date: profile.birth_date ?? '',
    birth_place: profile.birth_place ?? '',
    ring_size: profile.ring_size ?? '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function set<K extends keyof UpdateCustomerProfileInput>(key: K, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const response = await fetch('/api/v1/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (response.ok) {
        setSaved(true);
        router.refresh();
        return;
      }
      const body = (await response.json().catch(() => null)) as
        | { error?: { code?: string; message?: string } }
        | null;
      setError(body?.error?.message ?? 'The update was not saved. Please try again.');
    } catch {
      setError('The account service is unreachable. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="lx-account-form" onSubmit={handleSubmit}>
      <div className="lx-account-form__row lx-account-form__row--two">
        <div className="lx-account-field">
          <label htmlFor="pf-first">First name</label>
          <input id="pf-first" value={values.first_name ?? ''} onChange={(e) => set('first_name', e.target.value)} />
        </div>
        <div className="lx-account-field">
          <label htmlFor="pf-last">Last name</label>
          <input id="pf-last" value={values.last_name ?? ''} onChange={(e) => set('last_name', e.target.value)} />
        </div>
      </div>
      <div className="lx-account-form__row lx-account-form__row--two">
        <div className="lx-account-field">
          <label htmlFor="pf-phone">Phone</label>
          <input id="pf-phone" type="tel" value={values.phone ?? ''} onChange={(e) => set('phone', e.target.value)} />
        </div>
        <div className="lx-account-field">
          <label htmlFor="pf-currency">Preferred currency</label>
          <select id="pf-currency" value={values.preferred_currency ?? 'USD'} onChange={(e) => set('preferred_currency', e.target.value)}>
            {CURRENCIES.map((code) => (
              <option key={code} value={code}>{code}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="lx-account-form__row lx-account-form__row--two">
        <div className="lx-account-field">
          <label htmlFor="pf-birth-date">Birth date</label>
          <input id="pf-birth-date" type="date" value={values.birth_date ?? ''} onChange={(e) => set('birth_date', e.target.value)} />
        </div>
        <div className="lx-account-field">
          <label htmlFor="pf-birth-place">Birth place</label>
          <input id="pf-birth-place" value={values.birth_place ?? ''} onChange={(e) => set('birth_place', e.target.value)} />
        </div>
      </div>
      <div className="lx-account-form__row">
        <div className="lx-account-field">
          <label htmlFor="pf-ring-size">Ring size (US)</label>
          <input id="pf-ring-size" inputMode="decimal" value={values.ring_size ?? ''} onChange={(e) => set('ring_size', e.target.value)} />
        </div>
      </div>

      {error ? <p className="lx-account-error" role="alert">{error}</p> : null}
      {saved ? <p className="lx-account-success" role="status">Profile saved.</p> : null}

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <button type="submit" className="lx-btn lx-btn--solid" disabled={busy}>
          {busy ? 'Saving…' : 'Save profile'}
        </button>
      </div>
    </form>
  );
}
