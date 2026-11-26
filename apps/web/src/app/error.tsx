'use client';

/**
 * apps/web/src/app/error.tsx
 *
 * Root error boundary. It replaces the entire tree, so it cannot rely on the
 * storefront header or footer; it is its own sealed page.
 *
 * The boundary logs through the observability port (digest only) and offers a
 * real recovery action. No stack trace, database string or internal identifier
 * reaches the client.
 */
import { useEffect } from 'react';
import Link from 'next/link';
import { captureClientError } from '@maihan/observability/client';

export default function GlobalError({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}) {
  useEffect(() => {
    try {
      captureClientError(error, {
        tags: { error_boundary: 'root_error_boundary', digest: error.digest ?? 'unknown' },
        extra: { message: error.message },
      });
    } catch {
      // Observability must never block recovery.
    }
  }, [error]);

  return (
    <main className="error-page">
      <div className="error-page__frame">
        <p className="error-page__brand">Maihan Gems</p>
        <p className="error-page__eyebrow">Interruption</p>
        <h1 className="error-page__title">This page could not be assembled.</h1>
        <p className="error-page__body">
          Something failed while the record was being read. Nothing was changed, no order was
          created and no payment was taken. Try again, or return to the collection.
        </p>
        <div className="error-page__actions">
          <button type="button" onClick={reset} className="error-page__button">
            Try again
          </button>
          <Link href="/" className="error-page__button error-page__button--quiet">
            Return to the storefront
          </Link>
        </div>
      </div>
    </main>
  );
}
