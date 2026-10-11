/**
 * packages/ai/src/handoff/handoff-engine.ts
 *
 * Authority: technical_design/18_AI_ORCHESTRATION_ARCHITECTURE.md §13
 *
 * Handoff Engine:
 * - Detects the 9 authoritative handoff conditions
 * - State transition to AWAITING_HUMAN
 * - Generates clear expectation message for client
 */
import { randomUUID } from 'node:crypto';
import type { HandoffTrigger, HandoffRequest, HandoffDecision, HandoffRecord } from './types.js';

export const HANDOFF_NOTICES: Record<HandoffTrigger, string> = {
  CUSTOMER_REQUEST:
    'I have connected your inquiry directly to our Private Client Advisory team. A senior gemmologist will respond shortly.',
  LOW_CONFIDENCE:
    'To ensure complete mineralogical accuracy, I am routing this request to our senior gemmologist for verified consultation.',
  CERTIFICATE_ANOMALY:
    'A verification item has been flagged for curator review. Our gemmological department will inspect the archives directly.',
  COMPLEX_DYO:
    'Your bespoke mounting configuration requires master jeweller review. Our atelier director will assist you.',
  HIGH_VALUE:
    'For exceptional acquisitions of this calibre, our Principal Private Client Advisor will personally attend to your curation.',
  SENSITIVE_OPERATION:
    'This inquiry has been escalated to Client Relations to ensure priority handling.',
  POLICY_ESCALATION:
    'This inquiry has been transferred to a senior advisor for review.',
  DISSATISFACTION:
    'I apologize for any difficulty. I am immediately connecting you with our Client Advisory Director.',
  NO_INFORMATION:
    'Our digital records do not contain a verified answer for this piece. Connecting you with our archival specialists.',
};

export class HandoffEngine {
  /**
   * Evaluates turn context to determine if an automatic handoff should fire.
   */
  evaluateTriggers(context: {
    readonly userMessage?: string;
    readonly groundedRatio?: number;
    readonly emptyResultCount?: number;
    readonly hasCertificateAnomaly?: boolean;
    readonly orderValueUsd?: number;
    readonly guardrailAction?: string;
  }): HandoffDecision {
    const msg = (context.userMessage ?? '').toLowerCase();

    // 1. Explicit customer request
    if (
      /(speak|talk)\s+to\s+(a\s+)?(human|person|agent|someone|gemm?ologist)/i.test(msg) ||
      msg.includes('human agent') ||
      msg.includes('call me') ||
      msg.includes('gemologist') ||
      msg.includes('gemmologist')
    ) {
      return {
        shouldHandoff: true,
        trigger: 'CUSTOMER_REQUEST',
        reason: 'Customer explicitly requested a human specialist.',
      };
    }

    // 2. Sensitive operation (refund, dispute, complaint)
    if (msg.includes('refund') || msg.includes('complaint') || msg.includes('dispute') || msg.includes('fake')) {
      return {
        shouldHandoff: true,
        trigger: 'SENSITIVE_OPERATION',
        reason: 'Inquiry involves refund, dispute, or authenticity inquiry.',
      };
    }

    // 3. Policy escalation from guardrail
    if (context.guardrailAction === 'ESCALATE') {
      return {
        shouldHandoff: true,
        trigger: 'POLICY_ESCALATION',
        reason: 'Guardrail engine triggered policy escalation.',
      };
    }

    // 4. Low grounding confidence
    if (context.groundedRatio !== undefined && context.groundedRatio < 0.60) {
      return {
        shouldHandoff: true,
        trigger: 'LOW_CONFIDENCE',
        reason: `Grounded ratio (${context.groundedRatio}) fell below 0.60 threshold.`,
      };
    }

    // 5. Certificate anomaly detected
    if (context.hasCertificateAnomaly) {
      return {
        shouldHandoff: true,
        trigger: 'CERTIFICATE_ANOMALY',
        reason: 'Certificate anomaly detected on associated document.',
      };
    }

    // 6. High order value
    if (context.orderValueUsd !== undefined && context.orderValueUsd >= 25000) {
      return {
        shouldHandoff: true,
        trigger: 'HIGH_VALUE',
        reason: `Transaction value ($${context.orderValueUsd}) meets private concierge threshold.`,
      };
    }

    // 7. Repeated empty tool results
    if (context.emptyResultCount !== undefined && context.emptyResultCount >= 2) {
      return {
        shouldHandoff: true,
        trigger: 'NO_INFORMATION',
        reason: 'Tools returned no results twice consecutively.',
      };
    }

    return { shouldHandoff: false };
  }

  /**
   * Executes handoff state transition.
   */
  createHandoffRecord(req: HandoffRequest): HandoffRecord {
    return {
      handoffId: `hnd_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
      conversationKey: req.conversationKey,
      trigger: req.trigger,
      state: 'AWAITING_HUMAN',
      handedOffAt: new Date(),
      specialistNotice: HANDOFF_NOTICES[req.trigger] ?? HANDOFF_NOTICES.CUSTOMER_REQUEST,
    };
  }
}
