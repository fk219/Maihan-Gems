import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import { createCatalogDatabase } from '../catalog/executor.js';
import { executeStructuredArm } from './structured-arm.js';
import type { RawSpecFilters } from '../catalog/predicates.js';

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

function getDatabaseUrl(): string | undefined {
  if (process.env['DATABASE_URL']) return process.env['DATABASE_URL'];
  const envPath = resolve(process.cwd(), '../../.env');
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('DATABASE_URL=')) {
        return trimmed.slice('DATABASE_URL='.length).trim().replace(/^['"]|['"]$/g, '');
      }
    }
  }
  const localEnv = resolve(process.cwd(), '.env');
  if (existsSync(localEnv)) {
    const content = readFileSync(localEnv, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('DATABASE_URL=')) {
        return trimmed.slice('DATABASE_URL='.length).trim().replace(/^['"]|['"]$/g, '');
      }
    }
  }
  return undefined;
}

describe('Structured Filter Arm (Phase 5 Task 2)', () => {
  let pool: Pool | undefined;
  let db: ReturnType<typeof createCatalogDatabase> | undefined;
  let hasDb = false;

  beforeAll(async () => {
    const url = getDatabaseUrl();
    if (!url) return;
    try {
      pool = new Pool({ connectionString: url, max: 2, connectionTimeoutMillis: 5000 });
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      db = createCatalogDatabase(pool);
      hasDb = true;
    } catch {
      hasDb = false;
    }
  });

  afterAll(async () => {
    if (pool) {
      await pool.end().catch(() => {});
    }
  });

  it('rejects unknown taxonomy values and reports UNKNOWN_VALUE', async (ctx) => {
    if (!hasDb || !db) return ctx.skip();

    const raw: RawSpecFilters = {
      kind: [],
      jewelleryType: [],
      gemstoneKind: [],
      variety: ['non-existent-gemstone-xyz'],
      color: ['neon-glow-fake-color'],
      intensity: [],
      clarity: [],
      treatment: [],
      origin: [],
      shape: [],
      metal: [],
      settingStyle: [],
      certified: false,
      available: false,
    };

    const result = await executeStructuredArm(db, raw);
    expect(result.rejectedFilters.length).toBeGreaterThanOrEqual(2);
    expect(result.rejectedFilters.some((r) => r.filter === 'variety' && r.reason === 'UNKNOWN_VALUE')).toBe(true);
    expect(result.rejectedFilters.some((r) => r.filter === 'color' && r.reason === 'UNKNOWN_VALUE')).toBe(true);
    // Dropped unknown values must not enter plan id lists
    expect(result.plan.varietyIds).toHaveLength(0);
    expect(result.plan.colourIds).toHaveLength(0);
  });

  it('rejects inverted min/max numeric ranges with INVALID_RANGE', async (ctx) => {
    if (!hasDb || !db) return ctx.skip();

    const raw: RawSpecFilters = {
      kind: [],
      jewelleryType: [],
      gemstoneKind: [],
      variety: [],
      color: [],
      intensity: [],
      clarity: [],
      treatment: [],
      origin: [],
      shape: [],
      metal: [],
      settingStyle: [],
      certified: false,
      available: false,
      minPrice: 5000,
      maxPrice: 1000, // min > max
      minWeightCt: 4.5,
      maxWeightCt: 1.2, // min > max
    };

    const result = await executeStructuredArm(db, raw);
    expect(result.rejectedFilters.some((r) => r.filter === 'price' && r.reason === 'INVALID_RANGE')).toBe(true);
    expect(result.rejectedFilters.some((r) => r.filter === 'weight' && r.reason === 'INVALID_RANGE')).toBe(true);
    expect(result.plan.minPrice).toBeNull();
    expect(result.plan.maxPrice).toBeNull();
    expect(result.plan.minWeightCt).toBeNull();
    expect(result.plan.maxWeightCt).toBeNull();
  });

  it('executes valid structured query and assigns structuredScore = 1.0', async (ctx) => {
    if (!hasDb || !db) return ctx.skip();

    const raw: RawSpecFilters = {
      kind: [],
      jewelleryType: [],
      gemstoneKind: [],
      variety: [],
      color: [],
      intensity: [],
      clarity: [],
      treatment: [],
      origin: [],
      shape: [],
      metal: [],
      settingStyle: [],
      certified: false,
      available: false,
    };

    const result = await executeStructuredArm(db, raw, { limit: 10 });
    expect(result.rejectedFilters).toHaveLength(0);
    expect(result.totalMatches).toBeGreaterThanOrEqual(0);
    for (const candidate of result.candidates) {
      expect(candidate.structuredScore).toBe(1.0);
      expect(typeof candidate.productId).toBe('string');
    }
  });
});
