/**
 * apps/web/src/components/cms/block-renderers.spec.tsx
 *
 * Phase 12 — plan §19 task 1 tests: one renderer per content_block_type,
 * exhaustive dispatch, honest-no-op for unresolvable assets, and the
 * markdown allow-list (no raw HTML injection from block content).
 */
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { CONTENT_BLOCK_TYPES, type ContentBlockType } from '@maihan/contracts';
import { renderContentBlock, renderPageBlocks, CMS_BLOCK_RENDERERS } from './block-renderers.js';

const S = (ui: React.ReactElement): string => renderToStaticMarkup(ui);
const b = (type: ContentBlockType, props: Record<string, unknown>, id = 'b1') =>
  renderContentBlock({ id, type, props });

describe('renderer registry completeness (plan §19 task 1)', () => {
  it('has exactly one renderer per content_block_type (20 total)', () => {
    expect(CONTENT_BLOCK_TYPES).toHaveLength(20);
    for (const t of CONTENT_BLOCK_TYPES) {
      expect((CMS_BLOCK_RENDERERS as Record<string, unknown>)[t], t).toBeDefined();
    }
  });

  it('renders every type without throwing', () => {
    for (const t of CONTENT_BLOCK_TYPES) {
      expect(() => S(b(t, sampleProps(t)))).not.toThrow();
    }
  });
});

function sampleProps(t: ContentBlockType): Record<string, unknown> {
  switch (t) {
    case 'HERO': return { title: 'The Maihan Register', primaryHref: '/search', primaryLabel: 'Explore' };
    case 'RICH_TEXT': return { markdown: '# ignored h1\n\n### Care\n\nA *rare* **stone**' };
    case 'IMAGE': return { assetId: '00000000-0000-4000-8000-000000000000', alt: 'Emerald' };
    case 'IMAGE_GALLERY': return { items: [{ assetId: '00000000-0000-4000-8000-000000000001', alt: 'A' }] };
    case 'PRODUCT_COLLECTION': return { title: 'Rings', sourceUrls: ['https://example.com/p1'] };
    case 'GEMSTONE_COLLECTION': return { title: 'Emeralds', gemRefs: ['K1324'] };
    case 'CATEGORY_GRID': return { title: 'Categories', items: [{ label: 'Rings', href: '/search' }, { label: 'Pairs', href: '/search?kind=pair' }] };
    case 'FAQ': return { items: [{ question: 'Treatments?', answer: 'Disclosed per certificate.' }] };
    case 'BUYING_GUIDE': return { sections: [{ heading: 'Weights', markdown: 'Carat ranges.' }] };
    case 'CERTIFICATE_GUIDE': return { sections: [{ heading: 'GIA', markdown: 'Number recall.' }] };
    case 'COMPARISON_TABLE': return { title: 'Compare', columns: ['Stone', 'Origin'], rows: [['K1324', 'Zambia']] };
    case 'VIDEO': return { title: 'Film', externalUrl: 'https://example.com/v' };
    case 'CTA': return { label: 'Enquire', href: '/contact', tone: 'PRIMARY' };
    case 'BANNER': return { message: 'Studio open', href: '/visit' };
    case 'TESTIMONIAL': return { quote: 'Beautiful stones.', attribution: 'A client' };
    case 'SHOWROOM_CTA': return { heading: 'Private viewings', body: 'By appointment.', href: '/showroom' };
    case 'VEDIC_CTA': return { heading: 'Birthstone alignment', href: '/vedic' };
    case 'ASTROLOGY_CONTENT': return { markdown: 'Emerald supports Mercury.', sign: 'Taurus' };
    case 'CUSTOM_DESIGN_CTA': return { heading: 'Design your own' };
    case 'CONTACT_CTA': return { heading: 'Visit us', city: 'Dubai' };
  }
}

describe('markdown allow-list (doc 09 text subset)', () => {
  it('renders only the allowed block/inline subset', () => {
    const html = S(b('RICH_TEXT', { markdown: '### Care\n\nA *rare* **stone** and `code`\n\n- one\n- two' }));
    expect(html).toContain('<h3>');
    expect(html).toContain('<em>rare</em>');
    expect(html).toContain('<strong>stone</strong>');
    expect(html).toContain('<code>code</code>');
    expect(html).toContain('<li>one</li>');
  });

  it('escapes injected HTML in block content (no sanitizer shortcut)', () => {
    const html = S(b('RICH_TEXT', { markdown: '<script>alert(1)</script>' }));
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('renders safe links and strips unsafe link targets', () => {
    const ok = S(b('RICH_TEXT', { markdown: '[Shop](/search)' }));
    expect(ok).toContain('<a href="/search">');
    const bad = S(b('RICH_TEXT', { markdown: '[X](javascript:alert(1))' }));
    expect(bad).not.toContain('javascript:');
  });
});

describe('honest rendering rules', () => {
  it('media blocks expose the approved asset reference, never a guessed URL', () => {
    const html = S(b('IMAGE', { assetId: '00000000-0000-4000-8000-000000000000', alt: 'Emerald' }));
    expect(html).toContain('data-asset-id');
    expect(html).not.toMatch(/<img\s/);
  });

  it('CTA renders the target href as a real anchor', () => {
    const html = S(b('CTA', { label: 'Enquire', href: '/contact', tone: 'PRIMARY' }));
    expect(html).toContain('href="/contact"');
  });

  it('FAQ pairs question and answer for assistive tech', () => {
    const html = S(b('FAQ', { items: [{ question: 'Q1', answer: 'A1' }] }));
    expect(html).toContain('<dt>Q1</dt>');
    expect(html).toContain('<dd>A1</dd>');
  });
});

describe('page composition', () => {
  it('renders several blocks in document order', () => {
    const html = S(<>
      {renderPageBlocks([
        { id: 'h', type: 'HERO', props: { title: 'T' } },
        { id: 'r', type: 'RICH_TEXT', props: { markdown: 'Body' } },
      ])}
    </>);
    expect(html.indexOf('T')).toBeGreaterThan(-1);
    expect(html.indexOf('Body')).toBeGreaterThan(html.indexOf('T'));
  });
});
