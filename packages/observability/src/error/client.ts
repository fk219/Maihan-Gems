/**
 * packages/observability/src/error/client.ts
 *
 * Isomorphic/Browser-safe error capturing and Sentry reporting facade.
 * Has zero dependencies on Node-only modules or @maihan/contracts/domain,
 * making it safe to bundle directly into React Client Components (PG-5 budget safe).
 */

export interface ClientErrorContext {
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
}

export function captureClientError(error: unknown, context: ClientErrorContext = {}): string {
  const eventId = Math.random().toString(36).substring(2, 15);
  const err = error instanceof Error ? error : new Error(String(error));

  // In browser, emit structured diagnostic to console for support correlation
  if (typeof globalThis !== 'undefined' && 'window' in globalThis && typeof console !== 'undefined') {
    console.error(`[Observability] Error captured [id: ${eventId}]:`, err.message, {
      digest: (error as any)?.digest,
      tags: context.tags,
    });
  }

  // If Sentry browser SDK or global handler is mounted on window, dispatch
  const globalSentry = (globalThis as any)?.__SENTRY__;
  if (globalSentry && typeof globalSentry.captureException === 'function') {
    try {
      globalSentry.captureException(err, context);
    } catch {
      // Non-blocking observability
    }
  }

  return eventId;
}
