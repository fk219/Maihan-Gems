'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowLeft, Smartphone } from 'lucide-react';
import type { WebArAssetRecord } from '@/lib/mgh/fixtures/types';

const ThreeGemstoneStudio = dynamic(
  () => import('@/components/mgh/ar/ThreeGemstoneStudio'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[calc(100vh-4rem)] min-h-[560px] bg-[#171614] text-[#F8F7F4] flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#B89758]">
            Initializing Optical Scene
          </p>
          <p className="font-serif text-2xl">Loading 3D Gemstone Chamber…</p>
        </div>
      </div>
    ),
  }
);

interface ArViewerPageClientProps {
  asset: WebArAssetRecord;
  handoffToken: string | null;
  backHref: string;
}

export default function ArViewerPageClient({
  asset,
  handoffToken,
  backHref,
}: ArViewerPageClientProps) {
  return (
    <div className="min-h-screen bg-[#141413] text-[#F8F7F4] flex flex-col">
      <header className="h-16 px-4 sm:px-8 border-b border-[#2E2D2A] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#C7C3B8] hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Lot Dossier
          </Link>
          <span className="text-[#2E2D2A]">|</span>
          <h1 className="font-serif text-lg sm:text-xl truncate">
            WebAR &amp; 3D Studio: {asset.title}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {handoffToken && (
            <Link
              href={`/ar/handoff/${handoffToken}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono uppercase tracking-wider bg-[#1E3A5F] text-white rounded-sm hover:bg-[#162C49]"
            >
              <Smartphone className="w-3.5 h-3.5" />
              Mobile Handoff
            </Link>
          )}
        </div>
      </header>

      <main id="main-content" className="flex-1">
        <ThreeGemstoneStudio asset={asset} />
      </main>
    </div>
  );
}
