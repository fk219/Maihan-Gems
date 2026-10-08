/**
 * apps/web/src/components/design-system/Breadcrumbs.tsx
 *
 * Design-system primitive: Breadcrumbs (doc 08 layout inventory).
 *
 * Semantic <nav aria-label="Breadcrumb"> with an ordered list; the current
 * page is the last item, marked aria-current="page" and rendered as plain
 * text (not a link). JSON-LD BreadcrumbList is Task 8 — deliberately not
 * here. Server-compatible.
 */
import Link from 'next/link';

export interface BreadcrumbCrumb {
  readonly label: string;
  /** Omit for the current page. */
  readonly href?: string;
}

export interface BreadcrumbsProps {
  readonly crumbs: readonly BreadcrumbCrumb[];
}

export function Breadcrumbs({ crumbs }: BreadcrumbsProps) {
  if (crumbs.length === 0) return null;
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol className="breadcrumbs__list">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <li key={`${crumb.label}-${index}`} className="breadcrumbs__item">
              {crumb.href !== undefined && !isLast ? (
                <Link href={crumb.href}>{crumb.label}</Link>
              ) : (
                <span aria-current={isLast ? 'page' : undefined}>{crumb.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
