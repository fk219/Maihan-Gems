import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Vendor Portal | Maihan Gems',
  robots: { index: false, follow: false },
};

/**
 * F4 honest state: the previous vendor portal ran on the retired database.
 * The fresh vendor portal (submissions with your own reference numbers,
 * onboarding, key management) is the next app increment — submissions are
 * handled through the operations API meanwhile.
 */
export default function VendorGatePage() {
  return (
    <main className="golden-cloud-gallery min-h-screen text-[#181613]">
      <section className="mx-auto max-w-3xl px-6 pt-44 sm:pt-52 pb-24 text-center">
        <p className="font-mono text-xs tracking-[0.3em] uppercase text-[#8A7B5C]">Maihan Gems Partners</p>
        <h1 className="mt-4 font-serif text-4xl sm:text-5xl text-[#141413]">Vendor Portal</h1>
        <p className="mt-6 text-base leading-relaxed text-[#5C4E3C]">
          The vendor portal is being rebuilt on the new platform. Onboarding and
          stone submissions resume shortly — our partners will receive their
          portal access by email.
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
