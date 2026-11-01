import { describe, expect, it } from 'vitest';
import { bucketPath, recordRequest, renderMetrics, resetMetrics } from '../metrics.js';

describe('prometheus metrics', () => {
  it('buckets dynamic path segments', () => {
    expect(bucketPath('/api/v1/catalogue/gemstones/G-COR-RUB-AE014-00317')).toBe('/api/v1/catalogue/gemstones/:rest');
    expect(bucketPath('/api/v1/orders/MG-2026-123456/pay')).toBe('/api/v1/orders/:rest');
    expect(bucketPath('/healthz')).toBe('/healthz');
  });

  it('renders counters and process gauges', () => {
    resetMetrics();
    recordRequest('POST', '/api/v1/orders/MG-2026-123456/pay', 200);
    recordRequest('POST', '/api/v1/orders/MG-2026-654321/pay', 409);
    const text = renderMetrics();
    expect(text).toContain('maihan_http_requests_total{method="POST",path="/api/v1/orders/:rest",status="200"} 1');
    expect(text).toContain('status="409"');
    expect(text).toContain('maihan_process_uptime_seconds');
    expect(text).toContain('maihan_process_resident_memory_bytes');
  });

  it('ignores metrics and media paths', () => {
    resetMetrics();
    recordRequest('GET', '/metrics', 200);
    recordRequest('GET', '/media/abc.png', 200);
    expect(renderMetrics()).not.toContain('maihan_http_requests_total{');
  });
});
