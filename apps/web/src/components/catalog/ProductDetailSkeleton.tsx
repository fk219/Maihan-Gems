/**
 * apps/web/src/components/catalog/ProductDetailSkeleton.tsx
 *
 * Loading skeleton for the product detail routes (products/[productSlug],
 * [varietySlug]-rings/[productSlug]): mirrors the final layout — breadcrumb,
 * title block, badge row, spec table, provenance section. Composed from the
 * shared Skeleton primitive; announced by the route's loading.tsx.
 */
import { Skeleton } from '../design-system/Skeleton.js';

export function ProductDetailSkeleton() {
  return (
    <div className="page product-detail product-detail--loading" aria-busy="true" aria-live="polite">
      <span className="visually-hidden">Loading product</span>
      <Skeleton width="220px" height="18px" variant="text" />
      <div className="product-detail__layout">
        <div className="product-detail__summary">
          <Skeleton width="70%" height="44px" variant="text" />
          <Skeleton width="45%" height="20px" variant="text" />
          <div className="product-detail__badges">
            <Skeleton width="110px" height="26px" />
            <Skeleton width="150px" height="26px" />
          </div>
        </div>
        <div className="product-detail__specs">
          <Skeleton width="140px" height="28px" variant="text" />
          <Skeleton width="100%" height="220px" variant="card" />
        </div>
        <div className="product-detail__provenance">
          <Skeleton width="120px" height="28px" variant="text" />
          <Skeleton width="100%" height="120px" variant="card" />
        </div>
      </div>
    </div>
  );
}
