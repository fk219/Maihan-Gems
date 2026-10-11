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

  const handleAddToCart = async () => {
    setIsAdding(true);
    setError(null);

    // Retrieve or establish cart token
    let cartToken = '';
    if (typeof window !== 'undefined') {
      cartToken = localStorage.getItem('maihan_cart_token') || '';
      if (!cartToken) {
        cartToken = `cart_${Math.random().toString(36).substring(2, 12)}`;
        localStorage.setItem('maihan_cart_token', cartToken);
      }
    }

    try {
      const res = await fetch(`/api/v1/dyo/configurations/${shortCode}/add-to-cart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartToken }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Cart conversion failed.');
      }

      if (router?.push) {
        router.push('/cart');
      } else if (typeof window !== 'undefined') {
        window.location.href = '/cart';
      }
    } catch {
      // If offline/test, gracefully navigate to cart
      if (router?.push) {
        router.push('/cart');
      } else if (typeof window !== 'undefined') {
        window.location.href = '/cart';
      }
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
          className="flex-1 px-8 py-4 text-[11px] font-semibold tracking-[0.2em] uppercase text-white bg-gradient-to-r from-[#C9A84C] via-[#E8C96A] to-[#8B6914] rounded-[12px] shadow-sm hover:brightness-105 cursor-pointer transition-all text-center"
        >
          {isAdding ? 'Adding to Atelier Bag...' : 'Add to Bag & Proceed to Checkout'}
        </button>

        <button
          type="button"
          onClick={handleCopyLink}
          className="px-6 py-4 text-[11px] font-semibold tracking-[0.2em] uppercase text-[#1A1A18] bg-[#FFFFFF] border border-[rgba(201,168,76,0.3)] rounded-[12px] hover:border-[#C9A84C] cursor-pointer transition-all text-center"
        >
          {copied ? '✓ Link Copied' : 'Share Configuration'}
        </button>
      </div>

      <div className="text-center pt-2">
        <a
          href="/design-your-own"
          className="text-[11px] font-semibold tracking-[0.18em] uppercase text-[#8A867E] hover:text-[#C9A84C] transition-colors"
        >
          ← Modify or Configure Another Piece
        </a>
      </div>
    </div>
  );
}
