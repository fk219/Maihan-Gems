/**
 * Route-level loading state: the shared listing skeleton, shaped like the
 * final collection page. One aria-busy announcement, no spinners.
 */
import { ListSkeleton } from '../../../components/catalog/ListSkeleton.js';

export default function Loading() {
  return <ListSkeleton />;
}
