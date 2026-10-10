/**
 * apps/web/src/app/(storefront)/search/loading.tsx
 *
 * Route-level loading state (Task 5 / doc 08): the listing skeleton, shaped
 * like the final search layout. One aria-busy announcement, no spinners.
 */
import { ListSkeleton } from '../../../components/catalog/ListSkeleton.js';

export default function Loading() {
  return <ListSkeleton />;
}
