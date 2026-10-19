'use client';

/**
 * apps/web/src/components/dyo/DyoReviewActions.tsx
 *
 * Client actions for Phase 7 DYO Review:
 *   - "Add to Bag & Proceed to Checkout" (Cart conversion)
 *   - "Copy Shareable Link" (Deep link copying)
 *   - "Modify Configuration"
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export interface DyoReviewActionsProps {
  readonly shortCode: string;
}

export function DyoReviewActions({ shortCode }: DyoReviewActionsProps) {
  let router: any = null;
  try {
    router = useRouter();
  } catch {
    // Graceful fallback when rendered outside Next.js AppRouterContext (e.g. SSR, tests)
  }
  const [isAdding, setIsAdding] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quoteToken, setQuoteToken] = useState<string | null>(null);

  const handleAddToCart = async () => {
    setIsAdding(true);
    setError(null);

    try {
      // Resolve a REAL server cart token. A locally invented token would be
      // rejected by the API (CART_NOT_FOUND); reuse an active cart when the
      // server confirms it, otherwise create one.
      let cartToken = '';
      const cached = typeof window !== 'undefined' ? localStorage.getItem('maihan_cart_token') : null;
      if (cached) {
        const check = await fetch(`/api/v1/carts/${encodeURIComponent(cached)}`);
        if (check.ok) {
          const body = await check.json().catch(() => null);
          if (body?.data?.state === 'ACTIVE') cartToken = cached;
        }
      }
      if (!cartToken) {
        const createRes = await fetch('/api/v1/carts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        });
        if (!createRes.ok) {
          const data = await createRes.json().catch(() => ({}));
          throw new Error(data?.error?.message || 'The server could not open a bag. Please try again.');
        }
        const body = await createRes.json();
        cartToken = body?.data?.cart_token ?? '';
        if (!cartToken) throw new Error('The server did not return a bag token. Please try again.');
        if (typeof window !== 'undefined') localStorage.setItem('maihan_cart_token', cartToken);
      }

      let activeQuoteToken = quoteToken;
      if (!activeQuoteToken) {
        const quoteRes = await fetch(`/api/v1/dyo/configurations/${shortCode}/quote`, { method: 'POST' });
        if (!quoteRes.ok) throw new Error('This configuration could not be quoted. Please refresh and try again.');
        const quoteData = await quoteRes.json();
        activeQuoteToken = quoteData?.data?.quoteToken ?? null;
        if (!activeQuoteToken) throw new Error('The quote response was incomplete. Please try again.');
        setQuoteToken(activeQuoteToken);
      }

      const res = await fetch(`/api/v1/dyo/configurations/${shortCode}/add-to-cart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartToken, quoteToken: activeQuoteToken }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data?.error?.code === 'PRICE_CHANGED' || res.status === 409 || res.status === 422) {
          setQuoteToken(null);
        }
        throw new Error(data?.error?.message || data.message || 'Cart conversion failed.');
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('maihan-atelier'));
      }

      if (router?.push) {
        router.push('/cart');
      } else if (typeof window !== 'undefined') {
        window.location.href = '/cart';
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Cart conversion failed. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="space-y-4 pt-6">
      {error && (
        <div className="p-3 bg-red-50 text-red-700 text-xs rounded-[8px] border border-red-200">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <button
          type="button"
          disabled={isAdding}
          onClick={handleAddToCart}
          className="flex-1 px-8 py-4 text-[11px] font-semibold tracking-[0.2em] uppercase text-white bg-gradient-to-r from-[#D4A437] via-[#F0D48A] to-[#8A5E12] rounded-[12px] shadow-sm hover:brightness-105 cursor-pointer transition-all text-center"
        >
          {isAdding ? 'Adding to Atelier Bag...' : 'Add to Bag & Proceed to Checkout'}
        </button>

        <button
          type="button"
          onClick={handleCopyLink}
          className="px-6 py-4 text-[11px] font-semibold tracking-[0.2em] uppercase text-[#1A1A18] bg-[#FFFFFF] border border-[rgba(212,164,55,0.3)] rounded-[12px] hover:border-[#D4A437] cursor-pointer transition-all text-center"
        >
          {copied ? '✓ Link Copied' : 'Share Configuration'}
        </button>
      </div>

      <div className="text-center pt-2">
        <a
          href="/design-your-own"
          className="text-[11px] font-semibold tracking-[0.18em] uppercase text-[#8A867E] hover:text-[#D4A437] transition-colors"
        >
          ← Modify or Configure Another Piece
        </a>
      </div>
    </div>
  );
}
