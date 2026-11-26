import type { Metadata } from 'next';
import { ComingSoon } from '@/components/mgh/content/ComingSoon';

export const metadata: Metadata = { title: 'Policy | Maihan Gems' };

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  await params;
  return <ComingSoon title="Policy" blurb="This policy page is being prepared for publication." backHref="/policy" />;
}
