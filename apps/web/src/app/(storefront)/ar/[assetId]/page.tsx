/**
 * apps/web/src/app/(storefront)/ar/[assetId]/page.tsx
 *
 * M3 — the reference applet's AR viewer page, verbatim, wired to the repo's
 * REAL `webar_assets` seam (`@/lib/webar-server`):
 *   - the viewer renders the REAL READY asset (`WebArAssetView` — modelUrl
 *     carries the actual GLB path; calibration facts the vault does not
 *     record print 'Not evidenced', never an invented figure);
 *   - the 404 branch lists the REAL READY assets (the reference listed its
 *     fixture ledger — the applet's own honest-fallback markup otherwise);
 *   - unknown ids render the same not-found plate exactly.
 */
import Link from 'next/link';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { listReadyWebArAssets, loadWebArAssetView } from '@/lib/webar-server';
import ArViewerPageClient from '@/components/mgh/ar/ArViewerPageClient';

export const metadata = {
  robots: { index: false, follow: false },
} as const;

export default async function ArViewerPage({
  params,
}: {
  params: Promise<{ assetId: string }>;
}) {
  const { assetId } = await params;
  const asset = await loadWebArAssetView(assetId);

  if (!asset) {
    const availableAssets = await listReadyWebArAssets();
    return (
      <div className="min-h-screen bg-[#F8F7F4] text-[#141413] flex flex-col justify-between p-6 sm:p-12">
        <header className="max-w-3xl mx-auto w-full flex items-center justify-between border-b border-[#E4E0D8] pb-4">
          <Link
            href="/"
            className="font-serif text-xl tracking-tight text-[#141413]"
          >
            MAIHAN GEMS
          </Link>
          <span className="font-mono text-xs uppercase tracking-[0.14em] text-[#B45309]">
            HTTP 404 · Missing WebAR Asset
          </span>
        </header>

        <main
          id="main-content"
          className="max-w-3xl mx-auto w-full my-12 bg-[#F1EFEA] border border-[#E4E0D8] p-8 sm:p-10 space-y-6"
        >
          <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.14em] text-[#B91C1C]">
            <AlertTriangle className="w-4 h-4" />
            Optical Twin Not Found
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#141413]">
            WebAR Asset &ldquo;{assetId}&rdquo; Is Not Evidenced in the Vault
          </h1>
          <p className="text-sm text-[#575551] leading-relaxed">
            Maihan Gems only renders 3D and WebAR optical twins when calibrated
            refraction and millimeter geometry have been recorded for the parcel. We
            never substitute a generic placeholder stone for an uncalibrated lot.
          </p>

          <div className="border-t border-[#E4E0D8] pt-6 space-y-3">
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#575551]">
              Calibrated WebAR Assets Available for Inspection
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {availableAssets.map((item) => (
                <Link
                  key={item.assetId}
                  href={`/ar/${item.assetId}`}
                  className="p-3 bg-[#F8F7F4] border border-[#E4E0D8] hover:border-[#1E3A5F] transition-colors flex items-center justify-between"
                >
                  <div>
                    <p className="font-serif text-base text-[#141413]">{item.title}</p>
                    <p className="font-mono text-xs text-[#575551]">
                      {item.assetId} ·{' '}
                      {item.caratOrScale !== null
                        ? `${item.caratOrScale.toFixed(2)} ct`
                        : 'Not evidenced'}
                    </p>
                  </div>
                  <span className="font-mono text-xs text-[#1E3A5F] uppercase">
                    Open 3D →
                  </span>
                </Link>
              ))}
            </div>
          </div>

          <div className="pt-2 flex flex-wrap gap-3">
            <Link
              href="/browse"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1E3A5F] text-white text-xs font-mono uppercase tracking-wider"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Browse Vault Catalogue
            </Link>
          </div>
        </main>

        <footer className="max-w-3xl mx-auto w-full text-xs text-[#575551] font-mono border-t border-[#E4E0D8] pt-4">
          Maihan Gems Optical Telemetry · Honest Asset Verification
        </footer>
      </div>
    );
  }

  // Handoff tokens are hash-only vault rows — no token is enumerable for the
  // asset here (the reference's matching fixture token had no honest
  // equivalent), so the studio's handoff chip stays absent until a token is
  // minted for this session via the QR API.
  const handoffToken: string | null = null;
  // Registered assets are standalone procedural twins (no product relation in
  // the vault) — the reference's not-linked fallback lands on /browse.
  const backHref = '/browse';

  return (
    <ArViewerPageClient
      asset={asset}
      handoffToken={handoffToken}
      backHref={backHref}
    />
  );
}
