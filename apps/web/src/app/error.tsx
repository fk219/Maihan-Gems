'use client';

/**
 * apps/web/src/app/error.tsx
 *
 * Root error boundary for apps/web.
 * Integrates Sentry client capture and displays a luxury fallback recovery view.
 * Guarantees zero raw stack traces, database strings, or internal errors reach the client.
 */
import { useEffect } from 'react';
import Link from 'next/link';
import { captureClientError } from '@maihan/observability/client';
import { ErrorState } from '../components/design-system/ErrorState.js';

export default function GlobalError({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}) {
  useEffect(() => {
    // Proactively capture to Sentry / observability
    try {
      captureClientError(error, {
        tags: { error_boundary: 'root_error_boundary', digest: error.digest ?? 'unknown' },
        extra: { message: error.message },
      });
    } catch {
      // Non-blocking guarantee
    }
  }, [error]);

  return (
    <div style={{ padding: '4rem 1.5rem', maxWidth: '640px', margin: '0 auto', textAlign: 'center' }}>
      <ErrorState
        title="We encountered an unexpected disruption"
        recovery={
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem' }}>
            <button
              type="button"
              onClick={reset}
              className="button button--primary"
              style={{
                padding: '0.75rem 1.75rem',
                backgroundColor: '#0F172A',
                color: '#FFFFFF',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Try Again
            </button>
            <Link
              href="/"
              className="button button--secondary"
              style={{
                padding: '0.75rem 1.75rem',
                backgroundColor: '#F8FAFC',
                color: '#0F172A',
                border: '1px solid #E2E8F0',
                borderRadius: '6px',
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              Return to Storefront
            </Link>
          </div>
        }
      >
        <p style={{ color: '#64748B', lineHeight: '1.6' }}>
          Our atelier systems have logged this event for investigation. Please retry or return to exploring gemstones.
        </p>
      </ErrorState>
    </div>
  );
}
