/**
 * packages/domain/src/approval/two-person.spec.ts
 *
 * The pure two-person rule (plan task 3 / doc 23 §8 rule 3). No database, no
 * clock: the whole contract is decidable from its arguments.
 */
import { describe, expect, it } from 'vitest';

import {
  TwoPersonError,
  assertTwoPerson,
  certificateApprovalEntityKind,
  cmsPageEntityKind,
  isSelfApproval,
  isTrustBearingCmsPageKind,
  productPublishEntityKind,
  requiresSecondApprover,
  twoPersonAuditFields,
  twoPersonRuleFor,
} from './two-person.js';

describe('requiresSecondApprover', () => {
  it('covers exactly the three trust-bearing situations', () => {
    expect(requiresSecondApprover('CERTIFICATE_APPROVAL')).toBe(true);
    expect(requiresSecondApprover('CMS_TRUST_PAGE')).toBe(true);
    expect(requiresSecondApprover('PRODUCT_PUBLISH_UNVERIFIED_PRICE')).toBe(true);
  });

  it('does not apply to ordinary content, reviews or verified-price publishing', () => {
    expect(requiresSecondApprover('CERTIFICATE_REVIEW')).toBe(false);
    expect(requiresSecondApprover('CMS_PAGE')).toBe(false);
    expect(requiresSecondApprover('PRODUCT_PUBLISH')).toBe(false);
  });
});

describe('classifiers', () => {
  it('certificate: only a transition to VERIFIED is trust-bearing', () => {
    expect(certificateApprovalEntityKind('VERIFIED')).toBe('CERTIFICATE_APPROVAL');
    expect(certificateApprovalEntityKind('REJECTED')).toBe('CERTIFICATE_REVIEW');
  });

  it('CMS: BUYING_GUIDE, CERTIFICATE_GUIDE and TREATMENT copy are trust-bearing', () => {
    expect(isTrustBearingCmsPageKind('BUYING_GUIDE')).toBe(true);
    expect(isTrustBearingCmsPageKind('CERTIFICATE_GUIDE')).toBe(true);
    expect(isTrustBearingCmsPageKind('TREATMENT_HEAT')).toBe(true);
    expect(isTrustBearingCmsPageKind('STATIC')).toBe(false);
    expect(cmsPageEntityKind('BUYING_GUIDE')).toBe('CMS_TRUST_PAGE');
    expect(cmsPageEntityKind('BLOG')).toBe('CMS_PAGE');
  });

  it('product: DRAFT -> ACTIVE without VERIFIED price evidence is trust-bearing', () => {
    for (const evidence of ['UNKNOWN', 'OBSERVED', 'EXTRACTED', 'PATTERN', 'INFERRED']) {
      expect(productPublishEntityKind('DRAFT', 'ACTIVE', evidence)).toBe(
        'PRODUCT_PUBLISH_UNVERIFIED_PRICE',
      );
    }
    expect(productPublishEntityKind('DRAFT', 'ACTIVE', 'VERIFIED')).toBe('PRODUCT_PUBLISH');
    expect(productPublishEntityKind('ACTIVE', 'DRAFT', 'UNKNOWN')).toBe('PRODUCT_PUBLISH');
    expect(productPublishEntityKind('ARCHIVED', 'ACTIVE', 'UNKNOWN')).toBe('PRODUCT_PUBLISH');
  });
});

describe('isSelfApproval', () => {
  it('is true only for two identical recorded actors', () => {
    expect(isSelfApproval('actor-1', 'actor-1')).toBe(true);
    expect(isSelfApproval('actor-1', 'actor-2')).toBe(false);
    expect(isSelfApproval(null, 'actor-1')).toBe(false);
  });
});

describe('assertTwoPerson', () => {
  it('refuses self-approval with the typed code and the entity kind', () => {
    const rule = twoPersonRuleFor('CERTIFICATE_APPROVAL');
    try {
      assertTwoPerson(rule, 'actor-1', 'actor-1');
      expect.unreachable('self-approval must throw');
    } catch (error) {
      expect(error).toBeInstanceOf(TwoPersonError);
      expect(error).toMatchObject({
        name: 'TwoPersonError',
        code: 'TWO_PERSON_REQUIRED',
        entityKind: 'CERTIFICATE_APPROVAL',
      });
    }
  });

  it('accepts a different approver', () => {
    expect(() =>
      assertTwoPerson(twoPersonRuleFor('CMS_TRUST_PAGE'), 'editor-1', 'publisher-1'),
    ).not.toThrow();
  });

  it('satisfies the rule when no editor is recorded, and never invents one', () => {
    expect(() =>
      assertTwoPerson(twoPersonRuleFor('PRODUCT_PUBLISH_UNVERIFIED_PRICE'), null, 'actor-1'),
    ).not.toThrow();
  });

  it('is a no-op for non-trust content even when the same actor edited it', () => {
    expect(() => assertTwoPerson(twoPersonRuleFor('CMS_PAGE'), 'actor-1', 'actor-1')).not.toThrow();
    expect(() =>
      assertTwoPerson(twoPersonRuleFor('CERTIFICATE_REVIEW'), 'actor-1', 'actor-1'),
    ).not.toThrow();
  });
});

describe('twoPersonAuditFields', () => {
  it('names both actors and flags the unrecorded-editor case', () => {
    expect(
      twoPersonAuditFields(twoPersonRuleFor('CERTIFICATE_APPROVAL'), 'editor-1', 'approver-1'),
    ).toEqual({
      entity_kind: 'CERTIFICATE_APPROVAL',
      required: true,
      editor_id: 'editor-1',
      second_approver_id: 'approver-1',
      editor_unrecorded: false,
    });

    expect(twoPersonAuditFields(twoPersonRuleFor('CMS_TRUST_PAGE'), null, 'approver-1')).toMatchObject({
      editor_id: null,
      second_approver_id: 'approver-1',
      editor_unrecorded: true,
    });
  });
});
