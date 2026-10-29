import type { Metadata } from 'next';
import { ComingSoon } from '@/components/mgh/content/ComingSoon';

export const metadata: Metadata = { title: 'The Maihan Journal | Maihan Gems' };

export default function Page() {
  return (
    <ComingSoon
      title="The Maihan Journal"
      blurb="Stories from the vault: stones, origins and atelier notes are being prepared for publication."
      backHref="/"
    />
  );
}
