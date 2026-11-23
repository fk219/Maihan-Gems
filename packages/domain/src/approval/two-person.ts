/**
 * packages/domain/src/approval/two-person.ts
 *
 * Phase 12 — Global Task 3 (Track C9): the two-person rule for trust-bearing
 * content.
 *
 * Authority:
 *   - INITIAL_IMPLEMENTATION_PLAN.md §19 task 3 ("Two-person approval for
 *     trust content").
 *   - technical_design/23_ADMIN_CONSOLE_AND_RBAC.md §8 rule 3: trust-bearing
 *     content requires a second approver, and never permits self-approval.
 *   - technical_design/22_CMS.md §4: BUYING_GUIDE and CERTIFICATE_GUIDE are the
 *     trust-bearing page kinds.
 *   - technical_design/17_CERTIFICATE_INTELLIGENCE.md: verification to
 *     VERIFIED is a human trust decision.
 *   - AGENTS.md §7: a product may only leave DRAFT for ACTIVE when its price
 *     evidence is trustworthy (gate V15 refuses UNKNOWN; the two-person rule
 *     covers every other non-VERIFIED evidence level).
 *
 * This module is PURE: no I/O, no clock, no repository. It answers three
 * questions and nothing else:
 *
 *   1. Does this entity kind require a second approver?
 *   2. Is this actor approving their own work?
 *   3. Does this (rule, editor, approver) triple satisfy the rule?
 *
 * The classifiers below turn each call site's facts into an entity kind. They
 * live here, not in the repositories, so "which changes are trust-bearing" is
 * one reviewable list instead of three drifting conditionals.
 *
 * The "no recorded editor" case is deliberate and documented: a document that
 * no human has touched has no editor to be different from, so the rule is
 * satisfied. The absence is recorded in the audit snapshot, never guessed.
 */
import { DomainError } from '../errors.js';

/**
 * Every situation the three decision paths can be in. The non-trust kinds
 * exist so a call site always names its situation explicitly rather than
 * passing a boolean; `requiresSecondApprover` is the single decision point.
 */
export const TWO_PERSON_ENTITY_KINDS = Object.freeze([
  /** Certificate approval that moves the document to VERIFIED. */
  'CERTIFICATE_APPROVAL',
  /** Any other certificate decision (a rejection is not a trust promotion). */
  'CERTIFICATE_REVIEW',
  /** A CMS page kind that carries trust copy (doc 22 §4). */
  'CMS_TRUST_PAGE',
  /** Any other CMS page kind. */
  'CMS_PAGE',
  /** DRAFT -> ACTIVE while price evidence is not VERIFIED. */
  'PRODUCT_PUBLISH_UNVERIFIED_PRICE',
  /** Any other product publication (evidence VERIFIED, or not a DRAFT->ACTIVE move). */
  'PRODUCT_PUBLISH',
] as const);

export type TwoPersonEntityKind = (typeof TWO_PERSON_ENTITY_KINDS)[number];

/** The trust-bearing subset. One list, consulted by every path. */
export const TRUST_BEARING_ENTITY_KINDS = Object.freeze([
  'CERTIFICATE_APPROVAL',
  'CMS_TRUST_PAGE',
  'PRODUCT_PUBLISH_UNVERIFIED_PRICE',
] as const satisfies readonly TwoPersonEntityKind[]);

/**
 * doc 22 §4: the page kinds whose copy makes a trust claim. TREATMENT pages
 * also state gemstone treatment facts and are trust-bearing for the same
 * reason (the CMS repository applied this rule before it was extracted here).
 */
export const TRUST_BEARING_CMS_PAGE_KINDS = Object.freeze([
  'BUYING_GUIDE',
  'CERTIFICATE_GUIDE',
] as const);

/** A CMS page kind is trust-bearing when it is a listed kind or TREATMENT copy. */
export function isTrustBearingCmsPageKind(pageKind: string): boolean {
  return (
    (TRUST_BEARING_CMS_PAGE_KINDS as readonly string[]).includes(pageKind) ||
    pageKind.includes('TREATMENT')
  );
}

/** Does this entity kind require an approver different from the editor? */
export function requiresSecondApprover(entityKind: TwoPersonEntityKind): boolean {
  return (TRUST_BEARING_ENTITY_KINDS as readonly string[]).includes(entityKind);
}

/** Certificate: only the transition to VERIFIED is a trust promotion. */
export function certificateApprovalEntityKind(toStatus: string): TwoPersonEntityKind {
  return toStatus === 'VERIFIED' ? 'CERTIFICATE_APPROVAL' : 'CERTIFICATE_REVIEW';
}

/** CMS: the page kind decides, not the revision or the actor's role. */
export function cmsPageEntityKind(pageKind: string): TwoPersonEntityKind {
  return isTrustBearingCmsPageKind(pageKind) ? 'CMS_TRUST_PAGE' : 'CMS_PAGE';
}

/**
 * Product: exactly the DRAFT -> ACTIVE move with price evidence that is not
 * VERIFIED. `VERIFIED` is compared as a literal: the locked `evidence_status`
 * enum has no VERIFIED member today, so every real publication is trust-bearing
 * until price verification is a recorded fact. The rule never silently
 * downgrades — it names the situation and lets the caller refuse.
 */
export function productPublishEntityKind(
  fromState: string,
  toState: string,
  priceEvidence: string,
): TwoPersonEntityKind {
  return fromState === 'DRAFT' && toState === 'ACTIVE' && priceEvidence !== 'VERIFIED'
    ? 'PRODUCT_PUBLISH_UNVERIFIED_PRICE'
    : 'PRODUCT_PUBLISH';
}

export interface TwoPersonRule {
  readonly entityKind: TwoPersonEntityKind;
  readonly required: boolean;
}

/** The rule for an entity kind. `assertTwoPerson` consumes this shape. */
export function twoPersonRuleFor(entityKind: TwoPersonEntityKind): TwoPersonRule {
  return { entityKind, required: requiresSecondApprover(entityKind) };
}

/**
 * The typed refusal. Extends DomainError so the code is stable and callers can
 * branch on it; the API maps it to 403 `TWO_PERSON_REQUIRED`, never to a
 * generic validation failure.
 */
export class TwoPersonError extends DomainError {
  readonly entityKind: TwoPersonEntityKind;

  constructor(entityKind: TwoPersonEntityKind) {
    super(
      'TWO_PERSON_REQUIRED',
      `This change is trust-bearing (${entityKind}); a second approver who did not edit it is required.`,
    );
    this.name = 'TwoPersonError';
    this.entityKind = entityKind;
  }
}

/**
 * Self-approval means the same recorded actor edited and approved. A null
 * editor is NOT self-approval: there is no recorded editor to differ from.
 */
export function isSelfApproval(editorId: string | null, approverId: string): boolean {
  return editorId !== null && editorId === approverId;
}

/**
 * Throw when the rule is required and the approver is the last editor.
 *
 * The order is deliberate: a non-trust entity kind is a no-op even if the ids
 * match, so this function can be called unconditionally by a repository. A
 * missing editor is documented as satisfied, and the caller records that fact
 * in the audit snapshot rather than inventing an editor.
 */
export function assertTwoPerson(
  rule: TwoPersonRule,
  editorId: string | null,
  approverId: string,
): void {
  if (!rule.required) return;
  if (editorId === null) return;
  if (isSelfApproval(editorId, approverId)) {
    throw new TwoPersonError(rule.entityKind);
  }
}

/**
 * The audit payload every enforced path records. Both actors are named, so the
 * ledger answers "who edited, who approved" without a join, and a path that
 * skipped the rule would be visible as `required: false` rather than absent.
 */
export interface TwoPersonAuditFields {
  readonly entity_kind: TwoPersonEntityKind;
  readonly required: boolean;
  readonly editor_id: string | null;
  readonly second_approver_id: string;
  /** True when no editor is recorded and the rule is therefore satisfied. */
  readonly editor_unrecorded: boolean;
  /** Audit snapshots are JSONB documents, not a closed record type. */
  readonly [field: string]: unknown;
}

export function twoPersonAuditFields(
  rule: TwoPersonRule,
  editorId: string | null,
  approverId: string,
): TwoPersonAuditFields {
  return {
    entity_kind: rule.entityKind,
    required: rule.required,
    editor_id: editorId,
    second_approver_id: approverId,
    editor_unrecorded: rule.required && editorId === null,
  };
}
