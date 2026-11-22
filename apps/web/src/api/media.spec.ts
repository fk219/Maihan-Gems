/**
 * apps/web/src/api/media.spec.ts — A5 contract.
 *
 * No database and no bucket: the handler runs against a fake `execute` that
 * returns one assets row, and a fake `ObjectStorage` that returns a CDN URL.
 * That is enough to prove the three outcomes that matter — redirect, 404
 * envelope, and fail-closed when storage is not wired.
 */
import { describe, expect, it } from 'vitest';
import type { ObjectStorage } from '@maihan/db';
import { createCatalogApi } from './index.js';
import { lookupRoute } from './routes.js';
import { MEDIA_CACHE_CONTROL } from './media-handlers.js';
import type { CatalogQueryService } from '../modules/catalog/index.js';

const ASSET_ID = '9f1d7a5e-3c2b-4a6d-8e0f-1a2b3c4d5e6f';
const IDS = { traceId: '00000000000000000000000000000a55', requestId: 'req_test_media' };

const dummyService = {} as CatalogQueryService;

function storage(): ObjectStorage {
  return {
    async put(input) {
      return { key: input.key, size: input.body.byteLength, contentType: input.contentType, sha256: 'f' };
    },
    async get() {
      return null;
    },
    async head() {
      return null;
    },
    async delete() {
      return undefined;
    },
    publicUrl(key) {
      return `https://cdn.example.com/${key}`;
    },
  };
}

function dbWith(row: Record<string, unknown> | null): { execute: () => Promise<{ rows: unknown[] }>; calls: number } {
  const db = {
    calls: 0,
    async execute() {
      db.calls += 1;
      return { rows: row === null ? [] : [row] };
    },
  };
  return db;
}

function assetRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: ASSET_ID,
    kind: 'IMAGE',
    role: 'PRIMARY',
    storage_key: 'ab/cd/' + 'a'.repeat(64) + '.jpg',
    processing_state: 'READY',
    ...overrides,
  };
}

function request(path = `/api/v1/media/${ASSET_ID}`): Request {
  return new Request(`http://localhost:3000${path}`, { method: 'GET' });
}

describe('GET /api/v1/media/{assetId}', () => {
  it('registers both the versioned and legacy paths', () => {
    expect(lookupRoute('GET', `/api/v1/media/${ASSET_ID}`)).toMatchObject({
      kind: 'match',
      route: { id: 'getMediaAssetHandler', method: 'GET', path: '/api/v1/media/{assetId}' },
    });
    expect(lookupRoute('GET', `/media/${ASSET_ID}`)).toMatchObject({
      kind: 'match',
      route: { id: 'getMediaAssetHandler' },
    });
  });

  it('302s a READY public asset to storage.publicUrl with immutable caching', async () => {
    const api = createCatalogApi({
      service: dummyService,
      ids: () => ({ ...IDS }),
      db: dbWith(assetRow()) as never,
      mediaStorage: storage(),
    });

    const response = await api(request());

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(
      `https://cdn.example.com/ab/cd/${'a'.repeat(64)}.jpg`,
    );
    expect(response.headers.get('cache-control')).toBe(MEDIA_CACHE_CONTROL);
    expect(response.headers.get('x-trace-id')).toBe(IDS.traceId);
    expect(await response.text()).toBe('');
  });

  it('returns the 404 envelope for an unknown asset', async () => {
    const api = createCatalogApi({
      service: dummyService,
      ids: () => ({ ...IDS }),
      db: dbWith(null) as never,
      mediaStorage: storage(),
    });

    const response = await api(request());

    expect(response.status).toBe(404);
    const body = (await response.json()) as { error: { code: string; requestId: string; traceId: string } };
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.requestId).toBe(IDS.requestId);
    expect(body.error.traceId).toBe(IDS.traceId);
  });

  it('refuses malformed ids before they reach Postgres', async () => {
    const db = dbWith(assetRow());
    const api = createCatalogApi({
      service: dummyService,
      ids: () => ({ ...IDS }),
      db: db as never,
      mediaStorage: storage(),
    });

    const response = await api(request('/api/v1/media/not-a-uuid'));

    expect(response.status).toBe(404);
    expect(db.calls).toBe(0);
  });

  it('refuses assets that are not READY or have no key', async () => {
    for (const overrides of [
      { processing_state: 'PENDING' },
      { processing_state: 'FAILED' },
      { storage_key: null },
    ]) {
      const api = createCatalogApi({
        service: dummyService,
        ids: () => ({ ...IDS }),
        db: dbWith(assetRow(overrides)) as never,
        mediaStorage: storage(),
      });
      expect((await api(request())).status).toBe(404);
    }
  });

  it('refuses private certificate, report and appraisal media', async () => {
    for (const overrides of [
      { kind: 'CERTIFICATE', role: 'CERTIFICATE' },
      { kind: 'REPORT', role: 'REPORT' },
      { kind: 'IMAGE', role: 'APPRAISAL' },
    ]) {
      const api = createCatalogApi({
        service: dummyService,
        ids: () => ({ ...IDS }),
        db: dbWith(assetRow(overrides)) as never,
        mediaStorage: storage(),
      });
      expect((await api(request())).status).toBe(404);
    }
  });

  it('fails closed with 500 INTERNAL when media storage is not wired', async () => {
    const api = createCatalogApi({
      service: dummyService,
      ids: () => ({ ...IDS }),
      db: dbWith(assetRow()) as never,
    });

    const response = await api(request());
    expect(response.status).toBe(500);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe('INTERNAL');
  });

  it('allows only GET', async () => {
    const api = createCatalogApi({
      service: dummyService,
      ids: () => ({ ...IDS }),
      db: dbWith(assetRow()) as never,
      mediaStorage: storage(),
    });

    const response = await api(
      new Request(`http://localhost:3000/api/v1/media/${ASSET_ID}`, { method: 'POST' }),
    );
    expect(response.status).toBe(405);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe('METHOD_NOT_ALLOWED');
  });
});
