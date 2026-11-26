/**
 * apps/web/src/app/(storefront)/loading.tsx
 *
 * The default storefront loading state. Routes with a more specific
 * loading.tsx (listings, product detail) keep their own shapes; this covers
 * the editorial and account surfaces. No spinner: the skeleton reserves the
 * final layout so the page does not jump.
 */
import { Skeleton } from '../../components/design-system/Skeleton.js';

export default function Loading() {
  return (
    <main className="page mh-page" aria-busy="true" aria-live="polite">
      <span className="visually-hidden">Loading page</span>
      <Skeleton width="min(320px, 60vw)" height="12px" variant="text" />
      <div style={{ display: 'grid', gap: 16, marginTop: 28 }}>
        <Skeleton width="min(720px, 82vw)" height="72px" variant="text" />
        <Skeleton width="min(540px, 72vw)" height="20px" variant="text" />
      </div>
      <div style={{ display: 'grid', gap: 24, marginTop: 56 }}>
        <Skeleton width="100%" height="1px" variant="block" />
        <Skeleton width="min(420px, 64vw)" height="28px" variant="text" />
        <Skeleton width="100%" height="220px" variant="card" />
      </div>
    </main>
  );
}
