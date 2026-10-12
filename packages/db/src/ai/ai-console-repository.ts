/**
 * packages/db/src/ai/ai-console-repository.ts
 *
 * Phase 12 — Stage F / Global Task 11 (E12.7 AI operations console).
 *
 * READ-ONLY visibility over the locked AI tables (0013_ai.sql):
 *   - conversations (queue by state/channel, message counts);
 *   - tool_calls (tool-call audit trail incl. DENY decisions and errors);
 *   - guardrail_events (rule ids, action distribution; hash-only triggers);
 *   - ai_evaluations (evaluation runs grouped by suite/dimension).
 *
 * The structural no-write guard (ADR-003/NFR-05) is preserved by
 * construction: this repository exposes NO mutating statement at all. The
 * console is an audit surface, not an operator control of the AI runtime.
 * READ_ONLY_ANALYST-safe: conversation keys and ids are returned, but no
 * message body is included in list output (PII minimisation, doc 23 §11).
 */
import { sql } from 'drizzle-orm';
import type { CatalogDatabase } from '../catalog/executor.js';

export interface ConsoleConversationRow extends Record<string, unknown> {
  id: string; conversation_key: string; channel: string; state: string;
  message_count: number; handoff_reason: string | null; updated_at: string;
}
export interface ConsoleToolCallRow extends Record<string, unknown> {
  id: string; tool_name: string; authorization_decision: string;
  error_code: string | null; latency_ms: number | null; cost_usd: string | null; created_at: string;
}
export interface ConsoleGuardrailRow extends Record<string, unknown> {
  id: number; rule_id: string; action: string; conversation_id: string | null; created_at: string;
}
export interface ConsoleEvalRow extends Record<string, unknown> {
  run_id: string; eval_suite: string; dimension: string;
  total: number; passed: number;
}

export interface AiConsoleRepository {
  listConversations(opts: { state?: string; limit: number; offset: number }): Promise<ConsoleConversationRow[]>;
  listToolCalls(opts: { denialsOnly?: boolean; limit: number; offset: number }): Promise<ConsoleToolCallRow[]>;
  listGuardrailEvents(opts: { limit: number; offset: number }): Promise<ConsoleGuardrailRow[]>;
  listEvaluationRuns(): Promise<ConsoleEvalRow[]>;
}

export function createAiConsoleRepository(db: CatalogDatabase): AiConsoleRepository {
  return {
    async listConversations({ state, limit, offset }) {
      const where = state !== undefined
        ? sql`WHERE state::text = ${state}`
        : sql``;
      const res = await db.execute<ConsoleConversationRow>(
        sql`SELECT id, conversation_key, channel::text AS channel, state::text AS state,
                   message_count, handoff_reason::text AS handoff_reason, updated_at
              FROM conversations ${where}
             ORDER BY updated_at DESC LIMIT ${limit} OFFSET ${offset}`,
      );
      return res.rows;
    },

    async listToolCalls({ denialsOnly, limit, offset }) {
      const where = denialsOnly
        ? sql`WHERE authorization_decision = 'DENY'`
        : sql``;
      const res = await db.execute<ConsoleToolCallRow>(
        sql`SELECT id, tool_name, authorization_decision, error_code, latency_ms, cost_usd::text AS cost_usd, created_at
              FROM tool_calls ${where}
             ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
      );
      return res.rows;
    },

    async listGuardrailEvents({ limit, offset }) {
      const res = await db.execute<ConsoleGuardrailRow>(
        sql`SELECT id, rule_id, action, conversation_id, created_at
              FROM guardrail_events
             ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
      );
      return res.rows;
    },

    async listEvaluationRuns() {
      const res = await db.execute<ConsoleEvalRow>(
        sql`SELECT run_id::text AS run_id, eval_suite, dimension,
                   count(*)::int AS total,
                   count(*) FILTER (WHERE passed)::int AS passed
              FROM ai_evaluations
             GROUP BY run_id, eval_suite, dimension
             ORDER BY eval_suite, dimension`,
      );
      return res.rows;
    },
  };
}
