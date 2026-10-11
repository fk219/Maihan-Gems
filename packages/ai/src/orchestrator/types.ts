/**
 * packages/ai/src/orchestrator/types.ts
 *
 * Authority: technical_design/18_AI_ORCHESTRATION_ARCHITECTURE.md §3, §10
 */
import type { Citation, ToolActorType, ToolServices } from '../tools/types.js';
import type { AiSurface } from '../gateway/types.js';
import type { HandoffRecord } from '../handoff/types.js';

export interface OrchestratorTurnInput {
  readonly conversationKey: string;
  readonly message: string;
  readonly actorType?: ToolActorType;
  readonly actorId?: string;
  readonly customerId?: string;
  readonly surface?: AiSurface;
  readonly previousMessages?: ReadonlyArray<{
    readonly role: 'user' | 'assistant' | 'system';
    readonly content: string;
  }>;
}

export type SseFrameType =
  | 'start'
  | 'intent'
  | 'tool_call'
  | 'tool_result'
  | 'content_delta'
  | 'citation'
  | 'grounding'
  | 'handoff'
  | 'done'
  | 'error';

export interface SseFrame {
  readonly event: SseFrameType;
  readonly data: Record<string, unknown>;
}

export interface OrchestrationResult {
  readonly conversationKey: string;
  readonly responseText: string;
  readonly citations: ReadonlyArray<Citation>;
  readonly groundedRatio: number;
  readonly toolCallsExecuted: ReadonlyArray<{
    readonly tool: string;
    readonly input: Record<string, unknown>;
    readonly decision: string;
  }>;
  readonly handoff?: HandoffRecord;
  readonly latencyMs: number;
}

export interface OrchestratorOptions {
  readonly services: ToolServices;
  readonly surface?: AiSurface;
}
