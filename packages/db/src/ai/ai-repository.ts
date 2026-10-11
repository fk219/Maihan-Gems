/**
 * packages/db/src/ai/ai-repository.ts
 *
 * Authority:
 * - technical_design/18_AI_ORCHESTRATION_ARCHITECTURE.md
 * - packages/db/migrations/0013_ai.sql
 *
 * Implements persistence for:
 * - Conversations & messages
 * - Tool calls & authorization decisions
 * - Knowledge documents & chunks
 * - AI interactions & performance metrics
 * - Guardrail events audit
 * - AI evaluations
 */

export interface DbClient {
  query: (text: string, params?: any[]) => Promise<{ rows: any[] }>;
}

export interface ConversationRow {
  readonly id: string;
  readonly conversation_key: string;
  readonly channel: string;
  readonly state: string;
  readonly customer_id: string | null;
  readonly external_ref: string | null;
  readonly locale: string;
  readonly handoff_reason: string | null;
  readonly handed_off_at: Date | null;
  readonly summary: string | null;
  readonly message_count: number;
  readonly created_at: Date;
  readonly updated_at: Date;
}

export interface MessageRow {
  readonly id: string;
  readonly conversation_id: string;
  readonly seq: number;
  readonly role: string;
  readonly content: string;
  readonly citations: unknown[];
  readonly guardrail_flags: unknown[];
  readonly created_at: Date;
}

export async function createConversation(
  client: DbClient | any,
  input: {
    readonly conversationKey: string;
    readonly channel: 'WEB_CHAT' | 'WHATSAPP' | 'ADMIN' | 'SEARCH';
    readonly customerId?: string | null;
    readonly externalRef?: string | null;
    readonly locale?: string;
  },
): Promise<ConversationRow> {
  const query = `
    INSERT INTO conversations (
      conversation_key, channel, customer_id, external_ref, locale, state
    ) VALUES ($1, $2::conversation_channel, $3, $4, $5, 'OPEN')
    ON CONFLICT (conversation_key) DO UPDATE SET updated_at = now()
    RETURNING *;
  `;
  const res = await client.query(query, [
    input.conversationKey,
    input.channel,
    input.customerId ?? null,
    input.externalRef ?? null,
    input.locale ?? 'en',
  ]);
  return res.rows[0];
}

export async function getConversationByKey(
  client: DbClient | any,
  conversationKey: string,
): Promise<ConversationRow | null> {
  const query = `
    SELECT * FROM conversations
    WHERE conversation_key = $1;
  `;
  const res = await client.query(query, [conversationKey]);
  return res.rows[0] ?? null;
}

export async function updateConversationState(
  client: DbClient | any,
  input: {
    readonly conversationId: string;
    readonly state: 'OPEN' | 'AWAITING_HUMAN' | 'ASSIGNED' | 'RESOLVED' | 'CLOSED';
    readonly handoffReason?: string | null;
    readonly summary?: string | null;
  },
): Promise<void> {
  const query = `
    UPDATE conversations
    SET state = $2::conversation_state,
        handoff_reason = COALESCE($3::handoff_reason, handoff_reason),
        handed_off_at = CASE WHEN $2 = 'AWAITING_HUMAN' THEN now() ELSE handed_off_at END,
        summary = COALESCE($4, summary),
        updated_at = now()
    WHERE id = $1;
  `;
  await client.query(query, [
    input.conversationId,
    input.state,
    input.handoffReason ?? null,
    input.summary ?? null,
  ]);
}

export async function appendMessage(
  client: DbClient | any,
  input: {
    readonly conversationId: string;
    readonly seq: number;
    readonly role: 'user' | 'assistant' | 'system' | 'tool';
    readonly content: string;
    readonly citations?: unknown[];
    readonly guardrailFlags?: unknown[];
    readonly modelName?: string;
    readonly inputTokens?: number;
    readonly outputTokens?: number;
    readonly costUsd?: number;
    readonly latencyMs?: number;
  },
): Promise<MessageRow> {
  const query = `
    INSERT INTO messages (
      conversation_id, seq, role, content, citations, guardrail_flags,
      model_name, input_tokens, output_tokens, cost_usd, latency_ms
    ) VALUES ($1, $2, $3::message_role, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *;
  `;
  const res = await client.query(query, [
    input.conversationId,
    input.seq,
    input.role,
    input.content,
    JSON.stringify(input.citations ?? []),
    JSON.stringify(input.guardrailFlags ?? []),
    input.modelName ?? null,
    input.inputTokens ?? null,
    input.outputTokens ?? null,
    input.costUsd ?? null,
    input.latencyMs ?? null,
  ]);

  // Update conversation message count
  await client.query(
    'UPDATE conversations SET message_count = message_count + 1, updated_at = now() WHERE id = $1;',
    [input.conversationId],
  );

  return res.rows[0];
}

export async function recordToolCall(
  client: DbClient | any,
  input: {
    readonly conversationId: string;
    readonly messageId?: string | null;
    readonly toolName: string;
    readonly toolVersion: string;
    readonly input: Record<string, unknown>;
    readonly output?: Record<string, unknown> | null;
    readonly authorizationDecision: string;
    readonly actorType: string;
    readonly latencyMs?: number;
  },
): Promise<void> {
  const query = `
    INSERT INTO tool_calls (
      conversation_id, message_id, tool_name, tool_version, input, output,
      authorization_decision, actor_type, latency_ms
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);
  `;
  await client.query(query, [
    input.conversationId,
    input.messageId ?? null,
    input.toolName,
    input.toolVersion,
    JSON.stringify(input.input),
    JSON.stringify(input.output ?? {}),
    input.authorizationDecision,
    input.actorType,
    input.latencyMs ?? null,
  ]);
}

export async function recordAiInteraction(
  client: DbClient | any,
  input: {
    readonly requestId: string;
    readonly conversationId?: string | null;
    readonly channel: string;
    readonly surface: string;
    readonly intent?: string;
    readonly provider: string;
    readonly modelName: string;
    readonly promptVersion: string;
    readonly inputTokens?: number;
    readonly outputTokens?: number;
    readonly costUsd?: number;
    readonly latencyMs?: number;
    readonly toolCallCount: number;
    readonly guardrailAction?: string;
    readonly groundedRatio?: number;
    readonly handoffTriggered: boolean;
  },
): Promise<void> {
  const query = `
    INSERT INTO ai_interactions (
      request_id, conversation_id, channel, surface, intent, provider,
      model_name, prompt_version, input_tokens, output_tokens, cost_usd,
      latency_ms, tool_call_count, guardrail_action, grounded_ratio, handoff_triggered
    ) VALUES ($1, $2, $3::conversation_channel, $4, $5, $6::ai_provider, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16);
  `;
  await client.query(query, [
    input.requestId,
    input.conversationId ?? null,
    input.channel,
    input.surface,
    input.intent ?? null,
    input.provider,
    input.modelName,
    input.promptVersion,
    input.inputTokens ?? null,
    input.outputTokens ?? null,
    input.costUsd ?? null,
    input.latencyMs ?? null,
    input.toolCallCount,
    input.guardrailAction ?? null,
    input.groundedRatio ?? null,
    input.handoffTriggered,
  ]);
}

export async function recordGuardrailEvent(
  client: DbClient | any,
  input: {
    readonly conversationId?: string | null;
    readonly ruleId: string;
    readonly action: 'ALLOW' | 'SANITIZE' | 'BLOCK' | 'ESCALATE';
    readonly triggerTextHash?: string;
    readonly detail?: Record<string, unknown>;
  },
): Promise<void> {
  const query = `
    INSERT INTO guardrail_events (
      conversation_id, rule_id, action, trigger_text_hash, detail
    ) VALUES ($1, $2, $3, $4, $5);
  `;
  await client.query(query, [
    input.conversationId ?? null,
    input.ruleId,
    input.action,
    input.triggerTextHash ?? null,
    JSON.stringify(input.detail ?? {}),
  ]);
}
