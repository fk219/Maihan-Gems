import type { Metadata } from 'next';
import { ComingSoon } from '@/components/mgh/content/ComingSoon';

export const metadata: Metadata = { title: 'Private Viewings | Maihan Gems' };

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  await params;
  return <ComingSoon title="Private Viewings" blurb="Private viewing appointments are arranged personally. Contact the house to arrange a viewing." backHref="/contact" />;
}
