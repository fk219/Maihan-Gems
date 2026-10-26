'use client';

import Link from 'next/link';
import { useStorefront } from '@/components/mgh/providers/StorefrontProvider';
import { getAllGemstones } from '@/lib/mgh/storefront-data';
import { ProductCard } from './ProductCard';

export function FavoritesPageClient() {
  const { favorites } = useStorefront();
  const stones = getAllGemstones().filter((s) => favorites.includes(s.id));

  if (stones.length === 0) {
    return (
      <div className="rounded-sm border border-[#E4DFD5] bg-white p-12 text-center space-y-4">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[#121211]">
          No saved specimens in your curation tray.
        </h2>
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
