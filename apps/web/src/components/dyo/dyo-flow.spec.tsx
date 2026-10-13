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
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AxeBuilder } from '../../lib/axe-builder.js';
import { StorefrontProvider } from '../storefront/StorefrontProvider.js';
import { DEFAULT_FX } from '../../lib/currency.js';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/design-your-own',
  useSearchParams: () => new URLSearchParams(),
}));

import DesignYourOwnEntryPage from '../../app/(storefront)/design-your-own/page.js';
import DyoReviewPage from '../../app/(storefront)/design-your-own/review/[configurationCode]/page.js';
import CartPage from '../../app/(storefront)/cart/page.js';
import { DyoConfigurator } from './DyoConfigurator.js';

function withStorefront(ui: React.ReactNode): React.ReactElement {
  return createElement(StorefrontProvider, { rates: DEFAULT_FX, children: ui });
}

async function auditA11y(name: string, ui: React.ReactElement): Promise<void> {
  document.documentElement.setAttribute('lang', 'en');
  if (document.title === '') document.title = 'Maihan Gems';
  const container = document.createElement('div');
  container.innerHTML = renderToStaticMarkup(withStorefront(ui));
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
    const page = await DesignYourOwnEntryPage();
    const markup = renderToStaticMarkup(withStorefront(page));
    expect(markup).toContain('Design your own');
    expect(markup).toContain('Setting');
    expect(markup).toContain('Stone');
    expect(markup).toContain('Finish');
    expect(markup).toContain('18K Yellow Gold');
    expect(markup).toContain('Platinum');
  });

  it('renders DyoConfigurator component correctly', () => {
    const markup = renderToStaticMarkup(<DyoConfigurator />);
    expect(markup).toContain('01 / Mounting &amp; Metal');
    expect(markup).toContain('02 / Natural Gemstone');
    expect(markup).toContain('03 / Customise &amp; Quote');
    expect(markup).toContain('Jewellery Category');
  });

  it('renders DyoReviewPage with configuration specs, invariant ledger, and pricing snapshot', async () => {
    const page = await DyoReviewPage({
      params: Promise.resolve({ configurationCode: 'cfg_js1150w14_k1324' }),
    });
    const markup = renderToStaticMarkup(page);

    // Header & code
    expect(markup).toContain('Atelier Commission Review');
    expect(markup).toContain('cfg_js1150w14_k1324');
    expect(markup).toContain('STATUS: VALID');

    // Structural invariant ledger
    expect(markup).toContain('Deterministic Structural Verification Ledger');
    expect(markup).toContain('INV-01 Composition');
    expect(markup).toContain('INV-02 Pair Rule');
    expect(markup).toContain('INV-03 Single Stone');

    // Authoritative pricing table
    expect(markup).toContain('Authoritative Pricing Snapshot');
    expect(markup).toContain('Mounting Fabrication');
    expect(markup).toContain('Certified Natural Mineral');
    expect(markup).toContain('Total Investment');

    // Actions
    expect(markup).toContain('Add to Bag &amp; Proceed to Checkout');
    expect(markup).toContain('Share Configuration');
  });

  it('renders CartPage with atelier shopping bag layout', async () => {
    const markup = renderToStaticMarkup(
      withStorefront(await CartPage({ searchParams: Promise.resolve({}) })),
    );
    expect(markup).toContain('Your bag');
    expect(markup).toContain('lx-empty');
  });

  describe('Accessibility Audits (axe-core WCAG 2.2 AA)', () => {
    it('passes a11y audit on DYO entry page', async () => {
      await auditA11y('dyo entry page', await DesignYourOwnEntryPage());
    });

    it('passes a11y audit on DYO review page', async () => {
      const page = await DyoReviewPage({
        params: Promise.resolve({ configurationCode: 'cfg_js1150w14_k1324' }),
      });
      await auditA11y('dyo review page', page);
    });

    it('passes a11y audit on cart page', async () => {
      await auditA11y('cart page', await CartPage({ searchParams: Promise.resolve({}) }));
    });
  });
});
