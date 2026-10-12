/**
 * apps/web/src/api/admin/ai-console-handlers.ts
 *
 * Phase 12 — Stage F / Global Task 11 HTTP surface (E12.7).
 *
 * Read-only endpoints over the AI console repository:
 *   GET /admin/ai/conversations — channel queue (conversation/message
 *        counts; NO message bodies — PII minimisation, doc 23 §11);
 *   GET /admin/ai/tool-calls — tool-call audit trail (denialsOnly filter);
 *   GET /admin/ai/guardrails — guardrail event stream (hash-only triggers);
 *   GET /admin/ai/evaluations — evaluation runs by suite/dimension.
 *
 * RBAC (doc 23 §3): ai_logs/conversations = AI_OPERATIONS (+READ_ONLY_
 * ANALYST dashboards only); the no-write structural guard (ADR-003) is
 * preserved because every handler's repository call is read-only.
 */
import type { RouteContext, HandlerOutcome } from '../handlers.js';
import { createAiConsoleRepository, type CatalogDatabase } from '@maihan/db';

import {
  authorizeAdmin,
  authzFailureResponse,
} from './authz.js';

function gate(
  ctx: RouteContext,
  module: 'conversations' | 'ai_logs' | 'evaluation_runs',
): { actor: import('@maihan/contracts').AdminActor } | { failure: Response } {
  const headers = ctx.request?.headers ?? new Headers();
  const decision = authorizeAdmin(headers, { module, action: 'list' });
  if (decision.ok) return { actor: decision.actor };
  return { failure: authzFailureResponse(decision.status, ctx.ids) };
}

function consoleRepo(ctx: RouteContext) {
  if (ctx.db === undefined) throw new Error('AI console handlers require the db seam (ctx.db)');
  return createAiConsoleRepository(ctx.db as CatalogDatabase);
}

const paging = (ctx: RouteContext): { limit: number; offset: number } => ({
  limit: Math.min(Number(ctx.url.searchParams.get('limit') ?? '50'), 500),
  offset: Math.max(Number(ctx.url.searchParams.get('offset') ?? '0'), 0),
});

export async function aiConsoleConversationsHandler(ctx: RouteContext): Promise<HandlerOutcome> {
  const g = gate(ctx, 'conversations');
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };
  const state = ctx.url.searchParams.get('state') ?? undefined;
  const rows = await consoleRepo(ctx).listConversations({ state, ...paging(ctx) });
  return { status: 200, body: { data: rows, meta: { count: rows.length, ...paging(ctx) } } };
}

export async function aiConsoleToolCallsHandler(ctx: RouteContext): Promise<HandlerOutcome> {
  const g = gate(ctx, 'ai_logs');
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };
  const denialsOnly = ctx.url.searchParams.get('denials') === 'true';
  const rows = await consoleRepo(ctx).listToolCalls({ denialsOnly, ...paging(ctx) });
  return { status: 200, body: { data: rows, meta: { count: rows.length, denialsOnly } } };
}

export async function aiConsoleGuardrailsHandler(ctx: RouteContext): Promise<HandlerOutcome> {
  const g = gate(ctx, 'ai_logs');
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };
  const rows = await consoleRepo(ctx).listGuardrailEvents(paging(ctx));
  return { status: 200, body: { data: rows, meta: { count: rows.length } } };
}

export async function aiConsoleEvaluationsHandler(ctx: RouteContext): Promise<HandlerOutcome> {
  const g = gate(ctx, 'evaluation_runs');
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };
  const rows = await consoleRepo(ctx).listEvaluationRuns();
  return { status: 200, body: { data: rows, meta: { count: rows.length } } };
}
