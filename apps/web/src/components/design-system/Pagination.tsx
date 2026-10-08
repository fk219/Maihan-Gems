/**
 * apps/web/src/components/design-system/Pagination.tsx
 *
 * Design-system primitive: Pagination (doc 08).
 *
 * The Phase 3 catalogue is KEYSET-paginated (`meta.has_more` +
 * `meta.next_cursor`); the source's numbered pagination does not exist in
 * this contract, so the primitive renders only the controls the API actually
 * supports: a real <a rel="next"> forward link when more results exist and a
 * back link when a cursor is present. Inventing page numbers here would
 * fabricate capabilities the API does not have.
 *
 * Server-compatible; both controls are plain links (URL is the state).
 */
import Link from 'next/link';

export interface PaginationProps {
  /** Current path with its search params minus the cursor, from the caller. */
  readonly basePath: string;
  /** Present when the current view was reached via a cursor. */
  readonly previousCursor: string | null;
  /** `meta.next_cursor` — null means "no further page". */
  readonly nextCursor: string | null;
  readonly hasNext: boolean;
}

function href(basePath: string, cursor: string | null): string {
  return cursor === null ? basePath : `${basePath}${basePath.includes('?') ? '&' : '?'}cursor=${encodeURIComponent(cursor)}`;
}

export function Pagination({ basePath, previousCursor, nextCursor, hasNext }: PaginationProps) {
  if (previousCursor === null && !hasNext) return null;
  return (
    <nav className="pagination" aria-label="Pagination">
      {previousCursor !== null && (
        <Link href={href(basePath, previousCursor)} rel="prev" className="pagination__prev">
          Previous
        </Link>
      )}
      {hasNext && nextCursor !== null && (
        <Link href={href(basePath, nextCursor)} rel="next" className="pagination__next">
          Next
        </Link>
      )}
    </nav>
  );
}
