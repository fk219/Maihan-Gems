'use client';

import { useEffect, useMemo, useState } from 'react';

import { formatMoney } from '../../lib/currency.js';
import { gemHexFor } from '../../lib/ngc/colors.js';
import {
  compatibleSettings,
  compatibleStones,
  pairingCaption,
  settingSeatLabel,
  stoneFitStatus,
} from '../../lib/dyo-compat.js';
import { productImage } from '../../lib/storefront-images.js';
import type { SettingForDyo, StorefrontCard } from '../../lib/storefront-types.js';
import { JewelryConfiguratorCanvas, type MetalFinish } from '../configurator/JewelryConfiguratorCanvas.js';
import { VirtualTryOnModal } from '../webar/VirtualTryOnModal.js';
import { useStorefront } from './StorefrontProvider.js';
import { VaultReveal } from './VaultReveal.js';
import { Spotlight } from '../ui/spotlight.js';
import { Tilt } from '../ui/tilt.js';

type MetalName = '18K Yellow Gold' | '18K White Gold' | '18K Rose Gold' | 'Platinum';
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

function metalFinishOf(name: MetalName): MetalFinish {
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
  const [metal, setMetal] = useState<MetalName>('18K Yellow Gold');
  const [size, setSize] = useState('6.5');
  const [beginning, setBeginning] = useState(false);
  const [beginError, setBeginError] = useState<string | null>(null);
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

  const componentSubtotal = (setting?.priceUsd ?? 0) + (stone?.priceUsd ?? 0);
  const makingFee = Math.round(componentSubtotal * 15) / 100;
  const total = Math.round((componentSubtotal + makingFee) * 100) / 100;
  const settingImage = setting ? imageFor(setting) : '';
  const stoneImage = stone ? imageFor(stone) : '';
  const accept = setting?.accepts
    .map((r) => {
      const shape = r.shape ?? 'any shape';
      const min = r.minCarat ?? null;
      const max = r.maxCarat ?? null;
      const range = min !== null || max !== null ? `${min ?? 0}–${max ?? '∞'}ct` : 'weight range not evidenced';
      return `${shape} ${range}`;
    })
    .join(' · ');
  const caption = pairingCaption(setting, stone, metal);

  useEffect(() => {
    syncQuery(settingId, stoneId);
  }, [settingId, stoneId]);

  function chooseSetting(id: string) {
    setSettingId(id);
    setStoneId(null);
    setPanel(2);
  }

  function chooseStone(id: string) {
    setStoneId(id);
    setPanel(3);
  }

  /**
   * The atelier order is NOT a client-priced bag line — the server composes
   * the configuration (INV-01/02/03), validates it against the real
   * compatibility rules and quotes it (server-authoritative price). The
   * review page then converts the exact quote transactionally.
   */
  async function beginAtelierOrder(): Promise<void> {
    if (!setting || !stone || beginning) return;
    setBeginning(true);
    setBeginError(null);
    try {
      const isRing = (setting.settingFor ?? 'ring').toLowerCase() === 'ring';
      const createRes = await fetch('/api/v1/dyo/configurations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settingVariantSku: setting.sku,
          gemRef: stone.sku,
          jewelleryType: (setting.settingFor ?? 'ring').toUpperCase() === 'EARRINGS' ? 'EARRINGS' : 'RING',
          options: {
            metal,
            ...(isRing ? { ringSize: size } : {}),
          },
        }),
      });
      const createBody = (await createRes.json().catch(() => null)) as {
        data?: { configuration?: { short_code?: string } };
        error?: { message?: string };
      } | null;
      const shortCode = createBody?.data?.configuration?.short_code;
      if (!createRes.ok || !shortCode) {
        throw new Error(createBody?.error?.message ?? 'The atelier could not register this composition.');
      }
      const validateRes = await fetch(`/api/v1/dyo/configurations/${encodeURIComponent(shortCode)}/validate`, { method: 'POST' });
      if (!validateRes.ok) {
        const validateBody = (await validateRes.json().catch(() => null)) as { error?: { message?: string } } | null;
        throw new Error(validateBody?.error?.message ?? 'This composition failed compatibility validation.');
      }
      window.location.href = `/design-your-own/review/${encodeURIComponent(shortCode)}`;
    } catch (cause) {
      setBeginError(cause instanceof Error ? cause.message : 'The atelier could not begin this composition.');
      setBeginning(false);
    }
  }

  const swatches = [
    { name: '18K Yellow Gold' as const, color: '#D4A437' },
    { name: '18K White Gold' as const, color: '#F6F2E9' },
    { name: '18K Rose Gold' as const, color: '#EA580C' },
    { name: 'Platinum' as const, color: '#D7D8DC' },
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
        <div>
          <p className="atelier__guide">
            {panel === 1
              ? 'Step 1 of 3. Choose the mounting first. Seats that cannot hold the stone you arrived with are omitted.'
              : panel === 2
                ? 'Step 2 of 3. Choose a stone the seat can hold. “Needs review” means a jeweller checks the prongs before the piece is made.'
                : 'Step 3 of 3. Set metal and size. This total is indicative. The server writes the quote on the next page.'}
          </p>
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
        </div>
      </header>

      <VaultReveal as="section" stagger={80} className="atelier__layout">
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
                    <Tilt key={item.id} rotationFactor={5} className="relative">
                    <Spotlight size={180} />
                    <button type="button" className={`atelier-card${stoneId === item.id ? ' is-on' : ''}`} onClick={() => chooseStone(item.id)}>
                      <span className="atelier-card__media"><img src={imageFor(item)} alt="" /></span>
                      <span className="atelier-card__kicker">{[item.caratTotal ? `${item.caratTotal} ct` : null, item.shape, item.originCountry].filter(Boolean).join(' · ')}</span>
                      <strong>{item.title}</strong>
                      <em>{formatMoney(item.priceUsd, currency, rates)}</em>
                      <span className={`atelier-card__fit${status === 'needs_review' ? ' is-review' : ''}`}>
                        {status === 'needs_review' ? 'Needs review' : 'Fits'}
                      </span>
                    </button>
                    </Tilt>
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
              <p className="atelier__kicker">Your pairing</p>
              <div className="atelier__picks">
                <article className="atelier-card">
                  <span className="atelier-card__media">{settingImage ? <img src={settingImage} alt="" /> : <span />}</span>
                  <span className="atelier-card__kicker">{setting?.settingFor ?? 'Setting'}</span>
                  <strong>{setting ? settingSeatLabel(setting.title, setting.settingFor) : 'Setting'}</strong>
                  <em>{setting ? formatMoney(setting.priceUsd, currency, rates) : '—'}</em>
                </article>
                <article className="atelier-card">
                  <span className="atelier-card__media">{stoneImage ? <img src={stoneImage} alt="" /> : <span />}</span>
                  <span className="atelier-card__kicker">{[stone?.caratTotal ? `${stone.caratTotal} ct` : null, stone?.shape].filter(Boolean).join(' · ') || 'Stone'}</span>
                  <strong>{stone?.title ?? 'Stone'}</strong>
                  <em>{stone ? formatMoney(stone.priceUsd, currency, rates) : '—'}</em>
                </article>
              </div>
              <dl className="atelier__totals">
                <div><dt>Setting</dt><dd>{setting ? formatMoney(setting.priceUsd, currency, rates) : '—'}</dd></div>
                <div><dt>Stone</dt><dd>{stone ? formatMoney(stone.priceUsd, currency, rates) : '—'}</dd></div>
                <div><dt>Atelier making (15%)</dt><dd>{setting && stone ? formatMoney(makingFee, currency, rates) : '—'}</dd></div>
                <div className="is-total"><dt>Indicative total</dt><dd>{formatMoney(total, currency, rates)}</dd></div>
              </dl>
              <p className="atelier__note">
                The authoritative price is the server quote on the review page — component prices here are indicative.
              </p>
              <button
                type="button"
                className="atelier__bag"
                disabled={!setting || !stone || beginning}
                onClick={() => void beginAtelierOrder()}
              >
                {beginning ? 'Preparing your composition…' : 'Review & quote on the server'}
              </button>
              {beginError ? <p role="alert" className="atelier__note">{beginError}</p> : null}
              {accept ? <p className="atelier__note">Accepts {accept}</p> : null}
              {fit === 'needs_review' ? (
                <p className="atelier__note">
                  This pairing sits near the seat’s size band. A jeweller will review the prongs before the piece is made.
                </p>
              ) : null}
              {fit === 'fits' ? <p className="atelier__fit">Compatible — shape and carat sit inside the seat.</p> : null}
            </div>
          ) : null}
          {panel < 3 ? (
            <div className="atelier__advance">
              <button
                type="button"
                className="atelier__bag"
                disabled={(panel === 1 && !setting) || (panel === 2 && !stone)}
                onClick={() => setPanel((current) => (current === 1 ? 2 : 3))}
              >
                Continue
              </button>
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
                label={
                  stone && setting
                    ? `${stone.title} in a ${settingSeatLabel(setting.title, setting.settingFor)}`
                    : 'Studio preview'
                }
              />
            ) : (
              <p>Select a setting</p>
            )}
          </div>
          <p className="atelier__caption">{caption}</p>
          <p className="atelier__kicker">Metal</p>
          <div className="atelier__metals">
            {swatches.map((item) => (
              <button key={`preview-${item.name}`} type="button" className={metal === item.name ? 'is-on' : ''} onClick={() => setMetal(item.name)}>
                <i style={{ background: item.color }} />
                {item.name}
              </button>
            ))}
          </div>
          {setting?.settingFor === 'ring' || !setting ? (
            <button type="button" className="atelier__try" disabled={!setting || !stone} onClick={() => setTryOn(true)}>
              Virtual try-on
            </button>
          ) : (
            <p className="atelier__kicker">Camera try-on is available for rings. This mounting stays in the 3D studio.</p>
          )}
        </aside>
      </VaultReveal>
      <VirtualTryOnModal
        open={tryOn}
        onClose={() => setTryOn(false)}
        metal={metalFinishOf(metal)}
        carat={stone?.caratTotal ?? 1}
        title="Try on your design"
        mode="hand"
        stoneColor={gemHexFor(stone?.colorHue, stone?.stoneType)}
        sharePath={`/design-your-own?setting=${setting?.id ?? ''}&stone=${stone?.id ?? ''}&tryon=1`}
      />
    </div>
  );
}
