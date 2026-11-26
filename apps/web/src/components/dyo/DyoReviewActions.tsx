'use client';

/**
 * apps/web/src/components/dyo/DyoReviewActions.tsx
 *
 * The actions on a recorded configuration.
 *
 * "Add to bag" exists only for a PRICED configuration, because the API refuses
 * any other state. For every other state the honest action is to ask the
 * atelier to review it. A failed conversion is shown as a failure; the previous
 * version navigated to the bag regardless, which made the bag disagree with the
 * configuration.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export interface DyoReviewActionsProps {
  readonly shortCode: string;
  readonly state: string;
}

export function DyoReviewActions({ shortCode, state }: DyoReviewActionsProps) {
  let router: { push?: (href: string) => void } | null = null;
  try {
    router = useRouter();
  } catch {
    // Static/test render — the link fallback below still works.
  }

  const [isAdding, setIsAdding] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addToBag = async (): Promise<void> => {
    setIsAdding(true);
    setError(null);
    let cartToken = '';
    if (typeof window !== 'undefined') {
      cartToken = localStorage.getItem('maihan_cart_token') ?? '';
      if (cartToken === '') {
        cartToken = `cart_${Math.random().toString(36).slice(2, 12)}`;
        localStorage.setItem('maihan_cart_token', cartToken);
      }
    }

    try {
      const response = await fetch(`/api/v1/dyo/configurations/${shortCode}/add-to-cart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartToken }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message ?? 'The configuration could not be added to the bag.');
      }
      if (router?.push !== undefined) router.push('/cart');
      else window.location.assign('/cart');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The configuration could not be added to the bag.');
    } finally {
      setIsAdding(false);
    }
  };

  const copyLink = (): void => {
    if (typeof window === 'undefined') return;
    void navigator.clipboard
      .writeText(window.location.href)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2500);
      })
      .catch(() => setError('The link could not be copied. Select the address bar instead.'));
  };

  return (
    <div className="sf-checkout__actions" style={{ marginTop: 8 }}>
      {state === 'PRICED' ? (
        <button type="button" className="mh-cta" disabled={isAdding} onClick={() => void addToBag()}>
          {isAdding ? 'Adding…' : 'Add to bag'}
        </button>
      ) : (
        <a className="mh-cta" href="/contact">
          Ask the atelier to review it
        </a>
      )}

      <button type="button" className="mh-cta mh-cta--quiet" onClick={copyLink}>
        {copied ? 'Link copied' : 'Share this configuration'}
      </button>

      <a className="sf-text-link" href="/design-your-own">
        ← Modify or start another
      </a>

      {error !== null && (
        <p role="alert" style={{ margin: 0, flexBasis: '100%', color: '#9a3412', fontSize: 12 }}>
          {error}
        </p>
      )}
    </div>
  );
}
