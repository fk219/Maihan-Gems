import type { Metadata } from 'next';
import Link from 'next/link';
import { UnsubscribeForm } from '@/components/mgh/content/UnsubscribeForm';
import { SITE_URL } from '@/lib/mgh/site-url';

export const metadata: Metadata = {
  title: 'Unsubscribe | Maihan Gems',
  description: 'Unsubscribe from the Maihan Journal mailing list.',
  alternates: { canonical: `${SITE_URL}/unsubscribe` },
  robots: { index: false, follow: false },
};

export default function UnsubscribePage() {
  return (
    <div className="mx-auto max-w-xl px-4 sm:px-6 lg:px-8 py-16 space-y-6">
      <nav aria-label="Breadcrumb" className="text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-wider text-[#76726A]">
        <ol className="flex items-center gap-2">
          <li><Link href="/" className="hover:text-[#121211]">Home</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="font-medium text-[#121211]">Unsubscribe</li>
        </ol>
      </nav>
      <div className="space-y-2">
        <p className="text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-[0.2em] text-[#9A7B2C]">THE MAIHAN JOURNAL</p>
        <h1 className="font-[family-name:var(--font-eb-garamond)] text-4xl font-normal text-[#121211]">Unsubscribe</h1>
        <p className="text-sm text-[#4E4C47]">We are sorry to see you go. Enter the address you subscribed with.</p>
      </div>
      <UnsubscribeForm />
    </div>
  );
}
