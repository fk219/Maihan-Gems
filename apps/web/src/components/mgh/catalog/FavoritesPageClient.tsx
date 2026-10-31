'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useStorefront } from '@/components/mgh/providers/StorefrontProvider';
import { fetchFavoriteStones } from '@/lib/mgh/favorites-client';
import type { GemstoneItem } from '@/lib/mgh/fixtures/types';
import { ProductCard } from './ProductCard';

export function FavoritesPageClient() {
  const { favorites } = useStorefront();
  const [stones, setStones] = useState<GemstoneItem[] | null>(null);

  useEffect(() => {
    let alive = true;
    void fetchFavoriteStones(favorites)
      .then((items) => { if (alive) setStones(items); })
      .catch(() => { if (alive) setStones([]); });
    return () => { alive = false; };
  }, [favorites]);

  if (stones === null) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-sm border border-[#E4DFD5] bg-white h-96 animate-pulse" />
        ))}
      </div>
    );
  }

  if (stones.length === 0) {
    return (
      <div className="rounded-sm border border-[#E4DFD5] bg-white p-12 text-center space-y-4">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[#121211]">
          No saved specimens in your curation tray.
        </h2>
        <p className="text-sm text-[#4E4C47]">
          Tap the heart on any stone to keep it in this private shortlist.
        </p>
        <div className="pt-2">
          <Link
            href="/browse"
            className="inline-flex items-center px-5 py-2.5 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider font-semibold gold-gradient-cta rounded-sm"
          >
            Explore Gemstones
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
      {stones.map((stone) => (
        <ProductCard key={stone.id} stone={stone} />
      ))}
    </div>
  );
}
