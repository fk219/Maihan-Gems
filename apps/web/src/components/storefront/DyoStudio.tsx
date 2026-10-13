'use client';

import { useEffect, useMemo, useState } from 'react';

import { addToBag, getBag, subscribeAtelier } from '../../lib/atelier-store.js';
import { cardToAtelier } from '../../lib/atelier-item.js';
import { formatMoney } from '../../lib/currency.js';
import { gemHexFor } from '../../lib/ngc/colors.js';
import {
  compatibleSettings,
  compatibleStones,
  pairingCaption,
  stoneFitStatus,
} from '../../lib/dyo-compat.js';
import { productImage } from '../../lib/storefront-images.js';
import type { SettingForDyo, StorefrontCard } from '../../lib/storefront-types.js';
import { JewelryConfiguratorCanvas, type MetalFinish } from '../configurator/JewelryConfiguratorCanvas.js';
import { VirtualTryOnModal } from '../webar/VirtualTryOnModal.js';
import { useStorefront } from './StorefrontProvider.js';

const METALS = ['18K Yellow Gold', '18K White Gold', '18K Rose Gold', 'Platinum'] as const;
const SIZES = ['5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9'];

function imageFor(product: StorefrontCard): string {
  return productImage({
    kind: product.kind,
    stoneType: product.stoneType,
    jewelryType: product.jewelryType,
    settingFor: product.settingFor,
    style: product.style,
    title: product.title,
    colorHue: product.colorHue,
    variety: product.variety,
    quantityType: product.quantityType,
    imageUrl: product.imageUrl,
  });
}

function metalFinishOf(name: (typeof METALS)[number]): MetalFinish {
  if (name.includes('White')) return 'WHITE_GOLD';
  if (name.includes('Rose')) return 'ROSE_GOLD';
  if (name.includes('Platinum')) return 'PLATINUM';
  return 'YELLOW_GOLD';
}

function syncQuery(settingId: string | null, stoneId: string | null) {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (settingId) url.searchParams.set('setting', settingId);
  else url.searchParams.delete('setting');
  if (stoneId) url.searchParams.set('stone', stoneId);
  else url.searchParams.delete('stone');
  window.history.replaceState(null, '', `${url.pathname}${url.search}`);
}

export function DyoStudio({
  settings,
  stones,
  initialSettingId = null,
  initialStoneId = null,
  initialTryOn = false,
}: {
  settings: SettingForDyo[];
  stones: StorefrontCard[];
  initialSettingId?: string | null;
  initialStoneId?: string | null;
  initialTryOn?: boolean;
}) {
  const { currency, rates } = useStorefront();
  const [settingId, setSettingId] = useState<string | null>(initialSettingId);
  const [stoneId, setStoneId] = useState<string | null>(initialStoneId);
  const [metal, setMetal] = useState<(typeof METALS)[number]>('18K Yellow Gold');
  const [size, setSize] = useState('6.5');
  const [reserved, setReserved] = useState(false);
  const [tryOn, setTryOn] = useState(initialTryOn);

  const lockedStone = stones.find((row) => row.id === initialStoneId) ?? null;
  const settingList = useMemo(
    () => compatibleSettings(settingId ? null : lockedStone, settings),
    [lockedStone, settingId, settings],
  );
  const setting = settings.find((row) => row.id === settingId) ?? null;
  const matches = useMemo(() => compatibleStones(setting, stones), [setting, stones]);
  const stone = (setting ? matches : stones).find((row) => row.id === stoneId) ?? null;
  const fit = setting && stone ? stoneFitStatus(setting, stone) : null;
  const step: 1 | 2 | 3 = stone && setting ? 3 : setting ? 2 : 1;
  const [panel, setPanel] = useState<1 | 2 | 3>(step);

  useEffect(() => {
    setPanel(step);
  }, [step]);

  const total = (setting?.priceUsd ?? 0) + (stone?.priceUsd ?? 0);
  const settingImage = setting ? imageFor(setting) : '';
  const stoneImage = stone ? imageFor(stone) : '';
  const accept = setting?.accepts.map((r) => `${r.shape} ${r.minCarat ?? 0}–${r.maxCarat ?? '∞'}ct`).join(' · ');
  const compositionId = setting && stone ? `dyo-${setting.id}-${stone.id}` : null;
  const caption = pairingCaption(setting, stone, metal);

  useEffect(() => {
    syncQuery(settingId, stoneId);
  }, [settingId, stoneId]);

  useEffect(() => {
    const sync = () => {
      if (compositionId) setReserved(getBag().some((row) => row.id === compositionId));
    };
    sync();
    return subscribeAtelier(sync);
  }, [compositionId]);

  function chooseSetting(id: string) {
    setSettingId(id);
    setStoneId(null);
    setPanel(2);
  }

  function chooseStone(id: string) {
    setStoneId(id);
    setPanel(3);
  }

  function reserve() {
    if (!setting || !stone) return;
    addToBag({
      ...cardToAtelier(setting),
      id: `dyo-${setting.id}-${stone.id}`,
      slug: setting.slug,
      title: `${setting.title} × ${stone.title}`,
      priceUsd: total,
      specs: `${stone.caratTotal ?? ''} ct · ${metal}${setting.settingFor === 'ring' ? ` · US ${size}` : ''}`,
    });
    setReserved(true);
  }

  const swatches = [
    { name: '18K Yellow Gold' as const, color: '#C9A84C' },
    { name: '18K White Gold' as const, color: '#FAFAF8' },
    { name: '18K Rose Gold' as const, color: '#EA580C' },
    { name: 'Platinum' as const, color: '#8A867E' },
  ];

  return (
    <div className="atelier">
      <header className="atelier__head">
        <div>
          <p className="atelier__kicker">Bespoke</p>
          <h1>Design your own</h1>
          <p>
            Choose a mounting, then a stone it will hold. Compatibility follows the seat’s shape and carat band.
            The live preview is a faceted studio render.
          </p>
        </div>
        <ol className="atelier__steps">
          {(['Setting', 'Stone', 'Finish'] as const).map((label, i) => {
            const n = (i + 1) as 1 | 2 | 3;
            return (
              <li key={label} className={panel === n ? 'is-on' : panel > n ? 'is-done' : ''}>
                <button type="button" onClick={() => setPanel(n)} disabled={(n === 2 && !setting) || (n === 3 && !stone)}>
                  <span>{n}</span>
                  {label}
                </button>
              </li>
            );
          })}
        </ol>
      </header>

      <div className="atelier__layout">
        <section className="atelier__stage" aria-live="polite">
          {panel === 1 ? (
            settingList.length === 0 ? (
              <p className="atelier__empty">No settings currently accept this stone.</p>
            ) : (
              <div className="atelier__grid">
                {settingList.map((item) => (
                  <button key={item.id} type="button" className={`atelier-card${settingId === item.id ? ' is-on' : ''}`} onClick={() => chooseSetting(item.id)}>
                    <span className="atelier-card__media"><img src={imageFor(item)} alt="" /></span>
                    <span className="atelier-card__kicker">{item.settingFor}</span>
                    <strong>{item.title}</strong>
                    <em>{formatMoney(item.priceUsd, currency, rates)}</em>
                  </button>
                ))}
              </div>
            )
          ) : null}

          {panel === 2 ? (
            matches.length > 0 ? (
              <div className="atelier__grid">
                {matches.map((item) => {
                  const status = setting ? stoneFitStatus(setting, item) : 'fits';
                  return (
                    <button key={item.id} type="button" className={`atelier-card${stoneId === item.id ? ' is-on' : ''}`} onClick={() => chooseStone(item.id)}>
                      <span className="atelier-card__media"><img src={imageFor(item)} alt="" /></span>
                      <span className="atelier-card__kicker">{[item.caratTotal ? `${item.caratTotal} ct` : null, item.shape, item.originCountry].filter(Boolean).join(' · ')}</span>
                      <strong>{item.title}</strong>
                      <em>{formatMoney(item.priceUsd, currency, rates)}</em>
                      <span className={`atelier-card__fit${status === 'needs_review' ? ' is-review' : ''}`}>
                        {status === 'needs_review' ? 'Needs review' : 'Fits'}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="atelier__empty">No stones currently fit this mounting. Go back and choose another setting.</p>
            )
          ) : null}

          {panel === 3 ? (
            <div className="atelier__finish">
              <p className="atelier__kicker">Metal</p>
              <div className="atelier__metals">
                {swatches.map((item) => (
                  <button key={item.name} type="button" className={metal === item.name ? 'is-on' : ''} onClick={() => setMetal(item.name)}>
                    <i style={{ background: item.color }} />
                    {item.name}
                  </button>
                ))}
              </div>
              {setting?.settingFor === 'ring' ? (
                <>
                  <p className="atelier__kicker">Ring size, US</p>
                  <div className="atelier__sizes">
                    {SIZES.map((value) => (
                      <button key={value} type="button" className={size === value ? 'is-on' : ''} onClick={() => setSize(value)}>{value}</button>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          ) : null}
        </section>

        <aside className="atelier__preview">
          <p className="atelier__kicker">Live preview</p>
          <div className="atelier__hero">
            {setting || stone ? (
              <JewelryConfiguratorCanvas
                mode={setting ? 'mounted' : 'stone'}
                metal={metalFinishOf(metal)}
                stone={
                  stone
                    ? {
                        shape: stone.shape ?? 'Round',
                        carat: stone.caratTotal ?? 1,
                        color: gemHexFor(stone.colorHue, stone.stoneType),
                        lengthMm: stone.lengthMm,
                        widthMm: stone.widthMm,
                        stoneType: stone.stoneType,
                      }
                    : null
                }
                label={stone && setting ? `${stone.title} in ${setting.title}` : 'Studio preview'}
              />
            ) : (
              <p>Select a setting</p>
            )}
          </div>
          <p className="atelier__caption">{caption}</p>
          <div className="atelier__thumbs">
            <figure>{settingImage ? <img src={settingImage} alt="" /> : <span />}<figcaption>{setting?.title ?? 'Setting'}</figcaption></figure>
            <figure>{stoneImage ? <img src={stoneImage} alt="" /> : <span />}<figcaption>{stone?.title ?? 'Stone'}</figcaption></figure>
          </div>
          <p className="atelier__kicker">Metal</p>
          <div className="atelier__metals">
            {swatches.map((item) => (
              <button key={`preview-${item.name}`} type="button" className={metal === item.name ? 'is-on' : ''} onClick={() => setMetal(item.name)}>
                <i style={{ background: item.color }} />
                {item.name}
              </button>
            ))}
          </div>
          <dl>
            <div><dt>Setting</dt><dd>{setting ? formatMoney(setting.priceUsd, currency, rates) : '—'}</dd></div>
            <div><dt>Stone</dt><dd>{stone ? formatMoney(stone.priceUsd, currency, rates) : '—'}</dd></div>
            <div className="is-total"><dt>{metal}{setting?.settingFor === 'ring' ? ` · US ${size}` : ''}</dt><dd>{formatMoney(total, currency, rates)}</dd></div>
          </dl>
          {accept ? <p className="atelier__note">Accepts {accept}</p> : null}
          {fit === 'needs_review' ? (
            <p className="atelier__note">
              This pairing sits near the seat’s size band. A jeweller will review the prongs before the piece is made.
            </p>
          ) : null}
          {fit === 'fits' ? <p className="atelier__fit">Compatible — shape and carat sit inside the seat.</p> : null}
          <button type="button" className="atelier__bag" disabled={!setting || !stone} onClick={reserve}>
            {reserved ? 'Held in your bag' : 'Add to bag'}
          </button>
          <button type="button" className="atelier__try" disabled={!setting || !stone} onClick={() => setTryOn(true)}>
            Virtual try-on
          </button>
        </aside>
      </div>
      <VirtualTryOnModal
        open={tryOn}
        onClose={() => setTryOn(false)}
        metal={metalFinishOf(metal)}
        carat={stone?.caratTotal ?? 1}
        title="Try on your design"
        mode={setting?.settingFor === 'earrings' ? 'ear' : setting?.settingFor === 'pendant' ? 'neck' : 'hand'}
        sharePath={`/design-your-own?setting=${setting?.id ?? ''}&stone=${stone?.id ?? ''}&tryon=1`}
      />
    </div>
  );
}
