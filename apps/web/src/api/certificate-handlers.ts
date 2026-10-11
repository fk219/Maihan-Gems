/**
 * apps/web/src/api/certificate-handlers.ts
 *
 * Route handlers for Phase 8 Certificate Intelligence:
 *   - POST /api/v1/certificates: Presigned upload request & certificate registration
 *   - GET  /api/v1/certificates/{certificateId}: Document state & metadata
 *   - POST /api/v1/certificates/{certificateId}/ocr: OCR extraction run submission & cross-checks
 *   - POST /api/v1/certificates/{certificateId}/review: Human review & verification decision
 *   - GET  /api/v1/gemstones/{gemRef}/certificates/public: Public read model view (enforcing INV-07)
 */
import { ContractError } from '@maihan/contracts';
import {
  createCertificate,
  getCertificateById,
  recordOcrRun,
  persistExtractions,
  recordAnomalies,
  recordVerificationEvent,
  updateCertificateStatus,
  recordHumanReview,
  getPublicCertificatesForGemstone,
} from '@maihan/db';
import {
  runCertificateCrossChecks,
  canAutomateCrossCheckTransition,
  canPromoteToVerified,
  type CertificateExtractionSchema,
  type StructuredGemstoneData,
  type VerificationStatus,
} from '@maihan/domain';
import type { RouteHandler, RouteContext } from './handlers.js';
import { requireIdentifier } from './query.js';

function getDb(ctx: RouteContext): any {
  const db = ctx.db || (ctx.service as any)?.port?.db;
  if (!db) {
    throw new ContractError('INTERNAL', 'Database connection not available for certificate operations.');
  }
  return (db as any).pool || db;
}

async function parseBody(request?: Request): Promise<unknown> {
  if (!request) return {};
  try {
    const text = await request.text();
    if (text.trim().length === 0) return {};
    return JSON.parse(text);
  } catch {
    throw new ContractError('VALIDATION_FAILED', 'Request body must be valid JSON.');
  }
}

export const createCertificateHandler: RouteHandler = async (ctx) => {
  const db = getDb(ctx);
  const rawBody = (await parseBody(ctx.request)) as Record<string, any>;

  const kind = rawBody['kind'] ?? 'CERTIFICATE';
  const gemstoneId = rawBody['gemstoneId'] ?? null;
  const configurationId = rawBody['configurationId'] ?? null;
  const productId = rawBody['productId'] ?? null;
  const sourceUrl = rawBody['sourceUrl'] ?? null;

  try {
    const cert = await createCertificate(db, {
      kind: kind as any,
      gemstoneId,
      configurationId,
      productId,
      sourceUrl,
    });

    await recordVerificationEvent(db, {
      certificateId: cert.id,
      eventType: 'UPLOADED',
      fromStatus: null,
      toStatus: 'UNVERIFIED',
      actorType: 'SYSTEM',
      detail: { kind: cert.kind, sourceUrl: cert.source_url },
    });

    return {
      status: 201,
      body: {
        data: {
          certificate: cert,
          upload_url: `https://storage.maihan.internal/certificates/${cert.id}/presigned-put`,
        },
      },
    };
  } catch (err: any) {
    throw new ContractError('INTERNAL', err.message);
  }
};

export const getCertificateHandler: RouteHandler = async (ctx) => {
  const db = getDb(ctx);
  const certId = requireIdentifier(ctx.params['certificateId'], 'certificateId');

  const cert = await getCertificateById(db, certId);
  if (!cert) {
    throw new ContractError('NOT_FOUND', `Certificate ${certId} not found.`);
  }

  return {
    status: 200,
    body: {
      data: {
        certificate: cert,
      },
    },
  };
};

export const processOcrRunHandler: RouteHandler = async (ctx) => {
  const db = getDb(ctx);
  const certId = requireIdentifier(ctx.params['certificateId'], 'certificateId');
  const rawBody = (await parseBody(ctx.request)) as Record<string, any>;

  const extraction = rawBody['extraction'] as CertificateExtractionSchema | undefined;
  if (!extraction) {
    throw new ContractError('VALIDATION_FAILED', 'extraction payload is required.');
  }

  const runId = rawBody['runId'] ?? `run_${Date.now().toString(36)}`;
  const provider = rawBody['modelProvider'] ?? 'VERCEL_AI_GATEWAY';
  const modelName = rawBody['modelName'] ?? 'gemini-1.5-pro';
  const modelVersion = rawBody['modelVersion'] ?? 'v1.0';
  const promptVersion = rawBody['promptVersion'] ?? 'p1.0';

  const structured: StructuredGemstoneData = rawBody['structuredGemstone'] ?? {
    stoneCount: 1,
  };

  const anomalies = runCertificateCrossChecks(extraction, structured);
  const hasErrorAnomaly = anomalies.some((a) => a.severity === 'ERROR');

  let nextStatus: VerificationStatus = 'EXTRACTED';
  const canCrossCheck = canAutomateCrossCheckTransition(extraction, hasErrorAnomaly);
  if (canCrossCheck) {
    nextStatus = 'CROSS_CHECKED';
  }

  await persistExtractions(db, {
    certificateId: certId,
    runId,
    extraction,
    modelProvider: provider,
    modelName,
    modelVersion,
    promptVersion,
  });

  if (anomalies.length > 0) {
    await recordAnomalies(db, certId, runId, anomalies);
  }

  await recordOcrRun(db, {
    certificateId: certId,
    runId,
    provider,
    modelName,
    modelVersion,
    status: 'SUCCEEDED',
    fieldsExtracted: 6,
    meanConfidence: extraction.stone.weight_ct.confidence,
  });

  await updateCertificateStatus(
    db,
    certId,
    nextStatus,
    extraction.stone.weight_ct.confidence,
    extraction.lab_name.value,
    extraction.certificate_number.value,
  );

  await recordVerificationEvent(db, {
    certificateId: certId,
    eventType: nextStatus === 'CROSS_CHECKED' ? 'CROSS_CHECKED' : 'EXTRACTED',
    fromStatus: 'UNVERIFIED',
    toStatus: nextStatus,
    actorType: 'SYSTEM',
    detail: { runId, anomaliesCount: anomalies.length },
  });

  return {
    status: 200,
    body: {
      data: {
        certificateId: certId,
        runId,
        status: nextStatus,
        anomalies,
        requiresHumanReview: nextStatus !== 'CROSS_CHECKED' || anomalies.length > 0,
      },
    },
  };
};

export const reviewCertificateHandler: RouteHandler = async (ctx) => {
  const db = getDb(ctx);
  const certId = requireIdentifier(ctx.params['certificateId'], 'certificateId');
  const rawBody = (await parseBody(ctx.request)) as Record<string, any>;

  const reviewerId = rawBody['reviewerId'];
  const decision = rawBody['decision'] as 'APPROVE' | 'REJECT';
  const notes = rawBody['notes'] ?? null;

  if (!reviewerId) {
    throw new ContractError('VALIDATION_FAILED', 'reviewerId is required.');
  }

  if (decision === 'REJECT') {
    await recordHumanReview(db, {
      certificateId: certId,
      reviewerId,
      decision: 'REJECT',
      notes,
    });
    await updateCertificateStatus(db, certId, 'REJECTED');
    await recordVerificationEvent(db, {
      certificateId: certId,
      eventType: 'REJECTED',
      fromStatus: 'CROSS_CHECKED',
      toStatus: 'REJECTED',
      actorType: 'HUMAN',
      actorId: reviewerId,
      detail: { notes },
    });
    return {
      status: 200,
      body: {
        data: {
          certificateId: certId,
          status: 'REJECTED',
        },
      },
    };
  }

  const extraction = rawBody['extraction'] as CertificateExtractionSchema | undefined;
  if (!extraction) {
    throw new ContractError('VALIDATION_FAILED', 'extraction payload required to verify approval.');
  }

  const canVerify = canPromoteToVerified(extraction, false, true);
  if (!canVerify) {
    throw new ContractError(
      'UNPROCESSABLE',
      'Whole-document verification requires every material field >= 0.90 and human approval.',
    );
  }

  await recordHumanReview(db, {
    certificateId: certId,
    reviewerId,
    decision: 'APPROVE',
    notes,
    fieldsOverridden: rawBody['fieldsOverridden'],
  });

  await updateCertificateStatus(db, certId, 'VERIFIED');
  await recordVerificationEvent(db, {
    certificateId: certId,
    eventType: 'APPROVED',
    fromStatus: 'CROSS_CHECKED',
    toStatus: 'VERIFIED',
    actorType: 'HUMAN',
    actorId: reviewerId,
    detail: { notes, overrides: rawBody['fieldsOverridden'] },
  });

  return {
    status: 200,
    body: {
      data: {
        certificateId: certId,
        status: 'VERIFIED',
        verifiedBy: reviewerId,
      },
    },
  };
};

export const getPublicGemstoneCertificatesHandler: RouteHandler = async (ctx) => {
  const db = getDb(ctx);
  const gemRef = requireIdentifier(ctx.params['gemRef'], 'gemRef');

  const rows = await getPublicCertificatesForGemstone(db, gemRef);
  return {
    status: 200,
    body: {
      data: {
        gemRef,
        certificates: rows,
        notice: 'Read model enforces INV-07: confidence < 0.50 withheld.',
      },
    },
  };
};
