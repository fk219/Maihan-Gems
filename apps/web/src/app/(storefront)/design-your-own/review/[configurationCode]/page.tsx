/**
 * apps/web/src/app/(storefront)/design-your-own/review/[configurationCode]/page.tsx
 *
 * `/design-your-own/review/<code>` — review a recorded configuration.
 *
 * The previous version invented the review: a fixed Ceylon sapphire, a fixed
 * Muzo origin, a fixed treatment, a fixed price, and a "Certified Natural
 * Mineral" line. None of it came from the configuration row. This version
 * renders `loadDyoConfiguration` verbatim:
 *
 *   - the recorded jewellery type, setting variant and stone reference;
 *   - the options the compose step stored (metal, labels, ring size, engraving);
 *   - the recorded compatibility result;
 *   - and nothing about price, treatment, origin or certification, because the
 *     configuration row does not carry them.
 *
 * If the code is unknown, the page is an honest empty state — not a fabricated
 * review with a plausible total.
 */
import type { Metadata } from 'next';
import Link from 'next/link';

import { Breadcrumbs } from '../../../../../components/design-system/Breadcrumbs.js';
import { EditorialMasthead } from '../../../../../components/design-system/EditorialMasthead.js';
import { DyoReviewActions } from '../../../../../components/dyo/DyoReviewActions.js';
import { loadDyoConfiguration } from '../../../../../lib/dyo-server.js';

interface PageProps {
  readonly params: Promise<{ configurationCode: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { configurationCode } = await params;
  return {
    title: `Configuration review · ${configurationCode} | Maihan Gems`,
    description: 'The recorded composition and compatibility state of a Design Your Own configuration.',
  };
}

function option(config: { selected_options: Record<string, unknown> }, key: string): string | null {
  const value = config.selected_options[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export default async function DyoReviewPage({ params }: PageProps) {
  const { configurationCode } = await params;
  const config = await loadDyoConfiguration(configurationCode);

  if (config === null) {
    return (
      <main className="page dyo-review-page mh-page">
        <Breadcrumbs
          crumbs={[
            { label: 'Home', href: '/' },
            { label: 'Design your own', href: '/design-your-own' },
            { label: 'Review' },
          ]}
        />
        <EditorialMasthead
          eyebrow="Configuration review"
          title="This configuration is not on file"
          lead="A review page is the record of a configuration that was actually stored. This code does not resolve to one."
        />
        <div className="empty-state">
          <h2 className="empty-state__title">Nothing was recorded under this code.</h2>
          <p className="empty-state__body">
            The code may have expired, or the configuration may never have been completed. No
            price, stone or composition is shown because none was found.
          </p>
          <div className="empty-state__action">
            <Link className="mh-cta" href="/design-your-own">
              Start a configuration
              <span aria-hidden="true">→</span>
            </Link>
            <Link className="mh-cta mh-cta--quiet" href="/contact">
              Ask the salon
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const settingLabel = option(config, 'settingLabel');
  const metalLabel = option(config, 'metalLabel');
  const gemLabel = option(config, 'gemLabel');
  const gemRef = option(config, 'gemRef');
  const ringSize = option(config, 'ringSize');
  const engraving = config.engraving_text ?? option(config, 'engraving');

  return (
    <main className="page dyo-review-page mh-page">
      <Breadcrumbs
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Design your own', href: '/design-your-own' },
          { label: config.short_code },
        ]}
      />

      <EditorialMasthead
        eyebrow="Configuration review"
        title={`Commission ${config.short_code}`}
        lead="The composition exactly as it was recorded. Compatibility is the stored result; the price is quoted by the atelier, not computed here."
        meta={
          <>
            <span>State {config.state}</span>
            <span>Compatibility {config.compatibility_status}</span>
          </>
        }
      />

      <div className="sf-split">
        <section className="sf-checkout__panel" aria-labelledby="dyo-composition">
          <h2 id="dyo-composition">Composition</h2>
          <dl className="mh-provenance">
            <dt>Jewellery type</dt>
            <dd>{config.jewellery_type.toLowerCase()}</dd>
            <dt>Mounting</dt>
            <dd>{settingLabel ?? 'Not named in this record'}</dd>
            <dt>Metal</dt>
            <dd>{metalLabel ?? 'Not named in this record'}</dd>
            <dt>Stone</dt>
            <dd>
              {gemLabel ?? 'Not named in this record'}
              {gemRef !== null && (
                <>
                  {' '}
                  <span className="tabular">({gemRef})</span>
                </>
              )}
            </dd>
            {ringSize !== null && (
              <>
                <dt>Ring size</dt>
                <dd className="tabular">US {ringSize}</dd>
              </>
            )}
            {engraving !== null && (
              <>
                <dt>Engraving request</dt>
                <dd>{engraving}</dd>
              </>
            )}
          </dl>
          <p className="sf-fine-print">
            The configuration row stores the stone reference and the option labels it was given.
            It does not store a treatment, origin or certificate, so this page does not show one.
          </p>
        </section>

        <section className="sf-checkout__panel" aria-labelledby="dyo-compatibility">
          <h2 id="dyo-compatibility">Composition check</h2>
          <p>
            {config.compatibility_status === 'COMPATIBLE'
              ? 'The recorded composition satisfies the structural invariants.'
              : `The recorded compatibility state is ${config.compatibility_status}.`}
          </p>
          {config.compatibility_detail.length > 0 ? (
            <ul className="sf-prose" style={{ paddingLeft: 20 }}>
              {config.compatibility_detail.map((detail, index) => {
                if (typeof detail !== 'object' || detail === null) return null;
                const row = detail as Record<string, unknown>;
                const label = typeof row['invariant'] === 'string' ? row['invariant'] : `Check ${index + 1}`;
                const note = typeof row['note'] === 'string' ? row['note'] : null;
                const result = typeof row['result'] === 'string' ? row['result'] : null;
                return (
                  <li key={`${label}-${index}`}>
                    <strong>{label}</strong>
                    {result !== null ? ` · ${result}` : ''}
                    {note !== null ? ` — ${note}` : ''}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="sf-fine-print">No per-rule detail was stored for this configuration.</p>
          )}
          <p className="sf-fine-print">
            INV-01: one setting variant and one stone XOR one pair. INV-02: a pair may attach only
            to earrings. INV-03: a single stone may attach only to a non-earring mounting.
          </p>
        </section>
      </div>

      <div className="sf-checkout__notice" role="note">
        <strong>No price is shown.</strong> The configuration row carries no price snapshot. An
        amount is quoted by the atelier after review, and no payment is taken on this page.
      </div>

      <DyoReviewActions shortCode={config.short_code} state={config.state} />
    </main>
  );
}
