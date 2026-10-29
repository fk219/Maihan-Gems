import type { Metadata } from 'next';
import { ComingSoon } from '@/components/mgh/content/ComingSoon';

export const metadata: Metadata = { title: 'Private Viewings | Maihan Gems' };

export default function Page() {
  return (
    <ComingSoon
      title="Private Viewings"
      blurb="Private viewing appointments are arranged personally. Contact the house to arrange a viewing."
      backHref="/contact"
    />
  );
}
