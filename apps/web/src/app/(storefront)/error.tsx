'use client';

/**
 * apps/web/src/app/(storefront)/error.tsx
 *
 * The storefront route-level error boundary. It renders inside the storefront
 * layout, so the header and footer remain available — the visitor is not
 * dropped onto a naked page.
 */
import { useEffect } from 'react';
import Link from 'next/link';
import { captureClientError } from '@maihan/observability/client';

import { ErrorState } from '../../components/design-system/ErrorState.js';

export default function StorefrontError({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}) {
  useEffect(() => {
    console.error(error.digest ?? 'storefront-error');
    try {
      captureClientError(error, {
        tags: { error_boundary: 'storefront_group', digest: error.digest ?? 'unknown' },
      });
    } catch {
      // Non-blocking.
    }
  }, [error]);

  return (
    <main className="page mh-page">
      <p className="sf-eyebrow">Interruption</p>
      <ErrorState
        title="This page could not be assembled."
        recovery={
          <>
            <button type="button" onClick={reset} className="mh-cta">
              Try again
            </button>
            <Link href="/" className="mh-cta mh-cta--quiet">
              Return home
            </Link>
          </>
        }
      >
        <p>
          The record could not be read. Nothing was changed and no order was created. The header
          and the rest of the catalogue are still available.
        </p>
      </ErrorState>
    </main>
  );
}
