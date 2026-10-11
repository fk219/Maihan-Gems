import { describe, it, expect, vi } from 'vitest';
import { createCatalogApi } from './index.js';
import type { CatalogQueryService } from '../modules/catalog/index.js';
import type { DbClient } from '@maihan/db';

describe('WebAR API Handlers (Phase 11 Task 4)', () => {
  const dummyService = {} as CatalogQueryService;

  it('GET /api/v1/webar/:assetId returns asset data on success', async () => {
    const mockDb = {
      query: vi.fn().mockResolvedValue({
        rowCount: 1,
        rows: [
          {
            id: 'a0000000-0000-0000-0000-000000000001',
            asset_id: null,
            product_id: null,
            setting_variant_id: null,
            jewellery_type: 'RING',
            model_format: 'GLB',
            compression: null,
            storage_key: 'models/ring.glb',
            cdn_url: 'https://cdn.maihan.gems/models/ring.glb',
            hdr_env_key: null,
            texture_max_px: 1024,
            poly_count: 45000,
            vertex_count: 30000,
            file_bytes: 1200000,
            fit_rule: {
              anchorSegment: 'PROXIMAL_PHALANX',
              fingerIndex: 3,
              baseScale: 1.0,
              scaleMin: 0.7,
              scaleMax: 1.4,
              rotationOffset: { x: 0, y: 0, z: 0 },
              positionOffset: { x: 0, y: 0, z: 0 },
            },
            state: 'READY',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
      }),
    } as unknown as DbClient;

    const api = createCatalogApi({
      service: dummyService,
      db: mockDb,
    });

    const req = new Request('http://localhost/api/v1/webar/a0000000-0000-0000-0000-000000000001', {
      method: 'GET',
    });

    const res = await api(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data).toBeDefined();
    expect(body.data.id).toBe('a0000000-0000-0000-0000-000000000001');
    expect(body.data.cdnUrl).toBe('https://cdn.maihan.gems/models/ring.glb');
  });

  it('GET /api/v1/webar/:assetId returns 404 when asset not found', async () => {
    const mockDb = {
      query: vi.fn().mockResolvedValue({ rowCount: 0, rows: [] }),
    } as unknown as DbClient;

    const api = createCatalogApi({
      service: dummyService,
      db: mockDb,
    });

    const req = new Request('http://localhost/api/v1/webar/a0000000-0000-0000-0000-000000000099', {
      method: 'GET',
    });

    const res = await api(req);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('POST /api/v1/ar/handoff creates handoff token with hashed storage', async () => {
    const mockDb = {
      query: vi.fn().mockResolvedValue({ rowCount: 1 }),
    } as unknown as DbClient;

    const api = createCatalogApi({
      service: dummyService,
      db: mockDb,
    });

    const req = new Request('http://localhost/api/v1/ar/handoff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        webarAssetId: 'a0000000-0000-0000-0000-000000000001',
      }),
    });

    const res = await api(req);
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.data.rawToken).toBeDefined();
    expect(body.data.handoffUrl).toContain('/ar/handoff/');
    expect(body.data.expiresAt).toBeDefined();
  });

  it('GET /api/v1/ar/handoff/:token redeems single-use token and returns session', async () => {
    const mockDb = {
      query: vi.fn()
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            {
              id: 'b0000000-0000-0000-0000-000000000001',
              webar_asset_id: 'a0000000-0000-0000-0000-000000000001',
              product_id: null,
              consumed_at: null,
              expires_at: new Date(Date.now() + 600000).toISOString(),
              cdn_url: 'https://cdn.maihan.gems/models/ring.glb',
              jewellery_type: 'RING',
              fit_rule: {
                anchorSegment: 'PROXIMAL_PHALANX',
                fingerIndex: 3,
                baseScale: 1.0,
                scaleMin: 0.7,
                scaleMax: 1.4,
                rotationOffset: { x: 0, y: 0, z: 0 },
                positionOffset: { x: 0, y: 0, z: 0 },
              },
            },
          ],
        })
        .mockResolvedValueOnce({ rowCount: 1 }),
    } as unknown as DbClient;

    const api = createCatalogApi({
      service: dummyService,
      db: mockDb,
    });

    const req = new Request('http://localhost/api/v1/ar/handoff/valid_token_12345', {
      method: 'GET',
    });

    const res = await api(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.webarAssetId).toBe('a0000000-0000-0000-0000-000000000001');
    expect(body.data.cdnUrl).toBe('https://cdn.maihan.gems/models/ring.glb');
  });

  it('GET /api/v1/ar/handoff/:token rejects replayed token with 409 CONFLICT', async () => {
    const mockDb = {
      query: vi.fn().mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 'b0000000-0000-0000-0000-000000000001',
            webar_asset_id: 'a0000000-0000-0000-0000-000000000001',
            consumed_at: new Date(Date.now() - 5000).toISOString(),
            expires_at: new Date(Date.now() + 60000).toISOString(),
          },
        ],
      }),
    } as unknown as DbClient;

    const api = createCatalogApi({
      service: dummyService,
      db: mockDb,
    });

    const req = new Request('http://localhost/api/v1/ar/handoff/used_token_12345', {
      method: 'GET',
    });

    const res = await api(req);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.code).toBe('IDEMPOTENCY_CONFLICT');
  });
});
