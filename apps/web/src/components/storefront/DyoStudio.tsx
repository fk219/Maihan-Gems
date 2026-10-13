'use client';

import { useMemo, useState } from 'react';

import { addToBag } from '../../lib/atelier-store.js';
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
  const [settingId, setSettingId] = useState<string | null>(settings[0]?.id ?? null);
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

  const accept = setting?.accepts.map((r) => `${r.shape} ${r.minCarat ?? 0}–${r.maxCarat ?? '∞'}ct`).join(' · ');

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

  return (
    <div className="lx-dyo">
      <ol className="lx-steps">
        {(['Setting', 'Stone', 'Finish'] as const).map((label, i) => {
          const n = (i + 1) as 1 | 2 | 3;
          return (
            <li key={label} className={step === n ? 'is-on' : step > n ? 'is-done' : ''}>
              <button type="button" onClick={() => setStep(n)} disabled={n === 2 && !setting} className="lx-steps__btn">
                <span>{n}</span>
                {label}
              </button>
            </li>
          );
        })}
      </ol>

      <div className="lx-dyo__grid">
        <div className="lx-dyo__stage">
          {step === 1 ? (
            <div className="lx-dyo__choices">
              {settings.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`lx-pick${settingId === item.id ? ' is-on' : ''}`}
                  onClick={() => chooseSetting(item.id)}
                >
                  <img src={imageFor(item)} alt="" />
                  <span className="lx-card__meta">{item.settingFor}</span>
                  <strong>{item.title}</strong>
                  <em>{formatMoney(item.priceUsd, currency, rates)}</em>
                </button>
              ))}
            </div>
          ) : null}

          {step === 2 ? (
            matches.length > 0 ? (
              <div className="lx-dyo__choices">
                {matches.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`lx-pick${stoneId === item.id ? ' is-on' : ''}`}
                    onClick={() => chooseStone(item.id)}
                  >
                    <img src={imageFor(item)} alt="" />
                    <span className="lx-card__meta">{item.originCountry}</span>
                    <strong>{item.title}</strong>
                    <em>{formatMoney(item.priceUsd, currency, rates)}</em>
                  </button>
                ))}
              </div>
            ) : (
              <p className="lx-lede">No vault stones currently satisfy this setting’s acceptance rules. Choose another mounting.</p>
            )
          ) : null}

          {step === 3 ? (
            <div className="lx-finish">
              <label>
                Metal
                <select value={metal} onChange={(e) => setMetal(e.target.value as (typeof METALS)[number])}>
                  {METALS.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </label>
              {setting?.settingFor === 'ring' ? (
                <label>
                  Ring size (US)
                  <select value={size} onChange={(e) => setSize(e.target.value)}>
                    {SIZES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
              ) : null}
              <p className="lx-lede">
                Compatibility follows the setting’s accepted shapes and carat range. Inferred identities are not manufactured here.
              </p>
            </div>
          ) : null}
        </div>

        <aside className="lx-preview">
          <span className="lx-kicker">Live preview</span>
          <div className="lx-preview__frame">
            {setting ? <img src={settingImage} alt={setting.title} className="is-setting" /> : null}
            {stone ? <img src={stoneImage} alt={stone.title} className="is-stone" /> : null}
            {!setting ? <p>Choose a setting to begin.</p> : null}
          </div>
          <dl className="lx-summary__rows">
            <div>
              <dt>Setting</dt>
              <dd>{setting ? formatMoney(setting.priceUsd, currency, rates) : '—'}</dd>
            </div>
            <div>
              <dt>Stone</dt>
              <dd>{stone ? formatMoney(stone.priceUsd, currency, rates) : '—'}</dd>
            </div>
            <div className="is-total">
              <dt>Combined</dt>
              <dd>{formatMoney(total, currency, rates)}</dd>
            </div>
          </dl>
          {accept ? <p className="lx-summary__note">Accepts {accept}</p> : null}
          <button
            type="button"
            className="lx-btn lx-btn--solid lx-btn--block"
            disabled={!setting || !stone}
            onClick={reserve}
          >
            {reserved ? 'Held in your bag' : 'Add composition to bag'}
          </button>
        </aside>
      </div>
    </div>
  );
}
