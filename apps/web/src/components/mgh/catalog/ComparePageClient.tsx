'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Scale, Trash2 } from 'lucide-react';
import { useStorefront } from '@/components/mgh/providers/StorefrontProvider';
import { fetchFavoriteStones } from '@/lib/mgh/favorites-client';
import { fetchCompareSettings, type CompareSetting } from '@/lib/mgh/compare-client';
import type { GemstoneItem } from '@/lib/mgh/fixtures/types';

const money = (v: number, cur: string): string =>
  v > 0 ? `$${v.toLocaleString('en-US')} ${cur || 'USD'}` : 'Price on request';

const caratRange = (s: CompareSetting): string => {
  if (s.minCt == null && s.maxCt == null) return '—';
  if (s.minCt != null && s.maxCt != null) return `${s.minCt}–${s.maxCt} ct`;
  return `${s.minCt ?? s.maxCt} ct`;
};

export function ComparePageClient() {
  const { compareList, toggleCompare, clearCompare } = useStorefront();
  const [gems, setGems] = useState<GemstoneItem[] | null>(null);
  const [settings, setSettings] = useState<CompareSetting[] | null>(null);

  const gemRefs = useMemo(() => compareList.filter((id) => !id.startsWith('S-') && !id.startsWith('J-')), [compareList]);
  const settingRefs = useMemo(() => compareList.filter((id) => id.startsWith('S-')), [compareList]);

  useEffect(() => {
    let alive = true;
    void Promise.all([fetchFavoriteStones(gemRefs), fetchCompareSettings(settingRefs)])
      .then(([g, s]) => {
        if (!alive) return;
        setGems(g);
        setSettings(s);
      })
      .catch(() => {
        if (!alive) return;
        setGems([]);
        setSettings([]);
      });
    return () => { alive = false; };
  }, [gemRefs, settingRefs]);

  const loading = gems === null || settings === null;
  const total = (gems?.length ?? 0) + (settings?.length ?? 0);

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="h-48 rounded-sm border border-[#E4DFD5] bg-white animate-pulse" />
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="rounded-sm border border-[#E4DFD5] bg-white p-12 text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[#D4AF37]/40 bg-[#FCF8EC]">
          <Scale className="h-5 w-5 text-[#9A7B2C]" />
        </div>
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[#121211]">
          Nothing on the comparison table yet.
        </h2>
        <p className="text-sm text-[#4E4C47]">
          Add up to four stones or settings with the scales icon to read them side by side.
        </p>
        <div className="pt-2 flex flex-wrap justify-center gap-3">
          <Link href="/browse" className="inline-flex items-center px-5 py-2.5 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider font-semibold gold-gradient-cta rounded-sm">
            Browse Gemstones
          </Link>
          <Link href="/settings" className="inline-flex items-center px-5 py-2.5 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider font-semibold border border-[#E4DFD5] text-[#121211] rounded-sm hover:border-[#D4AF37] transition-colors">
            Browse Settings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={clearCompare}
          className="inline-flex items-center gap-1.5 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider text-[#76726A] hover:text-[#9B3A2A] transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" /> Clear comparison
        </button>
      </div>

      {gems && gems.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-[family-name:var(--font-eb-garamond)] text-2xl font-normal text-[#121211]">Loose Gemstones</h2>
          <div className="overflow-x-auto rounded-sm border border-[#E4DFD5] bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#E4DFD5] text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-[0.16em] text-[#76726A]">
                  <th className="px-5 py-3 font-medium">Piece</th>
                  <th className="px-5 py-3 font-medium">Variety</th>
                  <th className="px-5 py-3 font-medium">Carat</th>
                  <th className="px-5 py-3 font-medium">Shape</th>
                  <th className="px-5 py-3 font-medium">Origin</th>
                  <th className="px-5 py-3 font-medium text-right">Price</th>
                  <th className="px-5 py-3 font-medium text-right"> </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EBE0]">
                {gems.map((stone) => (
                  <tr key={stone.id} className="hover:bg-[#FBF7EC] transition-colors">
                    <td className="px-5 py-4">
                      <Link href={`/product/${stone.slug}`} className="font-medium text-[#1A1612] hover:underline">
                        {stone.name}
                      </Link>
                      <span className="block font-[family-name:var(--font-mono)] text-[10px] text-[#9A7B2C]">{stone.sku}</span>
                    </td>
                    <td className="px-5 py-4 text-[#3D362C]">{stone.variety}</td>
                    <td className="px-5 py-4 tabular-nums text-[#3D362C]">{stone.carat > 0 ? `${stone.carat.toFixed(2)} ct` : '—'}</td>
                    <td className="px-5 py-4 text-[#3D362C]">{stone.shape ?? 'Not evidenced'}</td>
                    <td className="px-5 py-4 text-[#3D362C]">{stone.origin || '—'}</td>
                    <td className="px-5 py-4 text-right tabular-nums text-[#9A7B2C]">{money(stone.price, stone.currency)}</td>
                    <td className="px-5 py-4 text-right">
                      <button type="button" onClick={() => toggleCompare(stone.id)} aria-label={`Remove ${stone.name} from comparison`} className="p-1 text-[#A39E93] hover:text-[#9B3A2A] transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {settings && settings.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-[family-name:var(--font-eb-garamond)] text-2xl font-normal text-[#121211]">Settings</h2>
          <div className="overflow-x-auto rounded-sm border border-[#E4DFD5] bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#E4DFD5] text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-[0.16em] text-[#76726A]">
                  <th className="px-5 py-3 font-medium">Setting</th>
                  <th className="px-5 py-3 font-medium">Jewellery</th>
                  <th className="px-5 py-3 font-medium">Metal</th>
                  <th className="px-5 py-3 font-medium">Style</th>
                  <th className="px-5 py-3 font-medium">Carat range</th>
                  <th className="px-5 py-3 font-medium">Compatible cuts</th>
                  <th className="px-5 py-3 font-medium text-right">Price</th>
                  <th className="px-5 py-3 font-medium text-right"> </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EBE0]">
                {settings.map((setting) => (
                  <tr key={setting.ref} className="hover:bg-[#FBF7EC] transition-colors">
                    <td className="px-5 py-4">
                      <Link href={`/settings/${setting.ref}`} className="font-medium text-[#1A1612] hover:underline">
                        {setting.name}
                      </Link>
                      <span className="block font-[family-name:var(--font-mono)] text-[10px] text-[#9A7B2C]">{setting.ref}</span>
                    </td>
                    <td className="px-5 py-4 text-[#3D362C]">{setting.jewelleryType}</td>
                    <td className="px-5 py-4 text-[#3D362C]">{setting.metal}</td>
                    <td className="px-5 py-4 text-[#3D362C]">{setting.style ?? '—'}</td>
                    <td className="px-5 py-4 text-[#3D362C]">{caratRange(setting)}</td>
                    <td className="px-5 py-4 text-[#3D362C]">{setting.compatibleShapes.length ? setting.compatibleShapes.join(', ') : '—'}</td>
                    <td className="px-5 py-4 text-right tabular-nums text-[#9A7B2C]">{money(setting.price, setting.currency)}</td>
                    <td className="px-5 py-4 text-right">
                      <button type="button" onClick={() => toggleCompare(setting.ref)} aria-label={`Remove ${setting.name} from comparison`} className="p-1 text-[#A39E93] hover:text-[#9B3A2A] transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
