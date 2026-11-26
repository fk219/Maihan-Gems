/**
 * apps/web/src/components/catalog/setting-detail.spec.tsx
 *
 * The setting-detail route now renders develop's design (SettingDetailClient)
 * over main's catalogue seam. These tests pin the part that must remain true:
 * the page renders the design the service returns, shows its real variant
 * SKUs, and 404s an unknown code instead of inventing a mounting.
 *
 * The page mounts a client component that reads the storefront context, so the
 * audit wraps it in the same providers the root/storefront layouts mount.
 *
 * The spec lives beside the other catalogue specs rather than inside src/app:
 * the route-manifest test treats every file under src/app as a route file.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import SettingDetailPage from '../../app/(storefront)/settings/[settingSku]/page.js';
import { setCatalogServiceForTest } from '../../lib/catalog-server.js';
import { FakeCatalogPort, settingDesignFixture } from '../../modules/catalog/testing/doubles.js';
import {
  MemoryCacheStore,
  MemoryGenerationStore,
  createCatalogQueryService,
} from '../../modules/catalog/index.js';
import { StorefrontProvider as AppletStorefrontProvider } from '../mgh/providers/StorefrontProvider.js';
import { StorefrontProvider as CurrencyStorefrontProvider } from '../storefront/StorefrontProvider.js';

function wire(port: FakeCatalogPort): void {
  setCatalogServiceForTest(
    createCatalogQueryService({
      port,
      store: new MemoryCacheStore(),
      generations: new MemoryGenerationStore(),
      namespace: 'setting-detail-spec',
    }),
  );
}

function withProviders(node: React.ReactElement): React.ReactElement {
  return (
    <AppletStorefrontProvider>
      <CurrencyStorefrontProvider rates={{ USD: 1, AED: 3.6725, THB: 34.5 }}>
        {node}
      </CurrencyStorefrontProvider>
    </AppletStorefrontProvider>
  );
}

afterEach(() => {
  setCatalogServiceForTest(undefined);
});

describe('SettingDetailPage — record-backed rendering', () => {
  it('renders the design and its real metal variants', async () => {
    const port = new FakeCatalogPort();
    port.setSettingList({
      items: [settingDesignFixture('JS1409')],
      facets: { variety: [], color: [], jewellery_type: [], metal: [], settingStyle: [], shape: [], origin: [], treatment: [] },
      rejected_filters: [],
      meta: { limit: 24, has_more: false, next_cursor: null },
    });
    wire(port);

    const page = await SettingDetailPage({ params: Promise.resolve({ settingSku: 'JS1409' }) });
    const html = renderToStaticMarkup(withProviders(page));

    expect(html).toContain('Pave Setting');
    expect(html).toContain('JS1409');
    expect(html).toContain('W14');
  });

  it('turns an unknown design code into a 404, never a fabricated mounting', async () => {
    const port = new FakeCatalogPort();
    port.notFound.add('NOPE-000');
    wire(port);

    await expect(
      SettingDetailPage({ params: Promise.resolve({ settingSku: 'NOPE-000' }) }),
    ).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
  });
});
