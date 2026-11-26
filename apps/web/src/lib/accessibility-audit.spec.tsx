/**
 * apps/web/src/lib/accessibility-audit.spec.tsx
 *
 * Phase 4 Task 11 — automated accessibility audit (WCAG 2.2 AA target, SoT
 * 12.9 "zero blocking violations is the release gate").
 *
 * Tooling: axe-core run in happy-dom against the shared component states that
 * survived the storefront integration: the megamenu, the catalogue
 * not-found/error/loading views and the product-detail renderer.
 *
 * The page-level cases this file used to carry rendered main's pre-integration
 * storefront pages. Those pages are now develop's, they mount client providers
 * and fetch through the catalogue adapter, so page rendering is audited in a
 * real browser instead of happy-dom (see `docs/design-shots/v3/axe.md` and the
 * `audit:design` harness). The component contract audited here is unchanged.
 *
 * @vitest-environment happy-dom
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AxeBuilder } from './axe-builder.js';

import { productDetailFixture } from '../modules/catalog/testing/doubles.js';

import { MegaMenu } from '../components/layout/MegaMenu.js';
import { ProductDetailContent } from '../components/catalog/ProductDetailContent.js';
import { CatalogNotFoundView } from '../components/catalog/CatalogNotFoundView.js';
import { CatalogErrorView } from '../components/catalog/CatalogErrorView.js';
import { ListSkeleton } from '../components/catalog/ListSkeleton.js';
import { buildMegaMenu } from './mega-menu.js';
import type { TaxonomyReadModel } from '@maihan/contracts';

const webRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

function taxonomy(): TaxonomyReadModel {
  return {
    species: [],
    varieties: [
      {
        slug: 'tsavorite-garnet',
        name: 'Tsavorite',
        display_name: 'Tsavorite Garnet',
        species_code: 'GARNET',
        source_route: '/tsavorite-garnet',
        is_organic: false,
        state: 'ACTIVE',
        evidence_status: 'OBSERVED',
      },
    ],
    colours: [],
    intensities: [],
    clarities: [],
    origins: [],
    treatments: [],
    metals: [],
    setting_styles: [],
    jewellery_types: [],
  } as TaxonomyReadModel;
}

async function audit(name: string, ui: React.ReactElement): Promise<void> {
  // SSR the component and load the markup into a live container. The harness
  // mirrors what the root layout really ships: `<html lang="en">` and a
  // document title (happy-dom maps document.documentElement to its own html
  // element, so we set lang/title explicitly rather than wrapping markup).
  document.documentElement.setAttribute('lang', 'en');
  if (document.title === '') document.title = 'Maihan Gems';
  const container = document.createElement('div');
  container.innerHTML = renderToStaticMarkup(ui);
  document.body.appendChild(container);
  try {
    const results = await new AxeBuilder().analyze();
    const blocking = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    const notes = results.violations.filter((v) => v.impact !== 'critical' && v.impact !== 'serious');
    if (notes.length > 0) {
      console.warn(`[a11y] ${name}: non-blocking findings (reported, not gating):`, notes.map((v) => `${v.id}(${v.impact})`));
    }
    expect(blocking, `${name}: blocking violations: ${blocking.map((v) => `${v.id}: ${JSON.stringify(v.nodes.map((n) => n.failureSummary))}`).join('; ')}`).toEqual([]);
  } finally {
    container.remove();
  }
}

describe('Task 11 accessibility audit — representative templates (axe-core, critical+serious blocking)', () => {
  it('mega menu (disclosure semantics, real links)', async () => {
    const groups = buildMegaMenu(taxonomy());
    await audit('mega menu', <MegaMenu groups={groups} />);
  });

  it('not-found state', async () => {
    await audit(
      'not-found',
      <CatalogNotFoundView subject="gemstone variety" browseHref="/varieties" browseLabel="Browse varieties" />,
    );
  });

  it('error state with recovery actions', async () => {
    await audit(
      'error state',
      <CatalogErrorView error={new Error('boom')} reset={() => {}} backHref="/varieties" backLabel="Browse varieties" />,
    );
  });

  it('loading skeleton', async () => {
    await audit('loading skeleton', <ListSkeleton />);
  });

  it('product detail content (renderer level)', async () => {
    await audit('product detail content', <ProductDetailContent detail={productDetailFixture()} />);
  });
});

describe('audit tooling sanity', () => {
  it('axe-core is really installed and the builder is wired (not an always-pass stub)', () => {
    const pkg = JSON.parse(readFileSync(join(webRoot, 'package.json'), 'utf8')) as { devDependencies: Record<string, string> };
    expect(Object.keys(pkg.devDependencies)).toContain('axe-core');
    const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'axe-builder.ts'), 'utf8');
    expect(src).toContain('axe.run');
  });

  it('the audit itself would catch a blocking violation (control check)', async () => {
    // A document with no <main>/landmarks and an empty button must produce
    // at least one serious/critical violation — proving the audit can fail.
    const container = document.createElement('div');
    container.innerHTML = '<div><button></button></div>';
    document.body.appendChild(container);
    try {
      const results = await new AxeBuilder().analyze();
      const blocking = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
      expect(blocking.length).toBeGreaterThan(0);
    } finally {
      container.remove();
    }
  });
});
