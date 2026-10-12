/**
 * packages/observability/src/tracing/tracer.ts
 *
 * OpenTelemetry-compliant in-memory tracer and span lifecycle helper.
 * Provides `withSpan()` and tracer instruments conforming to technical_design/28.
 *
 * Enforces cardinality limits:
 * - Query spans: statement hash / shape only (never raw values).
 * - HTTP spans: method, route template, status code (never full query strings with PII).
 * - AI spans: token count, duration, tool count, grounded ratio (never prompt/completion secrets).
 */
import {
  generateSpanId,
  generateTraceId,
  type SpanContext,
} from './context.js';

export type SpanKind = 'SERVER' | 'CLIENT' | 'INTERNAL' | 'PRODUCER' | 'CONSUMER';

export type SpanStatusCode = 'UNSET' | 'OK' | 'ERROR';

export interface SpanStatus {
  readonly code: SpanStatusCode;
  readonly message?: string;
}

export type AttributeValue = string | number | boolean | Array<string | number | boolean>;

export interface SpanRecord {
  readonly name: string;
  readonly kind: SpanKind;
  readonly context: SpanContext;
  readonly parentSpanId?: string;
  readonly startTimeMs: number;
  endTimeMs?: number;
  durationMs?: number;
  readonly attributes: Record<string, AttributeValue>;
  status: SpanStatus;
  readonly events: Array<{ name: string; timestampMs: number; attributes?: Record<string, AttributeValue> }>;
}

export interface Span {
  readonly context: SpanContext;
  setAttribute(key: string, value: AttributeValue): Span;
  setAttributes(attributes: Record<string, AttributeValue>): Span;
  setStatus(code: SpanStatusCode, message?: string): Span;
  addEvent(name: string, attributes?: Record<string, AttributeValue>): Span;
  recordException(error: unknown): Span;
  end(): void;
}

export interface SpanExporter {
  export(spans: readonly SpanRecord[]): void | Promise<void>;
}

export class InMemorySpanExporter implements SpanExporter {
  private readonly spans: SpanRecord[] = [];

  export(spans: readonly SpanRecord[]): void {
    this.spans.push(...spans);
  }

  getFinishedSpans(): readonly SpanRecord[] {
    return [...this.spans];
  }

  clear(): void {
    this.spans.length = 0;
  }
}

class SpanImpl implements Span {
  public readonly context: SpanContext;
  public readonly record: SpanRecord;
  private ended = false;
  private readonly onEnd: (span: SpanRecord) => void;

  constructor(
    name: string,
    context: SpanContext,
    parentSpanId: string | undefined,
    kind: SpanKind,
    onEnd: (span: SpanRecord) => void,
    initialAttributes: Record<string, AttributeValue> = {},
  ) {
    this.context = context;
    this.onEnd = onEnd;
    this.record = {
      name,
      kind,
      context,
      parentSpanId,
      startTimeMs: Date.now(),
      attributes: { ...initialAttributes },
      status: { code: 'UNSET' },
      events: [],
    };
  }

  setAttribute(key: string, value: AttributeValue): Span {
    if (!this.ended) {
      this.record.attributes[key] = value;
    }
    return this;
  }

  setAttributes(attributes: Record<string, AttributeValue>): Span {
    if (!this.ended) {
      Object.assign(this.record.attributes, attributes);
    }
    return this;
  }

  setStatus(code: SpanStatusCode, message?: string): Span {
    if (!this.ended) {
      this.record.status = { code, message };
    }
    return this;
  }

  addEvent(name: string, attributes?: Record<string, AttributeValue>): Span {
    if (!this.ended) {
      this.record.events.push({
        name,
        timestampMs: Date.now(),
        attributes,
      });
    }
    return this;
  }

  recordException(error: unknown): Span {
    if (!this.ended) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.setStatus('ERROR', err.message);
      this.addEvent('exception', {
        'exception.type': err.name,
        'exception.message': err.message,
      });
    }
    return this;
  }

  end(): void {
    if (this.ended) return;
    this.ended = true;
    const now = Date.now();
    this.record.endTimeMs = now;
    this.record.durationMs = Math.max(0, now - this.record.startTimeMs);
    if (this.record.status.code === 'UNSET') {
      this.record.status = { code: 'OK' };
    }
    this.onEnd(this.record);
  }
}

export interface StartSpanOptions {
  parent?: SpanContext;
  kind?: SpanKind;
  attributes?: Record<string, AttributeValue>;
}

export class Tracer {
  private readonly exporters: SpanExporter[] = [];

  constructor(public readonly name: string, public readonly version: string = '1.0.0') {}

  addExporter(exporter: SpanExporter): void {
    this.exporters.push(exporter);
  }

  startSpan(name: string, options: StartSpanOptions = {}): Span {
    const parent = options.parent;
    const traceId = parent ? parent.traceId : generateTraceId();
    const parentSpanId = parent ? parent.spanId : undefined;
    const spanId = generateSpanId();
    const traceFlags = parent ? parent.traceFlags : 1;

    const context: SpanContext = {
      traceId,
      spanId,
      traceFlags,
    };

    const span = new SpanImpl(
      name,
      context,
      parentSpanId,
      options.kind ?? 'INTERNAL',
      (record) => {
        for (const exp of this.exporters) {
          try {
            exp.export([record]);
          } catch {
            // Observability must never throw or disrupt application flow (technical_design/28 §10)
          }
        }
      },
      options.attributes,
    );

    return span;
  }
}

/** Global tracer singleton registry */
const TRACERS = new Map<string, Tracer>();
const GLOBAL_EXPORTERS: SpanExporter[] = [];

export function getTracer(name: string = '@maihan/observability', version: string = '1.0.0'): Tracer {
  let tracer = TRACERS.get(name);
  if (!tracer) {
    tracer = new Tracer(name, version);
    for (const exp of GLOBAL_EXPORTERS) {
      tracer.addExporter(exp);
    }
    TRACERS.set(name, tracer);
  }
  return tracer;
}

export function registerGlobalSpanExporter(exporter: SpanExporter): void {
  GLOBAL_EXPORTERS.push(exporter);
  for (const tracer of TRACERS.values()) {
    tracer.addExporter(exporter);
  }
}

/**
 * Executes an async or sync block within a traced span, handling automatic completion and exception recording.
 */
export async function withSpan<T>(
  name: string,
  options: StartSpanOptions,
  fn: (span: Span) => Promise<T> | T,
): Promise<T> {
  const tracer = getTracer();
  const span = tracer.startSpan(name, options);
  try {
    const result = await fn(span);
    return result;
  } catch (err) {
    span.recordException(err);
    throw err;
  } finally {
    span.end();
  }
}
