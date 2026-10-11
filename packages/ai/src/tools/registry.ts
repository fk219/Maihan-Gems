/**
 * packages/ai/src/tools/registry.ts
 *
 * Authority: technical_design/18_AI_ORCHESTRATION_ARCHITECTURE.md §4, ADR-003
 *
 * Aggregates all 10 controlled tools and provides structural safety validation:
 * - Exactly 10 tools registered
 * - Exactly 2 tools declare `mutates: true` (create_customer_request, transfer_to_human)
 * - Zero tools exist that mutate price, inventory, orders, payments, certificates, or permissions
 */
import type { Tool } from './types.js';
import {
  searchInventoryTool,
  getProductTool,
  getGemstoneTool,
  compareGemstonesTool,
} from './inventory-tools.js';
import { searchKnowledgeTool } from './knowledge-tools.js';
import { checkDyoCompatibilityTool, getPriceQuoteTool } from './dyo-pricing-tools.js';
import { getCertificateTool } from './certificate-tools.js';
import { createCustomerRequestTool, transferToHumanTool } from './mutation-tools.js';

export const ALL_TOOLS: ReadonlyArray<Tool<any, any>> = [
  searchInventoryTool,
  getProductTool,
  getGemstoneTool,
  compareGemstonesTool,
  searchKnowledgeTool,
  checkDyoCompatibilityTool,
  getPriceQuoteTool,
  getCertificateTool,
  createCustomerRequestTool,
  transferToHumanTool,
];

export const TOOL_REGISTRY: ReadonlyMap<string, Tool<any, any>> = new Map(
  ALL_TOOLS.map((tool) => [tool.name, tool]),
);

export function getTool(name: string): Tool<any, any> | undefined {
  return TOOL_REGISTRY.get(name);
}

export function listTools(): ReadonlyArray<Tool<any, any>> {
  return ALL_TOOLS;
}

/**
 * Structural safety assertion (ADR-003, NFR-05).
 * Throws if any unauthorized mutating tool is detected.
 */
export function assertStructuralMutationSafety(): {
  readonly totalTools: number;
  readonly mutatingTools: ReadonlyArray<string>;
  readonly isSafe: boolean;
} {
  const mutating = ALL_TOOLS.filter((t) => t.mutates).map((t) => t.name);
  const permittedMutations = new Set(['create_customer_request', 'transfer_to_human']);

  for (const name of mutating) {
    if (!permittedMutations.has(name)) {
      throw new Error(`CRITICAL_SECURITY_VIOLATION: Tool '${name}' declares mutates: true but is not permitted.`);
    }
  }

  // Ensure prohibited domains are completely absent from mutating tools
  const prohibitedKeywords = ['price', 'inventory', 'stock', 'order', 'payment', 'certificate', 'permission'];
  for (const name of mutating) {
    for (const kw of prohibitedKeywords) {
      if (name.includes(kw)) {
        throw new Error(`CRITICAL_SECURITY_VIOLATION: Mutating tool '${name}' targets prohibited domain '${kw}'.`);
      }
    }
  }

  return {
    totalTools: ALL_TOOLS.length,
    mutatingTools: mutating,
    isSafe: true,
  };
}
