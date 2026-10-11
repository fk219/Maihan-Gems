/**
 * packages/ai/src/tools/mutation-tools.ts
 *
 * Authority: technical_design/18_AI_ORCHESTRATION_ARCHITECTURE.md §4, ADR-003
 *
 * The ONLY two tools in the entire AI system permitted to declare `mutates: true`.
 * Both invoke application services, never raw SQL.
 * Structural invariant: Neither touches price, inventory, orders, payments, certificates, or permissions.
 */
import { z } from 'zod';
import type { Tool, ToolContext, AuthzDecision, Citation } from './types.js';

// ─── 9. create_customer_request ─────────────────────────────────────────────

const CreateCustomerRequestInput = z.object({
  intent: z.enum(['INQUIRY', 'BESPOKE_REQUEST', 'APPOINTMENT', 'CUSTOM_CURATION']),
  notes: z.string().min(5),
  contactInfo: z.string().min(3),
});

const CreateCustomerRequestOutput = z.object({
  requestId: z.string(),
  status: z.literal('SUBMITTED'),
  confirmationMessage: z.string(),
});

export const createCustomerRequestTool: Tool<
  z.infer<typeof CreateCustomerRequestInput>,
  z.infer<typeof CreateCustomerRequestOutput>
> = {
  name: 'create_customer_request',
  version: '1.0.0',
  description: 'Submit an official bespoke sourcing, private salon viewing, or concierge inquiry.',
  inputSchema: CreateCustomerRequestInput,
  outputSchema: CreateCustomerRequestOutput,
  mutates: true,
  timeoutMs: 3000,
  idempotent: false,
  authorization(ctx: ToolContext): AuthzDecision {
    // Requires authenticated customer session or explicit contact info
    if (ctx.actorType === 'ANONYMOUS_WEB' && !ctx.customerId) {
      return {
        allowed: true,
        action: 'ALLOW_SCOPED',
        reason: 'Permitted with explicit contact details provided in input.',
      };
    }
    return { allowed: true, action: 'ALLOW' };
  },
  async execute(ctx: ToolContext, input) {
    const res = await ctx.services.commerce.createCustomerRequest(input);
    return {
      requestId: res.requestId,
      status: 'SUBMITTED',
      confirmationMessage: 'Your inquiry has been logged with Maihan Gems Private Client Advisory.',
    };
  },
  citationFor(_output): ReadonlyArray<Citation> {
    return []; // Mutating customer requests carry no citations
  },
};

// ─── 10. transfer_to_human ──────────────────────────────────────────────────

const TransferToHumanInput = z.object({
  reason: z.enum([
    'CUSTOMER_REQUEST',
    'LOW_CONFIDENCE',
    'CERTIFICATE_ANOMALY',
    'COMPLEX_DYO',
    'HIGH_VALUE',
    'SENSITIVE_OPERATION',
    'POLICY_ESCALATION',
    'DISSATISFACTION',
    'NO_INFORMATION',
  ]),
  summary: z.string().min(5),
});

const TransferToHumanOutput = z.object({
  handoffId: z.string(),
  status: z.string(),
  specialistNotice: z.string(),
});

export const transferToHumanTool: Tool<
  z.infer<typeof TransferToHumanInput>,
  z.infer<typeof TransferToHumanOutput>
> = {
  name: 'transfer_to_human',
  version: '1.0.0',
  description: 'Seamlessly transfer the conversation to a human gemmologist or private client advisor.',
  inputSchema: TransferToHumanInput,
  outputSchema: TransferToHumanOutput,
  mutates: true,
  timeoutMs: 1000,
  idempotent: true,
  authorization(_ctx: ToolContext): AuthzDecision {
    // Publicly accessible to any user
    return { allowed: true, action: 'ALLOW' };
  },
  async execute(ctx: ToolContext, input) {
    const res = await ctx.services.ai.transferToHuman({
      reason: input.reason,
      summary: input.summary,
    });
    return {
      handoffId: res.handoffId,
      status: res.status,
      specialistNotice: 'A senior gemmologist has been notified and will review your request.',
    };
  },
  citationFor(_output): ReadonlyArray<Citation> {
    return []; // Handoff produces no citations
  },
};
