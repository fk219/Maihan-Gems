/**
 * packages/db/src/cms/seo-validation.spec.ts
 *
 * Phase 12 — Stage C / Global Task 5 pure-validation tests (no DB):
 * entity-kind whitelist (0002 enum), length bounds (title 60 / desc 160),
 * internal canonical paths, https OG images, robots token whitelist, and
 * the optimistic-concurrency rejection classes.
 */
import { describe, expect, it } from 'vitest';

import { createSeoRepository, SEO_ENTITY_KINDS } from './seo-repository.js';
import type { CatalogDatabase } from '../catalog/executor.js';

/** A rejecting executor proves no write happens after a failed validate(). */
const rejectingDb = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute: async () => { throw new Error('fake-executor: query attempted'); },
} as never as CatalogDatabase;

const seedingDb = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute: async (q: any) => {
    const chunks = q?.queryChunks ?? [];
    const parts: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const walk = (cs: any[]): string | string[] => {
      const out: string[] = [];
      for (const c of cs) {
        if (Array.isArray(c?.value) && c.value.every((p: unknown) => typeof p === 'string')) out.push(c.value.join(''));
        else if (Array.isArray(c?.queryChunks)) { const inner = walk(c.queryChunks); out.push(typeof inner === 'string' ? inner : inner.join('')); }
        else if (typeof c === 'string') out.push(c);
        else out.push('');
      }
      return out;
    };
    void chunks; void walk; void parts;
    return { rows: [] };
  },
} as never as CatalogDatabase;

const audit: unknown[] = [];
const noopAudit = async (): Promise<void> => { audit.push(1); };
const repo = createSeoRepository(seedingDb, noopAudit as never);
const rejectingRepo = createSeoRepository(rejectingDb, noopAudit as never);

const valid = {
  entity_kind: 'PRODUCT' as const,
  entity_id: '00000000-0000-4000-8000-000000000001',
  title: 'K1324 Emerald',
  description: 'Zambian emerald, 2.1 ct',
  canonical_path: '/products/k1324',
  noindex: false,
};

describe('seo validation (Global Task 5)', () => {
  it('validates a valid payload, then reaches the INSERT (empty db => conflict result)', async () => {
    // The seeding executor returns no rows, so save() ends in EXPECTED_STALE —
    // proving validation passed and the write path was reached (no leak).
    await expect(repo.save({ ...valid, actorId: 'a1' })).rejects.toMatchObject({ kind: 'EXPECTED_STALE' });
  });

  it('rejects an entity_kind outside the 0002 enum before any query', async () => {
    await expect(rejectingRepo.save({
      ...valid, entity_kind: 'EVERYTHING' as never, actorId: 'a1',
    })).rejects.toMatchObject({ kind: 'INVALID_KIND' });
  });

  it('rejects over-length title and description (SERP bounds)', async () => {
    await expect(rejectingRepo.save({ ...valid, title: 'x'.repeat(61), actorId: 'a1' })).rejects.toMatchObject({ kind: 'INVALID_FIELD' });
    await expect(rejectingRepo.save({ ...valid, description: 'x'.repeat(161), actorId: 'a1' })).rejects.toMatchObject({ kind: 'INVALID_FIELD' });
  });

  it('rejects non-internal canonical paths and non-https OG images', async () => {
    await expect(rejectingRepo.save({ ...valid, canonical_path: 'https://elsewhere/x', actorId: 'a1' })).rejects.toMatchObject({ kind: 'INVALID_FIELD' });
    await expect(rejectingRepo.save({ ...valid, og_image_url: 'http://insecure/x.png', actorId: 'a1' })).rejects.toMatchObject({ kind: 'INVALID_FIELD' });
  });

  it('rejects robots directives outside the token whitelist', async () => {
    await expect(rejectingRepo.save({ ...valid, robots: 'noindex, teleport', actorId: 'a1' })).rejects.toMatchObject({ kind: 'INVALID_FIELD' });
    // A permitted robots token passes validate() and reaches the write path:
    // prove by using the seeding executor (allowed through to the INSERT).
    await expect(repo.save({ ...valid, robots: 'noindex, nofollow', actorId: 'a1' })).rejects.toMatchObject({ kind: 'EXPECTED_STALE' });
  });

  it('exposes the seven enum kinds verbatim from 0002', () => {
    expect(SEO_ENTITY_KINDS).toEqual(['PRODUCT', 'CATEGORY', 'VARIETY', 'COLLECTION', 'PAGE', 'ARTICLE', 'ORGANIZATION']);
  });
});
