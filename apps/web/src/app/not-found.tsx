import Link from 'next/link';
import { StorefrontHeader } from '@/components/mgh/shell/StorefrontHeader';
import { StorefrontFooter } from '@/components/mgh/shell/StorefrontFooter';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0A0A0B] text-[#F7F5F0]">
      <StorefrontHeader />
      <main
        id="main-content"
        className="flex-1 mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-28 text-center space-y-6"
      >
        <p className="text-[11px] font-[family-name:var(--font-mono)] uppercase tracking-[0.26em] text-[#D4AF37]">
          HTTP 404 · RECORD NOT IN VAULT LEDGER
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl font-normal text-[#F7F5F0] tracking-tight text-balance">
          The requested specimen or dossier was not found.
        </h1>
        <p className="text-xs text-[#A39E93] max-w-md mx-auto leading-relaxed">
          Unverified slugs, configuration codes, and order references are never fabricated.
        </p>
        <div className="pt-4 flex flex-wrap items-center justify-center gap-3 text-[11px] font-[family-name:var(--font-mono)] uppercase tracking-[0.2em]">
          <Link
            href="/browse"
            className="px-6 py-3 gold-gradient-cta transition-all"
          >
            Browse Vault
          </Link>
          <Link
            href="/"
            className="px-6 py-3 border border-[#D4AF37]/40 text-[#E6C97A] hover:bg-[#D4AF37]/10 transition-colors"
          >
            Return to Maison
          </Link>
        </div>
      </main>
      <StorefrontFooter />
    </div>
  );
}
