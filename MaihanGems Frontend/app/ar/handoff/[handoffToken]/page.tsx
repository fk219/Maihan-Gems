import React from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, QrCode, Smartphone, Sparkles } from 'lucide-react';
import { getHandoffSessionByToken, getGemstoneBySlugOrId } from '@/lib/storefront-data';
import { VALID_HANDOFF_TOKENS } from '@/lib/fixtures';

export default async function ArHandoffPage({
  params,
  searchParams,
}: {
  params: Promise<{ handoffToken: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { handoffToken } = await params;
  const { mode } = await searchParams;
  const handoff = getHandoffSessionByToken(handoffToken);

  if (!handoff) {
    const validSessions = Object.values(VALID_HANDOFF_TOKENS);
    return (
      <div className="min-h-screen bg-[#F8F7F4] text-[#141413] p-6 sm:p-12 flex flex-col justify-center">
        <main
          id="main-content"
          className="max-w-2xl mx-auto w-full bg-[#F1EFEA] border border-[#E4E0D8] p-8 space-y-5"
        >
          <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.14em] text-[#B91C1C]">
            <AlertTriangle className="w-4 h-4" />
            Invalid Handoff Token
          </div>
          <h1 className="font-serif text-3xl text-[#141413]">
            AR Handoff Session &ldquo;{handoffToken}&rdquo; Was Not Found
          </h1>
          <p className="text-sm text-[#575551] leading-relaxed">
            This mobile handoff token is either expired or does not match an active
            calibrated gemstone session. Choose a verified session below to launch the
            3D viewer.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            {validSessions.map((s) => (
              <Link
                key={s.token}
                href={`/ar/handoff/${s.token}`}
                className="px-4 py-2 bg-[#F8F7F4] border border-[#E4E0D8] hover:border-[#1E3A5F] text-xs font-mono uppercase tracking-wider"
              >
                Token: {s.token} ({s.assetId})
              </Link>
            ))}
          </div>
        </main>
      </div>
    );
  }

  const isMobilePreview = mode === 'mobile';
  const stone = getGemstoneBySlugOrId(handoff.asset.sku);
  const backHref = stone ? `/product/${stone.slug}` : '/browse';

  return (
    <div className="min-h-screen bg-[#F8F7F4] text-[#141413] p-6 sm:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E4E0D8] pb-5">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#575551]">
              Desktop-to-Mobile WebAR Handoff
            </p>
            <h1 className="font-serif text-3xl sm:text-4xl mt-1">
              {handoff.asset.title}
            </h1>
          </div>
          <Link
            href={`/ar/${handoff.asset.assetId}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#1E3A5F] text-white text-xs font-mono uppercase tracking-wider"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Launch Full 3D Viewer
          </Link>
        </header>

        <main id="main-content" className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-5 bg-[#F1EFEA] border border-[#E4E0D8] p-6 space-y-5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs uppercase tracking-wider text-[#575551]">
                Handoff Token
              </span>
              <span className="font-mono text-xs font-medium text-[#1E3A5F] bg-[#F8F7F4] px-2.5 py-1 border border-[#E4E0D8]">
                {handoff.session.token}
              </span>
            </div>

            <div className="bg-white p-6 border border-[#E4E0D8] flex flex-col items-center justify-center">
              <svg
                viewBox="0 0 120 120"
                className="w-44 h-44 text-[#141413]"
                role="img"
                aria-label={`QR Code for token ${handoff.session.token}`}
              >
                <rect width="120" height="120" fill="#ffffff" />
                <rect x="10" y="10" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="6" />
                <rect x="19" y="19" width="12" height="12" fill="currentColor" />
                <rect x="80" y="10" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="6" />
                <rect x="89" y="19" width="12" height="12" fill="currentColor" />
                <rect x="10" y="80" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="6" />
                <rect x="19" y="89" width="12" height="12" fill="currentColor" />
                <rect x="50" y="16" width="8" height="8" fill="currentColor" />
                <rect x="62" y="24" width="8" height="16" fill="currentColor" />
                <rect x="48" y="48" width="24" height="24" fill="#1E3A5F" />
                <rect x="56" y="56" width="8" height="8" fill="#ffffff" />
                <rect x="16" y="52" width="16" height="8" fill="currentColor" />
                <rect x="82" y="52" width="12" height="18" fill="currentColor" />
                <rect x="52" y="84" width="18" height="8" fill="currentColor" />
                <rect x="80" y="82" width="24" height="10" fill="currentColor" />
                <rect x="92" y="96" width="14" height="14" fill="currentColor" />
              </svg>
              <p className="mt-3 font-mono text-[11px] text-[#575551] text-center">
                Scan with mobile camera to open <br />
                <span className="text-[#141413] font-medium">/ar/{handoff.asset.assetId}</span>
              </p>
            </div>

            <div className="space-y-2 text-xs text-[#575551]">
              <p className="flex justify-between border-b border-[#E4E0D8] pb-1.5">
                <span>Refractive Index</span>
                <span className="font-mono text-[#141413] tabular-nums">
                  {handoff.asset.ior.toFixed(3)}
                </span>
              </p>
              <p className="flex justify-between border-b border-[#E4E0D8] pb-1.5">
                <span>Dimensions</span>
                <span className="font-mono text-[#141413] tabular-nums">
                  {handoff.asset.dimensionsMm}
                </span>
              </p>
              <p className="flex justify-between">
                <span>Session Expires</span>
                <span className="font-mono text-[#141413] tabular-nums">
                  {handoff.session.expiresAt}
                </span>
              </p>
            </div>
          </div>

          <div className="md:col-span-7 bg-[#F8F7F4] border border-[#E4E0D8] p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.14em] text-[#1E3A5F]">
                <Smartphone className="w-4 h-4" />
                {isMobilePreview ? 'Mobile Receiver Mode Active' : 'Desktop Companion View'}
              </div>
              <h2 className="font-serif text-2xl">
                {isMobilePreview
                  ? 'Ready to Launch Mobile WebAR Try-On'
                  : 'Transfer Inspection to Mobile or Inspect on This Screen'}
              </h2>
              <p className="text-sm text-[#575551] leading-relaxed">
                Our WebAR handoff preserves the exact stone orientation, carat scale (
                {handoff.asset.caratOrScale.toFixed(2)} ct), and platinum claw geometry
                when transitioning from desktop research to mobile wrist/finger try-on.
              </p>
            </div>

            <div className="bg-[#F1EFEA] border border-[#E4E0D8] p-5 space-y-4">
              <p className="font-mono text-xs uppercase tracking-wider text-[#575551]">
                Simulate Device Mode
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/ar/handoff/${handoff.session.token}`}
                  className={`px-4 py-2 text-xs font-mono uppercase tracking-wider border ${
                    !isMobilePreview
                      ? 'bg-[#141413] text-white border-[#141413]'
                      : 'bg-[#F8F7F4] text-[#141413] border-[#E4E0D8]'
                  }`}
                >
                  Desktop QR View
                </Link>
                <Link
                  href={`/ar/handoff/${handoff.session.token}?mode=mobile`}
                  className={`px-4 py-2 text-xs font-mono uppercase tracking-wider border ${
                    isMobilePreview
                      ? 'bg-[#141413] text-white border-[#141413]'
                      : 'bg-[#F8F7F4] text-[#141413] border-[#E4E0D8]'
                  }`}
                >
                  Phone Receiver View
                </Link>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#E4E0D8]">
              <Link
                href={backHref}
                className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#575551] hover:text-[#141413]"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Product Dossier
              </Link>
              <Link
                href={`/ar/${handoff.asset.assetId}`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#1E3A5F] text-white text-xs font-mono uppercase tracking-wider hover:bg-[#162C49]"
              >
                <QrCode className="w-4 h-4" />
                Open Interactive 3D &amp; AR Viewer
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
