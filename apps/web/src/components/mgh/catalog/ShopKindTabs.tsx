'use client';

import { useState } from 'react';
import type { GemstoneItem, MatchedPairItem, SettingItem } from '@/lib/mgh/fixtures';
import { CollectionExplorer } from './CollectionExplorer';
import { ProductCard } from '@/components/mgh/ProductCard';

export function ShopKindTabs({
  stones,
  pairs,
  settings,
}: {
  stones: GemstoneItem[];
  pairs: MatchedPairItem[];
  settings: SettingItem[];
}) {
  const [activeKind, setActiveKind] = useState<'stones' | 'pairs' | 'jewellery'>('stones');

  return (
    <div className="space-y-8">
      {/* Category Selector */}
      <div
        role="tablist"
        aria-label="Shop categories"
        className="inline-flex rounded-full border border-[#E4DFD5] bg-white p-1 gap-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeKind === 'stones'}
          onClick={() => setActiveKind('stones')}
          className={`px-5 py-2 text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-wider rounded-full transition-colors whitespace-nowrap ${
            activeKind === 'stones'
              ? 'bg-[#0A0A0B] text-[#E6C97A] font-semibold'
              : 'text-[#4E4C47] hover:text-[#121211]'
          }`}
        >
          Gemstones ({stones.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeKind === 'pairs'}
          onClick={() => setActiveKind('pairs')}
          className={`px-5 py-2 text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-wider rounded-full transition-colors whitespace-nowrap ${
            activeKind === 'pairs'
              ? 'bg-[#0A0A0B] text-[#E6C97A] font-semibold'
              : 'text-[#4E4C47] hover:text-[#121211]'
          }`}
        >
          Earring Pairs ({pairs.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeKind === 'jewellery'}
          onClick={() => setActiveKind('jewellery')}
          className={`px-5 py-2 text-xs font-[family-name:var(--font-eb-garamond)] uppercase tracking-wider rounded-full transition-colors whitespace-nowrap ${
            activeKind === 'jewellery'
              ? 'bg-[#0A0A0B] text-[#E6C97A] font-semibold'
              : 'text-[#4E4C47] hover:text-[#121211]'
          }`}
        >
          Settings ({settings.length})
        </button>
      </div>

      {activeKind === 'stones' && <CollectionExplorer initialItems={stones} />}

      {activeKind === 'pairs' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-[#D4AF37]/30 bg-[#0A0A0B] text-[#E6C97A] px-4 py-3 text-sm font-[family-name:var(--font-eb-garamond)]">
            Matched gemstone pairs are designed for earrings only.
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
                href="/settings/SET-EAR-DROP-04"
              />
            ))}
          </div>
        </div>
      )}

      {activeKind === 'jewellery' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {settings.map((setting) => (
            <ProductCard
              key={setting.sku}
              category={setting.category}
              name={setting.name}
              material="Platinum & 18k Gold"
              carat={setting.style}
              price={setting.basePrice}
              image={setting.images[0]}
              href={`/settings/${setting.sku}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
