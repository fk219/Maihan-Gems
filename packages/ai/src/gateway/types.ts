/**
 * packages/ai/src/gateway/types.ts
 *
 * Authority: technical_design/18_AI_ORCHESTRATION_ARCHITECTURE.md §2
 *
 * ModelGateway abstraction: provider isolation, fallback chain, budget enforcement.
 * Business logic NEVER imports provider SDKs directly.
 */
export type AiProvider = 'VERCEL_AI_GATEWAY' | 'OPENROUTER' | 'LOCAL' | 'MOCK';

export type AiSurface = 'chat_panel' | 'whatsapp' | 'admin_assist' | 'search_assist';

export interface ChatMessage {
  readonly role: 'system' | 'user' | 'assistant' | 'tool';
  readonly content: string;
  readonly name?: string;
  readonly toolCallId?: string;
}

export interface ToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly parameters: Record<string, unknown>;
}

export interface GenerateRequest {
  readonly messages: ReadonlyArray<ChatMessage>;
  readonly tools?: ReadonlyArray<ToolDefinition>;
  readonly temperature?: number;
  readonly maxTokens?: number;
  readonly surface?: AiSurface;
  readonly model?: string;
  readonly stream?: boolean;
}

export interface ToolCallProposal {
  readonly id: string;
  readonly name: string;
  readonly arguments: Record<string, unknown>;
}

export interface TokenUsage {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cachedTokens?: number;
  readonly costUsd: number;
}

export interface GenerateResult {
  readonly content: string;
  readonly toolCalls?: ReadonlyArray<ToolCallProposal>;
  readonly finishReason: 'stop' | 'tool_calls' | 'length' | 'content_filter' | 'error';
  readonly usage: TokenUsage;
  readonly latencyMs: number;
  readonly modelName: string;
  readonly provider: AiProvider;
}

export interface StreamChunk {
  readonly type: 'content_delta' | 'tool_call_delta' | 'done' | 'error';
  readonly delta?: string;
  readonly toolCall?: {
    readonly id: string;
    readonly name?: string;
    readonly argumentsDelta?: string;
  };
  readonly finishReason?: string;
  readonly usage?: TokenUsage;
  readonly error?: string;
}

export interface ModelDescriptor {
  readonly id: string;
  readonly name: string;
  readonly provider: AiProvider;
  readonly contextWindow: number;
  readonly costPer1kInputUsd: number;
  readonly costPer1kOutputUsd: number;
  readonly supportsVision: boolean;
  readonly supportsTools: boolean;
}

export interface BudgetStatus {
  readonly surface: AiSurface;
  readonly dailyLimitUsd: number;
  readonly currentUsageUsd: number;
  readonly remainingBudgetUsd: number;
  readonly allowed: boolean;
}

export interface ModelGateway {
  generate(req: GenerateRequest): Promise<GenerateResult>;
  stream(req: GenerateRequest): AsyncIterable<StreamChunk>;
  embed(texts: ReadonlyArray<string>, model?: string): Promise<number[][]>;
  listModels(): ReadonlyArray<ModelDescriptor>;
  checkBudget(surface: AiSurface): Promise<BudgetStatus>;
  recordUsage(surface: AiSurface, costUsd: number): Promise<void>;
}
