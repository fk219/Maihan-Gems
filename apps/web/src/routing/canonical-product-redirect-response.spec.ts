/**
 * apps/web/src/routing/canonical-product-redirect-response.spec.ts
 *
 * The 308 at the framework boundary, not just "the page called
 * `permanentRedirect`".
 *
 * `next/navigation` is NOT mocked here. The real `permanentRedirect` runs and
 * throws the error Next's request pipeline recognises:
 *
 *   NEXT_REDIRECT;replace;<destination>;308;
 *
 * `isRedirectError` (next/dist/client/components/redirect-error) splits that
 * digest and requires `NEXT_REDIRECT`, `replace|push`, a destination and a
 * status in `RedirectStatusCode`; the App Router turns the same error into the
 * HTTP response. Asserting the exact digest therefore proves the 308 and the
 * Location the framework will emit, without a socket.
 *
 * Scope: this is framework-level, not socket-level. A true socket-level proof
 * would need `next start` plus a Playwright spec under `e2e/`, but the monorepo
 * has no E2E runner configured: no `playwright.config.*`, no `test:e2e` script,
 * and `e2e/` holds only a README. Playwright is a devDependency used by the
 * design-audit scripts, not a configured runner, so a Playwright spec would
 * have to invent a runner first. The catalogue adapter is mocked; Next is not.
 *
 * Routes covered:
 *   /[varietySlug] (single-segment stone fallback) -> 308 /products/<slug>
 *   /product/[slug]                                -> 308 /products/<slug>
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GEMSTONES } from '../lib/mgh/fixtures/catalog.js';

const adapter = vi.hoisted(() => ({
  getPdpCatalogGemstone: vi.fn(),
  getCatalogVarietyCollection: vi.fn(),
  getCatalogColourCollection: vi.fn(),
  getCatalogGemstoneBySlugOrId: vi.fn(),
}));

vi.mock('../lib/mgh/adapters/catalog.js', () => ({
  getPdpCatalogGemstone: adapter.getPdpCatalogGemstone,
  getCatalogVarietyCollection: adapter.getCatalogVarietyCollection,
  getCatalogColourCollection: adapter.getCatalogColourCollection,
  getCatalogGemstoneBySlugOrId: adapter.getCatalogGemstoneBySlugOrId,
}));

// The redirect branches never render the explorer; its client bundle is not
// the subject here and must not be constructed in a node environment.
vi.mock('@/components/mgh/catalog/CollectionExplorer', () => ({
  CollectionExplorer: () => null,
}));

import ProductAliasPage from '../app/(storefront)/product/[slug]/page.js';
import VarietyRootPage from '../app/(storefront)/[varietySlug]/page.js';

const stone = GEMSTONES[0]!;

interface ThrownDigest {
  digest: string;
}

async function thrownBy(run: () => Promise<unknown>): Promise<ThrownDigest> {
  try {
    await run();
  } catch (error) {
    if (typeof error !== 'object' || error === null || !('digest' in error)) {
      throw error;
    }
    const digest = (error as { digest?: unknown }).digest;
    if (typeof digest !== 'string') throw error;
    return { digest };
  }
  throw new Error('expected the route to throw a framework signal, but it returned');
}

function redirectDestination(digest: string): string {
  return digest.split(';').slice(2, -2).join(';');
}

function redirectStatus(digest: string): string | undefined {
  return digest.split(';').at(-2);
}

describe('canonical product redirect is a 308 at the framework boundary', () => {
  beforeEach(() => {
    adapter.getPdpCatalogGemstone.mockReset();
    adapter.getCatalogVarietyCollection.mockReset().mockResolvedValue(null);
    adapter.getCatalogColourCollection.mockReset().mockResolvedValue(null);
    adapter.getCatalogGemstoneBySlugOrId.mockReset().mockResolvedValue(null);
  });

  it('single-segment stone fallback emits the exact permanent-redirect digest', async () => {
    adapter.getPdpCatalogGemstone.mockResolvedValue({
      stone,
      displayTitle: stone.name,
      productDetail: null,
      breadcrumbVariety: null,
    });

    const { digest } = await thrownBy(() =>
      VarietyRootPage({ params: Promise.resolve({ varietySlug: stone.slug }) }),
    );

    expect(digest).toBe(`NEXT_REDIRECT;replace;/products/${stone.slug};308;`);
    expect(redirectDestination(digest)).toBe(`/products/${stone.slug}`);
    expect(redirectStatus(digest)).toBe('308');
  });

  it('single-segment fallback resolves through the canonical PDP adapter', async () => {
    adapter.getPdpCatalogGemstone.mockResolvedValue({
      stone,
      displayTitle: stone.name,
      productDetail: null,
      breadcrumbVariety: null,
    });

    await thrownBy(() =>
      VarietyRootPage({ params: Promise.resolve({ varietySlug: stone.id }) }),
    );

    expect(adapter.getPdpCatalogGemstone).toHaveBeenCalledWith(stone.id);
  });

  it('single-segment fallback keeps the 404 for an unresolved segment', async () => {
    adapter.getPdpCatalogGemstone.mockResolvedValue(null);

    const { digest } = await thrownBy(() =>
      VarietyRootPage({ params: Promise.resolve({ varietySlug: 'no-such-product' }) }),
    );

    expect(digest).toBe('NEXT_HTTP_ERROR_FALLBACK;404');
  });

  it('/product/[slug] also emits the exact permanent-redirect digest', async () => {
    adapter.getPdpCatalogGemstone.mockResolvedValue({
      stone,
      displayTitle: stone.name,
      productDetail: null,
      breadcrumbVariety: null,
    });

    const { digest } = await thrownBy(() =>
      ProductAliasPage({ params: Promise.resolve({ slug: stone.slug }) }),
    );

    expect(digest).toBe(`NEXT_REDIRECT;replace;/products/${stone.slug};308;`);
  });
});
