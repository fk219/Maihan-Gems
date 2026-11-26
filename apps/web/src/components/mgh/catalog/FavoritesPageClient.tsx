'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart } from 'lucide-react';
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" aria-busy="true">
        {[0, 1, 2].map((index) => (
          <div key={index} className="portal-card" style={{ height: 380 }} />
        ))}
      </div>
    );
  }

  if (stones.length === 0) {
    return (
      <div className="portal-card portal-empty">
        <div className="portal-empty__mark"><Heart /></div>
        <p className="portal-empty__title">No saved specimens</p>
        <p className="portal-empty__sub">Tap the heart on any stone to keep it in this private shortlist.</p>
        <div className="portal-inline" style={{ justifyContent: 'center', marginTop: 16 }}>
          <Link href="/browse" className="portal-btn portal-btn--gold">Explore gemstones</Link>
          <Link href="/settings" className="portal-btn portal-btn--ghost">Browse settings</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="portal-section">
      <div className="portal-inline" style={{ justifyContent: 'space-between' }}>
        <p className="portal-card__sub">{stones.length} saved piece(s) on this device</p>
        <span className="portal-badge portal-badge--active">{favorites.length} in tray</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stones.map((stone) => (
          <ProductCard key={stone.id} stone={stone} />
        ))}
      </div>
    </div>
  );
}
