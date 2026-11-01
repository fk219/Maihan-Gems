/**
 * OpenAI-compatible chat-completions seam for the concierge.
 *
 * No key is required to run the deterministic concierge; when OPENAI_API_KEY
 * or OPENROUTER_API_KEY is configured this enriches the turn through a model.
 * The model only receives read-only catalogue tools (ADR-003: no AI writes).
 */
export interface ModelMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  name?: string;
  tool_calls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }>;
}

export interface ToolSchema {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ModelReply {
  content: string;
  toolCalls: ToolCall[];
}

interface ProviderConfig { key: string; baseUrl: string; model: string }

function config(): ProviderConfig | null {
  const model = process.env['AI_MODEL'] || 'gpt-4o-mini';
  if (process.env['OPENAI_API_KEY']) {
    return {
      key: process.env['OPENAI_API_KEY'],
      baseUrl: (process.env['OPENAI_BASE_URL'] ?? 'https://api.openai.com/v1').replace(/\/$/, ''),
      model,
    };
  }
  if (process.env['OPENROUTER_API_KEY']) {
    return {
      key: process.env['OPENROUTER_API_KEY'],
      baseUrl: (process.env['OPENROUTER_BASE_URL'] ?? 'https://openrouter.ai/api/v1').replace(/\/$/, ''),
      model,
    };
  }
  return null;
}

export function modelConfigured(): boolean {
  return config() !== null;
}

interface RawToolCall {
  id?: string;
  function?: { name?: string; arguments?: string };
}

export async function askModel(messages: ModelMessage[], tools: ToolSchema[]): Promise<ModelReply | null> {
  const cfg = config();
  if (!cfg) return null;
  try {
    const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { authorization: `Bearer ${cfg.key}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: cfg.model,
        messages,
        tools: tools.length ? tools : undefined,
        tool_choice: tools.length ? 'auto' : undefined,
        temperature: 0.2,
        max_tokens: 300,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string | null; tool_calls?: RawToolCall[] } }>;
    };
    const message = data.choices?.[0]?.message;
    if (!message) return null;
    const toolCalls: ToolCall[] = [];
    for (const call of message.tool_calls ?? []) {
      const name = call.function?.name;
      if (!name) continue;
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(call.function?.arguments ?? '{}') as Record<string, unknown>;
      } catch {
        args = {};
      }
      toolCalls.push({ id: call.id ?? `call-${toolCalls.length}`, name, arguments: args });
    }
    return { content: (message.content ?? '').trim(), toolCalls };
  } catch {
    return null;
  }
}
