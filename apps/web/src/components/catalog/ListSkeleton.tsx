/**
 * apps/web/src/components/catalog/ListSkeleton.tsx
 *
 * Loading skeleton for every catalogue LISTING (variety, pairs, rings,
 * colour, settings): the title bar, result-count line and a card grid
 * matching the final layout's shape (doc 08: "skeleton matching final
 * layout; no spinner-only loaders"). Composed from the shared Skeleton
 * primitive; announced by the route's loading.tsx as an aria-busy region.
 */
import { Skeleton } from '../design-system/Skeleton.js';

export function ListSkeleton({ cards = 8 }: { cards?: number }) {
  return (
    <div className="page list-skeleton" aria-busy="true" aria-live="polite">
      <span className="visually-hidden">Loading results</span>
      <Skeleton width="320px" height="40px" variant="text" />
      <Skeleton width="160px" height="20px" variant="text" />
      <ul className="product-grid">
        {Array.from({ length: cards }, (_, i) => (
          <li key={i}>
            <Skeleton width="100%" height="220px" variant="card" />
          </li>
        ))}
      </ul>
    </div>
  );
}
