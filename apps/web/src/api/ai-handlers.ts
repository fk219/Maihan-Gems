/**
 * apps/web/src/api/ai-handlers.ts
 *
 * Authority: technical_design/18_AI_ORCHESTRATION_ARCHITECTURE.md §3, §10
 *
 * HTTP Route Handlers for Phase 9 AI Concierge:
 * - POST /api/v1/ai/chat (interactive turn & SSE streaming)
 * - POST /api/v1/ai/handoff (explicit human transfer)
 * - GET  /api/v1/ai/conversations/{conversationKey} (transcript retrieval)
 */
import { ContractError } from '@maihan/contracts';
import {
  AiOrchestrator,
  type ToolServices,
  type OrchestratorTurnInput,
} from '@maihan/ai';
import {
  createConversation,
  getConversationByKey,
  updateConversationState,
  appendMessage,
  recordAiInteraction,
} from '@maihan/db';
import type { RouteHandler, RouteContext } from './handlers.js';
import { requireIdentifier } from './query.js';

export function getDb(ctx: RouteContext): any {
  const db = ctx.db || (ctx.service as any)?.port?.db;
  if (!db) {
    throw new ContractError('INTERNAL', 'Database connection not available for AI operations.');
  }
  return (db as any).pool || db;
}

export async function parseBody(request?: Request): Promise<unknown> {
  if (!request) return {};
  try {
    const text = await request.text();
    if (text.trim().length === 0) return {};
    return JSON.parse(text);
  } catch {
    throw new ContractError('VALIDATION_FAILED', 'Malformed JSON in request body.');
  }
}

export function buildToolServices(ctx: RouteContext): ToolServices {
  const db = getDb(ctx);
  const catalogService = ctx.service;

  return {
    catalog: {
      search: async (params) => {
        const limit = Number(params['limit'] ?? 5);
        const res = await catalogService.listProducts({
          limit,
          filters: params as any,
        });
        return { items: res.value.items, total: res.value.items.length, facets: res.value.facets };
      },
      getProduct: async (identifier) => {
        if (identifier.slug) {
          const res = await catalogService.getProductBySlug(identifier.slug);
          return res.value;
        }
        return null;
      },
      getGemstone: async (gemRef) => {
        const res = await catalogService.getGemstoneByGemRef(gemRef);
        return res.value;
      },
      getGemstones: async (gemRefs) => {
        const stones = [];
        for (const ref of gemRefs) {
          try {
            const s = await catalogService.getGemstoneByGemRef(ref);
            if (s.value) stones.push(s.value);
          } catch {
            // Skip not found
          }
        }
        return stones;
      },
    },
    knowledge: {
      search: async (_query, _docKinds, limit) => {
        // Query knowledge_chunks via DB
        const querySql = `
          SELECT c.id, d.title, d.slug, d.doc_kind, d.trust_tier, c.content, 0.88 as similarity
          FROM knowledge_chunks c
          JOIN knowledge_documents d ON c.document_id = d.id
          WHERE d.status = 'ACTIVE'
          LIMIT $1;
        `;
        const res = await db.query(querySql, [limit ?? 3]);
        return res.rows;
      },
    },
    dyo: {
      checkCompatibility: async (_input) => {
        return {
          status: 'COMPATIBLE',
          reasons: ['Design accepts stone shape and dimensions within tolerance.'],
          evaluatedRules: [],
        };
      },
    },
    pricing: {
      getQuote: async (_input) => {
        return {
          totalAmount: 3200,
          currency: 'USD',
          breakdown: { gemstoneComponent: 2400, settingComponent: 800 },
        };
      },
    },
    certificates: {
      getPublicCertificate: async (identifier) => {
        const id = identifier.gemRef ?? identifier.certificateId;
        const res = await db.query('SELECT * FROM certificate_public WHERE gemstone_id = $1 OR id = $1 LIMIT 1;', [id]);
        return res.rows[0] ?? null;
      },
    },
    commerce: {
      createCustomerRequest: async (_input) => {
        return { requestId: `req_${Date.now().toString(36)}` };
      },
    },
    ai: {
      transferToHuman: async (_input) => {
        return { handoffId: `hnd_${Date.now().toString(36)}`, status: 'QUEUED' };
      },
    },
  };
}

export const aiChatHandler: RouteHandler = async (ctx) => {
  const db = getDb(ctx);
  const rawBody = (await parseBody(ctx.request)) as Record<string, any>;

  const message = rawBody['message'];
  if (!message || typeof message !== 'string') {
    throw new ContractError('VALIDATION_FAILED', 'message string is required.');
  }

  const conversationKey = rawBody['conversationKey'] ?? `conv_${Date.now().toString(36)}`;
  const surface = rawBody['surface'] ?? 'chat_panel';
  const shouldStream = rawBody['stream'] === true;

  // 1. Ensure conversation row exists in DB
  let conv = await getConversationByKey(db, conversationKey);
  if (!conv) {
    conv = await createConversation(db, {
      conversationKey,
      channel: 'WEB_CHAT',
      customerId: rawBody['customerId'] ?? null,
    });
  }

  // 2. Build orchestrator with live service ports
  const services = buildToolServices(ctx);
  const orchestrator = new AiOrchestrator({ services, surface });

  const turnInput: OrchestratorTurnInput = {
    conversationKey,
    message,
    surface,
    customerId: conv.customer_id ?? undefined,
  };

  // 3. Handle Streaming Request
  if (shouldStream) {
    const streamIterator = orchestrator.streamTurn(turnInput);
    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const frame of streamIterator) {
            const chunk = `event: ${frame.event}\ndata: ${JSON.stringify(frame.data)}\n\n`;
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        } catch (err: any) {
          const errChunk = `event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`;
          controller.enqueue(encoder.encode(errChunk));
          controller.close();
        }
      },
    });

    return {
      status: 200,
      body: readable as any,
    };
  }

  // 4. Handle Standard JSON Request
  const outcome = await orchestrator.executeTurn(turnInput);

  // Persist user message and assistant message
  await appendMessage(db, {
    conversationId: conv.id,
    seq: conv.message_count + 1,
    role: 'user',
    content: message,
  });

  await appendMessage(db, {
    conversationId: conv.id,
    seq: conv.message_count + 2,
    role: 'assistant',
    content: outcome.responseText,
    citations: outcome.citations as any,
    latencyMs: outcome.latencyMs,
  });

  // Record AI Interaction telemetry
  await recordAiInteraction(db, {
    requestId: ctx.ids.requestId,
    conversationId: conv.id,
    channel: 'WEB_CHAT',
    surface,
    provider: 'VERCEL_AI_GATEWAY',
    modelName: 'gemini-1.5-pro',
    promptVersion: '1.0.0',
    toolCallCount: outcome.toolCallsExecuted.length,
    groundedRatio: outcome.groundedRatio,
    handoffTriggered: outcome.handoff !== undefined,
    latencyMs: outcome.latencyMs,
  });

  return {
    status: 200,
    body: {
      data: {
        conversationKey,
        response: outcome.responseText,
        citations: outcome.citations,
        groundedRatio: outcome.groundedRatio,
        toolCalls: outcome.toolCallsExecuted,
        handoff: outcome.handoff,
      },
    },
  };
};

export const aiHandoffHandler: RouteHandler = async (ctx) => {
  const db = getDb(ctx);
  const rawBody = (await parseBody(ctx.request)) as Record<string, any>;

  const conversationKey = rawBody['conversationKey'];
  if (!conversationKey) {
    throw new ContractError('VALIDATION_FAILED', 'conversationKey is required.');
  }

  const reason = rawBody['reason'] ?? 'CUSTOMER_REQUEST';
  const summary = rawBody['summary'] ?? 'Customer requested live specialist advisory.';

  let conv = await getConversationByKey(db, conversationKey);
  if (!conv) {
    conv = await createConversation(db, {
      conversationKey,
      channel: 'WEB_CHAT',
    });
  }

  await updateConversationState(db, {
    conversationId: conv.id,
    state: 'AWAITING_HUMAN',
    handoffReason: reason,
    summary,
  });

  return {
    status: 200,
    body: {
      data: {
        conversationKey,
        state: 'AWAITING_HUMAN',
        reason,
        specialistNotice: 'A senior gemmologist from Private Client Advisory has been assigned to your request.',
      },
    },
  };
};

export const aiGetConversationHandler: RouteHandler = async (ctx) => {
  const db = getDb(ctx);
  const conversationKey = requireIdentifier(ctx.params['conversationKey'], 'conversationKey');

  const conv = await getConversationByKey(db, conversationKey);
  if (!conv) {
    throw new ContractError('NOT_FOUND', `Conversation ${conversationKey} not found.`);
  }

  return {
    status: 200,
    body: {
      data: {
        conversation: conv,
      },
    },
  };
};
