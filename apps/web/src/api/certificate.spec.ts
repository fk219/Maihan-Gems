/**
 * apps/web/src/api/certificate.spec.ts
 *
 * Test suite for Phase 8 Certificate Intelligence HTTP API endpoints:
 *   - POST /api/v1/certificates: Presigned upload request & certificate registration
 *   - GET  /api/v1/certificates/{certificateId}: Document retrieval
 *   - POST /api/v1/certificates/{certificateId}/ocr: OCR extraction submission & anomaly detection
 *   - POST /api/v1/certificates/{certificateId}/review: Human review approval/rejection
 *   - GET  /api/v1/gemstones/{gemRef}/certificates/public: Public read model view (INV-07 enforcement)
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { createCatalogApi, type CatalogApi } from './index.js';
import {
  MemoryCacheStore,
  MemoryGenerationStore,
  createCatalogQueryService,
} from '../modules/catalog/index.js';
import { FakeCatalogPort } from '../modules/catalog/testing/doubles.js';
import type { CertificateExtractionSchema } from '@maihan/domain';

function createMockExtraction(
  overrides?: Partial<CertificateExtractionSchema>,
): CertificateExtractionSchema {
  return {
    lab_name: { value: 'GIA', confidence: 0.95 },
    report_type: { value: 'GEM_REPORT', confidence: 0.92 },
    certificate_number: { value: 'GIA-21849102', confidence: 0.96 },
    issue_date: { value: '2026-01-15', confidence: 0.91 },
    stone: {
      weight_ct: { value: 3.42, confidence: 0.98 },
      length_mm: { value: 9.8, confidence: 0.94 },
      width_mm: { value: 7.9, confidence: 0.94 },
      depth_mm: { value: 5.2, confidence: 0.93 },
    },
    treatments: [{ value: 'NO_ENHANCEMENT', confidence: 0.95 }],
    origin: { value: 'Sri Lanka (Ceylon)', confidence: 0.92 },
    ...overrides,
  };
}

describe('Certificate Intelligence HTTP API (Phase 8 Tasks 1-10)', () => {
  let api: CatalogApi;
  const mockDb: any = {
    pool: {
      query: async (queryText: string, params: any[]) => {
        if (queryText.includes('INSERT INTO certificates')) {
          return {
            rows: [
              {
                id: 'cert_mock_123',
                kind: params[0],
                gemstone_id: params[1],
                configuration_id: params[2],
                product_id: params[3],
                source_url: params[4],
                verification_status: 'UNVERIFIED',
                confidence_overall: null,
                created_at: new Date(),
                updated_at: new Date(),
              },
            ],
          };
        }
        if (queryText.includes('SELECT * FROM certificates WHERE id = $1')) {
          return {
            rows: [
              {
                id: params[0],
                kind: 'CERTIFICATE',
                verification_status: 'UNVERIFIED',
                confidence_overall: null,
              },
            ],
          };
        }
        if (queryText.includes('SELECT * FROM certificate_public')) {
          return {
            rows: [
              {
                id: 'cert_pub_1',
                kind: 'CERTIFICATE',
                gemstone_id: params[0],
                verification_status: 'VERIFIED',
                confidence_overall: 0.95,
                lab_name: 'GIA',
                field_name: 'origin',
                normalized_value: 'Sri Lanka',
                confidence: 0.92,
                field_status: 'VERIFIED',
              },
            ],
          };
        }
        return { rows: [] };
      },
    },
  };

  beforeAll(() => {
    const service = createCatalogQueryService({
      port: new FakeCatalogPort(),
      store: new MemoryCacheStore(),
      generations: new MemoryGenerationStore(),
      namespace: 'test',
    });
    api = createCatalogApi({
      service,
      db: mockDb,
    });
  });

  it('POST /api/v1/certificates registers an unverified document and returns presigned upload url', async () => {
    const res = await api(
      new Request('http://localhost:3000/api/v1/certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'CERTIFICATE',
          gemstoneId: 'gem_12345',
          sourceUrl: 'https://archive.maihan.internal/stone/k1324/cert.jpg',
        }),
      }),
    );

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.certificate.id).toBe('cert_mock_123');
    expect(json.data.certificate.verification_status).toBe('UNVERIFIED');
    expect(json.data.upload_url).toContain('presigned-put');
  });

  it('GET /api/v1/certificates/{certificateId} retrieves certificate metadata', async () => {
    const res = await api(
      new Request('http://localhost:3000/api/v1/certificates/cert_mock_123', {
        method: 'GET',
      }),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.certificate.id).toBe('cert_mock_123');
  });

  it('POST /api/v1/certificates/{certificateId}/ocr processes extraction, runs cross-checks, and detects anomalies', async () => {
    const extractionWithLowOrigin = createMockExtraction({
      origin: { value: 'Nigeria', confidence: 0.54 }, // charter worked example
    });

    const res = await api(
      new Request('http://localhost:3000/api/v1/certificates/cert_mock_123/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extraction: extractionWithLowOrigin,
          structuredGemstone: {
            slugWeightCt: 3.42,
            stoneCount: 1,
            origin: 'Ratnapura, Sri Lanka', // conflict with Nigeria
          },
        }),
      }),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.status).toBe('EXTRACTED'); // low confidence blocks promotion to CROSS_CHECKED
    expect(json.data.requiresHumanReview).toBe(true);

    const anomalies = json.data.anomalies;
    expect(anomalies.some((a: any) => a.type === 'LOW_CONFIDENCE')).toBe(true);
    expect(anomalies.some((a: any) => a.type === 'ORIGIN_CONFLICT')).toBe(true);
  });

  it('POST /api/v1/certificates/{certificateId}/review approves certificate when all material fields >= 0.90', async () => {
    const highExtraction = createMockExtraction();

    const res = await api(
      new Request('http://localhost:3000/api/v1/certificates/cert_mock_123/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewerId: 'usr_gemmologist_01',
          decision: 'APPROVE',
          notes: 'Verified against GIA official portal.',
          extraction: highExtraction,
        }),
      }),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.status).toBe('VERIFIED');
    expect(json.data.verifiedBy).toBe('usr_gemmologist_01');
  });

  it('POST /api/v1/certificates/{certificateId}/review rejects approval if confidence is below 0.90 threshold', async () => {
    const lowExtraction = createMockExtraction({
      origin: { value: 'Nigeria', confidence: 0.54 },
    });

    const res = await api(
      new Request('http://localhost:3000/api/v1/certificates/cert_mock_123/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewerId: 'usr_gemmologist_01',
          decision: 'APPROVE',
          extraction: lowExtraction,
        }),
      }),
    );

    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error.code).toBe('UNPROCESSABLE');
  });

  it('GET /api/v1/gemstones/{gemRef}/certificates/public enforces INV-07 read-model view', async () => {
    const res = await api(
      new Request('http://localhost:3000/api/v1/gemstones/gem_12345/certificates/public', {
        method: 'GET',
      }),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.gemRef).toBe('gem_12345');
    expect(json.data.certificates).toHaveLength(1);
    expect(json.data.certificates[0].field_status).toBe('VERIFIED');
    expect(json.data.notice).toContain('INV-07');
  });
});
