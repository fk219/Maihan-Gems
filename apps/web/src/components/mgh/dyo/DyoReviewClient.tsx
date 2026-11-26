'use client';

/**
 * M5 — the applet's review-dossier "Acquire Commission" control with the
 * repo's REAL conversion seam behind it.
 *
 * Markup/classes preserved from the applet (`DyoReviewAddToCartButton`).
 * The ONE seam change: the applet's localStorage-only add is replaced by
 * the repo's proven DYO conversion chain (the same flow the replaced
 * `DyoReviewActions` ran, so INV-01/02/03 stay intact end-to-end):
 *
 *   1. resolve a REAL server cart token (reuse an ACTIVE server cart or
 *      create one — a locally invented token is rejected with 404/CART_NOT_FOUND),
 *   2. POST /api/v1/dyo/configurations/{code}/quote → real quoteToken
 *      (a fresh server-side quote; no client arithmetic),
 *   3. POST /api/v1/dyo/configurations/{code}/add-to-cart with the quote
 *      token (server re-validates + materialises the configured product
 *      line) — PRICE_CHANGED (409) re-quotes once, honest on failure,
 *   4. on success the page routes to the real bag where the merged tray
 *      (M4 seam) shows the server line.
 */
import { useState } from 'react';
import Link from 'next/link';
import { ShoppingBag, ArrowLeft } from 'lucide-react';

interface ServerError {
  code?: string;
  message?: string;
}

async function ensureServerCart(): Promise<string> {
  const cached = typeof window !== 'undefined' ? window.localStorage.getItem('maihan_cart_token') : null;
  if (cached) {
    try {
      const check = await fetch(`/api/v1/carts/${encodeURIComponent(cached)}`);
      if (check.ok) {
        const body = (await check.json().catch(() => null)) as { data?: { state?: string } } | null;
        if (body?.data?.state === 'ACTIVE') return cached;
      }
    } catch {
      // fall through to creating a fresh cart
    }
  }
  const createRes = await fetch('/api/v1/carts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  const createBody = (await createRes.json().catch(() => null)) as
    | { data?: { cart_token?: string }; error?: ServerError }
    | null;
  if (!createRes.ok) {
    throw new Error(createBody?.error?.message ?? 'The server could not open a bag. Please try again.');
  }
  const cartToken = createBody?.data?.cart_token ?? '';
  if (!cartToken) throw new Error('The server did not return a bag token. Please try again.');
  if (typeof window !== 'undefined') window.localStorage.setItem('maihan_cart_token', cartToken);
  return cartToken;
}

async function requestQuote(shortCode: string): Promise<string> {
  const res = await fetch(`/api/v1/dyo/configurations/${encodeURIComponent(shortCode)}/quote`, {
    method: 'POST',
  });
  const body = (await res.json().catch(() => null)) as
    | { data?: { quoteToken?: string }; error?: ServerError }
    | null;
  if (!res.ok) {
    throw new Error(body?.error?.message ?? 'The server could not quote this commission. Please try again.');
  }
  const quoteToken = body?.data?.quoteToken ?? '';
  if (!quoteToken) throw new Error('The quote response was incomplete. Please try again.');
  return quoteToken;
}

export function DyoReviewAddToCartButton({
  configurationCode,
  totalPriceLabel,
}: {
  configurationCode: string;
  /** The REAL server quote total (formatted by the page) — or null when the
   *  server has not priced this configuration yet; the button then asks for
   *  the quote at conversion time and says so honestly. */
  totalPriceLabel: string | null;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const priceLine = totalPriceLabel ?? 'server quote at conversion';

  const handleAcquire = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const cartToken = await ensureServerCart();
      const quoteToken = await requestQuote(configurationCode);
      const res = await fetch(
        `/api/v1/dyo/configurations/${encodeURIComponent(configurationCode)}/add-to-cart`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cartToken, quoteToken }),
        },
      );
      const data = (await res.json().catch(() => null)) as { error?: ServerError } | null;
      if (!res.ok) {
        // The quote is consumed/expired — one honest re-quote before refusing.
        if (data?.error?.code === 'PRICE_CHANGED' || res.status === 422) {
          const retryQuote = await requestQuote(configurationCode);
          const retry = await fetch(
            `/api/v1/dyo/configurations/${encodeURIComponent(configurationCode)}/add-to-cart`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ cartToken, quoteToken: retryQuote }),
            },
          );
          if (!retry.ok) {
            const retryBody = (await retry.json().catch(() => null)) as { error?: ServerError } | null;
            throw new Error(retryBody?.error?.message ?? 'Cart conversion failed.');
          }
        } else {
          throw new Error(data?.error?.message ?? 'Cart conversion failed.');
        }
      }
      // The server cart is the new bag authority; the applet's tray stays a
      // projection of real lines (the cart page merges server + browser).
      window.location.assign('/cart');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Cart conversion failed. Please try again.');
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      {error ? (
        <p role="alert" className="text-xs font-[family-name:var(--font-mono)] text-[#991B1B]">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void handleAcquire()}
          disabled={busy}
          className="inline-flex items-center gap-2 px-6 py-3.5 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider font-semibold gold-gradient-cta rounded-sm transition-all"
        >
          <ShoppingBag className="h-4 w-4" />
          {busy ? 'Acquiring…' : `Acquire Commission (${priceLine})`}
        </button>

        <Link
          href="/design-your-own"
          className="inline-flex items-center gap-1.5 px-4 py-3.5 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider font-medium border border-[#121211] bg-white text-[#121211] rounded-sm hover:bg-[#EFECE6]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Modify
        </Link>
      </div>
    </div>
  );
}
