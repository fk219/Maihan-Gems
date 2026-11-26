'use client';

/**
 * apps/web/src/components/dyo/DyoConfigurator.tsx
 *
 * Design Your Own — the three-step composition surface.
 *
 * What changed and why:
 *   - The previous build hardcoded a fictional catalogue: "Ceylon Royal Blue",
 *     "Muzo", "Burmese", "Certified Natural Mineral", "Complimentary engraving".
 *     None of it was supported by a record. Every option below is a DEMO row
 *     that exists in `maihan_dev` (see packages/db/seed-demo-catalogue.mjs), and
 *     the panel says so.
 *   - Prices are labelled illustrative and are never presented as a quote.
 *   - The composition rule is real: a pair may attach only to earrings, a
 *     single stone only to a non-earring mounting (INV-02 / INV-03). The check
 *     runs in the UI and again in the API.
 *   - Submission no longer invents a fallback code when the API fails. A
 *     failure is shown as a failure.
 *
 * The flow is three steps because the data model has three decisions:
 * mounting + metal, stone, then the options that qualify the composition.
 */
import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';

export type JewelleryType = 'RING' | 'EARRINGS' | 'PENDANT' | 'NECKLACE' | 'BRACELET';

interface MetalVariant {
  readonly sku: string;
  readonly metalCode: string;
  readonly metalLabel: string;
  readonly priceCents: number;
}

interface SettingOption {
  readonly designCode: string;
  readonly name: string;
  readonly description: string;
  readonly defaultJewelleryType: JewelleryType;
  readonly image: string;
  readonly variants: readonly MetalVariant[];
}

interface GemOption {
  readonly ref: string;
  readonly type: 'SINGLE' | 'PAIR';
  readonly name: string;
  readonly variety: string;
  readonly weightCt: number;
  readonly priceCents: number;
  readonly image: string;
}

/** Demo rows present in maihan_dev. Illustrative, not migrated source data. */
const SETTING_OPTIONS: readonly SettingOption[] = [
  {
    designCode: '9801',
    name: 'Halo Ring Setting',
    description: 'A low halo with twelve side stones. Recorded in 18K yellow and white gold.',
    defaultJewelleryType: 'RING',
    image: '/assets/settings/halo_ring.svg',
    variants: [
      { sku: 'JS9801Y18', metalCode: 'Y18', metalLabel: '18K Yellow Gold', priceCents: 165000 },
      { sku: 'JS9801W18', metalCode: 'W18', metalLabel: '18K White Gold', priceCents: 172000 },
    ],
  },
  {
    designCode: '9802',
    name: 'Four-Prong Stud Setting',
    description: 'A low four-prong stud. Recorded in 18K yellow gold and platinum 950.',
    defaultJewelleryType: 'EARRINGS',
    image: '/assets/settings/stud_earrings.svg',
    variants: [
      { sku: 'JS9802Y18', metalCode: 'Y18', metalLabel: '18K Yellow Gold', priceCents: 125000 },
      { sku: 'JS9802PT', metalCode: 'PT', metalLabel: 'Platinum 950', priceCents: 148000 },
    ],
  },
];

const GEM_OPTIONS: readonly GemOption[] = [
  {
    ref: 'K-DEMO-001',
    type: 'SINGLE',
    name: 'Emerald Oval, 1.02 ct',
    variety: 'Emerald',
    weightCt: 1.02,
    priceCents: 485000,
    image: '/assets/gemstones/emerald.svg',
  },
  {
    ref: 'K-DEMO-002',
    type: 'SINGLE',
    name: 'Sapphire Cushion, 2.35 ct',
    variety: 'Sapphire',
    weightCt: 2.35,
    priceCents: 920000,
    image: '/assets/gemstones/sapphire.svg',
  },
  {
    ref: 'PR-DEMO-001',
    type: 'PAIR',
    name: 'Emerald Round Pair, 1.64 ct total',
    variety: 'Emerald',
    weightCt: 1.64,
    priceCents: 690000,
    image: '/assets/gemstones/emerald.svg',
  },
  {
    ref: 'PR-DEMO-002',
    type: 'PAIR',
    name: 'Sapphire Oval Pair, 2.12 ct total',
    variety: 'Sapphire',
    weightCt: 2.12,
    priceCents: 1240000,
    image: '/assets/gemstones/sapphire.svg',
  },
];

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function DyoConfigurator() {
  let router: { push?: (href: string) => void } | null = null;
  try {
    router = useRouter();
  } catch {
    // Rendered outside the App Router (e.g. a static test) — the submit path
    // falls back to window.location, which also keeps the code deterministic.
  }

  const ringSizeId = useId();
  const engravingId = useId();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [jewelleryType, setJewelleryType] = useState<JewelleryType>('RING');
  const [selectedSetting, setSelectedSetting] = useState<SettingOption>(SETTING_OPTIONS[0]!);
  const [selectedVariant, setSelectedVariant] = useState<MetalVariant>(SETTING_OPTIONS[0]!.variants[0]!);
  const [selectedGem, setSelectedGem] = useState<GemOption>(GEM_OPTIONS[0]!);
  const [ringSize, setRingSize] = useState('7.0');
  const [engraving, setEngraving] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isPair = selectedGem.type === 'PAIR';
  const isEarrings = jewelleryType === 'EARRINGS';
  const compatible = isEarrings ? isPair : !isPair;
  const compatibilityReason = compatible
    ? isEarrings
      ? 'A matched pair is attached to earrings. INV-02 is satisfied.'
      : 'A single stone is attached to a non-earring mounting. INV-03 is satisfied.'
    : isEarrings
      ? 'Earrings require a matched pair. INV-02.'
      : 'A matched pair may attach only to earrings. INV-02.';

  const illustrativeTotal =
    selectedVariant.priceCents + selectedGem.priceCents;

  const changeJewelleryType = (type: JewelleryType): void => {
    setJewelleryType(type);
    if (type === 'EARRINGS') {
      const stud = SETTING_OPTIONS.find((option) => option.defaultJewelleryType === 'EARRINGS');
      if (stud !== undefined) {
        setSelectedSetting(stud);
        setSelectedVariant(stud.variants[0]!);
      }
      const pair = GEM_OPTIONS.find((gem) => gem.type === 'PAIR');
      if (pair !== undefined) setSelectedGem(pair);
      return;
    }
    if (selectedSetting.defaultJewelleryType === 'EARRINGS') {
      setSelectedSetting(SETTING_OPTIONS[0]!);
      setSelectedVariant(SETTING_OPTIONS[0]!.variants[0]!);
    }
    if (selectedGem.type === 'PAIR') setSelectedGem(GEM_OPTIONS[0]!);
  };

  const submit = async (): Promise<void> => {
    if (!compatible) return;
    setIsSubmitting(true);
    setSubmitError(null);

    const payload = {
      jewelleryType,
      settingVariantSku: selectedVariant.sku,
      gemRef: selectedGem.ref,
      options: {
        metal: selectedVariant.metalCode,
        metalLabel: selectedVariant.metalLabel,
        settingDesignCode: selectedSetting.designCode,
        settingLabel: selectedSetting.name,
        gemRef: selectedGem.ref,
        gemLabel: selectedGem.name,
        ...(jewelleryType === 'RING' ? { ringSize } : {}),
        ...(engraving.trim().length > 0 ? { engraving: engraving.trim() } : {}),
      },
    };

    try {
      const response = await fetch('/api/v1/dyo/configurations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message ?? 'The configuration could not be recorded.');
      }
      const body = (await response.json()) as {
        data?: { configuration?: { short_code?: string } };
      };
      const code = body.data?.configuration?.short_code;
      if (typeof code !== 'string' || code.length === 0) {
        throw new Error('The configuration was accepted without a review code.');
      }
      const href = `/design-your-own/review/${code}`;
      if (router?.push !== undefined) router.push(href);
      else window.location.assign(href);
    } catch (error) {
      // No fabricated fallback code: an unrecorded configuration cannot be
      // reviewed, and pretending otherwise would create a dead end.
      setSubmitError(error instanceof Error ? error.message : 'The configuration could not be recorded.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="dyo-container" id="dyo-configurator">
      <nav className="dyo-step-indicator" aria-label="Configurator progress">
        <button
          type="button"
          onClick={() => setStep(1)}
          className={`dyo-step-btn ${step === 1 ? 'dyo-step-btn--active' : ''} ${step > 1 ? 'dyo-step-btn--completed' : ''}`}
          aria-current={step === 1 ? 'step' : undefined}
        >
          01 / Mounting &amp; Metal
        </button>
        <button
          type="button"
          onClick={() => setStep(2)}
          className={`dyo-step-btn ${step === 2 ? 'dyo-step-btn--active' : ''} ${step > 2 ? 'dyo-step-btn--completed' : ''}`}
          aria-current={step === 2 ? 'step' : undefined}
        >
          02 / Natural Gemstone
        </button>
        <button
          type="button"
          onClick={() => setStep(3)}
          className={`dyo-step-btn ${step === 3 ? 'dyo-step-btn--active' : ''}`}
          aria-current={step === 3 ? 'step' : undefined}
        >
          03 / Customise &amp; Quote
        </button>
      </nav>

      <div className="sf-banner" role="note">
        <strong>Demo catalogue.</strong> The mountings and stones on this page are demo rows in
        the development database. They are not migrated source products, and the total shown is
        illustrative — it is not a quote.
      </div>

      {step === 1 && (
        <section className="dyo-panel" aria-labelledby="dyo-step-1-title">
          <header className="dyo-header">
            <p className="sf-eyebrow">Composition · 01</p>
            <h2 id="dyo-step-1-title">Select Precious Mounting &amp; Metal</h2>
            <p>
              A mounting design is a family; the sellable unit is a design and metal pair. Choose
              the design first, then the metal variant whose recorded price you want to see.
            </p>
          </header>

          <div>
            <p className="sf-eyebrow" id="dyo-category-label">
              Jewellery Category
            </p>
            <div
              className="sf-colour-row"
              role="group"
              aria-labelledby="dyo-category-label"
            >
              {(['RING', 'EARRINGS', 'PENDANT', 'NECKLACE', 'BRACELET'] as const).map((category) => (
                <button
                  key={category}
                  type="button"
                  aria-pressed={jewelleryType === category}
                  onClick={() => changeJewelleryType(category)}
                  className="dyo-step-btn"
                  style={
                    jewelleryType === category
                      ? { borderBottom: '1px solid #7a5a10', color: '#0b1117', paddingInline: 14 }
                      : { border: '1px solid rgba(11,17,23,0.14)', paddingInline: 14, minHeight: 44 }
                  }
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="sf-eyebrow" id="dyo-design-label">
              Mounting Design
            </p>
            <div className="dyo-grid-options" role="group" aria-labelledby="dyo-design-label">
              {SETTING_OPTIONS.map((option) => {
                const selected = selectedSetting.designCode === option.designCode;
                return (
                  <article
                    key={option.designCode}
                    role="button"
                    tabIndex={0}
                    aria-pressed={selected}
                    onClick={() => {
                      setSelectedSetting(option);
                      setSelectedVariant(option.variants[0]!);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === ' ' || event.key === 'Enter') {
                        event.preventDefault();
                        setSelectedSetting(option);
                        setSelectedVariant(option.variants[0]!);
                      }
                    }}
                    className={`dyo-option-card ${selected ? 'dyo-option-card--selected' : ''}`}
                  >
                    <div className="dyo-option-media">
                      <img src={option.image} alt="" loading="lazy" />
                    </div>
                    <span className="sf-eyebrow">{option.designCode}</span>
                    <h3 className="dyo-option-title">{option.name}</h3>
                    <p className="sf-fine-print">{option.description}</p>
                    <div className="dyo-option-price">
                      {option.variants.length} metal variant{option.variants.length === 1 ? '' : 's'}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <div>
            <p className="sf-eyebrow" id="dyo-metal-label">
              Precious Metal Variant
            </p>
            <div className="sf-colour-row" role="group" aria-labelledby="dyo-metal-label">
              {selectedSetting.variants.map((variant) => (
                <button
                  key={variant.sku}
                  type="button"
                  aria-pressed={selectedVariant.sku === variant.sku}
                  onClick={() => setSelectedVariant(variant)}
                  className="dyo-step-btn"
                  style={
                    selectedVariant.sku === variant.sku
                      ? { borderBottom: '1px solid #7a5a10', color: '#0b1117', paddingInline: 14 }
                      : { border: '1px solid rgba(11,17,23,0.14)', paddingInline: 14, minHeight: 44 }
                  }
                >
                  {variant.metalLabel} · {formatPrice(variant.priceCents)}
                </button>
              ))}
            </div>
          </div>

          <div className="sf-checkout__actions">
            <button type="button" className="mh-cta" onClick={() => setStep(2)}>
              Continue to the stone <span aria-hidden="true">→</span>
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="dyo-panel" aria-labelledby="dyo-step-2-title">
          <header className="dyo-header">
            <p className="sf-eyebrow">Composition · 02</p>
            <h2 id="dyo-step-2-title">Choose the stone</h2>
            <p>
              A single stone composes a ring, pendant, necklace or bracelet. A matched pair
              composes earrings. The rule is checked before the step can advance.
            </p>
          </header>

          <div
            role="status"
            aria-live="polite"
            className={`sf-banner ${compatible ? 'sf-banner--ok' : 'sf-banner--bad'}`}
          >
            <strong>{compatible ? 'Composition valid. ' : 'Composition not valid. '}</strong>
            {compatibilityReason}
          </div>

          <div className="dyo-grid-options" role="group" aria-label="Available stones">
            {GEM_OPTIONS.map((gem) => {
              const selected = selectedGem.ref === gem.ref;
              return (
                <article
                  key={gem.ref}
                  role="button"
                  tabIndex={0}
                  aria-pressed={selected}
                  onClick={() => setSelectedGem(gem)}
                  onKeyDown={(event) => {
                    if (event.key === ' ' || event.key === 'Enter') {
                      event.preventDefault();
                      setSelectedGem(gem);
                    }
                  }}
                  className={`dyo-option-card ${selected ? 'dyo-option-card--selected' : ''}`}
                >
                  <div className="dyo-option-media">
                    <img src={gem.image} alt="" loading="lazy" />
                  </div>
                  <div className="sf-meta-line">
                    <span>{gem.ref}</span>
                    <span>{gem.type}</span>
                    <span className="tabular">{gem.weightCt} ct</span>
                  </div>
                  <h3 className="dyo-option-title">{gem.name}</h3>
                  <p className="sf-fine-print">{gem.variety}</p>
                  <div className="dyo-option-price">{formatPrice(gem.priceCents)}</div>
                </article>
              );
            })}
          </div>

          <p className="sf-fine-print">
            Illustrations are category artwork, not photographs of the stone. Weight and price
            are the values recorded on the demo row.
          </p>

          <div className="sf-checkout__actions">
            <button type="button" className="mh-cta mh-cta--quiet" onClick={() => setStep(1)}>
              ← Back to mounting
            </button>
            <button
              type="button"
              className="mh-cta"
              disabled={!compatible}
              onClick={() => setStep(3)}
            >
              Customise &amp; review <span aria-hidden="true">→</span>
            </button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="dyo-panel" aria-labelledby="dyo-step-3-title">
          <header className="dyo-header">
            <p className="sf-eyebrow">Composition · 03</p>
            <h2 id="dyo-step-3-title">Customise &amp; Quote</h2>
            <p>
              The options below are recorded with the configuration. A price is quoted by the
              atelier after the composition is reviewed; this page does not issue one.
            </p>
          </header>

          <div className="sf-split">
            <div className="sf-form-stack">
              {jewelleryType === 'RING' && (
                <div className="sf-field">
                  <label htmlFor={ringSizeId}>Ring size (US)</label>
                  <select
                    id={ringSizeId}
                    value={ringSize}
                    onChange={(event) => setRingSize(event.target.value)}
                  >
                    {['5.0', '5.5', '6.0', '6.5', '7.0', '7.5', '8.0', '8.5', '9.0'].map((size) => (
                      <option key={size} value={size}>
                        US {size}
                      </option>
                    ))}
                  </select>
                  <span className="sf-field-note">
                    Sizing is a request. The atelier confirms the final size before the piece is
                    made.
                  </span>
                </div>
              )}

              <div className="sf-field">
                <label htmlFor={engravingId}>Engraving request (optional, 24 characters)</label>
                <input
                  id={engravingId}
                  type="text"
                  maxLength={24}
                  value={engraving}
                  onChange={(event) => setEngraving(event.target.value)}
                  placeholder="Text to be confirmed"
                />
                <span className="sf-field-note">
                  Recorded as a request, not as an accepted instruction. No engraving is promised
                  by this page.
                </span>
              </div>

              <div className="sf-invariant-list">
                <strong>Composition</strong>
                <span>
                  {selectedSetting.name} · {selectedVariant.metalLabel}
                </span>
                <span>{selectedGem.name}</span>
                <span>
                  {compatible
                    ? 'INV-01 / INV-02 / INV-03 satisfied for this composition.'
                    : compatibilityReason}
                </span>
              </div>
            </div>

            <div className="dyo-summary-card" aria-labelledby="dyo-summary-title">
              <p className="sf-eyebrow" id="dyo-summary-title">
                Illustrative total · demo records
              </p>
              <div className="dyo-summary-row">
                <span>Mounting ({selectedSetting.designCode})</span>
                <span>{formatPrice(selectedVariant.priceCents)}</span>
              </div>
              <div className="dyo-summary-row">
                <span>Metal ({selectedVariant.metalLabel})</span>
                <span>In variant price</span>
              </div>
              <div className="dyo-summary-row">
                <span>Stone ({selectedGem.ref})</span>
                <span>{formatPrice(selectedGem.priceCents)}</span>
              </div>
              <div className="dyo-summary-row dyo-summary-row--total">
                <span>Illustrative total</span>
                <span>{formatPrice(illustrativeTotal)}</span>
              </div>
              <p className="sf-fine-print">
                Not a quote. The composition must be reviewed and priced by the atelier before
                any amount is payable.
              </p>
            </div>
          </div>

          {submitError !== null && (
            <div className="sf-banner sf-banner--bad" role="alert">
              {submitError}
            </div>
          )}

          <div className="sf-checkout__actions">
            <button type="button" className="mh-cta mh-cta--quiet" onClick={() => setStep(2)}>
              ← Back to the stone
            </button>
            <button
              type="button"
              className="mh-cta"
              disabled={isSubmitting || !compatible}
              onClick={() => void submit()}
            >
              {isSubmitting ? 'Recording configuration…' : 'Record configuration & review'}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
