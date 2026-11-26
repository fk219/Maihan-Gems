import type { Metadata } from 'next';
import { ComingSoon } from '@/components/mgh/content/ComingSoon';

export const metadata: Metadata = { title: 'About | Maihan Gems' };

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  await params;
  return <ComingSoon title="About" blurb="This page is being prepared for publication." backHref="/about" />;
}
