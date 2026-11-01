import { describe, expect, it } from 'vitest';
import { parseTraceparent, traceparentOf } from '../tracing.js';

describe('trace context', () => {
  it('continues an inbound trace and issues a child span', () => {
    const inbound = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';
    const ctx = parseTraceparent(inbound);
    expect(ctx.traceId).toBe('4bf92f3577b34da6a3ce929d0e0e4736');
    expect(ctx.parentSpanId).toBe('00f067aa0ba902b7');
    expect(ctx.spanId).toMatch(/^[a-f0-9]{16}$/);
    expect(traceparentOf(ctx)).toMatch(/^00-4bf92f3577b34da6a3ce929d0e0e4736-[a-f0-9]{16}-01$/);
  });

  it('starts a new trace when the header is missing or malformed', () => {
    for (const header of [undefined, 'garbage', '00-xyz-abc-01']) {
      const ctx = parseTraceparent(header);
      expect(ctx.traceId).toMatch(/^[a-f0-9]{32}$/);
      expect(ctx.parentSpanId).toBeNull();
    }
  });
});
