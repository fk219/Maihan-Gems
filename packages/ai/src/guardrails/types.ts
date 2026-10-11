/**
 * packages/ai/src/guardrails/types.ts
 *
 * Authority: technical_design/18_AI_ORCHESTRATION_ARCHITECTURE.md §8
 */
export type GuardrailAction = 'ALLOW' | 'SANITIZE' | 'BLOCK' | 'ESCALATE';

export interface GuardrailCheckResult {
  readonly action: GuardrailAction;
  readonly ruleId: string;
  readonly reason?: string;
  readonly triggerTextHash?: string;
  readonly sanitizedContent?: string;
  readonly detail?: Record<string, unknown>;
}

export interface GuardrailEngineOptions {
  readonly maxInputLength?: number;
}
