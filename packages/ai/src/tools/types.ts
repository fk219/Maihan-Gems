/**
 * packages/ai/src/tools/types.ts
 *
 * Authority: technical_design/18_AI_ORCHESTRATION_ARCHITECTURE.md §4, ADR-003
 *
 * The strict tool interface:
 * - Every tool declares mutates, timeoutMs, idempotent, citationFor
 * - authorization() evaluated in code outside the LLM before execute()
 * - execute() calls application services only, never a raw repository or database handle
 */
import { z } from 'zod';

export type ToolActorType = 'ANONYMOUS_WEB' | 'CUSTOMER' | 'AI_AGENT' | 'ADMIN_ASSIST' | 'HUMAN_AGENT';

export interface AuthzDecision {
  readonly allowed: boolean;
  readonly action: 'ALLOW' | 'DENY' | 'ALLOW_SCOPED';
  readonly reason?: string;
  readonly scope?: Record<string, unknown>;
}

export interface Citation {
  readonly type: 'PRODUCT' | 'GEMSTONE' | 'CERTIFICATE' | 'KNOWLEDGE' | 'DYO_RULE';
  readonly id: string;
  readonly label: string;
  readonly url: string;
  readonly confidence: number;
  readonly fields: ReadonlyArray<string>;
}

export interface ToolServices {
  readonly catalog: {
    search(params: Record<string, unknown>): Promise<{ items: any[]; total: number; facets?: any }>;
    getProduct(identifier: { slug?: string; productId?: string }): Promise<any | null>;
    getGemstone(gemRef: string): Promise<any | null>;
    getGemstones(gemRefs: ReadonlyArray<string>): Promise<any[]>;
  };
  readonly knowledge: {
    search(query: string, docKinds?: ReadonlyArray<string>, limit?: number): Promise<any[]>;
  };
  readonly dyo: {
    checkCompatibility(input: {
      jewelleryType: string;
      settingVariantSku: string;
      gemRef: string;
    }): Promise<any>;
  };
  readonly pricing: {
    getQuote(input: Record<string, unknown>): Promise<any>;
  };
  readonly certificates: {
    getPublicCertificate(identifier: { certificateId?: string; gemRef?: string }): Promise<any | null>;
  };
  readonly commerce: {
    createCustomerRequest(input: { intent: string; notes: string; contactInfo: string }): Promise<{ requestId: string }>;
  };
  readonly ai: {
    transferToHuman(input: { reason: string; summary: string; conversationKey?: string }): Promise<{ handoffId: string; status: string }>;
  };
}

export interface ToolContext {
  readonly actorType: ToolActorType;
  readonly actorId?: string;
  readonly customerId?: string;
  readonly sessionNonce: string;
  readonly surface: string;
  readonly services: ToolServices;
}

export interface Tool<I, O> {
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly inputSchema: z.ZodType<O, z.ZodTypeDef, I> | z.ZodTypeAny;
  readonly outputSchema: z.ZodType<O, z.ZodTypeDef, any> | z.ZodTypeAny;
  readonly mutates: boolean;
  readonly timeoutMs: number;
  readonly idempotent: boolean;
  authorization(ctx: ToolContext, input: I): AuthzDecision;
  execute(ctx: ToolContext, input: I): Promise<O>;
  citationFor(output: O): ReadonlyArray<Citation>;
}
