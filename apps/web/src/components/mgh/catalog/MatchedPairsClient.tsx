'use client';

import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import type { MatchedPairItem, SettingItem } from '@/lib/mgh/fixtures';
import { ProductCard } from '@/components/mgh/ProductCard';

export function MatchedPairsClient({
  pairs,
  earringSettings,
}: {
  pairs: MatchedPairItem[];
  earringSettings: SettingItem[];
}) {
  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-[#D4AF37]/30 bg-[#0A0A0B] text-[#F7F5F0] px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-4 w-4 text-[#D4AF37] shrink-0" />
          <p className="text-sm font-[family-name:var(--font-eb-garamond)] text-[#C8C3B8]">
            <strong className="text-[#E6C97A]">Note:</strong> Matched stone pairs are made for earrings (`SET-EAR-DROP-04` or `SET-EAR-STUD-05`) so both stones stay together.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {earringSettings.map((es) => (
            <Link
              key={es.sku}
              href={`/settings/${es.sku}`}
              className="px-3.5 py-1.5 text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-wider border border-white/20 text-white rounded-full hover:border-[#D4AF37] hover:text-[#E6C97A] transition-colors"
            >
              {es.sku === 'SET-EAR-DROP-04' ? 'Drop Earring Setting' : 'Stud Earring Setting'}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {pairs.map((pair) => (
          <ProductCard
            key={pair.id}
            category={`Earring Pair · ${pair.origin}`}
            name={pair.name}
            material={`Natural ${pair.variety}`}
            carat={`${pair.totalCarat.toFixed(2)} CT`}
            price={pair.price}
            image={pair.images[0]}
            href={`/settings/SET-EAR-DROP-04`}
          />
        ))}
      </div>
    </div>
  );
}
