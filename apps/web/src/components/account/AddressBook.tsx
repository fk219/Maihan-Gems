'use client';

/**
 * apps/web/src/components/account/AddressBook.tsx
 *
 * Address book over the REAL `/api/v1/account/addresses**` endpoints:
 * list, create, edit, remove, set default. Every action surfaces its real
 * outcome; server validation errors are rendered, input is never discarded.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';

import type { CustomerAddressDto, CreateCustomerAddressInput } from '@maihan/contracts';

const KINDS = ['SHIPPING', 'BILLING', 'SHOWROOM', 'PICKUP'] as const;

const EMPTY: CreateCustomerAddressInput = {
  kind: 'SHIPPING',
  full_name: '',
  line1: '',
  city: '',
  postal_code: '',
  country_code: 'AE',
  is_default: false,
};

export function AddressBook({ initialAddresses }: { initialAddresses: CustomerAddressDto[] }) {
  const router = useRouter();
  const [addresses, setAddresses] = useState<CustomerAddressDto[]>(initialAddresses);
  const [draft, setDraft] = useState<CreateCustomerAddressInput | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function refresh() {
    router.refresh();
  }

  async function call(path: string, init: RequestInit): Promise<CustomerAddressDto[] | null> {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const response = await fetch(path, init);
      if (response.ok) {
        const body = (await response.json()) as { data?: CustomerAddressDto[] | CustomerAddressDto | { success?: boolean } };
        const list = await reload();
        if (typeof body.data === 'object' && body.data !== null && 'success' in (body.data as object)) {
          setSaved(true);
        } else {
          setSaved(true);
        }
        return list;
      }
      const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
      setError(body?.error?.message ?? 'The address operation was not completed. Please try again.');
      return null;
    } catch {
      setError('The account service is unreachable. Please try again.');
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function reload(): Promise<CustomerAddressDto[]> {
    const response = await fetch('/api/v1/account/addresses');
    if (!response.ok) return [];
    const body = (await response.json().catch(() => null)) as { data?: CustomerAddressDto[] } | null;
    const list = body?.data ?? [];
    setAddresses(list);
    return list;
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!draft) return;
    const list = await call('/api/v1/account/addresses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    });
    if (list !== null) {
      setDraft(null);
      refresh();
    }
  }

  async function handleUpdate(event: React.FormEvent) {
    event.preventDefault();
    if (!draft || editingId === null) return;
    const { id, customer_id, ...rest } = draft as never as CustomerAddressDto;
    void id;
    void customer_id;
    const list = await call(`/api/v1/account/addresses/${editingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rest),
    });
    if (list !== null) {
      setDraft(null);
      setEditingId(null);
      refresh();
    }
  }

  async function handleSetDefault(address: CustomerAddressDto) {
    await call(`/api/v1/account/addresses/${address.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_default: true }),
    });
    refresh();
  }

  async function handleDelete(address: CustomerAddressDto) {
    const confirmed = typeof window !== 'undefined'
      ? window.confirm(`Remove ${address.full_name}, ${address.line1}?`)
      : false;
    if (!confirmed) return;
    await call(`/api/v1/account/addresses/${address.id}`, { method: 'DELETE' });
    refresh();
  }

  function beginEdit(address: CustomerAddressDto) {
    setEditingId(address.id);
    setDraft({
      kind: address.kind,
      full_name: address.full_name,
      recipient: address.recipient ?? '',
      line1: address.line1,
      line2: address.line2 ?? '',
      line3: address.line3 ?? '',
      city: address.city,
      region: address.region ?? '',
      postal_code: address.postal_code,
      country_code: address.country_code,
      phone: address.phone ?? '',
      is_default: address.is_default,
    });
  }

  const isEditing = editingId !== null && draft !== null;

  return (
    <div className="lx-account-form">
      {addresses.length > 0 ? (
        <ul className="lx-address-list">
          {addresses.map((address) => (
            <li key={address.id} className="lx-address">
              <div>
                <span className="lx-address__kind">{address.kind}</span>
                {address.is_default ? <span className="lx-address__default">Default</span> : null}
              </div>
              <p className="lx-address__lines">
                {address.full_name}
                <br />
                {[address.line1, address.line2, address.city, address.region, address.postal_code, address.country_code]
                  .filter(Boolean)
                  .join(', ')}
                {address.phone ? (
                  <>
                    <br />
                    {address.phone}
                  </>
                ) : null}
              </p>
              <div className="lx-address__actions">
                <button type="button" className="lx-text-btn" onClick={() => beginEdit(address)}>Edit</button>
                {!address.is_default ? (
                  <button type="button" className="lx-text-btn" disabled={busy} onClick={() => void handleSetDefault(address)}>
                    Set default
                  </button>
                ) : null}
                <button type="button" className="lx-text-btn" disabled={busy} onClick={() => void handleDelete(address)}>
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="lx-account-note">No saved addresses yet.</p>
      )}

      {error ? <p className="lx-account-error" role="alert">{error}</p> : null}
      {saved && draft === null ? <p className="lx-account-success" role="status">Address book updated.</p> : null}

      {draft === null ? (
        <div>
          <button type="button" className="lx-btn lx-btn--ghost" onClick={() => setDraft({ ...EMPTY })}>
            Add an address
          </button>
        </div>
      ) : (
        <form onSubmit={isEditing ? handleUpdate : handleCreate} className="lx-account-card">
          <h2 className="lx-account-card__title">{isEditing ? 'Edit address' : 'New address'}</h2>
          <div className="lx-account-form">
            <div className="lx-account-form__row lx-account-form__row--two">
              <div className="lx-account-field">
                <label htmlFor="ad-kind">Kind</label>
                <select id="ad-kind" value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as CreateCustomerAddressInput['kind'] })}>
                  {KINDS.map((kind) => (
                    <option key={kind} value={kind}>{kind}</option>
                  ))}
                </select>
              </div>
              <div className="lx-account-field">
                <label htmlFor="ad-fullname">Full name</label>
                <input id="ad-fullname" required value={draft.full_name} onChange={(e) => setDraft({ ...draft, full_name: e.target.value })} />
              </div>
            </div>
            <div className="lx-account-field">
              <label htmlFor="ad-line1">Address line 1</label>
              <input id="ad-line1" required value={draft.line1} onChange={(e) => setDraft({ ...draft, line1: e.target.value })} />
            </div>
            <div className="lx-account-field">
              <label htmlFor="ad-line2">Address line 2</label>
              <input id="ad-line2" value={draft.line2 ?? ''} onChange={(e) => setDraft({ ...draft, line2: e.target.value })} />
            </div>
            <div className="lx-account-form__row lx-account-form__row--two">
              <div className="lx-account-field">
                <label htmlFor="ad-city">City</label>
                <input id="ad-city" required value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} />
              </div>
              <div className="lx-account-field">
                <label htmlFor="ad-region">Region</label>
                <input id="ad-region" value={draft.region ?? ''} onChange={(e) => setDraft({ ...draft, region: e.target.value })} />
              </div>
            </div>
            <div className="lx-account-form__row lx-account-form__row--two">
              <div className="lx-account-field">
                <label htmlFor="ad-postal">Postal code</label>
                <input id="ad-postal" required value={draft.postal_code} onChange={(e) => setDraft({ ...draft, postal_code: e.target.value })} />
              </div>
              <div className="lx-account-field">
                <label htmlFor="ad-country">Country code</label>
                <input id="ad-country" required maxLength={2} minLength={2} value={draft.country_code} onChange={(e) => setDraft({ ...draft, country_code: e.target.value.toUpperCase() })} />
              </div>
            </div>
            <div className="lx-account-form__row lx-account-form__row--two">
              <div className="lx-account-field">
                <label htmlFor="ad-phone">Phone</label>
                <input id="ad-phone" type="tel" value={draft.phone ?? ''} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
              </div>
              <div className="lx-account-field">
                <label htmlFor="ad-default">
                  <input
                    id="ad-default"
                    type="checkbox"
                    checked={draft.is_default}
                    onChange={(e) => setDraft({ ...draft, is_default: e.target.checked })}
                  />{' '}
                  Set as default
                </label>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button type="submit" className="lx-btn lx-btn--solid" disabled={busy}>
                {busy ? 'Saving…' : isEditing ? 'Save address' : 'Add address'}
              </button>
              <button
                type="button"
                className="lx-btn lx-btn--ghost"
                onClick={() => {
                  setDraft(null);
                  setEditingId(null);
                  setError(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
