/**
 * packages/domain — error model (doc 05 "Error handling", doc 07 "Error model").
 *
 * Two distinct domain error types, never merged:
 *
 *   DomainError    — a business-rule or validation failure. Carries a stable
 *                    string code (value-object validation codes live here).
 *   InvariantError — the violation of a numbered invariant INV-01..INV-10.
 *                    Code is a literal from the registry, never an ad-hoc
 *                    string, so callers and tests can branch on it.
 *
 * Neither is a transport error envelope (doc 07 owns that mapping: an
 * InvariantError maps to 422 with the invariant named).
 *
 * Error MESSAGES are human context. The `code` is the stable identifier tests
 * and callers rely on — changing a code is a breaking change, not an edit.
 */

/** The numbered invariant registry (Source of Truth section 7.3; doc 05). */
export type InvariantCode = 'INV-01' | 'INV-02' | 'INV-03' | 'INV-04' | 'INV-05' | 'INV-06' | 'INV-07' | 'INV-08' | 'INV-09' | 'INV-10';

/** Machine-readable detail attached to an invariant violation. */
export interface InvariantDetails {
  readonly [key: string]: unknown;
}

/** Business-rule or value-object validation failure with a stable code. */
export class DomainError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
  }
}

/** A numbered invariant (INV-01..INV-10) was violated. */
export class InvariantError extends DomainError {
  override readonly code: InvariantCode;
  readonly details?: InvariantDetails;

  constructor(code: InvariantCode, message: string, details?: InvariantDetails) {
    super(code, message);
    this.name = 'InvariantError';
    this.code = code;
    this.details = details;
  }
}
