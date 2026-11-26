import type { Metadata } from 'next';
import { ComingSoon } from '@/components/mgh/content/ComingSoon';

export const metadata: Metadata = { title: 'About Maihan Gems | Maihan Gems' };

export default function Page() {
  return <ComingSoon title="About Maihan Gems" blurb="Our house story is being prepared for publication." backHref="/" />;
}
