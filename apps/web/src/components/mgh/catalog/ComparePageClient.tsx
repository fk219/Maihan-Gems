'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Scale, Trash2 } from 'lucide-react';
import { useStorefront } from '@/components/mgh/providers/StorefrontProvider';
import { fetchFavoriteStones } from '@/lib/mgh/favorites-client';
import { fetchCompareSettings, type CompareSetting } from '@/lib/mgh/compare-client';
import type { GemstoneItem } from '@/lib/mgh/fixtures/types';

const money = (value: number, currency: string): string =>
  value > 0 ? `$${value.toLocaleString('en-US')} ${currency || 'USD'}` : 'Price on request';

const caratRange = (setting: CompareSetting): string => {
  if (setting.minCt == null && setting.maxCt == null) return '—';
  if (setting.minCt != null && setting.maxCt != null) return `${setting.minCt}–${setting.maxCt} ct`;
  return `${setting.minCt ?? setting.maxCt} ct`;
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
      .then(([gemstoneItems, settingItems]) => {
        if (!alive) return;
        setGems(gemstoneItems);
        setSettings(settingItems);
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
      <div className="portal-card portal-card--pad" style={{ minHeight: 220 }} aria-busy="true">
        <div className="portal-empty">
          <div className="portal-empty__mark"><Scale /></div>
          <p className="portal-empty__title">Reading the dossier</p>
          <p className="portal-empty__sub">Gathering the comparison table.</p>
        </div>
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="portal-card portal-empty">
        <div className="portal-empty__mark"><Scale /></div>
        <p className="portal-empty__title">Nothing on the comparison table</p>
        <p className="portal-empty__sub">Add up to four stones or settings with the scales icon to read them side by side.</p>
        <div className="portal-inline" style={{ justifyContent: 'center', marginTop: 16 }}>
          <Link href="/browse" className="portal-btn portal-btn--gold">Browse gemstones</Link>
          <Link href="/settings" className="portal-btn portal-btn--ghost">Browse settings</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="portal-section">
      <div className="portal-inline" style={{ justifyContent: 'space-between' }}>
        <p className="portal-card__sub">{total} piece(s) on the table</p>
        <button type="button" onClick={clearCompare} className="portal-btn portal-btn--ghost portal-btn--sm">
          <Trash2 /> Clear comparison
        </button>
      </div>

      {gems && gems.length > 0 ? (
        <section className="portal-card portal-table-wrap">
          <header className="portal-card__head" style={{ padding: '18px 18px 0' }}>
            <div>
              <h2 className="portal-card__title">Loose gemstones</h2>
              <p className="portal-card__sub">Carat, origin and price, read side by side</p>
            </div>
          </header>
          <table className="portal-table">
            <thead>
              <tr><th>Piece</th><th>Variety</th><th>Carat</th><th>Shape</th><th>Origin</th><th className="num">Price</th><th className="num"> </th></tr>
            </thead>
            <tbody>
              {gems.map((stone) => (
                <tr key={stone.id}>
                  <td>
                    <Link href={`/product/${stone.slug}`} className="strong">{stone.name}</Link>
                    <span className="dim">{stone.sku}</span>
                  </td>
                  <td>{stone.variety}</td>
                  <td>{stone.carat > 0 ? `${stone.carat.toFixed(2)} ct` : '—'}</td>
                  <td>{stone.shape ?? 'Not evidenced'}</td>
                  <td>{stone.origin || '—'}</td>
                  <td className="num strong">{money(stone.price, stone.currency)}</td>
                  <td className="num">
                    <button type="button" onClick={() => toggleCompare(stone.id)} aria-label={`Remove ${stone.name} from comparison`} className="portal-btn portal-btn--danger portal-btn--icon portal-btn--sm">
                      <Trash2 />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {settings && settings.length > 0 ? (
        <section className="portal-card portal-table-wrap">
          <header className="portal-card__head" style={{ padding: '18px 18px 0' }}>
            <div>
              <h2 className="portal-card__title">Settings</h2>
              <p className="portal-card__sub">Metal, style and compatible cuts</p>
            </div>
          </header>
          <table className="portal-table">
            <thead>
              <tr><th>Setting</th><th>Jewellery</th><th>Metal</th><th>Style</th><th>Carat range</th><th>Compatible cuts</th><th className="num">Price</th><th className="num"> </th></tr>
            </thead>
            <tbody>
              {settings.map((setting) => (
                <tr key={setting.ref}>
                  <td>
                    <Link href={`/settings/${setting.ref}`} className="strong">{setting.name}</Link>
                    <span className="dim">{setting.ref}</span>
                  </td>
                  <td>{setting.jewelleryType}</td>
                  <td>{setting.metal}</td>
                  <td>{setting.style ?? '—'}</td>
                  <td>{caratRange(setting)}</td>
                  <td>{setting.compatibleShapes.length ? setting.compatibleShapes.join(', ') : '—'}</td>
                  <td className="num strong">{money(setting.price, setting.currency)}</td>
                  <td className="num">
                    <button type="button" onClick={() => toggleCompare(setting.ref)} aria-label={`Remove ${setting.name} from comparison`} className="portal-btn portal-btn--danger portal-btn--icon portal-btn--sm">
                      <Trash2 />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </div>
  );
}
