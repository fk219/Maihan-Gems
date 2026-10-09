import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import { createCatalogDatabase } from '../catalog/executor.js';
import {
  composeProductEmbeddingDocument,
  computeEmbeddingContentHash,
  syncProductEmbedding,
} from './embedding.js';
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

describe('Product Embedding Composition & Idempotency (Phase 5 Task 6)', () => {
  describe('composeProductEmbeddingDocument', () => {
    it('composes deterministic pipe-separated document with all non-null fields', () => {
      const doc = composeProductEmbeddingDocument({
        title: 'Oval Blue Sapphire Solitaire Ring',
        variety: 'Sapphire',
        color: 'Blue',
        intensity: 'Vivid',
        shape: 'OVAL',
        cut: 'Brilliant',
        clarity: 'Eye Clean',
        treatment: 'No Heat',
        origin: 'Ceylon',
        settingStyle: 'Solitaire',
        metal: '14KW',
      });

      expect(doc).toBe(
        'Title: Oval Blue Sapphire Solitaire Ring | Variety: Sapphire | Color: Blue | Intensity: Vivid | Shape: OVAL | Cut: Brilliant | Clarity: Eye Clean | Treatment: No Heat | Origin: Ceylon | Setting Style: Solitaire | Metal: 14KW'
      );
    });

    it('omits empty or whitespace-only fields cleanly', () => {
      const doc = composeProductEmbeddingDocument({
        title: 'Loose Emerald',
        variety: 'Emerald',
        color: null,
        intensity: '   ',
        shape: 'EMERALD',
      });

      expect(doc).toBe('Title: Loose Emerald | Variety: Emerald | Shape: EMERALD');
    });
  });

  describe('computeEmbeddingContentHash', () => {
    it('computes stable SHA-256 hash', () => {
      const text = 'Title: Test Product | Variety: Ruby';
      const hash1 = computeEmbeddingContentHash(text);
      const hash2 = computeEmbeddingContentHash(text);
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });
  });

  describe('syncProductEmbedding idempotency integration', () => {
    let pool: Pool | undefined;
    let db: ReturnType<typeof createCatalogDatabase> | undefined;
    let hasDb = false;
    let testProductId: string | undefined;

    beforeAll(async () => {
      const url = getDatabaseUrl();
      if (!url) return;
      try {
        pool = new Pool({ connectionString: url, max: 2, connectionTimeoutMillis: 5000 });
        const client = await pool.connect();
        const res = await client.query('SELECT id::text FROM products LIMIT 1');
        client.release();
        if (res.rows.length > 0) {
          testProductId = res.rows[0].id;
        }
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

    it('skips provider call on second run when content_hash is identical', async (ctx) => {
      if (!hasDb || !db || !testProductId) return ctx.skip();

      let providerCallCount = 0;
      const fakeProvider = async () => {
        providerCallCount++;
        return new Array(1024).fill(0.001);
      };

      const testModel = 'test-model-v1';

      // First run: should generate and persist
      const res1 = await syncProductEmbedding(db, testProductId, fakeProvider, testModel);
      expect(res1.productId).toBe(testProductId);
      expect(res1.skipped).toBe(false);
      expect(res1.reason).toBe('GENERATED_AND_PERSISTED');
      expect(providerCallCount).toBe(1);

      // Second run: MUST skip model call
      const res2 = await syncProductEmbedding(db, testProductId, fakeProvider, testModel);
      expect(res2.productId).toBe(testProductId);
      expect(res2.skipped).toBe(true);
      expect(res2.reason).toBe('UNCHANGED_CONTENT_HASH');
      expect(res2.contentHash).toBe(res1.contentHash);
      expect(providerCallCount).toBe(1); // Provider NOT called again!
    });
  });
});
