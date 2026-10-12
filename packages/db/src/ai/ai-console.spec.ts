/**
 * packages/db/src/ai/ai-console.spec.ts
 *
 * Phase 12 — Stage F (Global Task 11) structural guard test: the read-only
 * AI console repository exports NO mutating functions at all — the ADR-003/
 * NFR-05 no-write path stays intact, proven by surface inspection.
 */
import { describe, expect, it } from 'vitest';

import { createAiConsoleRepository, type AiConsoleRepository } from './ai-console-repository.js';
import type { CatalogDatabase } from '../catalog/executor.js';

const noopDb = {
  execute: async () => ({ rows: [] }),
} as never as CatalogDatabase;

describe('AI console (GT 11) structural no-write guard', () => {
  const repo: AiConsoleRepository = createAiConsoleRepository(noopDb);

  it('exposes ONLY read methods (no create/update/delete/record anywhere)', () => {
    const surface = Object.getOwnPropertyNames(repo) as Array<keyof AiConsoleRepository>;
    expect(surface.sort()).toEqual([
      'listConversations', 'listEvaluationRuns', 'listGuardrailEvents', 'listToolCalls',
    ]);
    for (const name of surface) {
      expect(String(name)).toMatch(/^list/);
      expect(String(name)).not.toMatch(/create|update|delete|record|append|insert/i);
    }
  });
});
