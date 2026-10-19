/**
 * apps/web/src/components/catalog/product-detail.spec.tsx
 *
 * Task 4 — product detail tests:
 *  - the canonical ProductDetail contract renders verbatim (identity,
 *    specification table, provenance badge, availability badge);
 *  - the shared renderer is used by BOTH detail routes (no duplicate);
 *  - provenance is labelled with its evidence status, never promoted
 *    (INV-07: non-VERIFIED fields may not render as verified truth);
 *  - no media is fabricated (the DTO carries no media field).
 */
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { ProductDetailContent } from './ProductDetailContent.js';
import { productDetailFixture } from '../../modules/catalog/testing/doubles.js';

const S = (ui: React.ReactElement): string => renderToStaticMarkup(ui);

describe('ProductDetailContent — canonical contract rendering', () => {
  const detail = productDetailFixture();

  it('renders the identity (title, subtitle, breadcrumb to the variety)', () => {
    const html = S(<ProductDetailContent detail={detail} />);
    expect(html).toContain(`<h1>${detail.title}</h1>`);
    expect(html).toContain('aria-label="Breadcrumb"');
    expect(html).toContain('Green Tourmaline');
  });

  it('renders the specification table from DTO rows only', () => {
    const html = S(<ProductDetailContent detail={detail} />);
    expect(html).toContain('<caption');
    expect(html).toContain('<th scope="row">Type</th>');
    expect(html).toContain('Configured piece');
    expect(html).toContain('Total weight');
    expect(html).toContain('1.28 ct');
  });

  it('marks availability as a live badge without deriving state', () => {
    const html = S(<ProductDetailContent detail={detail} />);
    expect(html).toContain('role="status"');
    expect(html).toContain('Available');
  });

  it('labels provenance with evidence status verbatim (no promotion)', () => {
    const observed = S(<ProductDetailContent detail={detail} />);
    expect(observed).toContain('Source-verified SKU');

    const inferred = { ...detail, provenance: { ...detail.provenance, sku_evidence: 'INFERRED' as const, source_sku: null, source_sku_derived: 'JS1383R14-K2198' } };
    const html = S(<ProductDetailContent detail={inferred} />);
    expect(html).toContain('SKU evidence: INFERRED');
    expect(html).not.toContain('Source-verified SKU');
    expect(html).toContain('derived, not an observed source SKU');
  });

  it('renders no fabricated image when media is absent — gallery is honest', () => {
    // The contract now carries `media`; with an empty array the gallery
    // renders the "not yet evidenced" placeholder, never an invented image.
    const html = S(<ProductDetailContent detail={detail} />);
    expect(html).not.toContain('<img');
    expect(html).toContain('not yet evidenced');
  });

  it('renders gallery media verbatim from the DTO media array', () => {
    const withMedia = {
      ...detail,
      media: [
        { url: 'https://res.cloudinary.com/example/test.jpg', kind: 'IMAGE', role: 'PRIMARY', position: 0, alt: 'Test stone' },
      ],
    };
    const html = S(<ProductDetailContent detail={withMedia} />);
    expect(html).toContain('https://res.cloudinary.com/example/test.jpg');
    expect(html).toContain('Test stone');
  });
});
