/**
 * apps/web/src/app/(storefront)/ar/[assetId]/page.tsx
 *
 * The AR viewer surface.
 *
 * A READY `webar_assets` row renders the real viewer (`WebArAssetView`), and
 * every calibration fact the vault does not record prints `Not evidenced`.
 *
 * main's locked schema currently holds NO calibrated WebAR asset — and this
 * page never invents one: there is no placeholder model, no stock `.glb` and no
 * "try this other stone" link that implies an asset exists. The missing-asset
 * state is a complete page instead:
 *
 *   1. catalogue context — what reference was asked for and where the same
 *      reference can be read in the catalogue;
 *   2. the reason — no READY, calibrated asset is recorded for it (the real
 *      count of registered assets is stated);
 *   3. a next action — browse the vault, search the reference, or speak to a
 *      gemologist.
 */
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, Gem, Search, Sparkles } from 'lucide-react';
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
    const registered = await listReadyWebArAssets();
    const registeredCount = registered.length;

    return (
      <div className="min-h-screen bg-[#F8F7F4] text-[#141413] flex flex-col justify-between p-6 sm:p-12">
        <header className="max-w-3xl mx-auto w-full flex items-center justify-between border-b border-[#E4E0D8] pb-4">
          <Link href="/" className="font-serif text-xl tracking-tight text-[#141413]">
            MAIHAN GEMS
          </Link>
          <span className="font-mono text-xs uppercase tracking-[0.14em] text-[#B45309]">
            WebAR · Asset Not Recorded
          </span>
        </header>

        <main
          id="main-content"
          className="max-w-3xl mx-auto w-full my-12 bg-[#F1EFEA] border border-[#E4E0D8] p-8 sm:p-10 space-y-8"
        >
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.14em] text-[#B91C1C]">
              <AlertTriangle className="w-4 h-4" />
              Optical twin not available
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl text-[#141413]">
              No 3D asset is recorded for &ldquo;{assetId}&rdquo;
            </h1>
            <p className="text-sm text-[#575551] leading-relaxed">
              Reference{' '}
              <code className="font-mono bg-[#E9E5DC] px-1.5 py-0.5 rounded-sm">{assetId}</code>{' '}
              has no READY, calibrated optical twin in the vault. The catalogue can still
              describe the stone — the 3D studio cannot, and we will not substitute a
              placeholder model for it.
            </p>
          </div>

          {/* 1. Catalogue context */}
          <section aria-labelledby="ar-catalogue-title" className="border-t border-[#E4E0D8] pt-6 space-y-3">
            <h2
              id="ar-catalogue-title"
              className="font-mono text-xs uppercase tracking-[0.14em] text-[#575551]"
            >
              Read the same reference in the catalogue
            </h2>
            <p className="text-sm text-[#575551] leading-relaxed">
              Optical twins are an additional view, never the record itself. The stone&rsquo;s
              variety, weight, provenance and any laboratory documents live on its catalogue
              dossier.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href={`/search?q=${encodeURIComponent(assetId)}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1E3A5F] text-white text-xs font-mono uppercase tracking-wider"
              >
                <Search className="w-3.5 h-3.5" />
                Search this reference
              </Link>
              <Link
                href="/browse"
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-[#C9C3B6] text-[#141413] text-xs font-mono uppercase tracking-wider hover:border-[#1E3A5F]"
              >
                <Gem className="w-3.5 h-3.5" />
                Browse the vault catalogue
              </Link>
            </div>
          </section>

          {/* 2. The reason, stated with the real count */}
          <section aria-labelledby="ar-reason-title" className="border-t border-[#E4E0D8] pt-6 space-y-3">
            <h2
              id="ar-reason-title"
              className="font-mono text-xs uppercase tracking-[0.14em] text-[#575551]"
            >
              Why it is unavailable
            </h2>
            <p className="text-sm text-[#575551] leading-relaxed">
              A 3D studio is published only when the vault holds a calibrated asset: recorded
              millimetre geometry and refraction data attached to the piece. That data has not
              been recorded for this reference, so there is no model to load.
            </p>
            <p className="text-sm text-[#575551] leading-relaxed">
              Calibrated WebAR assets currently registered:{' '}
              <span className="font-mono text-[#141413]">{registeredCount}</span>
              {registeredCount === 0
                ? ' — the vault holds none yet, so no AR link on the site can resolve.'
                : '.'}
            </p>
          </section>

          {/* 3. A clear next action */}
          <section aria-labelledby="ar-next-title" className="border-t border-[#E4E0D8] pt-6 space-y-3">
            <h2
              id="ar-next-title"
              className="font-mono text-xs uppercase tracking-[0.14em] text-[#575551]"
            >
              What to do next
            </h2>
            <p className="text-sm text-[#575551] leading-relaxed">
              Ask a gemologist to arrange a private viewing of the piece, or request calibrated
              imagery for this reference. Both are handled by the salon, not by this page.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#141413] text-[#F8F7F4] text-xs font-mono uppercase tracking-wider"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Speak to a gemologist
              </Link>
              <Link
                href="/varieties"
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-[#C9C3B6] text-[#141413] text-xs font-mono uppercase tracking-wider hover:border-[#1E3A5F]"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Explore the varieties
              </Link>
            </div>
          </section>

          {registeredCount > 0 ? (
            <section aria-labelledby="ar-available-title" className="border-t border-[#E4E0D8] pt-6 space-y-3">
              <h2
                id="ar-available-title"
                className="font-mono text-xs uppercase tracking-[0.14em] text-[#575551]"
              >
                Calibrated assets available for inspection
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {registered.map((item) => (
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
                    <span className="font-mono text-xs text-[#1E3A5F] uppercase">Open 3D →</span>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
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
