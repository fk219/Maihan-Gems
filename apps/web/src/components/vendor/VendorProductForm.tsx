'use client';

/**
 * apps/web/src/components/vendor/VendorProductForm.tsx
 *
 * D4 — vendor stock intake. The only mutation the portal performs, and it can
 * only ever create a DRAFT: the API schema is strict, so `state`,
 * `price_evidence` and `vendor_id` are not accepted fields at all.
 *
 * Money is converted to integer minor units in the browser with BigInt, then
 * sent as `priceMinor`; no float ever reaches the wire or the database.
 */
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  field,
  fieldLabel,
  input,
  primaryButton,
  alert,
  notice,
} from './styles.js';

const KINDS = [
  ['LOOSE_STONE', 'Loose stone'],
  ['STONE_PAIR', 'Matched pair'],
  ['READY_MADE', 'Ready-made'],
] as const;

const JEWELLERY_TYPES = [
  ['RING', 'Ring'],
  ['EARRINGS', 'Earrings'],
  ['NECKLACE', 'Necklace'],
  ['PENDANT', 'Pendant'],
  ['BRACELET', 'Bracelet'],
  ['BROOCH', 'Brooch'],
  ['CUFFLINKS', 'Cufflinks'],
  ['CHARM', 'Charm'],
] as const;

const CURRENCIES = ['USD', 'EUR', 'GBP', 'AED', 'INR'] as const;

const MAX_PRICE_MINOR = 999_999_999_999n;

/** "1234.5" -> 123450. Returns null for anything that is not money-shaped. */
function toMinorUnits(raw: string): number | null {
  const match = /^(\d{1,10})(?:\.(\d{1,2}))?$/.exec(raw.trim());
  if (match === null) return null;
  const whole = BigInt(match[1] as string);
  const cents = BigInt((match[2] ?? '').padEnd(2, '0') || '0');
  const minor = whole * 100n + cents;
  if (minor > MAX_PRICE_MINOR) return null;
  return Number(minor);
}

export function VendorProductForm(): React.JSX.Element {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [kind, setKind] = useState<string>('LOOSE_STONE');
  const [jewelleryType, setJewelleryType] = useState<string>('RING');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState<string>('USD');
  const [totalWeightCt, setTotalWeightCt] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setSaved(null);

    const priceMinor = toMinorUnits(price);
    if (priceMinor === null) {
      setError('Price must be an amount like 1250 or 1250.50.');
      return;
    }

    setBusy(true);
    try {
      const response = await fetch('/api/v1/vendor/products', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          kind,
          slug,
          title,
          jewelleryType,
          priceMinor,
          currency,
          ...(totalWeightCt.trim().length === 0 ? {} : { totalWeightCt: totalWeightCt.trim() }),
          ...(shortDescription.trim().length === 0
            ? {}
            : { shortDescription: shortDescription.trim() }),
          ...(description.trim().length === 0 ? {} : { description: description.trim() }),
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        setError(body?.error?.message ?? 'The product could not be saved.');
        return;
      }

      setSaved('Saved as DRAFT. The platform reviews and publishes; the portal cannot publish.');
      setTitle('');
      setSlug('');
      setPrice('');
      setTotalWeightCt('');
      setShortDescription('');
      setDescription('');
      router.refresh();
    } catch {
      setError('The service is unreachable. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: 'grid', gap: '14px' }}>
      {error !== null && (
        <p role="alert" style={alert}>
          {error}
        </p>
      )}
      {saved !== null && (
        <p role="status" style={notice}>
          {saved}
        </p>
      )}

      <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <label style={field}>
          <span style={fieldLabel}>Title</span>
          <input
            required
            maxLength={200}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            style={input}
          />
        </label>
        <label style={field}>
          <span style={fieldLabel}>Slug</span>
          <input
            required
            maxLength={180}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            placeholder="ceylon-sapphire-2-1-ct"
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            style={input}
          />
        </label>
        <label style={field}>
          <span style={fieldLabel}>Kind</span>
          <select value={kind} onChange={(event) => setKind(event.target.value)} style={input}>
            {KINDS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label style={field}>
          <span style={fieldLabel}>Jewellery type</span>
          <select
            value={jewelleryType}
            onChange={(event) => setJewelleryType(event.target.value)}
            style={input}
          >
            {JEWELLERY_TYPES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label style={field}>
          <span style={fieldLabel}>Price</span>
          <input
            required
            inputMode="decimal"
            placeholder="1250.00"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            style={input}
          />
        </label>
        <label style={field}>
          <span style={fieldLabel}>Currency</span>
          <select value={currency} onChange={(event) => setCurrency(event.target.value)} style={input}>
            {CURRENCIES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </label>
        <label style={field}>
          <span style={fieldLabel}>Total weight (ct, optional)</span>
          <input
            inputMode="decimal"
            placeholder="2.140"
            value={totalWeightCt}
            onChange={(event) => setTotalWeightCt(event.target.value)}
            style={input}
          />
        </label>
      </div>

      <label style={field}>
        <span style={fieldLabel}>Short description (optional)</span>
        <textarea
          rows={2}
          maxLength={1000}
          value={shortDescription}
          onChange={(event) => setShortDescription(event.target.value)}
          style={input}
        />
      </label>
      <label style={field}>
        <span style={fieldLabel}>Description (optional)</span>
        <textarea
          rows={4}
          maxLength={20000}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          style={input}
        />
      </label>

      <div>
        <button type="submit" disabled={busy} style={primaryButton}>
          {busy ? 'Saving…' : 'Add as draft'}
        </button>
      </div>
    </form>
  );
}
