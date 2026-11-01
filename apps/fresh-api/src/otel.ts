/**
 * Minimal OTLP/HTTP (JSON) span exporter.
 *
 * Without OTEL_EXPORTER_OTLP_ENDPOINT this is a no-op: trace context still
 * propagates and logs carry trace/span IDs. With an endpoint (Jaeger,
 * Honeycomb, Grafana, otel-collector) request spans are batched and exported.
 */
import type { TraceContext } from './tracing.js';

export interface SpanRecord {
  traceId: string;
  spanId: string;
  parentSpanId: string | null;
  name: string;
  startedAt: number;
  endedAt: number;
  attributes: Record<string, string | number | boolean>;
  statusCode: number;
}

const buffer: SpanRecord[] = [];

function endpoint(): string | null {
  const value = process.env['OTEL_EXPORTER_OTLP_ENDPOINT']?.trim();
  return value ? value.replace(/\/$/, '') : null;
}

export function exporterConfigured(): boolean {
  return endpoint() !== null;
}

function attributeValue(value: string | number | boolean): Record<string, unknown> {
  if (typeof value === 'boolean') return { boolValue: value };
  if (typeof value === 'number') return Number.isInteger(value) ? { intValue: value } : { doubleValue: value };
  return { stringValue: value };
}

function spanJson(span: SpanRecord): Record<string, unknown> {
  return {
    traceId: span.traceId,
    spanId: span.spanId,
    ...(span.parentSpanId ? { parentSpanId: span.parentSpanId } : {}),
    name: span.name,
    kind: 2, // SERVER
    startTimeUnixNano: String(span.startedAt * 1_000_000),
    endTimeUnixNano: String(span.endedAt * 1_000_000),
    status: { code: span.statusCode >= 500 ? 2 : 1 },
    attributes: Object.entries(span.attributes).map(([key, value]) => ({
      key,
      value: attributeValue(value),
    })),
  };
}

export function otlpPayload(spans: SpanRecord[]): Record<string, unknown> {
  const service = process.env['OTEL_SERVICE_NAME'] ?? 'fresh-api';
  return {
    resourceSpans: [
      {
        resource: {
          attributes: [{ key: 'service.name', value: { stringValue: service } }],
        },
        scopeSpans: [
          {
            scope: { name: 'fresh-api' },
            spans: spans.map(spanJson),
          },
        ],
      },
    ],
  };
}

export function recordSpan(span: SpanRecord): void {
  if (!exporterConfigured()) return;
  buffer.push(span);
  if (buffer.length >= 25) void flushSpans();
}

export function requestSpan(
  trace: TraceContext,
  method: string,
  path: string,
  status: number,
  startedAt: number,
): SpanRecord {
  return {
    traceId: trace.traceId,
    spanId: trace.spanId,
    parentSpanId: trace.parentSpanId,
    name: `${method} ${path}`,
    startedAt,
    endedAt: Date.now(),
    attributes: {
      'http.request.method': method,
      'url.path': path.split('?')[0]!,
      'http.response.status_code': status,
    },
    statusCode: status,
  };
}

export async function flushSpans(): Promise<{ exported: number; ok: boolean }> {
  const base = endpoint();
  if (!base || buffer.length === 0) return { exported: 0, ok: true };
  const spans = buffer.splice(0, 50);
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  const extra = process.env['OTEL_EXPORTER_OTLP_HEADERS'];
  if (extra) {
    for (const pair of extra.split(',')) {
      const [key, ...rest] = pair.split('=');
      if (key && rest.length) headers[key.trim()] = rest.join('=').trim();
    }
  }
  try {
    const res = await fetch(`${base}/v1/traces`, {
      method: 'POST',
      headers,
      body: JSON.stringify(otlpPayload(spans)),
      signal: AbortSignal.timeout(10_000),
    });
    return { exported: spans.length, ok: res.ok };
  } catch {
    return { exported: spans.length, ok: false };
  }
}
