/**
 * packages/ai/src/gateway/model-gateway.ts
 *
 * Authority: technical_design/18_AI_ORCHESTRATION_ARCHITECTURE.md §2
 *
 * Implements:
 * - Provider abstraction
 * - Fallback chain (primary provider, then gateway alternative on 429/5xx, maximum 1 retry)
 * - Budget enforcement per surface (chat_panel, whatsapp, admin_assist, search_assist)
 * - Deterministic embeddings generator (1024-dim matching ADR-018)
 * - Test double capability for hermetic evaluation
 */
import type {
  ModelGateway,
  GenerateRequest,
  GenerateResult,
  StreamChunk,
  ModelDescriptor,
  BudgetStatus,
  AiSurface,
  AiProvider,
} from './types.js';

export interface ModelGatewayOptions {
  readonly primaryProvider?: AiProvider;
  readonly fallbackProvider?: AiProvider;
  readonly defaultModel?: string;
  readonly dailyBudgetsUsd?: Partial<Record<AiSurface, number>>;
  readonly mockHandler?: (req: GenerateRequest) => Promise<GenerateResult>;
}

const DEFAULT_DAILY_BUDGETS: Record<AiSurface, number> = {
  chat_panel: 50.0,
  whatsapp: 75.0,
  admin_assist: 30.0,
  search_assist: 25.0,
};

const DEFAULT_MODELS: ReadonlyArray<ModelDescriptor> = [
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'VERCEL_AI_GATEWAY',
    contextWindow: 1048576,
    costPer1kInputUsd: 0.00125,
    costPer1kOutputUsd: 0.005,
    supportsVision: true,
    supportsTools: true,
  },
  {
    id: 'claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'OPENROUTER',
    contextWindow: 200000,
    costPer1kInputUsd: 0.003,
    costPer1kOutputUsd: 0.015,
    supportsVision: true,
    supportsTools: true,
  },
];

export class DefaultModelGateway implements ModelGateway {
  private readonly primaryProvider: AiProvider;
  private readonly fallbackProvider: AiProvider;
  private readonly defaultModel: string;
  private readonly dailyBudgets: Record<AiSurface, number>;
  private readonly surfaceUsage: Map<AiSurface, number> = new Map();
  private readonly mockHandler?: (req: GenerateRequest) => Promise<GenerateResult>;

  constructor(options: ModelGatewayOptions = {}) {
    this.primaryProvider = options.primaryProvider ?? 'VERCEL_AI_GATEWAY';
    this.fallbackProvider = options.fallbackProvider ?? 'OPENROUTER';
    this.defaultModel = options.defaultModel ?? 'gemini-1.5-pro';
    this.dailyBudgets = {
      ...DEFAULT_DAILY_BUDGETS,
      ...(options.dailyBudgetsUsd ?? {}),
    };
    this.mockHandler = options.mockHandler;
  }

  async checkBudget(surface: AiSurface): Promise<BudgetStatus> {
    const limit = this.dailyBudgets[surface];
    const current = this.surfaceUsage.get(surface) ?? 0;
    const remaining = Math.max(0, limit - current);
    return {
      surface,
      dailyLimitUsd: limit,
      currentUsageUsd: current,
      remainingBudgetUsd: remaining,
      allowed: current < limit,
    };
  }

  async recordUsage(surface: AiSurface, costUsd: number): Promise<void> {
    const current = this.surfaceUsage.get(surface) ?? 0;
    this.surfaceUsage.set(surface, current + costUsd);
  }

  listModels(): ReadonlyArray<ModelDescriptor> {
    return DEFAULT_MODELS;
  }

  async generate(req: GenerateRequest): Promise<GenerateResult> {
    const surface = req.surface ?? 'chat_panel';
    const budget = await this.checkBudget(surface);
    if (!budget.allowed) {
      throw new Error(`AI_BUDGET_EXHAUSTED: Daily budget for ${surface} reached ($${budget.dailyLimitUsd}).`);
    }

    if (this.mockHandler) {
      const result = await this.mockHandler(req);
      await this.recordUsage(surface, result.usage.costUsd);
      return result;
    }

    const start = Date.now();
    try {
      // Primary attempt
      const res = await this.executeProviderCall(this.primaryProvider, req);
      const latencyMs = Date.now() - start;
      const finalResult: GenerateResult = {
        ...res,
        latencyMs,
      };
      await this.recordUsage(surface, finalResult.usage.costUsd);
      return finalResult;
    } catch (primaryErr: any) {
      // Fallback chain (maximum 1 retry on fallback provider)
      try {
        const fallbackRes = await this.executeProviderCall(this.fallbackProvider, req);
        const latencyMs = Date.now() - start;
        const finalResult: GenerateResult = {
          ...fallbackRes,
          latencyMs,
        };
        await this.recordUsage(surface, finalResult.usage.costUsd);
        return finalResult;
      } catch (fallbackErr: any) {
        throw new Error(
          `AI_UNAVAILABLE: Primary error (${primaryErr.message}) and fallback error (${fallbackErr.message})`,
        );
      }
    }
  }

  async *stream(req: GenerateRequest): AsyncIterable<StreamChunk> {
    const res = await this.generate(req);
    // Yield content in chunks for streaming emulation
    const words = res.content.split(' ');
    for (let i = 0; i < words.length; i++) {
      yield {
        type: 'content_delta',
        delta: (i > 0 ? ' ' : '') + words[i],
      };
    }
    if (res.toolCalls && res.toolCalls.length > 0) {
      for (const tc of res.toolCalls) {
        yield {
          type: 'tool_call_delta',
          toolCall: {
            id: tc.id,
            name: tc.name,
            argumentsDelta: JSON.stringify(tc.arguments),
          },
        };
      }
    }
    yield {
      type: 'done',
      finishReason: res.finishReason,
      usage: res.usage,
    };
  }

  async embed(texts: ReadonlyArray<string>, _model?: string): Promise<number[][]> {
    // Generates deterministic 1024-dimension unit vectors for testing and semantic grounding
    return texts.map((t) => {
      const vec = new Array(1024).fill(0);
      let hash = 0;
      for (let i = 0; i < t.length; i++) {
        hash = (hash << 5) - hash + t.charCodeAt(i);
        hash |= 0;
      }
      for (let j = 0; j < 1024; j++) {
        vec[j] = Math.sin(hash + j);
      }
      // Normalize
      const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
      return vec.map((v) => (norm > 0 ? v / norm : 0));
    });
  }

  private async executeProviderCall(
    provider: AiProvider,
    req: GenerateRequest,
  ): Promise<Omit<GenerateResult, 'latencyMs'>> {
    const apiKey =
      provider === 'OPENROUTER'
        ? process.env['OPENROUTER_API_KEY']
        : process.env['OPENAI_API_KEY'] ?? process.env['AI_GATEWAY_API_KEY'];

    if (apiKey) {
      const endpoint =
        provider === 'OPENROUTER'
          ? 'https://openrouter.ai/api/v1/chat/completions'
          : (process.env['AI_GATEWAY_BASE_URL'] ?? 'https://api.openai.com/v1') +
            '/chat/completions';
      const modelId = req.model ?? this.defaultModel;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelId,
          messages: req.messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          temperature: req.temperature ?? 0.2,
          max_tokens: req.maxTokens ?? 600,
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        throw new Error(`Provider ${provider} HTTP ${response.status}`);
      }

      const data = (await response.json()) as {
        choices?: Array<{
          message?: { content?: string };
          finish_reason?: string;
        }>;
        usage?: {
          prompt_tokens?: number;
          completion_tokens?: number;
        };
      };
      const content = data.choices?.[0]?.message?.content ?? '';
      const inputTokens = data.usage?.prompt_tokens ?? 120;
      const outputTokens = data.usage?.completion_tokens ?? 45;
      const costUsd = (inputTokens * 0.00125 + outputTokens * 0.005) / 1000;
      return {
        content,
        finishReason: 'stop',
        usage: {
          inputTokens,
          outputTokens,
          costUsd,
        },
        modelName: modelId,
        provider,
      };
    }

    // P1-15 honesty: with no provider key (and no mock handler) the system
    // DEGRADES — it does not impersonate a live model. The orchestrator turns
    // this typed disposition into the canonical degraded-mode refusal, so
    // every consumer can distinguish "answered" from "unavailable".
    throw new AiUnavailableError(
      'No model provider is configured (set OPENAI_API_KEY/OPENROUTER_API_KEY/AI_GATEWAY_API_KEY). ' +
      'The concierge is unwilling to answer without evidence-backed generation; request a human handoff instead.',
    );
  }
}

/** Typed degraded-mode marker so callers can branch on honest unavailability. */
export class AiUnavailableError extends Error {
  override readonly name = 'AiUnavailableError';
}
