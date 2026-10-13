'use client';

import { useEffect, useMemo, useState } from 'react';

import { addToBag, getBag, subscribeAtelier } from '../../lib/atelier-store.js';
import { cardToAtelier } from '../../lib/atelier-item.js';
import { formatMoney } from '../../lib/currency.js';
import { compatibleStones } from '../../lib/dyo-compat.js';
import { productImage } from '../../lib/storefront-images.js';
import type { SettingForDyo, StorefrontCard } from '../../lib/storefront-types.js';
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

export function DyoStudio({
  settings,
  stones,
}: {
  settings: SettingForDyo[];
  stones: StorefrontCard[];
}) {
  const { currency, rates } = useStorefront();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [settingId, setSettingId] = useState<string | null>(null);
  const [stoneId, setStoneId] = useState<string | null>(null);
  const [metal, setMetal] = useState<(typeof METALS)[number]>('18K Yellow Gold');
  const [size, setSize] = useState('6.5');
  const [reserved, setReserved] = useState(false);

  const setting = settings.find((s) => s.id === settingId) ?? null;
  const matches = useMemo(() => compatibleStones(setting, stones), [setting, stones]);
  const stone = matches.find((s) => s.id === stoneId) ?? null;
  const total = (setting?.priceUsd ?? 0) + (stone?.priceUsd ?? 0);
  const settingImage = setting ? imageFor(setting) : '';
  const stoneImage = stone ? imageFor(stone) : '';
  const finishedImage = setting && stone
    ? productImage({
        kind: 'jewelry',
        jewelryType: setting.settingFor,
        settingFor: setting.settingFor,
        stoneType: stone.stoneType,
        title: `${stone.title} ${setting.title}`,
        colorHue: stone.colorHue,
        variety: stone.variety,
        quantityType: stone.quantityType,
      })
    : settingImage;

  const accept = setting?.accepts.map((r) => `${r.shape} ${r.minCarat ?? 0}–${r.maxCarat ?? '∞'}ct`).join(' · ');
  const compositionId = setting && stone ? `dyo-${setting.id}-${stone.id}` : null;

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
    setStep(2);
  }

  function chooseStone(id: string) {
    setStoneId(id);
    setStep(3);
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

  const needsReview = Boolean(stone && setting && ((stone.caratTotal ?? 0) > 5 || (setting.settingFor === 'earrings' && stone.quantityType !== 'pair')));
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
          <p>Choose a mounting, then a stone it will hold, then metal and size. The preview uses those catalogue photographs.</p>
        </div>
        <ol className="atelier__steps">
          {(['Setting', 'Stone', 'Finish'] as const).map((label, i) => {
            const n = (i + 1) as 1 | 2 | 3;
            return (
              <li key={label} className={step === n ? 'is-on' : step > n ? 'is-done' : ''}>
                <button type="button" onClick={() => setStep(n)} disabled={(n === 2 && !setting) || (n === 3 && !stone)}>
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
          {step === 1 ? (
            settings.length === 0 ? (
              <p className="atelier__empty">No settings are in the catalogue yet.</p>
            ) : (
              <div className="atelier__grid">
                {settings.map((item) => (
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

          {step === 2 ? (
            matches.length > 0 ? (
              <div className="atelier__grid">
                {matches.map((item) => (
                  <button key={item.id} type="button" className={`atelier-card${stoneId === item.id ? ' is-on' : ''}`} onClick={() => chooseStone(item.id)}>
                    <span className="atelier-card__media"><img src={imageFor(item)} alt="" /></span>
                    <span className="atelier-card__kicker">{[item.caratTotal ? `${item.caratTotal} ct` : null, item.shape, item.originCountry].filter(Boolean).join(' · ')}</span>
                    <strong>{item.title}</strong>
                    <em>{formatMoney(item.priceUsd, currency, rates)}</em>
                  </button>
                ))}
              </div>
            ) : (
              <p className="atelier__empty">No stones currently fit this mounting. Go back and choose another setting.</p>
            )
          ) : null}

          {step === 3 ? (
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
            {finishedImage ? <img src={finishedImage} alt={stone && setting ? `${stone.title} with ${setting.title}` : 'Your design'} /> : <p>Select a setting</p>}
          </div>
          <div className="atelier__thumbs">
            <figure>{settingImage ? <img src={settingImage} alt="" /> : <span />}<figcaption>{setting?.title ?? 'Setting'}</figcaption></figure>
            <figure>{stoneImage ? <img src={stoneImage} alt="" /> : <span />}<figcaption>{stone?.title ?? 'Stone'}</figcaption></figure>
          </div>
          <dl>
            <div><dt>Setting</dt><dd>{setting ? formatMoney(setting.priceUsd, currency, rates) : '—'}</dd></div>
            <div><dt>Stone</dt><dd>{stone ? formatMoney(stone.priceUsd, currency, rates) : '—'}</dd></div>
            <div className="is-total"><dt>{metal}{setting?.settingFor === 'ring' ? ` · US ${size}` : ''}</dt><dd>{formatMoney(total, currency, rates)}</dd></div>
          </dl>
          {accept ? <p className="atelier__note">Accepts {accept}</p> : null}
          {needsReview ? (
            <p className="atelier__note">
              This pairing sits near the seat’s size band. A jeweller will review the prongs before the piece is made.
            </p>
          ) : null}
          <button type="button" className="atelier__bag" disabled={!setting || !stone} onClick={reserve}>
            {reserved ? 'Held in your bag' : 'Add to bag'}
          </button>
        </aside>
      </div>
    </div>
  );
}
