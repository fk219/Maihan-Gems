/**
 * packages/observability/src/logging/logger.ts
 *
 * Structured JSON logging with W3C trace correlation and proactive PII redaction.
 * Conforms to technical_design/28 §6:
 *
 * { "timestamp": "...", "level": "info", "service": "commerce", "env": "production",
 *   "trace_id": "...", "span_id": "...", "event": "order.placed", "actor_type": "CUSTOMER",
 *   "order_id": "...", "outcome": "success", "duration_ms": 142 }
 *
 * Security & Privacy Rules (AGENTS.md 10, NFR-06, NFR-09, doc 28 §4):
 * - ZERO PII in logs: emails, customer names, card numbers, phone numbers, raw passwords, auth tokens redacted.
 * - ZERO camera frames / raw biometrics in logs.
 * - Stable, greppable dotted `domain.action` event names.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_SEVERITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const PII_KEYS = new Set([
  'password',
  'token',
  'secret',
  'authorization',
  'cookie',
  'credit_card',
  'card_number',
  'card',
  'cvv',
  'phone',
  'email',
  'customer_email',
  'first_name',
  'last_name',
  'full_name',
  'address_line_1',
  'address_line_2',
  'camera_frame',
  'frame_data',
  'raw_image',
  'biometric',
]);

const EMAIL_REGEX = /[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g;
const PHONE_REGEX = /\+?[0-9]{10,15}/g;
const CARD_REGEX = /\b(?:\d{4}[ -]?){3}\d{4}\b/g;

/**
 * Recursively scrubs PII from log payloads.
 */
export function sanitizeLogData(value: unknown, depth = 0): unknown {
  if (depth > 6) return '[TRUNCATED_MAX_DEPTH]';
  if (value === null || value === undefined) return value;

  if (typeof value === 'string') {
    return value
      .replace(EMAIL_REGEX, '[REDACTED_EMAIL]')
      .replace(PHONE_REGEX, '[REDACTED_PHONE]')
      .replace(CARD_REGEX, '[REDACTED_CARD]');
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeLogData(item, depth + 1));
  }

  if (typeof value === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      const lower = key.toLowerCase();
      if (PII_KEYS.has(lower) || lower.includes('token') || lower.includes('secret') || lower.includes('password')) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeLogData(val, depth + 1);
      }
    }
    return sanitized;
  }

  return String(value);
}

export interface LogContext {
  traceId?: string;
  spanId?: string;
  requestId?: string;
  actorType?: 'CUSTOMER' | 'ADMIN' | 'ANONYMOUS' | 'SYSTEM' | 'CRON';
  service?: string;
  environment?: string;
  [key: string]: unknown;
}

export interface LogRecord {
  timestamp: string;
  level: LogLevel;
  service: string;
  env: string;
  event: string;
  message: string;
  trace_id?: string;
  span_id?: string;
  request_id?: string;
  actor_type?: string;
  [key: string]: unknown;
}

export interface LogSink {
  write(record: LogRecord): void;
}

export class ConsoleLogSink implements LogSink {
  write(record: LogRecord): void {
    const formatted = JSON.stringify(record);
    if (record.level === 'error') {
      console.error(formatted);
    } else if (record.level === 'warn') {
      console.warn(formatted);
    } else {
      console.log(formatted);
    }
  }
}

export class MemoryLogSink implements LogSink {
  public readonly records: LogRecord[] = [];

  write(record: LogRecord): void {
    this.records.push(record);
  }

  clear(): void {
    this.records.length = 0;
  }
}

export class Logger {
  constructor(
    private readonly service: string,
    private readonly defaultContext: LogContext = {},
    private readonly sink: LogSink = new ConsoleLogSink(),
    private readonly minLevel: LogLevel = 'info',
  ) {}

  child(context: LogContext): Logger {
    return new Logger(
      context.service ?? this.service,
      { ...this.defaultContext, ...context },
      this.sink,
      this.minLevel,
    );
  }

  private emit(level: LogLevel, event: string, message: string, data: Record<string, unknown> = {}): void {
    if (LEVEL_SEVERITY[level] < LEVEL_SEVERITY[this.minLevel]) {
      return;
    }

    const merged = { ...this.defaultContext, ...data };
    const sanitizedData = sanitizeLogData(merged) as Record<string, unknown>;

    const traceId = (sanitizedData['traceId'] as string | undefined) ?? this.defaultContext.traceId;
    const spanId = (sanitizedData['spanId'] as string | undefined) ?? this.defaultContext.spanId;
    const requestId = (sanitizedData['requestId'] as string | undefined) ?? this.defaultContext.requestId;
    const actorType = (sanitizedData['actorType'] as string | undefined) ?? this.defaultContext.actorType;
    const env = (sanitizedData['environment'] as string | undefined) ?? process.env['NODE_ENV'] ?? 'development';

    delete sanitizedData['traceId'];
    delete sanitizedData['spanId'];
    delete sanitizedData['requestId'];
    delete sanitizedData['actorType'];
    delete sanitizedData['environment'];
    delete sanitizedData['service'];

    const record: LogRecord = {
      timestamp: new Date().toISOString(),
      level,
      service: this.service,
      env,
      event,
      message,
      ...(traceId ? { trace_id: traceId } : {}),
      ...(spanId ? { span_id: spanId } : {}),
      ...(requestId ? { request_id: requestId } : {}),
      ...(actorType ? { actor_type: actorType } : {}),
      ...sanitizedData,
    };

    try {
      this.sink.write(record);
    } catch {
      // Non-blocking observability guarantee (doc 28 §10)
    }
  }

  debug(event: string, message: string, data?: Record<string, unknown>): void {
    this.emit('debug', event, message, data);
  }

  info(event: string, message: string, data?: Record<string, unknown>): void {
    this.emit('info', event, message, data);
  }

  warn(event: string, message: string, data?: Record<string, unknown>): void {
    this.emit('warn', event, message, data);
  }

  error(event: string, message: string, data?: Record<string, unknown>): void {
    this.emit('error', event, message, data);
  }
}

export function createLogger(service = 'maihan-gems', defaultContext: LogContext = {}, sink?: LogSink): Logger {
  return new Logger(service, defaultContext, sink);
}
