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
import { sql } from '@maihan/db';
import {
  ADMIN_ROLES,
  hasCapability,
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

async function assertCertificateReviewer(
  ctx: RouteContext,
  options: { readonly requireSession?: boolean } = {},
): Promise<string | undefined> {
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
    // P1-22: capability-based decision from the RBAC matrix instead of a
    // hand-maintained role list, so the matrix is the single source.
    if (
      !hasCapability(actor.role as never, 'certificates', 'approve') &&
      !hasCapability(actor.role as never, 'certificates', 'read')
    ) {
      throw new ContractError('FORBIDDEN', 'Trust-review capability required for certificate operations.');
    }
    return actor.customer_id;
  }
  // P1-18: when a session is REQUIRED (OCR — the two-person chain needs a
  // first party), an anonymous caller is refused even under the developer
  // seam. For review endpoints, seam credentials are tolerated as sandbox.
  if (options.requireSession) {
    throw new ContractError('UNAUTHORIZED', 'Sign in as a trust reviewer to run certificate OCR.');
  }
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
          // P1-18 honesty: no private storage integration exists yet (P2-4);
          // this URL is a labelled placeholder, not a working presign.
          upload_url: `mock://storage.maihan.internal/certificates/${cert.id}/presigned-put`,
          upload_mode: 'MOCK_PLACEHOLDER_UNTIL_STORAGE_ADR',
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
  // P1-18: the OCR actor is recorded whenever a signed-in actor is present
  // so a two-person chain (OCR by A → review by B) is provable. The
  // `requireSession` hard-stop arrives with the P2-4 pipeline work.
  const actorOcrId = await assertCertificateReviewer(ctx);
  const db = getDb(ctx);
  const certId = requireIdentifier(ctx.params['certificateId'], 'certificateId');
  const rawBody = (await parseBody(ctx.request)) as Record<string, any>;

  const extraction = rawBody['extraction'] as CertificateExtractionSchema | undefined;
  if (!extraction) {
    throw new ContractError('VALIDATION_FAILED', 'extraction payload is required.');
  }

  const runId = rawBody['runId'] ?? `run_${Date.now().toString(36)}`;
  // P1-18 honesty: the extraction input is caller-supplied data entry until
  // the real vision pipeline (P2-4) — the model labels are recorded as
  // DECLARATIONS, never as a provider execution certificate.
  const provider = rawBody['modelProvider'] ?? 'DECLARED_BY_CALLER';
  const modelName = rawBody['modelName'] ?? 'declared_extraction_v0';
  const modelVersion = rawBody['modelVersion'] ?? 'declared';
  const promptVersion = rawBody['promptVersion'] ?? 'declared';

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

  // Derived field count + true mean confidence (was hardcoded 6).
  const fieldNames = Object.keys(extraction).filter((k) => k !== 'stone');
  for (const subKey of Object.keys(extraction['stone'] ?? {})) fieldNames.push(`stone.${subKey}`);
  const confidences = fieldNames
    .map((f) => {
      const parts = f.split('.');
      let cur: any = extraction;
      for (const part of parts) cur = cur?.[part];
      return typeof cur?.confidence === 'number' ? cur.confidence : null;
    })
    .filter((c): c is number => c !== null);
  const meanConfidence = confidences.length > 0
    ? confidences.reduce((a, b) => a + b, 0) / confidences.length
    : extraction.stone.weight_ct.confidence;

  await recordOcrRun(db, {
    certificateId: certId,
    runId,
    provider,
    modelName,
    modelVersion,
    status: 'CALLER_SUPPLIED',
    fieldsExtracted: fieldNames.length,
    meanConfidence,
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
    actorType: actorOcrId ? 'HUMAN' : 'SYSTEM',
    actorId: actorOcrId,
    detail: { runId, anomaliesCount: anomalies.length, submitted_by: actorOcrId ?? null },
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

  // P1-18: the reviewer IS the signed-in session actor when one exists. A
  // signed-in actor cannot impersonate a different reviewer via the body.
  // Under the developer seam (no session) the sandbox reviewer id from the
  // body is tolerated verbatim and flagged as sandbox in the ledger.
  const sessionPresent = Boolean(extractSessionToken(ctx.request));
  const reviewerId = actorReviewerId
    ?? (!sessionPresent && isDevSeamEnabled() ? String(rawBody['reviewerId'] ?? '') || undefined : undefined);
  const sandboxReviewer = !sessionPresent && !actorReviewerId;
  const rawDecision = rawBody['decision'];
  if (rawDecision !== 'APPROVE' && rawDecision !== 'REJECT') {
    throw new ContractError(
      'VALIDATION_FAILED',
      `decision must be "APPROVE" or "REJECT" (received ${typeof rawDecision}).`,
    );
  }
  const decision: 'APPROVE' | 'REJECT' = rawDecision;
  const notes = rawBody['notes'] ?? null;

  if (!reviewerId) {
    throw new ContractError('VALIDATION_FAILED', 'A signed-in reviewer is required to record a review.');
  }

  // P1-18 two-person rule: whoever submitted the latest OCR pass must not be
  // the same principal that approves. Only the *session-provisioned*
  // identities feed the comparison; seam/sandbox ids cannot collide.
  if (actorReviewerId && !sandboxReviewer) {
    const lastEvents = await db.execute(sql`
      SELECT detail::text AS detail, event_type::text AS event_type FROM verification_events
      WHERE certificate_id = ${certId}::uuid
        AND event_type IN ('EXTRACTED'::document_kind, 'CROSS_CHECKED'::document_kind)
      ORDER BY created_at DESC LIMIT 1
    `);
    if (lastEvents.rows.length > 0) {
      let submittedBy: string | undefined;
      try {
        const detail = JSON.parse((lastEvents.rows[0] as { detail: string }).detail ?? '{}') as
          Record<string, unknown>;
        submittedBy = typeof detail['submitted_by'] === 'string' ? detail['submitted_by'] : undefined;
      } catch {
        submittedBy = undefined;
      }
      if (submittedBy && submittedBy === actorReviewerId) {
        throw new ContractError(
          'FORBIDDEN',
          'Two-person rule: the operator who submitted the extraction may not approve the same certificate.',
        );
      }
    }
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
