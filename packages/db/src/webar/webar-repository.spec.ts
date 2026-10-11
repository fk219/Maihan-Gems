import { describe, it, expect, vi } from 'vitest';
import {
  validateWebarAssetBudgets,
  createArHandoffToken,
  redeemArHandoffToken,
  findWebarAssetById,
} from './webar-repository.js';
import type { DbClient } from '../pool.js';
import { WEBAR_BUDGETS } from '@maihan/contracts';

describe('WebAR Repository & Budgets (Phase 11)', () => {
  describe('validateWebarAssetBudgets', () => {
    it('accepts assets within triangle, byte, and texture budget limits', () => {
      const ringBudget = WEBAR_BUDGETS.RING;
      const res = validateWebarAssetBudgets({
        jewelleryType: 'RING',
        polyCount: ringBudget.maxTriangles - 100,
        fileBytes: ringBudget.maxBytes - 1000,
        textureMaxPx: 1024,
      });
      expect(res.valid).toBe(true);
      expect(res.violations).toHaveLength(0);
    });

    it('rejects asset exceeding triangle budget', () => {
      const res = validateWebarAssetBudgets({
        jewelleryType: 'RING',
        polyCount: 65000, // Limit is 60,000
        fileBytes: 1000000,
        textureMaxPx: 1024,
      });
      expect(res.valid).toBe(false);
      expect(res.violations[0]).toContain('Polygon count (65000) exceeds budget');
    });

    it('rejects asset exceeding byte size budget', () => {
      const res = validateWebarAssetBudgets({
        jewelleryType: 'EARRINGS',
        polyCount: 40000,
        fileBytes: Math.floor(2.0 * 1024 * 1024), // Limit is 1.5MB
        textureMaxPx: 1024,
      });
      expect(res.valid).toBe(false);
      expect(res.violations[0]).toContain('File size');
    });

    it('rejects asset exceeding max texture dimensions', () => {
      const res = validateWebarAssetBudgets({
        jewelleryType: 'PENDANT',
        polyCount: 30000,
        fileBytes: 800000,
        textureMaxPx: 2048, // Limit is 1024
      });
      expect(res.valid).toBe(false);
      expect(res.violations[0]).toContain('Texture resolution (2048px) exceeds max allowed');
    });
  });

  describe('createArHandoffToken & redeemArHandoffToken', () => {
    it('creates a token, stores its SHA-256 hash, and generates desktop QR URL', async () => {
      const mockQuery = vi.fn().mockResolvedValue({ rowCount: 1 });
      const mockDb = { query: mockQuery } as unknown as DbClient;

      const result = await createArHandoffToken(mockDb, {
        webarAssetId: 'a0000000-0000-0000-0000-000000000001',
        baseUrl: 'https://maihan.gems',
      });

      expect(result.rawToken).toBeDefined();
      expect(result.rawToken.length).toBeGreaterThan(16);
      expect(result.handoffUrl).toContain('https://maihan.gems/ar/handoff/');
      expect(result.expiresAt).toBeDefined();

      expect(mockQuery).toHaveBeenCalledOnce();
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain('INSERT INTO ar_handoff_tokens');
      // Params: [tokenHash, productId, webarAssetId, expiresAt]
      expect(params[0]).not.toBe(result.rawToken); // Must store hash, not raw token
    });

    it('successfully redeems an unconsumed valid token', async () => {
      const mockQuery = vi.fn()
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            {
              id: 'b0000000-0000-0000-0000-000000000001',
              webar_asset_id: 'a0000000-0000-0000-0000-000000000001',
              product_id: 'c0000000-0000-0000-0000-000000000001',
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
        .mockResolvedValueOnce({
          rowCount: 1,
        });
      const mockDb = { query: mockQuery } as unknown as DbClient;

      const redemption = await redeemArHandoffToken(mockDb, 'valid_raw_token');
      expect(redemption.webarAssetId).toBe('a0000000-0000-0000-0000-000000000001');
      expect(redemption.cdnUrl).toBe('https://cdn.maihan.gems/models/ring.glb');
      expect(redemption.fitRule.fingerIndex).toBe(3);
    });

    it('rejects token replay when already consumed', async () => {
      const mockQuery = vi.fn().mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 'b0000000-0000-0000-0000-000000000001',
            webar_asset_id: 'a0000000-0000-0000-0000-000000000001',
            consumed_at: new Date(Date.now() - 5000).toISOString(),
            expires_at: new Date(Date.now() + 60000).toISOString(),
          },
        ],
      });
      const mockDb = { query: mockQuery } as unknown as DbClient;

      await expect(redeemArHandoffToken(mockDb, 'already_used_token')).rejects.toThrowError(
        /AR_HANDOFF_REPLAYED/
      );
    });

    it('rejects an expired token', async () => {
      const mockQuery = vi.fn().mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: 'b0000000-0000-0000-0000-000000000001',
            webar_asset_id: 'a0000000-0000-0000-0000-000000000001',
            consumed_at: null,
            expires_at: new Date(Date.now() - 60000).toISOString(), // expired
          },
        ],
      });
      const mockDb = { query: mockQuery } as unknown as DbClient;

      await expect(redeemArHandoffToken(mockDb, 'expired_token')).rejects.toThrowError(
        /AR_HANDOFF_INVALID/
      );
    });
  });

  describe('findWebarAssetById', () => {
    it('returns null when asset is not found', async () => {
      const mockQuery = vi.fn().mockResolvedValue({ rowCount: 0, rows: [] });
      const mockDb = { query: mockQuery } as unknown as DbClient;

      const asset = await findWebarAssetById(mockDb, 'a0000000-0000-0000-0000-000000000000');
      expect(asset).toBeNull();
    });

    it('returns parsed WebarAssetReadModel when found', async () => {
      const mockQuery = vi.fn().mockResolvedValue({
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
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      });
      const mockDb = { query: mockQuery } as unknown as DbClient;

      const asset = await findWebarAssetById(mockDb, 'a0000000-0000-0000-0000-000000000001');
      expect(asset).not.toBeNull();
      expect(asset?.id).toBe('a0000000-0000-0000-0000-000000000001');
      expect(asset?.jewelleryType).toBe('RING');
      expect(asset?.fitRule.fingerIndex).toBe(3);
    });
  });
});
