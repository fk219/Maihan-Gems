/**
 * packages/observability/src/slo/evaluator.ts
 *
 * Service Level Objectives (SLOs) and Alert Evaluator.
 * Defines production SLOs derived from NFR-01 to NFR-15 and technical_design/28 §7:
 *
 * 1. SLO-AVAIL-01: Storefront & API Availability >= 99.9% (P1 alert on breach)
 * 2. SLO-LATENCY-CATALOG: Catalog Query Latency p95 <= 400ms (P2 alert on breach)
 * 3. SLO-LATENCY-AI: AI Concierge TTFB p95 <= 2000ms (P2 alert on breach)
 * 4. SLO-GROUNDING: AI Concierge Grounded Ratio >= 0.60 (P1 alert on collapse, doc 28 §2)
 * 5. SLO-WHATSAPP-FAILURES: WhatsApp Webhook Failure Rate <= 1.0% (P1 alert on spike)
 * 6. SLO-DB-POOL-WAIT: Database Pool Wait p95 <= 50ms (P1 alert on pool exhaustion)
 */
import type { AlertIncident, AlertRuleDefinition } from '@maihan/contracts';
import type { MetricSample } from '@maihan/contracts';

export interface ServiceLevelObjective {
  readonly id: string;
  readonly name: string;
  readonly target: number;
  readonly unit: 'percent' | 'ms' | 'ratio';
  readonly rule: AlertRuleDefinition;
}

export const PRODUCTION_SLOS: readonly ServiceLevelObjective[] = [
  {
    id: 'SLO-AVAIL-01',
    name: 'Storefront & API Availability',
    target: 99.9,
    unit: 'percent',
    rule: {
      id: 'ALERT-P1-AVAILABILITY-DROP',
      name: 'Elevated API & Storefront Error Rate',
      severity: 'P1',
      owner: 'platform-oncall',
      runbookUrl: 'docs/runbooks/RB-01-ELEVATED-ERROR-RATE.md',
      sloId: 'SLO-AVAIL-01',
      metricName: 'http_request_error_rate',
      condition: 'gt',
      threshold: 0.1, // > 0.1% errors breaches 99.9% availability
      windowSeconds: 300,
      summary: 'API or Storefront availability dropped below 99.9% over a 5m window.',
    },
  },
  {
    id: 'SLO-LAT-01',
    name: 'Catalog Query Latency p95',
    target: 400,
    unit: 'ms',
    rule: {
      id: 'ALERT-P2-CATALOG-LATENCY-BREACH',
      name: 'Catalog Query Latency Regression',
      severity: 'P2',
      owner: 'catalog-team',
      runbookUrl: 'docs/runbooks/RB-02-HIGH-LATENCY-REGRESSION.md',
      sloId: 'SLO-LAT-01',
      metricName: 'catalog_query_duration_p95_ms',
      condition: 'gt',
      threshold: 400,
      windowSeconds: 300,
      summary: 'Catalog query latency p95 exceeded 400ms target over 5m window.',
    },
  },
  {
    id: 'SLO-AI-GROUNDING',
    name: 'AI Concierge Grounded Ratio',
    target: 0.60,
    unit: 'ratio',
    rule: {
      id: 'ALERT-P1-AI-GROUNDING-COLLAPSE',
      name: 'AI Grounded Ratio Collapse',
      severity: 'P1',
      owner: 'ai-operations',
      runbookUrl: 'docs/runbooks/RB-04-AI-PROVIDER-OUTAGE-FAILOVER.md',
      sloId: 'SLO-AI-GROUNDING',
      metricName: 'ai_grounded_ratio',
      condition: 'lt',
      threshold: 0.60,
      windowSeconds: 600,
      summary: 'AI Concierge grounded ratio collapsed below 0.60; possible hallucination or grounding bypass.',
    },
  },
  {
    id: 'SLO-WHATSAPP-DELIVERY',
    name: 'WhatsApp Webhook Success Rate',
    target: 99.0,
    unit: 'percent',
    rule: {
      id: 'ALERT-P1-WHATSAPP-WEBHOOK-FAILURES',
      name: 'WhatsApp Webhook Ingestion Failures',
      severity: 'P1',
      owner: 'integrations-oncall',
      runbookUrl: 'docs/runbooks/RB-05-WHATSAPP-WEBHOOK-FAILURES.md',
      sloId: 'SLO-WHATSAPP-DELIVERY',
      metricName: 'whatsapp_webhook_failure_rate',
      condition: 'gt',
      threshold: 1.0,
      windowSeconds: 300,
      summary: 'WhatsApp webhook failure rate exceeded 1.0%; signature errors or processing failures.',
    },
  },
  {
    id: 'SLO-DB-CONN',
    name: 'Database Connectivity & Pool Health',
    target: 50,
    unit: 'ms',
    rule: {
      id: 'ALERT-P1-DB-CONNECTIVITY-TIMEOUT',
      name: 'Database Pool Wait & Connectivity Degradation',
      severity: 'P1',
      owner: 'database-infra',
      runbookUrl: 'docs/runbooks/RB-03-DATABASE-CONNECTIVITY-TIMEOUT.md',
      sloId: 'SLO-DB-CONN',
      metricName: 'db_pool_wait_p95_ms',
      condition: 'gt',
      threshold: 50,
      windowSeconds: 120,
      summary: 'Database connection pool wait p95 exceeded 50ms; connection pool near exhaustion.',
    },
  },
];

export class AlertEvaluator {
  private readonly rules: AlertRuleDefinition[];
  private readonly firingIncidents = new Map<string, AlertIncident>();

  constructor(customRules?: AlertRuleDefinition[]) {
    this.rules = customRules ?? PRODUCTION_SLOS.map((s) => s.rule);
  }

  evaluateSamples(samples: readonly MetricSample[]): AlertIncident[] {
    const incidents: AlertIncident[] = [];
    const latestSamples = new Map<string, MetricSample>();

    for (const sample of samples) {
      latestSamples.set(sample.name, sample);
    }

    for (const rule of this.rules) {
      const sample = latestSamples.get(rule.metricName);
      if (!sample) continue;

      let isBreached = false;
      switch (rule.condition) {
        case 'gt':
          isBreached = sample.value > rule.threshold;
          break;
        case 'gte':
          isBreached = sample.value >= rule.threshold;
          break;
        case 'lt':
          isBreached = sample.value < rule.threshold;
          break;
        case 'lte':
          isBreached = sample.value <= rule.threshold;
          break;
        case 'eq':
          isBreached = sample.value === rule.threshold;
          break;
      }

      const existing = this.firingIncidents.get(rule.id);

      if (isBreached) {
        const incident: AlertIncident = {
          id: existing?.id ?? `inc_${Math.random().toString(36).substring(2, 10)}`,
          ruleId: rule.id,
          severity: rule.severity,
          status: 'FIRING',
          currentValue: sample.value,
          threshold: rule.threshold,
          owner: rule.owner,
          runbookUrl: rule.runbookUrl,
          summary: rule.summary,
          timestamp: Date.now(),
          labels: sample.labels,
        };
        this.firingIncidents.set(rule.id, incident);
        incidents.push(incident);
      } else if (existing) {
        // Resolve incident
        const resolved: AlertIncident = {
          ...existing,
          status: 'RESOLVED',
          currentValue: sample.value,
          timestamp: Date.now(),
        };
        this.firingIncidents.delete(rule.id);
        incidents.push(resolved);
      }
    }

    return incidents;
  }

  getFiringIncidents(): readonly AlertIncident[] {
    return Array.from(this.firingIncidents.values());
  }

  clear(): void {
    this.firingIncidents.clear();
  }
}
