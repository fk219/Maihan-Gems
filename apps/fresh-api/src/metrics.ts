/**
 * Dependency-free Prometheus text metrics: request counters (bounded path
 * buckets), uptime and memory gauges. No PII, no query strings, no bodies.
 */
const counters = new Map<string, number>();

export function bucketPath(path: string): string {
  const segs = path.split('/').filter(Boolean);
  // Catalogue endpoints keep their resource name (gemstones/settings/products);
  // everything else keeps only the service prefix to stay low-cardinality.
  const keep = Math.min(segs.length, path.startsWith('/api/v1/catalogue/') ? 4 : 3);
  return `/${segs.slice(0, keep).join('/')}${segs.length > keep ? '/:rest' : ''}`;
}

export function recordRequest(method: string, path: string, status: number): void {
  if (path === '/metrics' || path.startsWith('/media/')) return;
  const key = `${method.toUpperCase()}|${bucketPath(path)}|${status}`;
  counters.set(key, (counters.get(key) ?? 0) + 1);
  if (counters.size > 2000) counters.clear();
}

export function renderMetrics(): string {
  const lines: string[] = [];
  lines.push('# HELP maihan_http_requests_total HTTP requests by method, path bucket and status.');
  lines.push('# TYPE maihan_http_requests_total counter');
  for (const [key, value] of counters) {
    const [method, path, status] = key.split('|');
    lines.push(`maihan_http_requests_total{method="${method}",path="${path}",status="${status}"} ${value}`);
  }
  lines.push('# HELP maihan_process_uptime_seconds Process uptime in seconds.');
  lines.push('# TYPE maihan_process_uptime_seconds gauge');
  lines.push(`maihan_process_uptime_seconds ${process.uptime().toFixed(3)}`);
  lines.push('# HELP maihan_process_resident_memory_bytes Resident memory size.');
  lines.push('# TYPE maihan_process_resident_memory_bytes gauge');
  lines.push(`maihan_process_resident_memory_bytes ${process.memoryUsage().rss}`);
  return `${lines.join('\n')}\n`;
}

export function resetMetrics(): void {
  counters.clear();
}
