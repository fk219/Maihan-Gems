import { describe, expect, it } from 'vitest';
import { DomainError } from './errors.js';
import { expectErrorCode } from './testing/expect-domain-code.js';
import {
  EVIDENCE_STATUSES,
  GEMSTONE_KINDS,
  isEvidenceStatus,
  isProductKind,
  parseEvidenceStatus,
  parseGemstoneKind,
  parseJewelleryType,
  parseProductKind,
} from './enums.js';

describe('enum unions (SoT 8.3 mirrors)', () => {
  it('exposes the authoritative evidence_status members', () => {
    expect([...EVIDENCE_STATUSES]).toEqual(['OBSERVED', 'EXTRACTED', 'PATTERN', 'INFERRED', 'UNKNOWN']);
  });

  it('exposes the authoritative gemstone_kind members', () => {
    expect([...GEMSTONE_KINDS]).toEqual(['SINGLE', 'PAIR']);
  });

  it('parses product kinds and jewellery types', () => {
    for (const k of ['CONFIGURED', 'READY_MADE', 'LOOSE_STONE', 'STONE_PAIR', 'SETTING_ONLY']) {
      expect(parseProductKind(k)).toBe(k);
      expect(isProductKind(k)).toBe(true);
    }
    for (const j of ['RING', 'EARRINGS', 'NECKLACE', 'PENDANT', 'BRACELET', 'BROOCH', 'CUFFLINKS', 'CHARM']) {
      expect(parseJewelleryType(j)).toBe(j);
    }
  });

  it('rejects unknown members with stable codes', () => {
    expectErrorCode(() => parseProductKind('VIRTUAL'), 'INVALID_PRODUCT_KIND');
    expectErrorCode(() => parseJewelleryType('TOE_RING'), 'INVALID_JEWELLERY_TYPE');
    expectErrorCode(() => parseGemstoneKind('TRIPLET'), 'INVALID_GEMSTONE_KIND');
    expectErrorCode(() => parseEvidenceStatus('VERIFIED'), 'INVALID_EVIDENCE_STATUS');
  });

  it('VERIFIED is NOT an evidence_status member (it belongs to verification_status)', () => {
    expect(isEvidenceStatus('VERIFIED')).toBe(false);
    expect(() => parseEvidenceStatus('VERIFIED')).toThrowError(DomainError);
  });
});
