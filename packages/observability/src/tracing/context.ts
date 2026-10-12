/**
 * packages/observability/src/tracing/context.ts
 *
 * Trace Context propagation & W3C TraceContext traceparent implementation.
 * Conforms to W3C TraceContext Level 1 specifications:
 * version-traceId-parentSpanId-traceFlags (e.g. 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01).
 */

export interface SpanContext {
  readonly traceId: string;
  readonly spanId: string;
  readonly traceFlags: number;
  readonly traceState?: string;
}

export const W3C_TRACEPARENT_HEADER = 'traceparent';
export const W3C_TRACESTATE_HEADER = 'tracestate';
export const CUSTOM_TRACE_HEADER = 'x-trace-id';

export function generateRandomHex(length: number): string {
  const bytes = new Uint8Array(Math.ceil(length / 2));
  globalThis.crypto.getRandomValues(bytes);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += (bytes[i] as number).toString(16).padStart(2, '0');
  }
  return hex.slice(0, length);
}

/** Generate 32-character lowercase hex string for W3C trace id */
export function generateTraceId(): string {
  return generateRandomHex(32);
}

/** Generate 16-character lowercase hex string for W3C span id */
export function generateSpanId(): string {
  return generateRandomHex(16);
}

/**
 * Parses W3C traceparent header:
 * Format: 00-{32 hex trace-id}-{16 hex parent-id}-{2 hex trace-flags}
 */
export function parseTraceparent(headerValue: string | null | undefined): SpanContext | null {
  if (!headerValue || typeof headerValue !== 'string') {
    return null;
  }

  const parts = headerValue.trim().split('-');
  if (parts.length < 4) {
    return null;
  }

  const [version, traceId, parentSpanId, traceFlagsStr] = parts;

  // Version 00 check
  if (version !== '00' && !/^[0-9a-f]{2}$/i.test(version as string)) {
    return null;
  }

  // 32-hex traceId cannot be all zeroes
  if (!traceId || traceId.length !== 32 || !/^[0-9a-f]{32}$/i.test(traceId) || /^0{32}$/.test(traceId)) {
    return null;
  }

  // 16-hex parentSpanId cannot be all zeroes
  if (!parentSpanId || parentSpanId.length !== 16 || !/^[0-9a-f]{16}$/i.test(parentSpanId) || /^0{16}$/.test(parentSpanId)) {
    return null;
  }

  // 2-hex trace flags
  if (!traceFlagsStr || traceFlagsStr.length !== 2 || !/^[0-9a-f]{2}$/i.test(traceFlagsStr)) {
    return null;
  }

  const traceFlags = parseInt(traceFlagsStr, 16);

  return {
    traceId: traceId.toLowerCase(),
    spanId: parentSpanId.toLowerCase(),
    traceFlags,
  };
}

/**
 * Formats a SpanContext into a W3C traceparent header string.
 */
export function formatTraceparent(context: SpanContext): string {
  const flagsStr = (context.traceFlags & 0xff).toString(16).padStart(2, '0');
  return `00-${context.traceId.toLowerCase()}-${context.spanId.toLowerCase()}-${flagsStr}`;
}

/**
 * Extracts span context from request headers (checking `traceparent`, then `x-trace-id`).
 */
export function extractContextFromHeaders(headers: Headers | Record<string, string | undefined>): SpanContext {
  let traceparentValue: string | null = null;
  let customTraceId: string | null = null;

  if (headers instanceof Headers) {
    traceparentValue = headers.get(W3C_TRACEPARENT_HEADER);
    customTraceId = headers.get(CUSTOM_TRACE_HEADER);
  } else {
    for (const [k, v] of Object.entries(headers)) {
      if (!v) continue;
      const lowerKey = k.toLowerCase();
      if (lowerKey === W3C_TRACEPARENT_HEADER) {
        traceparentValue = v;
      } else if (lowerKey === CUSTOM_TRACE_HEADER) {
        customTraceId = v;
      }
    }
  }

  const parsed = parseTraceparent(traceparentValue);
  if (parsed) {
    return parsed;
  }

  // Fallback to x-trace-id if 32 hex chars, or generate new
  let traceId = customTraceId?.toLowerCase()?.trim() || '';
  if (!/^[0-9a-f]{32}$/.test(traceId) || /^0{32}$/.test(traceId)) {
    traceId = generateTraceId();
  }

  return {
    traceId,
    spanId: generateSpanId(),
    traceFlags: 1, // SAMPLED by default
  };
}

/**
 * Injects span context into an outgoing headers object or Headers instance.
 */
export function injectContextToHeaders(context: SpanContext, headers: Headers | Record<string, string>): void {
  const tp = formatTraceparent(context);
  if (headers instanceof Headers) {
    headers.set(W3C_TRACEPARENT_HEADER, tp);
    headers.set(CUSTOM_TRACE_HEADER, context.traceId);
  } else {
    headers[W3C_TRACEPARENT_HEADER] = tp;
    headers[CUSTOM_TRACE_HEADER] = context.traceId;
  }
}
