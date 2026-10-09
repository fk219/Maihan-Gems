import { describe, it, expect } from 'vitest';
import {
  SYNONYM_ENTRIES,
  expandQueryWithSynonyms,
} from './synonyms.js';

describe('Synonym Registry & Query Expansion (Phase 5 Task 8)', () => {
  describe('Provenance Distinction', () => {
    it('distinguishes OBSERVED and CURATED synonym provenance', () => {
      const observed = SYNONYM_ENTRIES.filter((s) => s.provenance === 'OBSERVED');
      const curated = SYNONYM_ENTRIES.filter((s) => s.provenance === 'CURATED');

      expect(observed.length).toBe(8);
      expect(curated.length).toBe(2);

      // Verify specific observed entries
      expect(observed.some((s) => s.canonical === 'tsavorite')).toBe(true);
      expect(observed.some((s) => s.canonical === 'sphene')).toBe(true);
      expect(observed.some((s) => s.canonical === 'padparadscha')).toBe(true);
      expect(observed.some((s) => s.canonical === 'ceylon')).toBe(true);

      // Verify curated entries
      expect(curated.some((s) => s.canonical === 'grossular garnet')).toBe(true);
      expect(curated.some((s) => s.canonical === 'emerald cut')).toBe(true);
    });
  });

  describe('expandQueryWithSynonyms', () => {
    it('expands variant term to include canonical term', () => {
      const res = expandQueryWithSynonyms('titanite ring');
      expect(res.appliedSynonyms.some((s) => s.canonical === 'sphene')).toBe(true);
      expect(res.expandedQuery).toContain('sphene');
      expect(res.expandedQuery).toContain('titanite');
    });

    it('expands canonical term to include primary variant', () => {
      const res = expandQueryWithSynonyms('tsavorite necklace');
      expect(res.appliedSynonyms.some((s) => s.canonical === 'tsavorite')).toBe(true);
      expect(res.expandedQuery).toContain('tsavorite');
      expect(res.expandedQuery).toContain('tsavorite garnet');
    });

    it('expands observed origin synonym ceylon / sri lankan', () => {
      const res = expandQueryWithSynonyms('sri lankan sapphire');
      expect(res.appliedSynonyms.some((s) => s.canonical === 'ceylon')).toBe(true);
      expect(res.expandedQuery).toContain('ceylon');
    });

    it('prevents cycles and recursive replacement loops', () => {
      const q = 'tsavorite green grossular garnet ring';
      const res = expandQueryWithSynonyms(q);
      expect(res.expandedQuery).toBeDefined();
      expect(res.appliedSynonyms.length).toBeGreaterThan(0);
      // Ensure no nested parenthetical explosion like "((((...))))"
      expect(res.expandedQuery).not.toMatch(/\(\(\(\(/);
    });

    it('leaves queries with no synonyms unchanged', () => {
      const q = 'diamond solitaire 14kw ring';
      const res = expandQueryWithSynonyms(q);
      expect(res.expandedQuery).toBe(q);
      expect(res.appliedSynonyms).toHaveLength(0);
    });

    it('handles empty query cleanly', () => {
      const res = expandQueryWithSynonyms('');
      expect(res.expandedQuery).toBe('');
      expect(res.appliedSynonyms).toHaveLength(0);
    });
  });
});
