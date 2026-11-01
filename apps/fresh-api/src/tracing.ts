/**
 * W3C trace-context propagation without a collector dependency.
 * Incoming `traceparent` is honoured; a new span is issued per request and
 * echoed back. The trace/span IDs are included in structured logs so an
 * OTLP/Honeycomb/Jaeger exporter can be added when credentials exist.
 */
import crypto from 'node:crypto';

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId: string | null;
  sampled: boolean;
}

const TRACEPARENT = /^00-([a-f0-9]{32})-([a-f0-9]{16})-([a-f0-9]{2})$/i;

export function parseTraceparent(header: string | string[] | undefined): TraceContext {
  const value = Array.isArray(header) ? header[0] : header;
  const match = value?.match(TRACEPARENT);
  const traceId = match?.[1]?.toLowerCase() ?? crypto.randomBytes(16).toString('hex');
  const parentSpanId = match?.[2]?.toLowerCase() ?? null;
  const sampled = match ? (Number.parseInt(match[3]!, 16) & 0x01) === 1 : true;
  return {
    traceId,
    spanId: crypto.randomBytes(8).toString('hex'),
    parentSpanId,
    sampled,
  };
}

export function traceparentOf(ctx: TraceContext): string {
  return `00-${ctx.traceId}-${ctx.spanId}-${ctx.sampled ? '01' : '00'}`;
}
