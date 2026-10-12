import { describe, it, expect, beforeEach } from 'vitest';
import {
  parseTraceparent,
  formatTraceparent,
  extractContextFromHeaders,
  injectContextToHeaders,
  withSpan,
  InMemorySpanExporter,
  registerGlobalSpanExporter,
  createLogger,
  MemoryLogSink,
  globalRegistry,
  CardinalityViolationError,
  initSentry,
  AlertEvaluator,
} from './index.js';

describe('Phase 12 — Observability Module Specification', () => {
  describe('W3C TraceContext Parsing & Header Propagation', () => {
    it('parses valid W3C traceparent header', () => {
      const header = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';
      const ctx = parseTraceparent(header);
      expect(ctx).not.toBeNull();
      expect(ctx?.traceId).toBe('4bf92f3577b34da6a3ce929d0e0e4736');
      expect(ctx?.spanId).toBe('00f067aa0ba902b7');
      expect(ctx?.traceFlags).toBe(1);
    });

    it('rejects malformed traceparent headers', () => {
      expect(parseTraceparent('')).toBeNull();
      expect(parseTraceparent('invalid')).toBeNull();
      // all zeroes traceId
      expect(parseTraceparent('00-00000000000000000000000000000000-00f067aa0ba902b7-01')).toBeNull();
      // invalid length
      expect(parseTraceparent('00-4bf92f3577b34da6a3ce929d0e0e47-00f067aa0ba902b7-01')).toBeNull();
    });

    it('formats SpanContext into traceparent header', () => {
      const formatted = formatTraceparent({
        traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
        spanId: '00f067aa0ba902b7',
        traceFlags: 1,
      });
      expect(formatted).toBe('00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01');
    });

    it('extracts and injects headers across boundaries', () => {
      const headers = new Headers();
      headers.set('traceparent', '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01');
      const ctx = extractContextFromHeaders(headers);
      expect(ctx.traceId).toBe('4bf92f3577b34da6a3ce929d0e0e4736');

      const outgoing = new Headers();
      injectContextToHeaders(ctx, outgoing);
      expect(outgoing.get('traceparent')).toBe('00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01');
      expect(outgoing.get('x-trace-id')).toBe('4bf92f3577b34da6a3ce929d0e0e4736');
    });
  });

  describe('Distributed Tracing & withSpan Execution', () => {
    let exporter: InMemorySpanExporter;

    beforeEach(() => {
      exporter = new InMemorySpanExporter();
      registerGlobalSpanExporter(exporter);
    });

    it('executes block within span and captures duration and attributes', async () => {
      const result = await withSpan(
        'catalog.getProductBySlug',
        {
          attributes: { 'product.slug': 'sapphire-ring-101' },
        },
        async (span) => {
          span.setAttribute('cache.hit', true);
          return { id: 'p_1' };
        },
      );

      expect(result).toEqual({ id: 'p_1' });
      const spans = exporter.getFinishedSpans();
      expect(spans.length).toBeGreaterThan(0);
      const span = spans.find((s) => s.name === 'catalog.getProductBySlug');
      expect(span).toBeDefined();
      expect(span?.attributes['product.slug']).toBe('sapphire-ring-101');
      expect(span?.attributes['cache.hit']).toBe(true);
      expect(span?.status.code).toBe('OK');
      expect(span?.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('records exception when child operation throws', async () => {
      await expect(
        withSpan('db.query.fail', {}, async () => {
          throw new Error('Database connection failed');
        }),
      ).rejects.toThrow('Database connection failed');

      const spans = exporter.getFinishedSpans();
      const failedSpan = spans.find((s) => s.name === 'db.query.fail');
      expect(failedSpan).toBeDefined();
      expect(failedSpan?.status.code).toBe('ERROR');
      expect(failedSpan?.status.message).toBe('Database connection failed');
    });
  });

  describe('Structured JSON Logging with PII Scrubbing', () => {
    let sink: MemoryLogSink;

    beforeEach(() => {
      sink = new MemoryLogSink();
    });

    it('formats JSON log with event, trace_id, and actor_type', () => {
      const logger = createLogger('commerce', { traceId: 'trace_123', actorType: 'CUSTOMER' }, sink);
      logger.info('order.placed', 'Order placed successfully', { orderId: 'ord_999' });

      expect(sink.records.length).toBe(1);
      const log = sink.records[0]!;
      expect(log.service).toBe('commerce');
      expect(log.event).toBe('order.placed');
      expect(log.trace_id).toBe('trace_123');
      expect(log.actor_type).toBe('CUSTOMER');
      expect(log['orderId']).toBe('ord_999');
    });

    it('strictly scrubs sensitive PII (emails, cards, passwords, biometrics)', () => {
      const logger = createLogger('identity', {}, sink);
      logger.info('user.register', 'Registration attempt', {
        email: 'customer@example.com',
        password: 'supersecretpass',
        nested: {
          token: 'bearer_token_xyz',
          customer_note: 'Contact at test@maihan.com',
          card: '4111 1111 1111 1111',
          camera_frame: 'base64_raw_pixels',
        },
      });

      expect(sink.records.length).toBe(1);
      const log = sink.records[0]!;
      expect(log['email']).toBe('[REDACTED]');
      expect(log['password']).toBe('[REDACTED]');
      const nested = log['nested'] as Record<string, unknown>;
      expect(nested['token']).toBe('[REDACTED]');
      expect(nested['camera_frame']).toBe('[REDACTED]');
      expect(nested['card']).toBe('[REDACTED]');
      expect(nested['customer_note']).toContain('[REDACTED_EMAIL]');
    });
  });

  describe('Metric Registry & Cardinality Protection (NFR-09, Doc 28 §4)', () => {
    beforeEach(() => {
      globalRegistry.resetAll();
    });

    it('records valid low-cardinality metrics (counters, gauges, histograms)', () => {
      const counter = globalRegistry.counter('catalog.requests.total', 'Total catalog requests');
      counter.inc({ route: '/api/v1/products', status: '200' }, 2);
      expect(counter.get({ route: '/api/v1/products', status: '200' })).toBe(2);

      const gauge = globalRegistry.gauge('catalog.gemstones.available', 'Available gemstones count');
      gauge.set(19665);
      expect(gauge.get()).toBe(19665);

      const histogram = globalRegistry.histogram('catalog.query.duration.ms', 'Query latency');
      histogram.observe(150);
      histogram.observe(250);
      histogram.observe(350);
      expect(histogram.getPercentile(95)).toBeGreaterThanOrEqual(250);
    });

    it('throws CardinalityViolationError on high-cardinality labels (email, user_id, sku, url)', () => {
      const counter = globalRegistry.counter('security.audit.cardinality', 'Test guard');

      expect(() => {
        counter.inc({ user_id: 'usr_1234' });
      }).toThrow(CardinalityViolationError);

      expect(() => {
        counter.inc({ email: 'victim@example.com' });
      }).toThrow(CardinalityViolationError);

      expect(() => {
        counter.inc({ sku: 'JS1016W10' });
      }).toThrow(CardinalityViolationError);

      expect(() => {
        counter.inc({ url: 'https://maihan.com/search?q=ruby' });
      }).toThrow(CardinalityViolationError);
    });
  });

  describe('Sentry Client & Error Redaction', () => {
    it('captures errors with sanitized context and tags', () => {
      const client = initSentry({ enabled: true, dsn: 'https://mock@sentry.io/1' });
      client.addBreadcrumb({ category: 'ui', message: 'User clicked buy' });

      const eventId = client.captureException(new Error('Payment gateway timeout'), {
        tags: { endpoint: '/api/v1/checkout/sessions' },
        extra: { customer_email: 'buyer@maihan.com', token: 'secret_tok' },
      });

      expect(eventId).toBeDefined();
      expect(client.capturedEvents.length).toBe(1);
      const ev = client.capturedEvents[0]!;
      expect(ev.message).toBe('Payment gateway timeout');
      expect(ev.tags['endpoint']).toBe('/api/v1/checkout/sessions');
      expect(ev.extra['customer_email']).toBe('[REDACTED]');
      expect(ev.extra['token']).toBe('[REDACTED]');
      expect(ev.breadcrumbs.length).toBe(1);
    });
  });

  describe('SLO Evaluator & Production Alert Rules', () => {
    it('evaluates samples against SLOs and fires alerts upon threshold breaches', () => {
      const evaluator = new AlertEvaluator();

      // Healthy samples
      const healthySamples = [
        {
          name: 'http_request_error_rate',
          type: 'gauge' as const,
          value: 0.02, // 0.02% <= 0.1% threshold
          timestamp: Date.now(),
          labels: {},
        },
        {
          name: 'catalog_query_duration_p95_ms',
          type: 'gauge' as const,
          value: 280, // <= 400ms threshold
          timestamp: Date.now(),
          labels: {},
        },
        {
          name: 'ai_grounded_ratio',
          type: 'gauge' as const,
          value: 0.85, // >= 0.60 threshold
          timestamp: Date.now(),
          labels: {},
        },
      ];

      const incidentsInitial = evaluator.evaluateSamples(healthySamples);
      expect(incidentsInitial.length).toBe(0);

      // Degraded samples: AI grounded ratio collapses, latency spikes
      const degradedSamples = [
        {
          name: 'ai_grounded_ratio',
          type: 'gauge' as const,
          value: 0.42, // < 0.60 -> BREACH!
          timestamp: Date.now(),
          labels: {},
        },
        {
          name: 'catalog_query_duration_p95_ms',
          type: 'gauge' as const,
          value: 580, // > 400 -> BREACH!
          timestamp: Date.now(),
          labels: {},
        },
      ];

      const incidents = evaluator.evaluateSamples(degradedSamples);
      expect(incidents.length).toBe(2);

      const p1Alert = incidents.find((i) => i.ruleId === 'ALERT-P1-AI-GROUNDING-COLLAPSE');
      expect(p1Alert).toBeDefined();
      expect(p1Alert?.severity).toBe('P1');
      expect(p1Alert?.status).toBe('FIRING');
      expect(p1Alert?.runbookUrl).toBe('docs/runbooks/RB-04-AI-PROVIDER-OUTAGE-FAILOVER.md');

      const p2Alert = incidents.find((i) => i.ruleId === 'ALERT-P2-CATALOG-LATENCY-BREACH');
      expect(p2Alert).toBeDefined();
      expect(p2Alert?.severity).toBe('P2');
      expect(p2Alert?.status).toBe('FIRING');
    });
  });
});
