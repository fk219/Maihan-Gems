/**
 * apps/web/src/components/design-system/design-system.spec.tsx
 *
 * Task 2 — focused primitive tests: rendering, typing, and the accessibility
 * contract (semantic elements, roles, aria attributes).
 *
 * Server-rendered with react-dom/server — the primitives are Server
 * Components and must render in the node environment with zero client JS.
 * Assertions target the semantic contract, not implementation detail.
 */
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { Badge } from './Badge.js';
import { Card } from './Card.js';
import { Skeleton } from './Skeleton.js';
import { EmptyState } from './EmptyState.js';
import { ErrorState } from './ErrorState.js';
import { SpecTable } from './SpecTable.js';
import { Money } from './Money.js';
import { Breadcrumbs } from './Breadcrumbs.js';
import { Pagination } from './Pagination.js';
import { ProductCard } from '../catalog/ProductCard.js';
import { productDetailFixture } from '../../modules/catalog/testing/doubles.js';

const S = (ui: React.ReactElement): string => renderToStaticMarkup(ui);

describe('Badge', () => {
  it('renders a plain span for decorative labels', () => {
    expect(S(<Badge tone="neutral">Configured piece</Badge>)).toContain('badge--neutral');
  });

  it('marks live state badges with role=status for assistive tech', () => {
    expect(S(<Badge tone="positive" live>Available</Badge>)).toContain('role="status"');
  });

  it('renders all four tones without page-local variants', () => {
    for (const tone of ['neutral', 'positive', 'warning', 'critical'] as const) {
      expect(S(<Badge tone={tone}>x</Badge>)).toContain(`badge--${tone}`);
    }
  });
});

describe('Card', () => {
  it('is a semantic article', () => {
    expect(S(<Card>body</Card>)).toMatch(/^<article/);
  });

  it('renders its primary action as a real link (never an overlay div)', () => {
    const html = S(
      <Card href="/products/p" linkLabel="Pave ring">
        body
      </Card>,
    );
    expect(html).toContain('<a class="card__link" href="/products/p">Pave ring</a>');
  });
});

describe('Skeleton', () => {
  it('is decorative — aria-hidden, no spinner, explicit dimensions', () => {
    const html = S(<Skeleton width="200px" height="24px" variant="text" />);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('width:200px');
    expect(html).toContain('skeleton--text');
    expect(html.toLowerCase()).not.toContain('spinner');
  });
});

describe('EmptyState', () => {
  it('announces politely and always carries its next action', () => {
    const html = S(
      <EmptyState title="No gemstones match these filters." action={<a href="/search">Browse all</a>}>
        Adjust or clear a filter.
      </EmptyState>,
    );
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('No gemstones match these filters.');
    expect(html).toContain('href="/search"');
  });
});

describe('ErrorState', () => {
  it('is announced via role=alert and exposes its recovery action', () => {
    const html = S(
      <ErrorState title="Something went wrong." recovery={<a href="/">Return home</a>} />,
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain('Return home');
  });
});

describe('SpecTable', () => {
  it('uses real table semantics with a caption and row headers', () => {
    const html = S(
      <SpecTable caption="Specifications" rows={[{ label: 'Weight', value: '1.28 ct' }]} />,
    );
    expect(html).toContain('<table');
    expect(html).toContain('<caption');
    expect(html).toContain('<th scope="row">Weight</th>');
  });

  it('renders nothing for an empty row set (honest empty handling)', () => {
    expect(S(<SpecTable caption="Specifications" rows={[]} />)).toBe('');
  });
});

describe('Money', () => {
  it('formats a contract amount with Intl and declares the currency code to AT', () => {
    const html = S(<Money amount={1250} currency="USD" />);
    expect(html).toContain('$1,250.00');
    expect(html).toContain('USD');
  });
});

describe('Breadcrumbs', () => {
  it('is a labelled nav with an ordered list; the current page is not a link', () => {
    const html = S(
      <Breadcrumbs
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Green Tourmaline', href: '/green-tourmaline' },
          { label: 'Pave Ring' },
        ]}
      />,
    );
    expect(html).toContain('aria-label="Breadcrumb"');
    expect(html).toContain('<ol');
    expect(html).toContain('aria-current="page"');
  });
});

describe('Pagination', () => {
  it('renders a real next link only when the API says has_more', () => {
    const html = S(
      <Pagination basePath="/green-tourmaline" previousCursor={null} nextCursor="abc" hasNext />,
    );
    expect(html).toContain('rel="next"');
    expect(html).toContain('cursor=abc');
    expect(html).not.toContain('rel="prev"');
  });

  it('renders nothing when the page is the only page', () => {
    expect(
      S(<Pagination basePath="/x" previousCursor={null} nextCursor={null} hasNext={false} />),
    ).toBe('');
  });
});

describe('ProductCard', () => {
  const product = productDetailFixture();

  it('renders the summary view model verbatim with a real product link', () => {
    const html = S(<ProductCard product={product} />);
    expect(html).toContain(product.title);
    expect(html).toContain(`href="/products/${product.slug}"`);
    expect(html).toContain('ct');
  });

  it('shows the availability badge as live state', () => {
    const html = S(<ProductCard product={product} />);
    expect(html).toContain('role="status"');
  });
});
