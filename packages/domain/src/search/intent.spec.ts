import { describe, expect, it } from 'vitest';
import {
  detectSearchIntent,
  isIdentifierToken,
  normalizeQueryText,
} from './intent.js';

describe('Search Intent Detection (Phase 5 Task 1)', () => {
  describe('normalizeQueryText', () => {
    it('normalizes casing, whitespace, and punctuation', () => {
      expect(normalizeQueryText('  Blue   Sapphire "Ring" \t\n')).toBe('blue sapphire ring');
      expect(normalizeQueryText('')).toBe('');
      expect(normalizeQueryText(null as unknown as string)).toBe('');
    });
  });

  describe('isIdentifierToken', () => {
    it('identifies gemstone reference tokens', () => {
      expect(isIdentifierToken('K1551')).toBe(true);
      expect(isIdentifierToken('k27053')).toBe(true);
    });

    it('identifies stone pair tokens', () => {
      expect(isIdentifierToken('PR5681')).toBe(true);
      expect(isIdentifierToken('pr102')).toBe(true);
    });

    it('identifies ready-made jewellery tokens', () => {
      expect(isIdentifierToken('J1383')).toBe(true);
      expect(isIdentifierToken('j99')).toBe(true);
    });

    it('identifies setting SKU tokens', () => {
      expect(isIdentifierToken('SOL-RD-14KW')).toBe(true);
      expect(isIdentifierToken('HALO-OV-18KY')).toBe(true);
    });

    it('rejects general non-identifier queries', () => {
      expect(isIdentifierToken('sapphire')).toBe(false);
      expect(isIdentifierToken('blue ring')).toBe(false);
      expect(isIdentifierToken('diamond 2ct')).toBe(false);
    });
  });

  describe('detectSearchIntent: IDENTIFIER_LOOKUP', () => {
    it('classifies single gem reference token as IDENTIFIER_LOOKUP', () => {
      const intent = detectSearchIntent('K1551');
      expect(intent.type).toBe('IDENTIFIER_LOOKUP');
      expect(intent.confidence).toBe(1.0);
      expect(intent.detectedIdentifier).toBe('K1551');
      expect(intent.residualQuery).toBe('k1551');
    });

    it('classifies pair token as IDENTIFIER_LOOKUP', () => {
      const intent = detectSearchIntent('PR5681');
      expect(intent.type).toBe('IDENTIFIER_LOOKUP');
      expect(intent.detectedIdentifier).toBe('PR5681');
    });

    it('classifies ready-made jewellery token as IDENTIFIER_LOOKUP', () => {
      const intent = detectSearchIntent('j1383');
      expect(intent.type).toBe('IDENTIFIER_LOOKUP');
      expect(intent.detectedIdentifier).toBe('J1383');
    });

    it('classifies setting SKU token as IDENTIFIER_LOOKUP', () => {
      const intent = detectSearchIntent('SOL-RD-14KW');
      expect(intent.type).toBe('IDENTIFIER_LOOKUP');
      expect(intent.detectedIdentifier).toBe('SOL-RD-14KW');
    });
  });

  describe('detectSearchIntent: NAVIGATIONAL', () => {
    it('classifies single variety query as NAVIGATIONAL', () => {
      const intent = detectSearchIntent('sapphire');
      expect(intent.type).toBe('NAVIGATIONAL');
      expect(intent.confidence).toBeGreaterThanOrEqual(0.9);
      expect(intent.extractedFilters.variety).toEqual(['sapphire']);
      expect(intent.residualQuery).toBe('');
    });

    it('classifies single jewellery type as NAVIGATIONAL', () => {
      const intent = detectSearchIntent('rings');
      expect(intent.type).toBe('NAVIGATIONAL');
      expect(intent.extractedFilters.jewelleryType).toEqual(['RING']);
      expect(intent.residualQuery).toBe('');
    });
  });

  describe('detectSearchIntent: DESCRIPTIVE & structured extraction', () => {
    it('extracts price range: between $X and $Y', () => {
      const intent = detectSearchIntent('blue sapphire between 2000 and 5000');
      expect(intent.type).toBe('DESCRIPTIVE');
      expect(intent.extractedFilters.variety).toEqual(['sapphire']);
      expect(intent.extractedFilters.color).toEqual(['blue']);
      expect(intent.extractedFilters.minPrice).toBe(2000);
      expect(intent.extractedFilters.maxPrice).toBe(5000);
    });

    it('extracts price range: under $X', () => {
      const intent = detectSearchIntent('ruby ring under 3000');
      expect(intent.extractedFilters.variety).toEqual(['ruby']);
      expect(intent.extractedFilters.jewelleryType).toEqual(['RING']);
      expect(intent.extractedFilters.maxPrice).toBe(3000);
      expect(intent.extractedFilters.minPrice).toBeUndefined();
    });

    it('extracts price range: over $X', () => {
      const intent = detectSearchIntent('emerald over 10000');
      expect(intent.extractedFilters.variety).toEqual(['emerald']);
      expect(intent.extractedFilters.minPrice).toBe(10000);
    });

    it('extracts carat range: between 1 and 3ct', () => {
      const intent = detectSearchIntent('sapphire between 1 and 3ct');
      expect(intent.extractedFilters.variety).toEqual(['sapphire']);
      expect(intent.extractedFilters.minWeightCt).toBe(1);
      expect(intent.extractedFilters.maxWeightCt).toBe(3);
    });

    it('extracts carat weight with tolerance around exact weight (2ct)', () => {
      const intent = detectSearchIntent('oval tanzanite 2ct');
      expect(intent.extractedFilters.variety).toEqual(['tanzanite']);
      expect(intent.extractedFilters.shape).toEqual(['OVAL']);
      expect(intent.extractedFilters.minWeightCt).toBe(1.75);
      expect(intent.extractedFilters.maxWeightCt).toBe(2.25);
    });

    it('extracts treatment and certification flags', () => {
      const intent = detectSearchIntent('unheated certified sapphire ring');
      expect(intent.extractedFilters.treatment).toEqual(['NO_ENHANCEMENT']);
      expect(intent.extractedFilters.certified).toBe(true);
      expect(intent.extractedFilters.variety).toEqual(['sapphire']);
      expect(intent.extractedFilters.jewelleryType).toEqual(['RING']);
    });

    it('extracts metal preference', () => {
      const intent = detectSearchIntent('platinum diamond solitaire ring');
      expect(intent.extractedFilters.metal).toEqual(['PLATINUM']);
      expect(intent.extractedFilters.jewelleryType).toEqual(['RING']);
      expect(intent.residualQuery).toContain('solitaire');
    });

    it('preserves residual search tokens cleanly without fabricating terms', () => {
      const intent = detectSearchIntent('vintage art deco blue sapphire ring');
      expect(intent.extractedFilters.variety).toEqual(['sapphire']);
      expect(intent.extractedFilters.color).toEqual(['blue']);
      expect(intent.extractedFilters.jewelleryType).toEqual(['RING']);
      expect(intent.residualQuery).toBe('vintage art deco');
    });
  });

  describe('detectSearchIntent: General PRODUCT_SEARCH & edge cases', () => {
    it('handles empty query gracefully', () => {
      const intent = detectSearchIntent('');
      expect(intent.type).toBe('PRODUCT_SEARCH');
      expect(intent.confidence).toBe(1.0);
      expect(intent.normalizedQuery).toBe('');
      expect(intent.residualQuery).toBe('');
      expect(intent.extractedFilters).toEqual({});
    });

    it('handles whitespace-only query gracefully', () => {
      const intent = detectSearchIntent('   \t\n  ');
      expect(intent.type).toBe('PRODUCT_SEARCH');
      expect(intent.residualQuery).toBe('');
    });

    it('is completely deterministic', () => {
      const q = 'unheated 2ct oval blue sapphire ring under 5000';
      const r1 = detectSearchIntent(q);
      const r2 = detectSearchIntent(q);
      expect(r1).toEqual(r2);
    });
  });
});
