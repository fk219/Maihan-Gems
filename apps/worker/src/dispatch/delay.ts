/**
 * apps/worker/src/dispatch/delay.ts
 *
 * An interruptible sleep. A worker told to stop must stop CLAIMING, and it must
 * not sit in a 5-second idle sleep before noticing. The timer is cleared the
 * moment the signal aborts, so shutdown latency is bounded by the in-flight
 * handler, not by the poll interval.
 */
export function delay(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0 || signal?.aborted === true) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = (): void => {
      clearTimeout(timer);
      resolve();
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}
