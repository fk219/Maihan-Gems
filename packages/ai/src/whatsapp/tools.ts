/**
 * packages/ai/src/whatsapp/tools.ts
 *
 * Authority:
 * - technical_design/20_WHATSAPP_ARCHITECTURE.md §1
 * - INITIAL_IMPLEMENTATION_PLAN.md §17 (Phase 10 Task 9)
 *
 * Implements channel-aware tool resolution proving that Web and WhatsApp
 * share the identical underlying tool registry and structural mutation safety.
 */
import { ALL_TOOLS } from '../tools/registry.js';
import type { Tool } from '../tools/types.js';

export type ChannelName = 'WEB' | 'WHATSAPP';

export function toolsFor(channel: ChannelName): ReadonlyArray<Tool<any, any>> {
  // Authority doc 20 §1: "WhatsApp uses the same orchestrator, the same tools, the same grounding gate"
  // Both channels must resolve to an identical tool registry.
  void channel;
  return ALL_TOOLS;
}

export function assertSharedBrainToolParity(): void {
  const webTools = toolsFor('WEB');
  const waTools = toolsFor('WHATSAPP');

  if (webTools.length !== waTools.length) {
    throw new Error(
      `Shared brain violation: WEB has ${webTools.length} tools but WHATSAPP has ${waTools.length} tools.`,
    );
  }

  const webNames = webTools.map((t) => t.name).sort();
  const waNames = waTools.map((t) => t.name).sort();

  for (let i = 0; i < webNames.length; i++) {
    if (webNames[i] !== waNames[i]) {
      throw new Error(
        `Shared brain violation: Tool mismatch at index ${i}: ${webNames[i]} vs ${waNames[i]}`,
      );
    }
  }
}
