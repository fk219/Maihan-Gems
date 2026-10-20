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
  ADMIN_ROLES,
  runCertificateCrossChecks,
  canAutomateCrossCheckTransition,
  canPromoteToVerified,
  type CertificateExtractionSchema,
  type StructuredGemstoneData,
  type VerificationStatus,
} from '@maihan/domain';
import { extractSessionToken, resolveRequestActor } from './auth-handlers.js';
import { isDevSeamEnabled } from '@maihan/config';
import type { RouteHandler, RouteContext } from './handlers.js';
import { requireIdentifier } from './query.js';

async function assertCertificateReviewer(ctx: RouteContext): Promise<string | undefined> {
  const sessionToken = extractSessionToken(ctx.request);
  const headerCustomerId = ctx.request?.headers.get('x-customer-id');
  if (headerCustomerId && !sessionToken) {
    throw new ContractError('FORBIDDEN', 'Customer accounts cannot run OCR or approve certificates.');
  }
  if (sessionToken) {
    const actor = await resolveRequestActor(ctx);
    if (!actor) {
      throw new ContractError('UNAUTHORIZED', 'Valid session required.');
    }
    if (!(ADMIN_ROLES as readonly string[]).includes(actor.role)) {
      throw new ContractError('FORBIDDEN', 'Administrative role required for certificate review operations.');
    }
    if (actor.role !== 'ADMIN_SUPER' && actor.role !== 'TRUST_REVIEWER' && actor.role !== 'CATALOG_MANAGER') {
      throw new ContractError('FORBIDDEN', 'Role TRUST_REVIEWER or ADMIN_SUPER is required for certificate operations.');
    }
    return actor.customer_id;
  }
  // R1-1 fail-closed: certificate ops need auth unless explicit dev seam.
  if (!isDevSeamEnabled()) {
    throw new ContractError('UNAUTHORIZED', 'Authentication required for certificate operations.');
  }
  return undefined;
}

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

/**
 * Upload validation gates (SG-5, M-08): an allowed content type, an explicit
 * size cap, and — when the document bytes are presented inline — a magic-byte
 * sniff so a renamed executable cannot register as a certificate document.
 */
const CERT_CONTENT_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);
const CERT_MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

function magicByteOk(contentType: string, bytes: Uint8Array): boolean {
  const head = Array.from(bytes.slice(0, 12))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  switch (contentType) {
    case 'application/pdf':
      return head.startsWith('25504446'); // %PDF
    case 'image/jpeg':
      return head.startsWith('ffd8ff');
    case 'image/png':
      return head.startsWith('89504e47');
    case 'image/webp':
      return head.startsWith('52494646') && head.slice(16, 24) === '57454250'; // RIFF....WEBP
    default:
      return false;
  }
}

function validateUploadDeclaration(body: Record<string, unknown>): void {
  const contentType = body['contentType'] as string | undefined;
  const sizeBytes = body['sizeBytes'] as number | undefined;
  const contentBase64 = body['contentBase64'] as string | undefined;

  if (contentType !== undefined && !CERT_CONTENT_TYPES.has(contentType)) {
    throw new ContractError(
      'VALIDATION_FAILED',
      `Unsupported certificate document type: ${contentType}. Allowed: ${[...CERT_CONTENT_TYPES].join(', ')}.`,
    );
  }
  if (sizeBytes !== undefined) {
    if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
      throw new ContractError('VALIDATION_FAILED', 'sizeBytes must be a positive number.');
    }
    if (sizeBytes > CERT_MAX_SIZE_BYTES) {
      throw new ContractError(
        'VALIDATION_FAILED',
        `Certificate document exceeds the ${CERT_MAX_SIZE_BYTES} byte cap.`,
      );
    }
  }
  if (contentBase64 !== undefined) {
    if (typeof contentBase64 !== 'string' || contentBase64.length === 0) {
      throw new ContractError('VALIDATION_FAILED', 'contentBase64 must be a non-empty string.');
    }
    const decoded = Buffer.from(contentBase64, 'base64');
    if (decoded.length === 0) {
      throw new ContractError('VALIDATION_FAILED', 'contentBase64 is not valid base64.');
    }
    if (decoded.length > CERT_MAX_SIZE_BYTES) {
      throw new ContractError(
        'VALIDATION_FAILED',
        `Certificate document exceeds the ${CERT_MAX_SIZE_BYTES} byte cap.`,
      );
    }
    if (contentType !== undefined && !magicByteOk(contentType, decoded)) {
      throw new ContractError(
        'VALIDATION_FAILED',
        'Document bytes do not match the declared content type (magic-byte sniff failed).',
      );
    }
  }
}

export const createCertificateHandler: RouteHandler = async (ctx) => {
  const db = getDb(ctx);
  const rawBody = (await parseBody(ctx.request)) as Record<string, any>;
  validateUploadDeclaration(rawBody);

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

  // INV-07: Non-VERIFIED certificate fields must never render as verified truth to public callers
  const sessionToken = extractSessionToken(ctx.request);
  const actor = sessionToken ? await resolveRequestActor(ctx) : null;
  const isPrivileged = actor && (ADMIN_ROLES as readonly string[]).includes(actor.role);
  const sanitizedCert =
    !isPrivileged && cert.verification_status !== 'VERIFIED'
      ? {
          ...cert,
          lab_name: null,
          certificate_number: null,
          verification_notice: 'On file, pending gemmological verification (INV-07).',
        }
      : cert;

  return {
    status: 200,
    body: {
      data: {
        certificate: sanitizedCert,
      },
    },
  };
};

export const processOcrRunHandler: RouteHandler = async (ctx) => {
  await assertCertificateReviewer(ctx);
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
  const actorReviewerId = await assertCertificateReviewer(ctx);
  const db = getDb(ctx);
  const certId = requireIdentifier(ctx.params['certificateId'], 'certificateId');
  const rawBody = (await parseBody(ctx.request)) as Record<string, any>;

  const reviewerId = rawBody['reviewerId'] ?? actorReviewerId;
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
  if (extraction) {
    const canVerify = canPromoteToVerified(extraction, false, true);
    if (!canVerify) {
      throw new ContractError(
        'UNPROCESSABLE',
        'Whole-document verification requires every material field >= 0.90 and human approval.',
      );
    }
  } else {
    // The admin queue approves a document whose persisted extraction has
    // already been cross-checked. Re-sending the extraction from a browser is
    // not required and was the reason the console button always failed.
    const cert = await getCertificateById(db, certId);
    if (!cert) throw new ContractError('NOT_FOUND', `Certificate ${certId} not found.`);
    const confidence = Number(cert.confidence_overall ?? 0);
    if (cert.verification_status !== 'CROSS_CHECKED' || !Number.isFinite(confidence) || confidence < 0.9) {
      throw new ContractError(
        'UNPROCESSABLE',
        'Certificate must be CROSS_CHECKED with confidence >= 0.90 before human verification.',
      );
    }
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
