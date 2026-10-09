import { describe, it, expect } from 'vitest';
import {
  DEFAULT_SEARCH_RANKING_CONFIG,
  calculateBusinessModifier,
  scoreCandidate,
  rankCandidates,
  type CandidateRankingSignals,
} from './ranking.js';

describe('Search Ranking & Modifiers (Phase 5 Task 7)', () => {
  describe('Weight & Invariant Guarantees', () => {
    it('weights sum to 1.00', () => {
      const w = DEFAULT_SEARCH_RANKING_CONFIG.weights;
      const sum =
        w.textRank +
        w.semantic +
        w.business +
        w.facet +
        w.availability +
        w.recency;
      expect(Math.round(sum * 100) / 100).toBe(1.0);
    });

    it('STRICT INVARIANT: heat-treated stones are NEVER demoted (modifier strictly 1.00)', () => {
      expect(DEFAULT_SEARCH_RANKING_CONFIG.modifiers.heatTreated).toBe(1.0);

      const baseCandidate: CandidateRankingSignals = {
        productId: 'prod-001',
        textRank: 0.8,
        semanticSimilarity: 0.5,
        availability: true,
        state: 'ACTIVE',
      };

      const untreatedCandidate: CandidateRankingSignals = {
        ...baseCandidate,
        isTreated: false,
      };

      const treatedCandidate: CandidateRankingSignals = {
        ...baseCandidate,
        isTreated: true,
      };

      const scoreUntreated = scoreCandidate(untreatedCandidate);
      const scoreTreated = scoreCandidate(treatedCandidate);

      expect(scoreTreated.finalScore).toBe(scoreUntreated.finalScore);
      expect(scoreTreated.modifierMultiplier).toBe(scoreUntreated.modifierMultiplier);
    });
  });

  describe('Business Modifiers Table', () => {
    it('applies verified certificate boost x1.15', () => {
      const c: CandidateRankingSignals = {
        productId: 'p1',
        textRank: 1.0,
        semanticSimilarity: 0.0,
        availability: false,
        state: 'ACTIVE',
        hasVerifiedCertificate: true,
      };
      const modifier = calculateBusinessModifier(c);
      expect(Math.round(modifier * 100) / 100).toBe(1.15);
    });

    it('applies stone_type recorded boost x1.08', () => {
      const c: CandidateRankingSignals = {
        productId: 'p1',
        textRank: 1.0,
        semanticSimilarity: 0.0,
        availability: false,
        state: 'ACTIVE',
        stoneTypeRecorded: true,
      };
      const modifier = calculateBusinessModifier(c);
      expect(Math.round(modifier * 100) / 100).toBe(1.08);
    });

    it('applies in-stock boost x1.05', () => {
      const c: CandidateRankingSignals = {
        productId: 'p1',
        textRank: 1.0,
        semanticSimilarity: 0.0,
        availability: true,
        state: 'ACTIVE',
      };
      const modifier = calculateBusinessModifier(c);
      expect(Math.round(modifier * 100) / 100).toBe(1.05);
    });

    it('applies ready-made modifier x0.95', () => {
      const c: CandidateRankingSignals = {
        productId: 'p1',
        textRank: 1.0,
        semanticSimilarity: 0.0,
        availability: false,
        state: 'ACTIVE',
        isReadyMade: true,
      };
      const modifier = calculateBusinessModifier(c);
      expect(Math.round(modifier * 100) / 100).toBe(0.95);
    });

    it('applies stone pair neutral modifier x1.00', () => {
      const c: CandidateRankingSignals = {
        productId: 'p1',
        textRank: 1.0,
        semanticSimilarity: 0.0,
        availability: false,
        state: 'ACTIVE',
        isPair: true,
      };
      const modifier = calculateBusinessModifier(c);
      expect(modifier).toBe(1.0);
    });
  });

  describe('Exclusions & Publication Gate', () => {
    it('excludes DRAFT products completely', () => {
      const c: CandidateRankingSignals = {
        productId: 'draft-p1',
        textRank: 1.0,
        semanticSimilarity: 1.0,
        availability: true,
        state: 'DRAFT',
      };
      const score = scoreCandidate(c);
      expect(score.excluded).toBe(true);
      expect(score.finalScore).toBe(0.0);
    });

    it('excludes ARCHIVED products completely', () => {
      const c: CandidateRankingSignals = {
        productId: 'archived-p1',
        textRank: 1.0,
        semanticSimilarity: 1.0,
        availability: true,
        state: 'ARCHIVED',
      };
      const score = scoreCandidate(c);
      expect(score.excluded).toBe(true);
      expect(score.finalScore).toBe(0.0);
    });
  });

  describe('Ranking Determinism & Stable Tie-breaker', () => {
    it('produces 100% deterministic ordered list for fixed candidate set', () => {
      const candidates: CandidateRankingSignals[] = [
        { productId: 'prod-A', textRank: 0.6, semanticSimilarity: 0.2, availability: true, state: 'ACTIVE' },
        { productId: 'prod-B', textRank: 0.9, semanticSimilarity: 0.7, availability: true, state: 'ACTIVE', hasVerifiedCertificate: true },
        { productId: 'prod-C', textRank: 0.4, semanticSimilarity: 0.1, availability: false, state: 'ACTIVE' },
      ];

      const r1 = rankCandidates(candidates);
      const r2 = rankCandidates(candidates);

      expect(r1).toEqual(r2);
      expect(r1[0]!.productId).toBe('prod-B'); // Highest score
    });

    it('breaks ties deterministically by productId DESC', () => {
      const candidates: CandidateRankingSignals[] = [
        { productId: 'prod-10', textRank: 0.5, semanticSimilarity: 0.0, availability: false, state: 'ACTIVE' },
        { productId: 'prod-20', textRank: 0.5, semanticSimilarity: 0.0, availability: false, state: 'ACTIVE' },
      ];

      const res = rankCandidates(candidates);
      expect(res[0]!.productId).toBe('prod-20');
      expect(res[1]!.productId).toBe('prod-10');
    });
  });
});
