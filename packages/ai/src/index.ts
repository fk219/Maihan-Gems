/**
 * packages/ai/src/index.ts
 *
 * Public surface of the @maihan/ai package.
 *
 * Authority: technical_design/18_AI_ORCHESTRATION_ARCHITECTURE.md
 *
 * Architectural Invariant (ADR-003):
 * - No repository handles or raw database connections are imported or exported here.
 * - Tool registry has zero mutating tools for price, inventory, orders, payments, certificates.
 * - The AI proposes; deterministic application services dispose.
 */
export * from './gateway/types.js';
export { DefaultModelGateway, type ModelGatewayOptions } from './gateway/model-gateway.js';

export * from './tools/types.js';
export {
  searchInventoryTool,
  getProductTool,
  getGemstoneTool,
  compareGemstonesTool,
} from './tools/inventory-tools.js';
export { searchKnowledgeTool } from './tools/knowledge-tools.js';
export { checkDyoCompatibilityTool, getPriceQuoteTool } from './tools/dyo-pricing-tools.js';
export { getCertificateTool } from './tools/certificate-tools.js';
export { createCustomerRequestTool, transferToHumanTool } from './tools/mutation-tools.js';
export {
  ALL_TOOLS,
  TOOL_REGISTRY,
  getTool,
  listTools,
  assertStructuralMutationSafety,
} from './tools/registry.js';

export * from './grounding/types.js';
export { GroundingGate, REFUSAL_TEMPLATES } from './grounding/grounding-gate.js';

export * from './guardrails/types.js';
export { GuardrailEngine } from './guardrails/guardrail-engine.js';

export * from './rag/types.js';
export { chunkKnowledgeDocument } from './rag/chunker.js';
export { KnowledgeRetriever } from './rag/retriever.js';

export * from './handoff/types.js';
export { HandoffEngine, HANDOFF_NOTICES } from './handoff/handoff-engine.js';

export * from './orchestrator/types.js';
export { AiOrchestrator } from './orchestrator/orchestrator.js';

export * from './eval/eval-suites.js';

export * from './whatsapp/types.js';
export { formatForWhatsApp, splitWhatsAppMessage } from './whatsapp/formatter.js';
export { toolsFor, assertSharedBrainToolParity } from './whatsapp/tools.js';
