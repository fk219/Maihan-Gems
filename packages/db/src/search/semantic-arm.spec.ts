import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import { createCatalogDatabase } from '../catalog/executor.js';
import {
  evaluateSemanticGating,
  executeSemanticArm,
  formatPgVector,
} from './semantic-arm.js';
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

describe('Semantic Search Arm & Gating (Phase 5 Task 5)', () => {
  describe('evaluateSemanticGating', () => {
    it('disables semantic arm when circuit breaker is open', () => {
      const decision = evaluateSemanticGating({
        semanticRequested: true,
        intentType: 'DESCRIPTIVE',
        structuredCandidateCount: 5,
        limit: 24,
        circuitBreakerOpen: true,
      });
      expect(decision.enabled).toBe(false);
      expect(decision.reason).toBe('CIRCUIT_BREAKER_OPEN');
    });

    it('disables semantic arm when semantic=false in request', () => {
      const decision = evaluateSemanticGating({
        semanticRequested: false,
        intentType: 'DESCRIPTIVE',
        structuredCandidateCount: 5,
        limit: 24,
      });
      expect(decision.enabled).toBe(false);
      expect(decision.reason).toBe('EXPLICITLY_DISABLED');
    });

    it('disables semantic arm when query is NAVIGATIONAL', () => {
      const decision = evaluateSemanticGating({
        semanticRequested: true,
        intentType: 'NAVIGATIONAL',
        structuredCandidateCount: 5,
        limit: 24,
      });
      expect(decision.enabled).toBe(false);
      expect(decision.reason).toBe('NAVIGATIONAL_OR_IDENTIFIER_QUERY');
    });

    it('disables semantic arm when query is IDENTIFIER_LOOKUP', () => {
      const decision = evaluateSemanticGating({
        semanticRequested: true,
        intentType: 'IDENTIFIER_LOOKUP',
        structuredCandidateCount: 1,
        limit: 24,
      });
      expect(decision.enabled).toBe(false);
      expect(decision.reason).toBe('NAVIGATIONAL_OR_IDENTIFIER_QUERY');
    });

    it('disables semantic arm when structured candidate count > limit * 20', () => {
      const decision = evaluateSemanticGating({
        semanticRequested: true,
        intentType: 'DESCRIPTIVE',
        structuredCandidateCount: 500,
        limit: 24, // 24 * 20 = 480 < 500
      });
      expect(decision.enabled).toBe(false);
      expect(decision.reason).toBe('STRUCTURED_CANDIDATE_OVERFLOW');
    });

    it('enables semantic arm when descriptive with reasonable constraints', () => {
      const decision = evaluateSemanticGating({
        semanticRequested: true,
        intentType: 'DESCRIPTIVE',
        structuredCandidateCount: 30,
        limit: 24,
      });
      expect(decision.enabled).toBe(true);
      expect(decision.reason).toBe('DESCRIPTIVE_WITH_LOW_CONSTRAINTS');
    });
  });

  describe('formatPgVector', () => {
    it('formats vector floats cleanly', () => {
      expect(formatPgVector([0.1, -0.25, 0.99])).toBe('[0.1,-0.25,0.99]');
    });
  });

  describe('executeSemanticArm DB execution', () => {
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

    it('returns empty when no vector is provided', async () => {
      if (!hasDb || !db) return;
      const res = await executeSemanticArm(db, []);
      expect(res.candidates).toHaveLength(0);
      expect(res.totalMatches).toBe(0);
    });

    it('executes HNSW vector search when 1024-dim vector is passed', async (ctx) => {
      if (!hasDb || !db) return ctx.skip();
      // Generate synthetic 1024-dim unit vector
      const vector = new Array(1024).fill(0).map((_, i) => (i % 2 === 0 ? 0.01 : -0.01));
      const res = await executeSemanticArm(db, vector, { limit: 5 });
      expect(res.totalMatches).toBeGreaterThanOrEqual(0);
      for (const c of res.candidates) {
        expect(c.semanticSimilarity).toBeGreaterThanOrEqual(0);
        expect(c.semanticSimilarity).toBeLessThanOrEqual(1.0);
      }
    });
  });
});
