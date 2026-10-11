/**
 * packages/ai/src/handoff/types.ts
 *
 * Authority: technical_design/18_AI_ORCHESTRATION_ARCHITECTURE.md §13
 */
export type HandoffTrigger =
  | 'CUSTOMER_REQUEST'
  | 'LOW_CONFIDENCE'
  | 'CERTIFICATE_ANOMALY'
  | 'COMPLEX_DYO'
  | 'HIGH_VALUE'
  | 'SENSITIVE_OPERATION'
  | 'POLICY_ESCALATION'
  | 'DISSATISFACTION'
  | 'NO_INFORMATION';

export type ConversationState = 'OPEN' | 'AWAITING_HUMAN' | 'ASSIGNED' | 'RESOLVED' | 'CLOSED';

export interface HandoffRequest {
  readonly trigger: HandoffTrigger;
  readonly summary: string;
  readonly conversationKey: string;
  readonly customerId?: string;
  readonly metadata?: Record<string, unknown>;
}

export interface HandoffDecision {
  readonly shouldHandoff: boolean;
  readonly trigger?: HandoffTrigger;
  readonly reason?: string;
}

export interface HandoffRecord {
  readonly handoffId: string;
  readonly conversationKey: string;
  readonly trigger: HandoffTrigger;
  readonly state: ConversationState;
  readonly handedOffAt: Date;
  readonly specialistNotice: string;
}
