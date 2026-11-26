/**
 * apps/web/src/app/(storefront)/design-your-own/dyo-flow.spec.tsx
 *
 * Storefront test suite for Phase 7 Design Your Own (DYO) flow and accessibility.
 * Authority:
 *   - INITIAL_IMPLEMENTATION_PLAN.md Phase 7 (Tasks 8, 9, 11)
 *   - technical_design/14_DYO_ARCHITECTURE.md
 *   - Axe-core accessibility audit (WCAG 2.2 AA target, zero critical/serious blocking)
 *
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AxeBuilder } from '../../lib/axe-builder.js';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/design-your-own',
  useSearchParams: () => new URLSearchParams(),
}));

import DesignYourOwnEntryPage from '../../app/(storefront)/design-your-own/page.js';
import DyoReviewPage from '../../app/(storefront)/design-your-own/review/[configurationCode]/page.js';
import CartPage from '../../app/(storefront)/cart/page.js';
import { DyoConfigurator } from './DyoConfigurator.js';
import { setDyoServiceForTest } from '../../lib/dyo-server.js';
import type { DyoConfigurationRow } from '@maihan/db';

const REVIEW_FIXTURE: DyoConfigurationRow = {
  id: 'd0000000-0000-4000-8000-000000000061',
  configuration_hash: 'demo-review-hash-v2',
  short_code: 'DEMO-REVIEW',
  jewellery_type: 'RING',
  setting_id: null,
  setting_variant_id: null,
  gemstone_id: null,
  gemstone_pair_id: null,
  side_stones: [],
  engraving_text: 'AETERNUM',
  selected_options: {
    metal: 'Y18',
    metalLabel: '18K Yellow Gold',
    settingDesignCode: '9801',
    settingLabel: 'Halo Ring Setting',
    gemRef: 'K-DEMO-005',
    gemLabel: 'Emerald Oval, 1.05 ct',
    ringSize: '7.0',
  },
  state: 'VALID',
  compatibility_status: 'COMPATIBLE',
  compatibility_detail: [
    { invariant: 'INV-01', result: 'PASS', note: 'One setting variant and one gemstone.' },
    { invariant: 'INV-02', result: 'PASS', note: 'No pair attached to a non-earring type.' },
    { invariant: 'INV-03', result: 'PASS', note: 'A single stone is attached to a ring.' },
  ],
  compatibility_checked_at: new Date('2026-01-01T00:00:00Z'),
  hash_version: 1,
  state_version: 1,
  anonymous_session_id: null,
  customer_id: null,
  created_at: new Date('2026-01-01T00:00:00Z'),
  updated_at: new Date('2026-01-01T00:00:00Z'),
  expires_at: null,
};

async function auditA11y(name: string, ui: React.ReactElement): Promise<void> {
  document.documentElement.setAttribute('lang', 'en');
  if (document.title === '') document.title = 'Maihan Gems';
  const container = document.createElement('div');
  container.innerHTML = renderToStaticMarkup(ui);
  document.body.appendChild(container);

  try {
    const results = await new AxeBuilder().analyze();
    const blocking = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );
    const notes = results.violations.filter(
      (v) => v.impact !== 'critical' && v.impact !== 'serious',
    );
    if (notes.length > 0) {
      console.warn(
        `[a11y] ${name}: non-blocking findings:`,
        notes.map((v) => `${v.id}(${v.impact})`),
      );
    }
    expect(
      blocking,
      `${name}: blocking violations: ${blocking.map((v) => `${v.id}: ${JSON.stringify(v.nodes.map((n) => n.failureSummary))}`).join('; ')}`,
    ).toEqual([]);
  } finally {
    container.remove();
  }
}

describe('Phase 7 DYO Storefront Flow & UI Verification', () => {
  beforeAll(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  });

  it('renders DYO entry page with configurator shell and mounting choices', async () => {
    const markup = renderToStaticMarkup(<DesignYourOwnEntryPage />);
    expect(markup).toContain('Design your own');
    expect(markup).toContain('Select Precious Mounting &amp; Metal');
    expect(markup).toContain('Halo Ring Setting');
    expect(markup).toContain('Four-Prong Stud Setting');
    expect(markup).toContain('18K Yellow Gold');
    expect(markup).toContain('Demo catalogue');
  });

  it('renders DyoConfigurator component correctly', () => {
    const markup = renderToStaticMarkup(<DyoConfigurator />);
    expect(markup).toContain('01 / Mounting &amp; Metal');
    expect(markup).toContain('02 / Natural Gemstone');
    expect(markup).toContain('03 / Customise &amp; Quote');
    expect(markup).toContain('Jewellery Category');
  });

  it('renders DyoReviewPage with the recorded composition and no fabricated price', async () => {
    setDyoServiceForTest(async () => REVIEW_FIXTURE);
    const page = await DyoReviewPage({
      params: Promise.resolve({ configurationCode: 'DEMO-REVIEW' }),
    });
    const markup = renderToStaticMarkup(page);

    // Identity & state
    expect(markup).toContain('Commission DEMO-REVIEW');
    expect(markup).toContain('State VALID');
    expect(markup).toContain('Compatibility COMPATIBLE');

    // Recorded composition
    expect(markup).toContain('Halo Ring Setting');
    expect(markup).toContain('18K Yellow Gold');
    expect(markup).toContain('Emerald Oval, 1.05 ct');
    expect(markup).toContain('AETERNUM');

    // Structural invariant ledger
    expect(markup).toContain('INV-01');
    expect(markup).toContain('INV-02');
    expect(markup).toContain('INV-03');

    // Honesty: no price is invented for a configuration row.
    expect(markup).toContain('No price is shown');
    expect(markup).not.toContain('Certified Natural Mineral');
    expect(markup).not.toContain('Total Investment');
    expect(markup).not.toContain('Ceylon');

    // Actions
    expect(markup).toContain('Ask the atelier to review it');
    expect(markup).toContain('Share this configuration');
  });

  it('renders CartPage with atelier shopping bag layout', async () => {
    const markup = renderToStaticMarkup(<CartPage />);
    expect(markup).toContain('Shopping bag');
    expect(markup).toContain('mh-cart');
  });

  describe('Accessibility Audits (axe-core WCAG 2.2 AA)', () => {
    it('passes a11y audit on DYO entry page', async () => {
      await auditA11y('dyo entry page', <DesignYourOwnEntryPage />);
    });

    it('passes a11y audit on DYO review page', async () => {
      setDyoServiceForTest(async () => REVIEW_FIXTURE);
      const page = await DyoReviewPage({
        params: Promise.resolve({ configurationCode: 'DEMO-REVIEW' }),
      });
      await auditA11y('dyo review page', page);
      setDyoServiceForTest(undefined);
    });

    it('passes a11y audit on cart page', async () => {
      await auditA11y('cart page', <CartPage />);
    });
  });
});
