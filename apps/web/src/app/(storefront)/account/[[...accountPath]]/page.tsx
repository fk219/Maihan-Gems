import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Your Account | Maihan Gems',
  robots: { index: false, follow: false },
};

/**
 * F4 honest state: customer sessions exist on the fresh API (register/login);
 * the account workspace (orders, favourites, saved designs) is the commerce
 * increment. This page renders the sign-in prompt until then.
 */
export default function AccountGatePage() {
  return (
    <main className="golden-cloud-gallery min-h-screen text-[#181613]">
      <section className="mx-auto max-w-3xl px-6 pt-44 sm:pt-52 pb-24 text-center">
        <p className="font-mono text-xs tracking-[0.3em] uppercase text-[#8A7B5C]">Maihan Gems Client Services</p>
        <h1 className="mt-4 font-serif text-4xl sm:text-5xl text-[#141413]">Your Account</h1>
        <p className="mt-6 text-base leading-relaxed text-[#5C4E3C]">
          Order history, saved pieces and private viewings are being prepared on
          the new platform. Client services will confirm your account access by
          email.
        </p>
        <div className="mt-10 inline-flex items-center gap-3 rounded-sm border border-[#D4AF37]/40 px-6 py-3">
          <Link href="/" className="text-sm text-[#141413] hover:text-[#1E3A5F]">
            Return to the collection →
          </Link>
        </div>
      </section>
    </main>
  );
}
