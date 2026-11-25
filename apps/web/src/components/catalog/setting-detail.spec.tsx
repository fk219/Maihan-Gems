/**
 * apps/web/src/components/catalog/setting-detail.spec.tsx
 *
 * The setting-detail page used to render a fixed table of "specifications"
 * (prong alloy, finish, compatibility) that came from no record. These tests
 * pin the correction: the page renders the catalog service's design and its
 * real variants, keeps evidence statuses verbatim, and 404s an unknown code
 * instead of inventing a mounting.
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

afterEach(() => {
  setCatalogServiceForTest(undefined);
});

describe('SettingDetailPage — record-backed rendering', () => {
  it('renders the design, its metal variants and the stored evidence status', async () => {
    const port = new FakeCatalogPort();
    port.setSettingList({
      items: [settingDesignFixture('JS1409')],
      facets: { variety: [], color: [], jewellery_type: [], metal: [], settingStyle: [], shape: [], origin: [], treatment: [] },
      rejected_filters: [],
      meta: { limit: 24, has_more: false, next_cursor: null },
    });
    wire(port);

    const html = renderToStaticMarkup(
      await SettingDetailPage({ params: Promise.resolve({ settingSku: 'JS1409' }) }),
    );

    expect(html).toContain('Pave Setting');
    expect(html).toContain('JS1409W14');
    expect(html).toContain('Metal variants');
    expect(html).toContain('OBSERVED');
    // The old page hard-coded these claims; none of them is in the record.
    expect(html).not.toContain('Cold-drawn high-tensile wire');
    expect(html).not.toContain('Haute Joaillerie Mirror Polish');
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
