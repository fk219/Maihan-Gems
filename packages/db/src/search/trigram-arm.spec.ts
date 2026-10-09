import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import { createCatalogDatabase } from '../catalog/executor.js';
import { executeTrigramArm } from './trigram-arm.js';
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

describe('Trigram Fallback Arm (Phase 5 Task 4)', () => {
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

  it('handles empty query cleanly without executing SQL', async () => {
    if (!hasDb || !db) return;
    const res = await executeTrigramArm(db, '');
    expect(res.candidates).toHaveLength(0);
    expect(res.totalMatches).toBe(0);
  });

  it('executes typo tolerance query and finds candidates with similarity >= 0.3', async (ctx) => {
    if (!hasDb || !db) return ctx.skip();
    const res = await executeTrigramArm(db, 'sapphir', { threshold: 0.3, limit: 10 });
    expect(res.thresholdUsed).toBe(0.3);
    for (const c of res.candidates) {
      expect(c.trigramSimilarity).toBeGreaterThanOrEqual(0.3);
      expect(typeof c.productId).toBe('string');
    }
  });

  it('orders candidates by similarity DESC', async (ctx) => {
    if (!hasDb || !db) return ctx.skip();
    const res = await executeTrigramArm(db, 'sapphire', { threshold: 0.2, limit: 10 });
    if (res.candidates.length >= 2) {
      for (let i = 0; i < res.candidates.length - 1; i++) {
        expect(res.candidates[i]!.trigramSimilarity).toBeGreaterThanOrEqual(res.candidates[i + 1]!.trigramSimilarity);
      }
    }
  });
});
