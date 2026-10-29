import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Your Account | Maihan Gems', robots: { index: false, follow: false } };

export default function Page() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0A0A0B] text-[#F7F5F0]">
      <main
        id="main-content"
        className="flex-1 mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-28 text-center space-y-6"
      >
        <p className="text-[11px] font-[family-name:var(--font-mono)] uppercase tracking-[0.26em] text-[#D4AF37]">
          MAIHAN GEMS CLIENT SERVICES
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl font-normal text-[#F7F5F0] tracking-tight text-balance">
          Your Account
        </h1>
        <p className="text-xs text-[#A39E93] max-w-md mx-auto leading-relaxed">Order history, saved pieces and private viewings are being prepared on the new platform. Client services will confirm your account access by email.</p>
        <div className="pt-4 flex flex-wrap items-center justify-center gap-3 text-[11px] font-[family-name:var(--font-mono)] uppercase tracking-[0.2em]">
          <Link href="/" className="px-6 py-3 gold-gradient-cta transition-all">
            Return to Maison
          </Link>
          <Link
            href="/"
            className="px-6 py-3 border border-[#D4AF37]/40 text-[#E6C97A] hover:bg-[#D4AF37]/10 transition-colors"
          >
            Return to Maison
          </Link>
        </div>
      </main>
    </div>
  );
}
