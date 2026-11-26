import type { Metadata } from 'next';
import { ComingSoon } from '@/components/mgh/content/ComingSoon';

export const metadata: Metadata = { title: 'Policies | Maihan Gems' };

export default function Page() {
  return <ComingSoon title="Policies" blurb="Our purchase, shipping, returns and privacy policies are being prepared for publication." backHref="/" />;
}
