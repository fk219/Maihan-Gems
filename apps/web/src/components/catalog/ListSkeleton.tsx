/**
 * apps/web/src/components/catalog/ListSkeleton.tsx
 *
 * Loading skeleton for every catalogue LISTING (browse, shop, variety, pairs,
 * rings, colour, search, settings). It mirrors the real page box for box:
 * the same max-w-7xl container and gutters, the same breadcrumb, the same
 * bordered header block, the same facet bar, and the same 1 / 2 / 3-column
 * grid of 10:14 → 3:4 plates with the card's 24 px radius and 24/32 px inset.
 *
 * That is the point of a skeleton: the resolve must move nothing. Every block
 * is the size of the text it replaces (11 px eyebrow, title, 11 px meta,
 * 24 px price), so the first paint after data arrives is a content swap, not a
 * reflow. The shimmer is one token and it stops under reduced motion.
 *
 * Announced once per page as an aria-busy region; the blocks are decorative.
 */
import { Skeleton } from '../design-system/Skeleton.js';

function CardSkeleton() {
  return (
    <div className="relative flex flex-col justify-between overflow-hidden rounded-[24px] border border-[#E5D4B3] bg-[#FAF8F4] p-6 sm:p-7 aspect-[10/14] sm:aspect-[3/4]">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-2">
          <Skeleton width="72px" height="11px" variant="text" />
          <Skeleton width="28px" height="2px" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton width="40px" height="40px" />
          <Skeleton width="40px" height="40px" />
        </div>
      </div>

      <div className="space-y-2.5">
        <Skeleton width="28px" height="2px" />
        <Skeleton width="86%" height="26px" variant="text" />
        <Skeleton width="64%" height="11px" variant="text" />
        <div className="flex items-center justify-between gap-3 pt-2">
          <Skeleton width="96px" height="24px" variant="text" />
          <Skeleton width="48px" height="48px" />
        </div>
      </div>
    </div>
  );
}

export function ListSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <div
      className="mx-auto max-w-7xl space-y-8 px-4 py-12 sm:px-6 lg:px-8"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="visually-hidden">Loading results</span>

      {/* Breadcrumb: 12 px line, same three items. */}
      <div className="flex items-center gap-2">
        <Skeleton width="44px" height="12px" variant="text" />
        <Skeleton width="6px" height="12px" variant="text" />
        <Skeleton width="58px" height="12px" variant="text" />
      </div>

      {/* Collection header: eyebrow + h1 left, count line right, hairline base. */}
      <div className="flex flex-col justify-between gap-4 border-b border-[#E4DFD5] pb-6 sm:flex-row sm:items-end">
        <div className="space-y-2">
          <Skeleton width="188px" height="11px" variant="text" />
          <Skeleton width="min(340px, 68vw)" height="38px" variant="text" />
        </div>
        <Skeleton width="210px" height="14px" variant="text" />
      </div>

      {/* Facet / toolbar row: the same 40 px controls and one hairline frame. */}
      <div className="flex flex-wrap items-center gap-3 rounded-sm border border-[#EAE5DC] bg-white p-5">
        <Skeleton width="128px" height="40px" />
        <Skeleton width="104px" height="40px" />
        <Skeleton width="96px" height="40px" />
        <Skeleton width="120px" height="40px" />
        <div className="ml-auto flex gap-2">
          <Skeleton width="40px" height="40px" />
          <Skeleton width="40px" height="40px" />
        </div>
      </div>

      {/* Results: the real grid, the real card, the real ratios. */}
      <div className="grid grid-cols-1 gap-7 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: cards }, (_, index) => (
          <CardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}
