/**
 * packages/domain/src/certificate/state-machine.ts
 *
 * Authority:
 *   - technical_design/17_CERTIFICATE_INTELLIGENCE.md Section "State machine"
 *   - INITIAL_IMPLEMENTATION_PLAN.md Phase 8 Task 6
 *
 * Transitions:
 *   UNVERIFIED --(EXTRACT)--> EXTRACTED
 *   EXTRACTED --(CROSS_CHECK)--> CROSS_CHECKED (all fields >= 0.85 & no ERROR anomaly)
 *   CROSS_CHECKED --(APPROVE)--> VERIFIED (human reviewer decision)
 *   ANY --(REJECT)--> REJECTED
 */
import { DomainError } from '../errors.js';
import type { VerificationStatus } from './types.js';

export type CertificateEvent =
  | { readonly type: 'EXTRACT'; readonly hasExtractedFields: boolean }
  | { readonly type: 'CROSS_CHECK'; readonly allFieldsAbove85: boolean; readonly hasErrorAnomaly: boolean }
  | { readonly type: 'APPROVE'; readonly isHumanReviewer: boolean; readonly allMaterialFieldsAbove90: boolean }
  | { readonly type: 'REJECT'; readonly reason: string };

export function transitionCertificateStatus(
  current: VerificationStatus,
  event: CertificateEvent,
): VerificationStatus {
  if (current === 'REJECTED') {
    throw new DomainError('CERTIFICATE_TERMINAL_STATE', 'rejected certificates cannot transition');
  }

  if (current === 'VERIFIED' && event.type !== 'REJECT') {
    throw new DomainError('CERTIFICATE_ALREADY_VERIFIED', 'verified certificates can only be rejected/superseded');
  }

  switch (event.type) {
    case 'REJECT':
      return 'REJECTED';

    case 'EXTRACT': {
      if (current !== 'UNVERIFIED') {
        throw new DomainError('ILLEGAL_CERTIFICATE_TRANSITION', `cannot extract from status ${current}`);
      }
      if (!event.hasExtractedFields) {
        throw new DomainError('EXTRACTION_EMPTY', 'cannot transition to EXTRACTED without extracted fields');
      }
      return 'EXTRACTED';
    }

    case 'CROSS_CHECK': {
      if (current !== 'EXTRACTED') {
        throw new DomainError('ILLEGAL_CERTIFICATE_TRANSITION', `cannot cross-check from status ${current}`);
      }
      if (event.hasErrorAnomaly) {
        // Blocks transition to CROSS_CHECKED; remains EXTRACTED (pending review)
        return 'EXTRACTED';
      }
      if (!event.allFieldsAbove85) {
        // Low confidence blocks automatic promotion to CROSS_CHECKED
        return 'EXTRACTED';
      }
      return 'CROSS_CHECKED';
    }

    case 'APPROVE': {
      if (current !== 'CROSS_CHECKED' && current !== 'EXTRACTED') {
        throw new DomainError('ILLEGAL_CERTIFICATE_TRANSITION', `cannot approve certificate from status ${current}`);
      }
      if (!event.isHumanReviewer) {
        throw new DomainError('HUMAN_REVIEW_REQUIRED', 'automated verification without human approval is strictly prohibited');
      }
      if (!event.allMaterialFieldsAbove90) {
        throw new DomainError(
          'INSUFFICIENT_CONFIDENCE_FOR_VERIFICATION',
          'verification requires every material field >= 0.90',
        );
      }
      return 'VERIFIED';
    }
  }
}
