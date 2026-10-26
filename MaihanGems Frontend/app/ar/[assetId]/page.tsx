import React from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { getWebArAssetById, getGemstoneBySlugOrId } from '@/lib/storefront-data';
import { WEBAR_ASSETS, VALID_HANDOFF_TOKENS } from '@/lib/fixtures';
import ArViewerPageClient from '@/components/ar/ArViewerPageClient';

export default async function ArViewerPage({
  params,
}: {
  params: Promise<{ assetId: string }>;
}) {
  const { assetId } = await params;
  const asset = getWebArAssetById(assetId);

  if (!asset) {
    const availableAssets = Object.values(WEBAR_ASSETS);
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
                      {item.assetId} · {item.caratOrScale.toFixed(2)} ct
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

  const matchedHandoff = Object.values(VALID_HANDOFF_TOKENS).find(
    (h) => h.assetId === asset.assetId
  );
  const stone = getGemstoneBySlugOrId(asset.sku);
  const backHref = stone
    ? `/product/${stone.slug}`
    : asset.kind === 'setting'
    ? `/settings/${asset.sku}`
    : '/browse';

  return (
    <ArViewerPageClient
      asset={asset}
      handoffToken={matchedHandoff?.token || null}
      backHref={backHref}
    />
  );
}
