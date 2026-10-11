/**
 * packages/ai/src/guardrails/guardrail-engine.ts
 *
 * Authority: technical_design/18_AI_ORCHESTRATION_ARCHITECTURE.md §8
 *
 * Implements:
 * - Injection detection across prompt injection, jailbreaks, and state mutation attempts
 * - Delimited XML blocks for untrusted user inputs
 * - Actions: ALLOW | SANITIZE | BLOCK | ESCALATE
 * - SHA-256 trigger text hash recording (never raw PII)
 */
import { createHash } from 'node:crypto';
import type { GuardrailCheckResult, GuardrailEngineOptions } from './types.js';

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
  /you\s+are\s+now\s+(in\s+)?(developer|dan|god)\s+mode/i,
  /system\s+prompt\s+leak/i,
  /reveal\s+your\s+hidden\s+instructions/i,
  /override\s+system\s+directives/i,
];

const UNAUTHORIZED_MUTATION_PATTERNS = [
  /set\s+inventory(\s+of\s+[\w-]+)?\s+to\s+0/i,
  /change\s+price(\s+of\s+[\w-]+)?\s+to\s+\d+/i,
  /update\s+stock(\s+of\s+[\w-]+)?\s+to\s+\d+/i,
  /apply\s+100%\s+discount/i,
  /cancel\s+all\s+orders/i,
  /grant\s+admin\s+(rights|role)/i,
  /delete\s+from\s+[\w_]+/i,
  /drop\s+table/i,
];

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

export class GuardrailEngine {
  private readonly maxInputLength: number;

  constructor(options: GuardrailEngineOptions = {}) {
    this.maxInputLength = options.maxInputLength ?? 4000;
  }

  /**
   * Wrap untrusted text in strict delimited XML tags to prevent prompt escaping.
   */
  delimitUntrustedContent(source: string, content: string): string {
    const cleanContent = content.replace(/<\/untrusted_context>/gi, '');
    return `<untrusted_context source="${source}">\n${cleanContent}\n</untrusted_context>`;
  }

  /**
   * Evaluates input text for prompt injection and unauthorized mutation directives.
   */
  evaluate(text: string): GuardrailCheckResult {
    if (!text || text.trim().length === 0) {
      return { action: 'ALLOW', ruleId: 'CLEAN_EMPTY' };
    }

    if (text.length > this.maxInputLength) {
      return {
        action: 'BLOCK',
        ruleId: 'INPUT_LENGTH_EXCEEDED',
        reason: `Input length (${text.length}) exceeds safety limit (${this.maxInputLength}).`,
        triggerTextHash: sha256(text.slice(0, 100)),
      };
    }

    // 1. Check for unauthorized mutation directives
    for (const pattern of UNAUTHORIZED_MUTATION_PATTERNS) {
      if (pattern.test(text)) {
        return {
          action: 'BLOCK',
          ruleId: 'MUTATION_DIRECTIVE_PROHIBITED',
          reason: 'Command attempts unauthorized database state mutation.',
          triggerTextHash: sha256(text),
          detail: { pattern: pattern.toString() },
        };
      }
    }

    // 2. Check for prompt injection / jailbreak attempts
    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(text)) {
        return {
          action: 'ESCALATE',
          ruleId: 'PROMPT_INJECTION_DETECTED',
          reason: 'Prompt injection signature detected in user input.',
          triggerTextHash: sha256(text),
          detail: { pattern: pattern.toString() },
        };
      }
    }

    // 3. Clean and sanitize HTML / raw script tags
    if (/<script|javascript:|data:/i.test(text)) {
      const sanitized = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      return {
        action: 'SANITIZE',
        ruleId: 'HTML_TAGS_STRIPPED',
        sanitizedContent: sanitized,
        triggerTextHash: sha256(text),
      };
    }

    return {
      action: 'ALLOW',
      ruleId: 'CLEAN_INPUT',
    };
  }
}
