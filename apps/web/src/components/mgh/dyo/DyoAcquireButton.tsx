'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/**
 * F3-commerce: converts the quoted configuration into a cart line via
 * fresh-api, then walks the buyer to checkout. The quoted price is the only
 * authority — the server cart line carries it verbatim.
 */
export default function DyoAcquireButton({ configurationCode }: { configurationCode: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const acquire = async () => {
    setBusy(true);
    setError('');
    try {
      // Tray token (guest cart) rides in sessionStorage across the flow.
      let token = sessionStorage.getItem('maihan_cart_token') ?? '';
      const createRes = await fetch('/api/fresh/carts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: token || undefined }),
      });
      const createBody = (await createRes.json()) as { token?: string };
      token = createBody.token ?? token;
      sessionStorage.setItem('maihan_cart_token', token);

      const addRes = await fetch(`/api/fresh/carts/${encodeURIComponent(token)}/items`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ configuration_code: configurationCode }),
      });
      if (!addRes.ok) {
        const body = (await addRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? 'The atelier could not reserve this commission.');
      }
      router.push('/checkout/order-summary');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong.');
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={acquire}
        disabled={busy}
        className="px-8 py-3.5 gold-gradient-cta text-sm disabled:opacity-50"
        data-testid="dyo-acquire"
      >
        {busy ? 'Reserving…' : 'Acquire Commission →'}
      </button>
      {error ? <p className="text-xs text-[#991B1B]">{error}</p> : null}
      <p className="text-[10px] text-[#76726A] font-[family-name:var(--font-mono)]">
        Reserving issues a fresh server quote and holds the stone for 24 hours.
      </p>
    </div>
  );
}
