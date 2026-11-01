import { describe, expect, it } from 'vitest';
import { otlpPayload, requestSpan } from '../otel.js';

describe('OTLP payload', () => {
  it('serialises a request span with resource + scope', () => {
    const span = requestSpan(
      { traceId: '4bf92f3577b34da6a3ce929d0e0e4736', spanId: 'd28e9cc4867cfc00', parentSpanId: '00f067aa0ba902b7', sampled: true },
      'GET',
      '/api/v1/catalogue/gemstones?q=ruby',
      200,
      Date.now() - 12,
    );
    const payload = otlpPayload([span]) as {
      resourceSpans: Array<{
        resource: { attributes: Array<{ key: string }> };
        scopeSpans: Array<{ spans: Array<{ traceId: string; attributes: Array<{ key: string }>; status: { code: number } }> }>;
      }>;
    };
    expect(payload.resourceSpans[0]!.resource.attributes[0]!.key).toBe('service.name');
    const emitted = payload.resourceSpans[0]!.scopeSpans[0]!.spans[0]!;
    expect(emitted.traceId).toBe('4bf92f3577b34da6a3ce929d0e0e4736');
    expect(emitted.attributes.map((a) => a.key)).toContain('http.response.status_code');
    expect(emitted.status.code).toBe(1);
  });
});
