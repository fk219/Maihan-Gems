/**
 * apps/web/src/components/catalog/CatalogNotFoundView.tsx
 *
 * The not-found view for every catalogue route boundary (Task 5): useful
 * navigation (search, varieties hub, home) and NO implementation details
 * (no slug echoing, no 404 internals). Server Component — it is fully static.
 */
import Link from 'next/link';

export interface CatalogNotFoundViewProps {
  /** What the user was looking for, in human terms (e.g. "gemstone"). */
  readonly subject: string;
  /** Primary contextual suggestion (the varieties hub for variety 404s). */
  readonly browseHref: string;
  readonly browseLabel: string;
}

export function CatalogNotFoundView({ subject, browseHref, browseLabel }: CatalogNotFoundViewProps) {
  return (
    <section className="page not-found-view" role="status">
      <h1>We couldn't find that {subject}.</h1>
      <p>It may have been sold, renamed, or the address may be incorrect.</p>
      <div className="not-found-view__actions">
        <Link href={browseHref} className="button">{browseLabel}</Link>
        <Link href="/search" className="button button--secondary">Search gemstones</Link>
        <Link href="/" className="button button--secondary">Return home</Link>
      </div>
    </section>
  );
}
