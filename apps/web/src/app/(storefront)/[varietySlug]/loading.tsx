/**
 * apps/web/src/app/(storefront)/[varietySlug]/loading.tsx
 *
 * Route-level loading state (Task 5): the listing skeleton, shaped like the
 * final variety page. One aria-busy announcement, no spinners.
 */
import { ListSkeleton } from '../../../components/catalog/ListSkeleton.js';

export default function Loading() {
  return <ListSkeleton />;
}
