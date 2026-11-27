/**
 * apps/web/src/routing/canonical-product-routes.spec.ts
 *
 * Regression: SoT 12.2 names ONE product detail route — `products/[slug]`
 * ("canonical product detail"). Every other product-detail URL is a permanent
 * redirect to it:
 *
 *   /product/[slug]                    -> 301/308 /products/[slug]
 *   /[varietySlug]/[productSlug]       -> 301/308 /products/[slug]
 *   /[varietySlug]-rings/[productSlug] -> 301/308 /products/[slug]
 *
 * `permanentRedirect` is mocked, so these tests assert the call the routes
 * make: the mocked module exposes no `redirect()`, which means a temporary
 * redirect would fail outright. Next documents `permanentRedirect` as a 308
 * response in a Server Component (`permanentRedirect` API reference), and the
 * SoT 13.1 table states the same permanent intent as 301.
 *
 * The canonical page is exercised with the same mocked adapter and must return
 * its element; the alias routes must never render.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GEMSTONES } from '../lib/mgh/fixtures/catalog.js';

const harness = vi.hoisted(() => {
  class PermanentRedirectSignal extends Error {
    constructor(readonly path: string) {
      super(`permanentRedirect:${path}`);
    }
  }
  class NotFoundSignal extends Error {}
  return {
    PermanentRedirectSignal,
    NotFoundSignal,
    redirects: [] as string[],
    notFounds: 0,
  };
});

vi.mock('next/navigation', () => ({
  permanentRedirect: (path: string): never => {
    harness.redirects.push(path);
    throw new harness.PermanentRedirectSignal(path);
  },
  notFound: (): never => {
    harness.notFounds += 1;
    throw new harness.NotFoundSignal();
  },
}));

const adapter = vi.hoisted(() => ({ getPdpCatalogGemstone: vi.fn() }));

vi.mock('../lib/mgh/adapters/catalog.js', () => ({
  getPdpCatalogGemstone: adapter.getPdpCatalogGemstone,
}));

// The canonical page mounts the applet PDP; its client bundle is not the
// subject of this test and must not be constructed in a node environment.
vi.mock('@/components/mgh/catalog/ProductDetailView', () => ({
  ProductDetailView: () => null,
}));

vi.mock('next/headers', () => ({
  headers: async (): Promise<Headers> => new Headers(),
}));

import CanonicalProductPage from '../app/(storefront)/products/[productSlug]/page.js';
import ProductAliasPage from '../app/(storefront)/product/[slug]/page.js';
import VarietyProductAliasPage from '../app/(storefront)/[varietySlug]/[productSlug]/page.js';
import ReadyMadeProductAliasPage from '../app/(storefront)/[varietySlug]-rings/[productSlug]/page.js';

const stone = GEMSTONES[0]!;

const aliases = [
  {
    name: '/product/[slug]',
    call: (slug: string): Promise<never> => ProductAliasPage({ params: Promise.resolve({ slug }) }),
  },
  {
    name: '/[varietySlug]/[productSlug]',
    call: (slug: string): Promise<never> =>
      VarietyProductAliasPage({
        params: Promise.resolve({ varietySlug: 'tsavorite-garnet', productSlug: slug }),
      }),
  },
  {
    name: '/[varietySlug]-rings/[productSlug]',
    call: (slug: string): Promise<never> =>
      ReadyMadeProductAliasPage({
        params: Promise.resolve({ varietySlug: 'tsavorite-garnet', productSlug: slug }),
      }),
  },
] as const;

function resolved() {
  return {
    stone,
    displayTitle: stone.name,
    productDetail: null,
    breadcrumbVariety: null,
  };
}

describe('one canonical product detail (SoT 12.2)', () => {
  beforeEach(() => {
    harness.redirects.length = 0;
    harness.notFounds = 0;
    adapter.getPdpCatalogGemstone.mockReset();
  });

  it('the canonical /products/[productSlug] route still renders', async () => {
    adapter.getPdpCatalogGemstone.mockResolvedValue(resolved());

    const element = await CanonicalProductPage({
      params: Promise.resolve({ productSlug: stone.slug }),
    });

    expect(element).toBeTruthy();
    expect(harness.redirects).toEqual([]);
    expect(harness.notFounds).toBe(0);
    expect(adapter.getPdpCatalogGemstone).toHaveBeenCalledWith(stone.slug);
  });

  it.each(aliases)('$name permanently redirects to the canonical detail', async ({ call }) => {
    adapter.getPdpCatalogGemstone.mockResolvedValue(resolved());

    await expect(call(stone.slug)).rejects.toBeInstanceOf(harness.PermanentRedirectSignal);

    expect(harness.redirects).toEqual([`/products/${stone.slug}`]);
    expect(harness.notFounds).toBe(0);
  });

  it.each(aliases)('$name 404s an unresolved identifier instead of redirecting', async ({ call }) => {
    adapter.getPdpCatalogGemstone.mockResolvedValue(null);

    await expect(call('no-such-product')).rejects.toBeInstanceOf(harness.NotFoundSignal);

    expect(harness.redirects).toEqual([]);
    expect(harness.notFounds).toBe(1);
  });

  it('redirects to the catalogue slug, never to the raw alias identifier', async () => {
    adapter.getPdpCatalogGemstone.mockResolvedValue(resolved());

    await expect(
      ProductAliasPage({ params: Promise.resolve({ slug: 'MG-TZ-0131' }) }),
    ).rejects.toBeInstanceOf(harness.PermanentRedirectSignal);

    expect(adapter.getPdpCatalogGemstone).toHaveBeenCalledWith('MG-TZ-0131');
    expect(harness.redirects).toEqual([`/products/${stone.slug}`]);
  });

  it('lets a catalogue failure reach the error boundary, never mislabels it as 404', async () => {
    adapter.getPdpCatalogGemstone.mockRejectedValue(new Error('catalogue unavailable'));

    await expect(
      ReadyMadeProductAliasPage({
        params: Promise.resolve({ varietySlug: 'tsavorite-garnet', productSlug: 'no-such-product' }),
      }),
    ).rejects.toThrow('catalogue unavailable');

    expect(harness.notFounds).toBe(0);
    expect(harness.redirects).toEqual([]);
  });
});
