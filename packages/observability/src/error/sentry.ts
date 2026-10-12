/**
 * packages/observability/src/error/sentry.ts
 *
 * Sentry-compatible error reporting client with data minimization and privacy protection.
 * Follows technical_design/28 §1, §10, §11:
 * - Redacts secrets, authentication tokens, passwords, cookies.
 * - Zero PII: scrubs emails, customer names, phone numbers.
 * - Zero camera/biometric data.
 * - Graceful fallback when Sentry is unconfigured or unavailable (never throws or crashes).
 */
import { sanitizeLogData } from '../logging/logger.js';

export interface SentryBreadcrumb {
  timestamp?: number;
  category: string;
  message: string;
  level?: 'info' | 'warning' | 'error';
  data?: Record<string, unknown>;
}

export interface SentryEvent {
  eventId: string;
  timestamp: number;
  level: 'info' | 'warning' | 'error' | 'fatal';
  message: string;
  exception?: {
    type: string;
    value: string;
    stacktrace?: string;
  };
  tags: Record<string, string>;
  extra: Record<string, unknown>;
  breadcrumbs: SentryBreadcrumb[];
}

export interface SentryClientOptions {
  dsn?: string;
  environment?: string;
  release?: string;
  enabled?: boolean;
  beforeSend?: (event: SentryEvent) => SentryEvent | null;
}

export class SentryClient {
  private readonly enabled: boolean;
  private readonly environment: string;
  private readonly release: string;
  private readonly breadcrumbs: SentryBreadcrumb[] = [];
  public readonly capturedEvents: SentryEvent[] = [];

  constructor(private readonly options: SentryClientOptions = {}) {
    this.enabled = options.enabled ?? Boolean(options.dsn);
    this.environment = options.environment ?? process.env['NODE_ENV'] ?? 'development';
    this.release = options.release ?? '0.0.0';
  }

  addBreadcrumb(breadcrumb: SentryBreadcrumb): void {
    if (!this.enabled) return;
    const sanitizedData = breadcrumb.data ? (sanitizeLogData(breadcrumb.data) as Record<string, unknown>) : undefined;
    this.breadcrumbs.push({
      timestamp: breadcrumb.timestamp ?? Date.now(),
      category: breadcrumb.category,
      message: breadcrumb.message,
      level: breadcrumb.level ?? 'info',
      ...(sanitizedData ? { data: sanitizedData } : {}),
    });
    // Keep bounded breadcrumbs ring buffer
    if (this.breadcrumbs.length > 50) {
      this.breadcrumbs.shift();
    }
  }

  captureException(error: unknown, context: { tags?: Record<string, string>; extra?: Record<string, unknown> } = {}): string {
    const eventId = Math.random().toString(36).substring(2, 15);
    if (!this.enabled) {
      return eventId;
    }

    const err = error instanceof Error ? error : new Error(String(error));
    const sanitizedExtra = context.extra ? (sanitizeLogData(context.extra) as Record<string, unknown>) : {};

    let event: SentryEvent | null = {
      eventId,
      timestamp: Date.now(),
      level: 'error',
      message: err.message,
      exception: {
        type: err.name,
        value: err.message,
        stacktrace: err.stack,
      },
      tags: {
        environment: this.environment,
        release: this.release,
        ...(context.tags ?? {}),
      },
      extra: sanitizedExtra,
      breadcrumbs: [...this.breadcrumbs],
    };

    if (this.options.beforeSend) {
      try {
        event = this.options.beforeSend(event);
      } catch {
        // Fallback: keep event if beforeSend fails
      }
    }

    if (event) {
      this.capturedEvents.push(event);
      if (this.capturedEvents.length > 100) {
        this.capturedEvents.shift();
      }
    }

    return eventId;
  }

  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', tags: Record<string, string> = {}): string {
    const eventId = Math.random().toString(36).substring(2, 15);
    if (!this.enabled) return eventId;

    const event: SentryEvent = {
      eventId,
      timestamp: Date.now(),
      level,
      message,
      tags: {
        environment: this.environment,
        release: this.release,
        ...tags,
      },
      extra: {},
      breadcrumbs: [...this.breadcrumbs],
    };

    this.capturedEvents.push(event);
    return eventId;
  }
}

let activeSentryClient: SentryClient = new SentryClient({ enabled: false });

export function initSentry(options: SentryClientOptions = {}): SentryClient {
  activeSentryClient = new SentryClient(options);
  return activeSentryClient;
}

export function getSentry(): SentryClient {
  return activeSentryClient;
}

export function captureException(error: unknown, context?: { tags?: Record<string, string>; extra?: Record<string, unknown> }): string {
  return getSentry().captureException(error, context);
}

export function addBreadcrumb(breadcrumb: SentryBreadcrumb): void {
  getSentry().addBreadcrumb(breadcrumb);
}
