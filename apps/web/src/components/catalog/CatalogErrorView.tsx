'use client';

/**
 * apps/web/src/components/catalog/CatalogErrorView.tsx
 *
 * The error recovery view for every catalogue route boundary (Task 5).
 * Client Component by necessity — the retry needs the error boundary's
 * reset(). The ONLY interactivity on the page; everything else stays
 * server-rendered.
 *
 * Recovery actions are REAL: retry re-renders the failed segment; the
 * contextual link offers the documented alternate path. Stack traces and
 * messages never render (the digest is the only diagnostic surface).
 */
import { useEffect } from 'react';
import Link from 'next/link';

import { ErrorState } from '../design-system/ErrorState.js';

export interface CatalogErrorViewProps {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
  /** Contextual alternate path (the parent listing), for real recovery. */
  readonly backHref: string;
  readonly backLabel: string;
}

export function CatalogErrorView({ error, reset, backHref, backLabel }: CatalogErrorViewProps) {
  useEffect(() => {
    // The digest goes to the console for support correlation; the UI never
    // shows it (doc 08: "never a bare message", no implementation details).
    console.error(error.digest ?? 'catalog-error');
  }, [error]);

  return (
    <ErrorState title="Something went wrong loading this page." recovery={
      <>
        <button type="button" onClick={reset} className="button">
          Try again
        </button>
        <Link href={backHref} className="button button--secondary">
          {backLabel}
        </Link>
      </>
    }>
      <p>The problem was logged and it may be temporary.</p>
    </ErrorState>
  );
}
