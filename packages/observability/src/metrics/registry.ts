/**
 * packages/observability/src/metrics/registry.ts
 *
 * Prometheus-compatible metric registry with strict cardinality protection (technical_design/28 §4).
 * Enforces Cardinality Rule 1: No user id, customer email, product SKU or raw URL in metric labels.
 */
import { FORBIDDEN_METRIC_LABEL_KEYS, type MetricSample, type MetricType } from '@maihan/contracts';

export class CardinalityViolationError extends Error {
  constructor(public readonly forbiddenKey: string, public readonly metricName: string) {
    super(`Forbidden high-cardinality metric label key "${forbiddenKey}" detected on metric "${metricName}". Cardinality rule violation (technical_design/28 §4).`);
    this.name = 'CardinalityViolationError';
  }
}

/**
 * Validates label keys against forbidden high-cardinality list.
 */
export function validateMetricLabels(metricName: string, labels: Record<string, string>): void {
  for (const key of Object.keys(labels)) {
    const lowerKey = key.toLowerCase();
    for (const forbidden of FORBIDDEN_METRIC_LABEL_KEYS) {
      if (lowerKey === forbidden.toLowerCase()) {
        throw new CardinalityViolationError(key, metricName);
      }
    }
  }
}

export interface MetricDefinition {
  name: string;
  type: MetricType;
  description: string;
}

export class Counter {
  private values = new Map<string, number>();

  constructor(public readonly name: string, public readonly description: string) {}

  inc(labels: Record<string, string> = {}, amount = 1): void {
    validateMetricLabels(this.name, labels);
    const key = JSON.stringify(Object.entries(labels).sort(([a], [b]) => a.localeCompare(b)));
    const current = this.values.get(key) ?? 0;
    this.values.set(key, current + amount);
  }

  get(labels: Record<string, string> = {}): number {
    const key = JSON.stringify(Object.entries(labels).sort(([a], [b]) => a.localeCompare(b)));
    return this.values.get(key) ?? 0;
  }

  collect(): MetricSample[] {
    const now = Date.now();
    const samples: MetricSample[] = [];
    for (const [key, val] of this.values.entries()) {
      const labels = Object.fromEntries(JSON.parse(key));
      samples.push({
        name: this.name,
        type: 'counter',
        value: val,
        timestamp: now,
        labels,
      });
    }
    return samples;
  }

  reset(): void {
    this.values.clear();
  }
}

export class Gauge {
  private values = new Map<string, number>();

  constructor(public readonly name: string, public readonly description: string) {}

  set(value: number, labels: Record<string, string> = {}): void {
    validateMetricLabels(this.name, labels);
    const key = JSON.stringify(Object.entries(labels).sort(([a], [b]) => a.localeCompare(b)));
    this.values.set(key, value);
  }

  get(labels: Record<string, string> = {}): number {
    const key = JSON.stringify(Object.entries(labels).sort(([a], [b]) => a.localeCompare(b)));
    return this.values.get(key) ?? 0;
  }

  collect(): MetricSample[] {
    const now = Date.now();
    const samples: MetricSample[] = [];
    for (const [key, val] of this.values.entries()) {
      const labels = Object.fromEntries(JSON.parse(key));
      samples.push({
        name: this.name,
        type: 'gauge',
        value: val,
        timestamp: now,
        labels,
      });
    }
    return samples;
  }

  reset(): void {
    this.values.clear();
  }
}

export class Histogram {
  private values = new Map<string, number[]>();

  constructor(
    public readonly name: string,
    public readonly description: string,
    public readonly buckets: number[] = [10, 50, 100, 250, 500, 1000, 2500, 5000],
  ) {}

  observe(value: number, labels: Record<string, string> = {}): void {
    validateMetricLabels(this.name, labels);
    const key = JSON.stringify(Object.entries(labels).sort(([a], [b]) => a.localeCompare(b)));
    const series = this.values.get(key) ?? [];
    series.push(value);
    this.values.set(key, series);
  }

  getPercentile(percentile: number, labels: Record<string, string> = {}): number {
    const key = JSON.stringify(Object.entries(labels).sort(([a], [b]) => a.localeCompare(b)));
    const values = this.values.get(key);
    if (!values || values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, Math.min(index, sorted.length - 1))] ?? 0;
  }

  collect(): MetricSample[] {
    const now = Date.now();
    const samples: MetricSample[] = [];
    for (const [key, valArray] of this.values.entries()) {
      const labels = Object.fromEntries(JSON.parse(key));
      const count = valArray.length;
      const sum = valArray.reduce((acc, v) => acc + v, 0);
      samples.push({
        name: `${this.name}_count`,
        type: 'gauge',
        value: count,
        timestamp: now,
        labels,
      });
      samples.push({
        name: `${this.name}_sum`,
        type: 'gauge',
        value: sum,
        timestamp: now,
        labels,
      });
      samples.push({
        name: `${this.name}_p95`,
        type: 'gauge',
        value: this.getPercentile(95, labels),
        timestamp: now,
        labels,
      });
    }
    return samples;
  }

  reset(): void {
    this.values.clear();
  }
}

export class MetricRegistry {
  private counters = new Map<string, Counter>();
  private gauges = new Map<string, Gauge>();
  private histograms = new Map<string, Histogram>();

  counter(name: string, description: string): Counter {
    let c = this.counters.get(name);
    if (!c) {
      c = new Counter(name, description);
      this.counters.set(name, c);
    }
    return c;
  }

  gauge(name: string, description: string): Gauge {
    let g = this.gauges.get(name);
    if (!g) {
      g = new Gauge(name, description);
      this.gauges.set(name, g);
    }
    return g;
  }

  histogram(name: string, description: string, buckets?: number[]): Histogram {
    let h = this.histograms.get(name);
    if (!h) {
      h = new Histogram(name, description, buckets);
      this.histograms.set(name, h);
    }
    return h;
  }

  collectAll(): MetricSample[] {
    const samples: MetricSample[] = [];
    for (const c of this.counters.values()) samples.push(...c.collect());
    for (const g of this.gauges.values()) samples.push(...g.collect());
    for (const h of this.histograms.values()) samples.push(...h.collect());
    return samples;
  }

  resetAll(): void {
    for (const c of this.counters.values()) c.reset();
    for (const g of this.gauges.values()) g.reset();
    for (const h of this.histograms.values()) h.reset();
  }
}

export const globalRegistry = new MetricRegistry();
