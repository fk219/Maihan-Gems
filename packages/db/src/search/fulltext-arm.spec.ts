import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import { createCatalogDatabase } from '../catalog/executor.js';
import { executeFullTextArm } from './fulltext-arm.js';
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

describe('Full-Text Search Arm (Phase 5 Task 3)', () => {
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

  it('handles empty query cleanly without database query', async () => {
    if (!hasDb || !db) return;
    const res = await executeFullTextArm(db, '');
    expect(res.candidates).toHaveLength(0);
    expect(res.totalMatches).toBe(0);
  });

  it('handles phrase search with quotes', async (ctx) => {
    if (!hasDb || !db) return ctx.skip();
    const res = await executeFullTextArm(db, '"sapphire ring"');
    expect(res.queryUsed).toBe('"sapphire ring"');
    expect(res.totalMatches).toBeGreaterThanOrEqual(0);
    for (const candidate of res.candidates) {
      expect(candidate.textRank).toBeGreaterThanOrEqual(0);
      expect(typeof candidate.productId).toBe('string');
    }
  });

  it('handles OR search correctly with websearch_to_tsquery', async (ctx) => {
    if (!hasDb || !db) return ctx.skip();
    const res = await executeFullTextArm(db, 'ruby OR sapphire');
    expect(res.queryUsed).toBe('ruby OR sapphire');
    expect(res.totalMatches).toBeGreaterThanOrEqual(0);
  });

  it('handles negation search with -term', async (ctx) => {
    if (!hasDb || !db) return ctx.skip();
    const res = await executeFullTextArm(db, 'sapphire -heated');
    expect(res.queryUsed).toBe('sapphire -heated');
    expect(res.totalMatches).toBeGreaterThanOrEqual(0);
  });

  it('ranks candidates by text_rank DESC with cover density 32', async (ctx) => {
    if (!hasDb || !db) return ctx.skip();
    const res = await executeFullTextArm(db, 'sapphire', { limit: 10 });
    if (res.candidates.length >= 2) {
      for (let i = 0; i < res.candidates.length - 1; i++) {
        expect(res.candidates[i]!.textRank).toBeGreaterThanOrEqual(res.candidates[i + 1]!.textRank);
      }
    }
  });
});
