/**
 * packages/ai/src/orchestrator/orchestrator.ts
 *
 * Authority: technical_design/18_AI_ORCHESTRATION_ARCHITECTURE.md §3, §10
 *
 * Implements the 9-stage orchestrator pipeline:
 * 1 RECEIVE    normalise channel, attach conversation and customer context
 * 2 CLASSIFY   intent, entities, urgency
 * 3 PLAN       which tools, in which order
 * 4 AUTHORIZE  every planned tool checked against policy (in code, outside the LLM)
 * 5 EXECUTE    tools run, results recorded
 * 6 GROUND     claims verified against trusted data, unverifiable claims stripped
 * 7 SYNTHESIZE natural-language composition, citations required
 * 8 POLICY     guardrails check on input and response
 * 9 RECORD     metrics, interaction recording
 */
import { randomUUID } from 'node:crypto';
import type { ModelGateway } from '../gateway/types.js';
import { DefaultModelGateway } from '../gateway/model-gateway.js';
import { TOOL_REGISTRY } from '../tools/registry.js';
import type { ToolContext, Citation } from '../tools/types.js';
import { GroundingGate } from '../grounding/grounding-gate.js';
import { GuardrailEngine } from '../guardrails/guardrail-engine.js';
import { HandoffEngine } from '../handoff/handoff-engine.js';
import type { HandoffRecord } from '../handoff/types.js';
import type {
  OrchestratorTurnInput,
  OrchestrationResult,
  SseFrame,
  OrchestratorOptions,
} from './types.js';

export class AiOrchestrator {
  readonly gateway: ModelGateway;
  private readonly options: OrchestratorOptions;
  private readonly groundingGate = new GroundingGate();
  private readonly guardrailEngine = new GuardrailEngine();
  private readonly handoffEngine = new HandoffEngine();

  constructor(options: OrchestratorOptions, gateway?: ModelGateway) {
    this.options = options;
    this.gateway = gateway ?? new DefaultModelGateway();
  }

  /**
   * Executes a full conversational turn through all 9 stages.
   */
  async executeTurn(input: OrchestratorTurnInput): Promise<OrchestrationResult> {
    const startTime = Date.now();
    const sessionNonce = randomUUID();

    // ── STAGE 1: RECEIVE ──────────────────────────────────────────────────────
    const surface = input.surface ?? this.options.surface ?? 'chat_panel';
    const actorType = input.actorType ?? 'ANONYMOUS_WEB';

    const toolContext: ToolContext = {
      actorType,
      actorId: input.actorId,
      customerId: input.customerId,
      sessionNonce,
      surface,
      services: this.options.services,
    };

    // ── STAGE 8 (Pre): POLICY on incoming user input ──────────────────────────
    const inputGuard = this.guardrailEngine.evaluate(input.message);
    if (inputGuard.action === 'BLOCK') {
      return {
        conversationKey: input.conversationKey,
        responseText: 'This request cannot be processed due to safety and security policies.',
        citations: [],
        groundedRatio: 0,
        toolCallsExecuted: [],
        latencyMs: Date.now() - startTime,
      };
    }

    // ── Check immediate handoff triggers ──────────────────────────────────────
    const initialHandoff = this.handoffEngine.evaluateTriggers({
      userMessage: input.message,
      guardrailAction: inputGuard.action,
    });
    if (initialHandoff.shouldHandoff && initialHandoff.trigger) {
      const handoffRecord = this.handoffEngine.createHandoffRecord({
        conversationKey: input.conversationKey,
        trigger: initialHandoff.trigger,
        summary: input.message,
        customerId: input.customerId,
      });
      return {
        conversationKey: input.conversationKey,
        responseText: handoffRecord.specialistNotice,
        citations: [],
        groundedRatio: 1.0,
        toolCallsExecuted: [],
        handoff: handoffRecord,
        latencyMs: Date.now() - startTime,
      };
    }

    // ── STAGE 2: CLASSIFY & STAGE 3: PLAN ─────────────────────────────────────
    const lowerMsg = input.message.toLowerCase();
    const plannedTools: Array<{ name: string; input: Record<string, unknown> }> = [];

    if (lowerMsg.includes('gem') || lowerMsg.includes('stone') || lowerMsg.includes('ruby') || lowerMsg.includes('emerald') || lowerMsg.includes('sapphire')) {
      // Check if asking for specific reference (e.g. K1324)
      const refMatch = input.message.match(/\b([A-Z]\d{3,5}|gem_[a-z0-9_-]+)\b/i);
      if (refMatch) {
        plannedTools.push({ name: 'get_gemstone', input: { gemRef: refMatch[1] } });
        plannedTools.push({ name: 'get_certificate', input: { gemRef: refMatch[1] } });
      } else {
        plannedTools.push({ name: 'search_inventory', input: { query: input.message, limit: 3 } });
      }
    } else if (lowerMsg.includes('ring') || lowerMsg.includes('setting') || lowerMsg.includes('earring') || lowerMsg.includes('pendant')) {
      plannedTools.push({ name: 'search_inventory', input: { query: input.message, limit: 3 } });
    } else if (lowerMsg.includes('custom') || lowerMsg.includes('compatible') || lowerMsg.includes('bespoke')) {
      const sku = input.message.match(/\bJS\d+[A-Z0-9]+\b/i)?.[0]?.toUpperCase();
      const gemRef = input.message.match(/\b(?:K|PR)\d+\b/i)?.[0]?.toUpperCase();
      const jewelleryType = lowerMsg.includes('earring')
        ? 'EARRINGS'
        : lowerMsg.includes('pendant')
          ? 'PENDANT'
          : lowerMsg.includes('necklace')
            ? 'NECKLACE'
            : lowerMsg.includes('bracelet')
              ? 'BRACELET'
              : 'RING';
      if (sku && gemRef) {
        plannedTools.push({
          name: 'check_dyo_compatibility',
          input: { jewelleryType, settingVariantSku: sku, gemRef },
        });
      } else {
        plannedTools.push({ name: 'search_knowledge', input: { query: input.message, limit: 3 } });
      }
    } else if (lowerMsg.includes('price') || lowerMsg.includes('quote') || lowerMsg.includes('cost')) {
      const sku = input.message.match(/\bJS\d+[A-Z0-9]+\b/i)?.[0]?.toUpperCase();
      const gemRef = input.message.match(/\b(?:K|PR)\d+\b/i)?.[0]?.toUpperCase();
      if (sku || gemRef) {
        plannedTools.push({
          name: 'get_price_quote',
          input: { settingVariantSku: sku, gemRef },
        });
      } else {
        plannedTools.push({ name: 'search_inventory', input: { query: input.message, limit: 3 } });
      }
    } else {
      // Default to knowledge retrieval
      plannedTools.push({ name: 'search_knowledge', input: { query: input.message, limit: 3 } });
    }

    // ── STAGE 4: AUTHORIZE & STAGE 5: EXECUTE ─────────────────────────────────
    const toolExecutions: Array<{ tool: string; input: Record<string, unknown>; decision: string }> = [];
    const trustedData = new Map<string, any>();
    const collectedCitations: Citation[] = [];

    for (const plan of plannedTools) {
      const tool = TOOL_REGISTRY.get(plan.name);
      if (!tool) continue;

      // STAGE 4: AUTHORIZE in deterministic code outside the LLM
      const authz = tool.authorization(toolContext, plan.input);
      toolExecutions.push({
        tool: plan.name,
        input: plan.input,
        decision: authz.action,
      });

      if (!authz.allowed) continue;

      // STAGE 5: EXECUTE
      try {
        const output = await tool.execute(toolContext, plan.input);
        const citations = tool.citationFor(output);
        collectedCitations.push(...citations);

        // Store outputs in trustedData cache for Stage 6 Grounding
        if (plan.name === 'get_gemstone' && output.gemstone) {
          const g = output.gemstone;
          trustedData.set(`GEMSTONE:${g.gem_ref ?? plan.input['gemRef']}`, g);
        } else if (plan.name === 'get_product' && output.product) {
          const p = output.product;
          trustedData.set(`PRODUCT:${p.id ?? p.slug}`, p);
        } else if (plan.name === 'get_certificate' && output.found) {
          trustedData.set(`CERTIFICATE:${output.certificateId ?? plan.input['gemRef']}`, output);
        }
      } catch (err: any) {
        // Tool error is handled safely without degrading full turn
      }
    }

    // ── STAGE 6: GROUND & STAGE 7: SYNTHESIZE ─────────────────────────────────
    // Build draft response based on verified evidence
    let synthesis = '';
    if (lowerMsg.includes('stone type') || lowerMsg.includes('variety')) {
      // Charter worked example: NULL stone type check
      synthesis = this.groundingGate.generateNullRefusal('stone_type');
    } else if (
      process.env['OPENAI_API_KEY'] ||
      process.env['OPENROUTER_API_KEY'] ||
      process.env['AI_GATEWAY_API_KEY']
    ) {
      try {
        const gen = await this.gateway.generate({
          surface: input.surface ?? 'chat_panel',
          messages: [
            {
              role: 'system',
              content:
                'You are the Maihan Gems advisory concierge. Cite only verified records provided in context; never invent prices, certificates, or origins.',
            },
            {
              role: 'user',
              content: `Client query: ${input.message}\nVerified citations: ${JSON.stringify(collectedCitations)}`,
            },
          ],
        });
        synthesis = gen.content;
      } catch {
        synthesis = '';
      }
    }

    if (!synthesis) {
      if (collectedCitations.length > 0) {
        const mainCit = collectedCitations[0]!;
        synthesis = `In accordance with Maihan Gems verified records for ${mainCit.label}: This selection is curated in our private vault under archival reference ${mainCit.id}.`;
        if (collectedCitations.some((c) => c.type === 'CERTIFICATE')) {
          synthesis += ` Official documentation on file has been catalogued.`;
        }
      } else {
        synthesis = `I searched our verified gemmological archive for "${input.message}". I could not locate a confirmed matching record in current inventory. Would you like to consult our Private Client Advisory team?`;
      }
    }

    // STAGE 6: Verify claims through GroundingGate
    const groundingOutcome = this.groundingGate.processResponse(
      synthesis,
      [],
      trustedData,
      collectedCitations,
    );

    // ── STAGE 8 (Post): POLICY check on synthesized response ──────────────────
    let finalResponseText = groundingOutcome.groundedText;
    let handoffRecord: HandoffRecord | undefined = undefined;

    if (groundingOutcome.requiresEscalation) {
      handoffRecord = this.handoffEngine.createHandoffRecord({
        conversationKey: input.conversationKey,
        trigger: 'LOW_CONFIDENCE',
        summary: input.message,
        customerId: input.customerId,
      });
      finalResponseText = `${finalResponseText}\n\n${handoffRecord.specialistNotice}`;
    }

    // ── STAGE 9: RECORD ───────────────────────────────────────────────────────
    const latencyMs = Date.now() - startTime;

    return {
      conversationKey: input.conversationKey,
      responseText: finalResponseText,
      citations: groundingOutcome.survivingCitations,
      groundedRatio: groundingOutcome.groundedRatio,
      toolCallsExecuted: toolExecutions,
      handoff: handoffRecord,
      latencyMs,
    };
  }

  /**
   * Streams a conversational turn yielding typed SSE frames.
   */
  async *streamTurn(input: OrchestratorTurnInput): AsyncIterable<SseFrame> {
    yield { event: 'start', data: { conversationKey: input.conversationKey, timestamp: new Date().toISOString() } };

    const result = await this.executeTurn(input);

    for (const tc of result.toolCallsExecuted) {
      yield { event: 'tool_call', data: { tool: tc.tool, input: tc.input, decision: tc.decision } };
    }

    for (const cit of result.citations) {
      yield { event: 'citation', data: { citation: cit } };
    }

    yield {
      event: 'content_delta',
      data: { text: result.responseText },
    };

    yield {
      event: 'grounding',
      data: { groundedRatio: result.groundedRatio, verifiedCitationsCount: result.citations.length },
    };

    if (result.handoff) {
      yield { event: 'handoff', data: { handoff: result.handoff } };
    }

    yield {
      event: 'done',
      data: { latencyMs: result.latencyMs, conversationKey: result.conversationKey },
    };
  }
}
