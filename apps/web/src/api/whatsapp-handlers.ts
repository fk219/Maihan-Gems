/**
 * apps/web/src/api/whatsapp-handlers.ts
 *
 * Authority: technical_design/20_WHATSAPP_ARCHITECTURE.md
 *
 * WhatsApp Channel Adapter:
 * - GET  /api/v1/webhooks/whatsapp: Meta webhook verification challenge
 * - POST /api/v1/webhooks/whatsapp: Signature verification over raw body before parsing,
 *   idempotent receipt via webhook_receipts, fast 200 acknowledgment,
 *   conversation resolution by MSISDN/wa_id, single-brain orchestrator invocation,
 *   WhatsApp response formatting & 4000-char chunking, and transcript persistence.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { ContractError } from '@maihan/contracts';
import {
  AiOrchestrator,
  splitWhatsAppMessage,
  WHATSAPP_CAPABILITIES,
  type OrchestratorTurnInput,
} from '@maihan/ai';
import {
  recordWhatsAppReceipt,
  markWebhookProcessed,
  findCustomerByPhone,
  resolveWhatsAppConversation,
  appendMessage,
  recordAiInteraction,
  checkMarketingOptIn,
} from '@maihan/db';
import type { RouteHandler } from './handlers.js';
import { getDb, buildToolServices } from './ai-handlers.js';

export const WHATSAPP_VERIFY_TOKEN_DEFAULT = 'maihan_gems_wa_secret_verify_2026';
export const WHATSAPP_APP_SECRET_DEFAULT = 'maihan_gems_wa_app_secret_test_token';

/**
 * Verifies X-Hub-Signature-256 header over raw payload before parsing.
 */
export function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  appSecret: string = WHATSAPP_APP_SECRET_DEFAULT,
): boolean {
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
    return false;
  }
  const signatureHex = signatureHeader.slice('sha256='.length);
  const expectedHex = createHmac('sha256', appSecret).update(rawBody).digest('hex');

  const sigBuf = Buffer.from(signatureHex, 'utf8');
  const expBuf = Buffer.from(expectedHex, 'utf8');

  if (sigBuf.length !== expBuf.length) {
    return false;
  }
  return timingSafeEqual(sigBuf, expBuf);
}

/**
 * GET /api/v1/webhooks/whatsapp: Meta Webhook Verification challenge
 */
export const whatsappVerificationHandler: RouteHandler = async (ctx) => {
  const url = ctx.url;
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  const expectedToken = process.env['WHATSAPP_VERIFY_TOKEN'] ?? WHATSAPP_VERIFY_TOKEN_DEFAULT;

  if (mode === 'subscribe' && token === expectedToken && challenge) {
    return {
      status: 200,
      body: challenge as any,
      headers: { 'content-type': 'text/plain' },
    };
  }

  throw new ContractError('FORBIDDEN', 'Invalid WhatsApp webhook verification token.');
};

/**
 * POST /api/v1/webhooks/whatsapp: Meta Inbound Messages & Statuses
 */
export const whatsappWebhookHandler: RouteHandler = async (ctx) => {
  const db = getDb(ctx);
  const req = ctx.request;

  if (!req) {
    throw new ContractError('VALIDATION_FAILED', 'Request object is missing.');
  }

  // 1. Read raw body BEFORE parsing for HMAC verification
  const rawBody = await req.text();
  const signature = req.headers.get('x-hub-signature-256') || req.headers.get('X-Hub-Signature-256');

  const appSecret = process.env['WHATSAPP_APP_SECRET'] ?? WHATSAPP_APP_SECRET_DEFAULT;

  // Verify HMAC signature
  const isValidSignature = verifyMetaSignature(rawBody, signature, appSecret);
  if (!isValidSignature) {
    throw new ContractError('UNAUTHORIZED', 'Invalid WhatsApp webhook HMAC signature.');
  }

  // 2. Parse payload safely
  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    throw new ContractError('VALIDATION_FAILED', 'Malformed JSON in WhatsApp webhook payload.');
  }

  // Fast check: entry and changes
  const entry = payload?.entry?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value;
  const message = value?.messages?.[0];

  // If this is a status update or delivery receipt, acknowledge with 200 fast
  if (!message) {
    return {
      status: 200,
      body: { status: 'acknowledged', type: 'receipt_or_status' },
    };
  }

  const messageId = message.id ?? `wam_${Date.now()}`;
  const senderPhone = message.from; // MSISDN string e.g. "15551234567"
  const messageText = message.text?.body ?? '';

  // 3. Deduplicate via webhook_receipts (provider = 'WHATSAPP', external_event_id = messageId)
  const receipt = await recordWhatsAppReceipt(db, {
    provider: 'WHATSAPP',
    externalEventId: messageId,
    signatureValid: true,
    eventType: 'messages',
    payload: { senderPhone, messageText, timestamp: message.timestamp },
  });

  if (receipt.isDuplicate) {
    return {
      status: 200,
      body: { status: 'duplicate_ignored', messageId },
    };
  }

  // 4. Resolve MSISDN to existing customer (identity merge)
  const customer = await findCustomerByPhone(db, senderPhone);
  const customerId = customer?.id ?? null;

  // 5. Resolve or create WhatsApp conversation (thread key = external_ref = senderPhone)
  const conv = await resolveWhatsAppConversation(db, senderPhone, customerId);

  // 6. Persist inbound user message
  await appendMessage(db, {
    conversationId: conv.id,
    seq: conv.message_count + 1,
    role: 'user',
    content: messageText,
  });

  // 7. Invoke Shared-Brain AI Orchestrator (identical tools, grounding, guardrails)
  const services = buildToolServices(ctx);
  const orchestrator = new AiOrchestrator({ services, surface: 'whatsapp' });

  const turnInput: OrchestratorTurnInput = {
    conversationKey: conv.conversation_key,
    message: messageText,
    surface: 'whatsapp',
    actorType: customer ? 'CUSTOMER' : 'ANONYMOUS_WEB',
    customerId: customerId ?? undefined,
  };

  const outcome = await orchestrator.executeTurn(turnInput);

  // 8. Format answer according to WhatsApp channel constraints (no HTML, 4000-char chunking)
  const splitResult = splitWhatsAppMessage(outcome.responseText);

  // 9. Persist assistant response
  await appendMessage(db, {
    conversationId: conv.id,
    seq: conv.message_count + 2,
    role: 'assistant',
    content: outcome.responseText,
    citations: outcome.citations as any,
    latencyMs: outcome.latencyMs,
  });

  // 10. Record AI Interaction telemetry
  await recordAiInteraction(db, {
    requestId: ctx.ids.requestId,
    conversationId: conv.id,
    channel: 'WHATSAPP',
    surface: 'whatsapp',
    provider: 'VERCEL_AI_GATEWAY',
    modelName: 'gemini-1.5-pro',
    promptVersion: '1.0.0',
    toolCallCount: outcome.toolCallsExecuted.length,
    groundedRatio: outcome.groundedRatio,
    handoffTriggered: outcome.handoff !== undefined,
    latencyMs: outcome.latencyMs,
  });

  // Mark receipt processed
  if (receipt.id) {
    await markWebhookProcessed(db, receipt.id);
  }

  return {
    status: 200,
    body: {
      status: 'success',
      conversationKey: conv.conversation_key,
      recipient: senderPhone,
      chunks: splitResult.chunks,
      handoff: outcome.handoff,
      capabilities: WHATSAPP_CAPABILITIES,
    },
  };
};

/**
 * POST /api/v1/whatsapp/send-template
 * Enforces marketing opt-in rules for outbound template messages.
 */
export const whatsappSendTemplateHandler: RouteHandler = async (ctx) => {
  const db = getDb(ctx);
  const req = ctx.request;

  let body: any = {};
  if (req) {
    const text = await req.text();
    if (text.trim().length > 0) body = JSON.parse(text);
  }

  const { recipientPhone, templateName, isMarketing } = body;
  if (!recipientPhone || !templateName) {
    throw new ContractError('VALIDATION_FAILED', 'recipientPhone and templateName are required.');
  }

  // Check opt-in if this is a marketing broadcast or proactive notification
  if (isMarketing) {
    const customer = await findCustomerByPhone(db, recipientPhone);
    const hasOptedIn = customer ? await checkMarketingOptIn(db, customer.id) : false;
    if (!hasOptedIn) {
      throw new ContractError(
        'FORBIDDEN',
        `Marketing send refused: customer ${recipientPhone} has not opted in.`,
      );
    }
  }

  return {
    status: 200,
    body: {
      status: 'queued',
      recipientPhone,
      templateName,
      providerMessageId: `wamid.HBgL${Date.now()}`,
    },
  };
};
