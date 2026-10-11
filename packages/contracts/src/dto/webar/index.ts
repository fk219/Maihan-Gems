/**
 * packages/contracts/src/dto/webar/index.ts
 *
 * Authority: technical_design/21_WEBAR_ARCHITECTURE.md §3, §7, §10
 *
 * WebAR & 3D Viewer DTOs:
 *   - Per-jewellery-type triangle, texture, and byte budgets
 *   - Fit rules for 3D placement and scaling
 *   - WebarAsset read models
 *   - QR Handoff token generation, verification, and redemption
 */
import { z } from 'zod';
import { JewelleryTypeSchema } from '../catalog/enums.js';

export const ModelFormatSchema = z.enum(['GLB', 'GLTF']);
export type ModelFormat = z.infer<typeof ModelFormatSchema>;

export const CompressionFormatSchema = z.enum(['DRACO', 'MESHOPT', 'NONE']);
export type CompressionFormat = z.infer<typeof CompressionFormatSchema>;

export const WebarAssetStateSchema = z.enum(['PENDING', 'FETCHING', 'READY', 'FAILED']);
export type WebarAssetState = z.infer<typeof WebarAssetStateSchema>;

/** Per-jewellery-type technical budget thresholds (doc 21 §3) */
export const WEBAR_BUDGETS: Record<
  z.infer<typeof JewelleryTypeSchema>,
  { maxTriangles: number; maxBytes: number; maxTexturePx: number; maxTextures: number }
> = {
  RING: { maxTriangles: 60000, maxBytes: 1887436, maxTexturePx: 1024, maxTextures: 4 }, // 1.8 MB
  EARRINGS: { maxTriangles: 50000, maxBytes: 1572864, maxTexturePx: 1024, maxTextures: 4 }, // 1.5 MB
  PENDANT: { maxTriangles: 40000, maxBytes: 1258291, maxTexturePx: 1024, maxTextures: 3 }, // 1.2 MB
  NECKLACE: { maxTriangles: 90000, maxBytes: 2726297, maxTexturePx: 1024, maxTextures: 4 }, // 2.6 MB
  BRACELET: { maxTriangles: 80000, maxBytes: 2516582, maxTexturePx: 1024, maxTextures: 4 }, // 2.4 MB
  BROOCH: { maxTriangles: 45000, maxBytes: 1400000, maxTexturePx: 1024, maxTextures: 3 },
  CUFFLINKS: { maxTriangles: 40000, maxBytes: 1200000, maxTexturePx: 1024, maxTextures: 3 },
  CHARM: { maxTriangles: 35000, maxBytes: 1000000, maxTexturePx: 1024, maxTextures: 2 },
};

/** Data-driven placement and fit rule (doc 21 §3, §4) */
export const FitRuleSchema = z
  .object({
    anchorSegment: z.enum(['PROXIMAL_PHALANX', 'INTERMEDIATE_PHALANX', 'WRIST', 'EAR_LOBE', 'CHEST', 'COLLARBONE']).default('PROXIMAL_PHALANX'),
    baseScale: z.number().positive().default(1.0),
    scaleMin: z.number().positive().default(0.7),
    scaleMax: z.number().positive().default(1.4),
    rotationOffset: z
      .object({
        x: z.number().default(0),
        y: z.number().default(0),
        z: z.number().default(0),
      })
      .default({ x: 0, y: 0, z: 0 }),
    positionOffset: z
      .object({
        x: z.number().default(0),
        y: z.number().default(0),
        z: z.number().default(0),
      })
      .default({ x: 0, y: 0, z: 0 }),
    fingerIndex: z.number().int().min(0).max(4).default(3), // 3 = Ring Finger (0=Thumb, 1=Index, 2=Middle, 3=Ring, 4=Pinky)
  })
  .strict();

export type FitRule = z.infer<typeof FitRuleSchema>;

/** WebarAsset public read model */
export const WebarAssetReadModelSchema = z
  .object({
    id: z.string().uuid(),
    assetId: z.string().uuid().nullable(),
    productId: z.string().uuid().nullable(),
    settingVariantId: z.string().uuid().nullable(),
    jewelleryType: JewelleryTypeSchema,
    modelFormat: ModelFormatSchema,
    compression: CompressionFormatSchema.nullable(),
    storageKey: z.string().min(1),
    cdnUrl: z.string().url(),
    hdrEnvKey: z.string().nullable(),
    textureMaxPx: z.number().int().positive(),
    polyCount: z.number().int().nonnegative().nullable(),
    vertexCount: z.number().int().nonnegative().nullable(),
    fileBytes: z.number().int().nonnegative().nullable(),
    fitRule: FitRuleSchema,
    state: WebarAssetStateSchema,
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export type WebarAssetReadModel = z.infer<typeof WebarAssetReadModelSchema>;

/** QR Handoff Request & Token Schemas (doc 21 §7) */
export const CreateHandoffRequestSchema = z
  .object({
    productId: z.string().uuid().optional(),
    webarAssetId: z.string().uuid(),
  })
  .strict();

export type CreateHandoffRequest = z.infer<typeof CreateHandoffRequestSchema>;

export const CreateHandoffResponseSchema = z
  .object({
    rawToken: z.string().min(16),
    handoffUrl: z.string().url(),
    expiresAt: z.string().datetime(),
  })
  .strict();

export type CreateHandoffResponse = z.infer<typeof CreateHandoffResponseSchema>;

export const RedeemHandoffResponseSchema = z
  .object({
    webarAssetId: z.string().uuid(),
    productId: z.string().uuid().nullable(),
    cdnUrl: z.string().url(),
    jewelleryType: JewelleryTypeSchema,
    fitRule: FitRuleSchema,
  })
  .strict();

export type RedeemHandoffResponse = z.infer<typeof RedeemHandoffResponseSchema>;
