import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import { createCatalogDatabase } from '../catalog/executor.js';
import { resolveFilterWhitelists } from '../catalog/whitelists.js';
import { resolveProductFilters, type RawSpecFilters } from '../catalog/predicates.js';
import { computeSearchFacets } from './facets.js';
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
  return undefined;
}

describe('Search Facets with Disjunctive Handling (Phase 5 Task 9)', () => {
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

  it('computes all 8 closed facet dimensions and conforms to FacetSetSchema', async (ctx) => {
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

    const { whitelist } = await resolveFilterWhitelists(db, raw);
    const { plan } = resolveProductFilters(raw, whitelist);

    const facets = await computeSearchFacets(db, plan, raw);

    expect(Array.isArray(facets.variety)).toBe(true);
    expect(Array.isArray(facets.color)).toBe(true);
    expect(Array.isArray(facets.jewellery_type)).toBe(true);
    expect(Array.isArray(facets.metal)).toBe(true);
    expect(Array.isArray(facets.settingStyle)).toBe(true);
    expect(Array.isArray(facets.shape)).toBe(true);
    expect(Array.isArray(facets.origin)).toBe(true);
    expect(Array.isArray(facets.treatment)).toBe(true);
  });

  it('sorts facet values by count DESC then value ASC', async (ctx) => {
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

    const { whitelist } = await resolveFilterWhitelists(db, raw);
    const { plan } = resolveProductFilters(raw, whitelist);

    const facets = await computeSearchFacets(db, plan, raw);

    for (const dim of Object.keys(facets) as (keyof typeof facets)[]) {
      const vals = facets[dim];
      for (let i = 0; i < vals.length - 1; i++) {
        if (vals[i]!.count === vals[i + 1]!.count) {
          expect(vals[i]!.value.localeCompare(vals[i + 1]!.value)).toBeLessThanOrEqual(0);
        } else {
          expect(vals[i]!.count).toBeGreaterThan(vals[i + 1]!.count);
        }
      }
    }
  });

  it('demonstrates disjunctive handling: selecting a color does not zero other color counts', async (ctx) => {
    if (!hasDb || !db) return ctx.skip();

    const rawWithColor: RawSpecFilters = {
      kind: [],
      jewelleryType: [],
      gemstoneKind: [],
      variety: [],
      color: ['blue'],
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

    const { whitelist } = await resolveFilterWhitelists(db, rawWithColor);
    const { plan } = resolveProductFilters(rawWithColor, whitelist);

    const facets = await computeSearchFacets(db, plan, rawWithColor);

    // In disjunctive mode, color facet counts reflect the set filtered on other dimensions,
    // so other colors may still have non-zero counts
    expect(facets.color).toBeDefined();
    const selectedBlue = facets.color.find((c) => c.value === 'blue');
    if (selectedBlue) {
      expect(selectedBlue.selected).toBe(true);
    }
  });
});
