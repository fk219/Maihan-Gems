/**
 * apps/web/src/api/admin/certificate-review-handlers.ts
 *
 * Phase 12 — Global Task 10 (Track C7 API surface).
 *
 * Three endpoints over the certificate review repository:
 *
 *   GET  /api/v1/admin/certificates
 *   GET  /api/v1/admin/certificates/{certificateId}
 *   POST /api/v1/admin/certificates/{certificateId}/decide
 *
 * Every handler gates FIRST through the one admin authorization path
 * (ADR-027) and then calls exactly ONE repository function. The gate's module
 * is `certificates` (doc 23 §3): `list` / `read` for the queue and the detail,
 * `approve` for the decision — the same capability covers APPROVE and REJECT,
 * because a refusal is the negative result of the same decision.
 *
 * The threshold lives in `packages/domain/src/certificate`; this file never
 * decides what is verifiable. A domain refusal is returned as a 422 with the
 * DOMAIN message, so the reviewer is told why ("verification requires every
 * material field >= 0.90") rather than shown a generic failure.
 */
import { ContractError } from '@maihan/contracts';
import { DomainError, TwoPersonError } from '@maihan/domain';
import {
  CertificateReviewError,
  decideCertificate,
  getCertificateForReview,
  listAnomaliesForCertificate,
  listPendingCertificates,
  resolveAnomaly,
} from '@maihan/db';
import { z } from 'zod';

import type { HandlerOutcome, RouteContext } from '../handlers.js';
import { authzFailureResponse, type CapabilityRequest } from './authz.js';
import { authorizeAdminRequest, type AdminDeps } from './session-authz.js';

interface Gate {
  readonly actor: import('@maihan/contracts').AdminActor;
}

async function gate(
  ctx: RouteContext,
  request: CapabilityRequest,
  deps: AdminDeps,
): Promise<Gate | { failure: Response }> {
  const decision = await authorizeAdminRequest(ctx, request, deps);
  if (decision.ok) return { actor: decision.actor };
  return { failure: authzFailureResponse(decision.status, ctx.ids) };
}

function requireDb(ctx: RouteContext): import('@maihan/db').CatalogDatabase {
  if (ctx.db === undefined) throw new ContractError('INTERNAL', 'Database seam is not configured.');
  return ctx.db;
}

const uuid = z.string().uuid();

function requireUuid(value: string | undefined, field: string): string {
  if (value === undefined || !uuid.safeParse(value).success) {
    throw new ContractError('VALIDATION_FAILED', `A valid ${field} is required.`);
  }
  return value;
}

function readPagination(url: URL): { limit: number; offset: number } {
  const rawLimit = Number(url.searchParams.get('limit') ?? '50');
  const rawOffset = Number(url.searchParams.get('offset') ?? '0');
  return {
    limit: Number.isFinite(rawLimit) ? rawLimit : 50,
    offset: Number.isFinite(rawOffset) ? rawOffset : 0,
  };
}

async function readOptionalJson(request: Request | undefined): Promise<unknown> {
  if (request === undefined) return {};
  const text = await request.text();
  if (text.trim().length === 0) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

/** The standard envelope shape, returned with a non-2xx status. */
function refusal(
  ctx: RouteContext,
  status: number,
  code: string,
  message: string,
): HandlerOutcome {
  return {
    status,
    body: {
      error: {
        code,
        message,
        requestId: ctx.ids.requestId,
        traceId: ctx.ids.traceId,
      },
    },
  };
}

/**
 * Domain and review refusals.
 *
 *   - below the 0.90 whole-document threshold: 422 with the domain message
 *     (doc 17 error table: CERTIFICATE_LOW_CONFIDENCE is 422);
 *   - an unresolved ERROR anomaly: 422 with doc 17's CERTIFICATE_ANOMALY;
 *   - a terminal or already-decided document: 409 carrying the domain's own
 *     stable code, so the console can distinguish "verified already" from
 *     "rejected already" without parsing prose.
 */
function mapReviewError(ctx: RouteContext, error: unknown): HandlerOutcome {
  // Two-person refusal is a 403 with its own code, never the generic domain
  // conflict mapping (TwoPersonError extends DomainError).
  if (error instanceof TwoPersonError) {
    return refusal(ctx, 403, 'TWO_PERSON_REQUIRED', error.message);
  }

  if (error instanceof CertificateReviewError) {
    switch (error.code) {
      case 'NOT_FOUND':
        return refusal(ctx, 404, 'NOT_FOUND', 'The requested certificate does not exist.');
      case 'NOTE_REQUIRED':
        return refusal(ctx, 400, 'VALIDATION_FAILED', 'A reason is required to reject a certificate.');
      case 'UNRESOLVED_ERROR_ANOMALY':
        return refusal(
          ctx,
          422,
          'CERTIFICATE_ANOMALY',
          'An unresolved ERROR anomaly blocks verification; resolve the anomaly first.',
        );
      case 'ALREADY_DECIDED':
        return refusal(
          ctx,
          409,
          'ALREADY_DECIDED',
          'This certificate was decided concurrently; reload the queue before deciding again.',
        );
      case 'ANOMALY_NOT_FOUND':
        return refusal(ctx, 404, 'NOT_FOUND', 'The requested anomaly does not exist.');
      case 'ANOMALY_ALREADY_RESOLVED':
        return refusal(
          ctx,
          409,
          'ANOMALY_ALREADY_RESOLVED',
          'This anomaly was already resolved; reload the certificate before resolving again.',
        );
      case 'RESOLUTION_REQUIRED':
        return refusal(ctx, 400, 'VALIDATION_FAILED', 'A resolution is required to resolve an anomaly.');
    }
  }

  if (error instanceof DomainError) {
    switch (error.code) {
      case 'INSUFFICIENT_CONFIDENCE_FOR_VERIFICATION':
        return refusal(ctx, 422, 'UNPROCESSABLE', error.message);
      case 'HUMAN_REVIEW_REQUIRED':
        return refusal(ctx, 422, 'UNPROCESSABLE', error.message);
      default:
        // CERTIFICATE_TERMINAL_STATE, CERTIFICATE_ALREADY_VERIFIED and
        // ILLEGAL_CERTIFICATE_TRANSITION are state conflicts.
        return refusal(ctx, 409, error.code, error.message);
    }
  }

  throw error;
}

// ─── Queue ─────────────────────────────────────────────────────────────────

export async function adminListPendingCertificatesHandler(
  ctx: RouteContext,
  deps: AdminDeps = {},
): Promise<HandlerOutcome> {
  const g = await gate(ctx, { module: 'certificates', action: 'list' }, deps);
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };

  const db = requireDb(ctx);
  const { limit, offset } = readPagination(ctx.url);
  const page = await listPendingCertificates(db, { limit, offset });
  return {
    status: 200,
    body: { data: page.items, meta: { total: page.total, limit: page.limit, offset: page.offset } },
  };
}

// ─── Detail ────────────────────────────────────────────────────────────────

export async function adminGetCertificateForReviewHandler(
  ctx: RouteContext,
  deps: AdminDeps = {},
): Promise<HandlerOutcome> {
  const g = await gate(ctx, { module: 'certificates', action: 'read' }, deps);
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };

  const db = requireDb(ctx);
  const certificateId = requireUuid(ctx.params['certificateId'], 'certificate id');
  const detail = await getCertificateForReview(db, certificateId);
  if (detail === null) {
    return refusal(ctx, 404, 'NOT_FOUND', 'The requested certificate does not exist.');
  }
  return { status: 200, body: { data: detail } };
}

// ─── Anomaly triage ────────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/certificates/{certificateId}/anomalies
 *
 * Open AND resolved anomalies, oldest first. The `anomalies` module is the
 * gate (doc 23 §3): TRUST_REVIEWER resolves, AI_OPERATIONS may only read.
 */
export async function adminListCertificateAnomaliesHandler(
  ctx: RouteContext,
  deps: AdminDeps = {},
): Promise<HandlerOutcome> {
  const g = await gate(ctx, { module: 'anomalies', action: 'read' }, deps);
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };

  const db = requireDb(ctx);
  const certificateId = requireUuid(ctx.params['certificateId'], 'certificate id');
  const list = await listAnomaliesForCertificate(db, certificateId);
  if (list === null) {
    return refusal(ctx, 404, 'NOT_FOUND', 'The requested certificate does not exist.');
  }
  return {
    status: 200,
    body: {
      data: list.items,
      meta: {
        certificateId: list.certificateId,
        open: list.open,
        resolved: list.resolved,
        total: list.items.length,
      },
    },
  };
}

const ResolveAnomalyBody = z.object({
  resolution: z.string().trim().min(1).max(200),
  note: z.string().trim().max(2000).optional(),
});

/**
 * POST /api/v1/admin/certificates/anomalies/{anomalyId}/resolve
 *
 * One resolution per anomaly, recorded with the actor and an audit row. The
 * anomaly is never deleted: the resolution is a record, not an erasure.
 */
export async function adminResolveCertificateAnomalyHandler(
  ctx: RouteContext,
  deps: AdminDeps = {},
): Promise<HandlerOutcome> {
  const g = await gate(ctx, { module: 'anomalies', action: 'resolve' }, deps);
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };

  const db = requireDb(ctx);
  const anomalyId = requireUuid(ctx.params['anomalyId'], 'anomaly id');
  const parsed = ResolveAnomalyBody.safeParse(await readOptionalJson(ctx.request));
  if (!parsed.success) {
    return refusal(ctx, 400, 'VALIDATION_FAILED', 'A resolution is required to resolve an anomaly.');
  }

  try {
    const result = await resolveAnomaly(db, {
      anomalyId,
      actorId: g.actor.sub,
      resolution: parsed.data.resolution,
      ...(parsed.data.note === undefined ? {} : { note: parsed.data.note }),
      requestId: ctx.ids.requestId,
    });
    return { status: 200, body: { data: result } };
  } catch (error) {
    return mapReviewError(ctx, error);
  }
}

// ─── Decision ──────────────────────────────────────────────────────────────

const DecideBody = z.object({
  decision: z.enum(['APPROVE', 'REJECT']),
  note: z.string().trim().max(2000).optional(),
});

export async function adminDecideCertificateHandler(
  ctx: RouteContext,
  deps: AdminDeps = {},
): Promise<HandlerOutcome> {
  const g = await gate(ctx, { module: 'certificates', action: 'approve' }, deps);
  if ('failure' in g) return { status: g.failure.status, body: await g.failure.json() };

  const db = requireDb(ctx);
  const certificateId = requireUuid(ctx.params['certificateId'], 'certificate id');
  const parsed = DecideBody.safeParse(await readOptionalJson(ctx.request));
  if (!parsed.success) {
    throw new ContractError('VALIDATION_FAILED', 'A decision of APPROVE or REJECT is required.');
  }

  try {
    const result = await decideCertificate(db, {
      certificateId,
      decision: parsed.data.decision,
      actorId: g.actor.sub,
      ...(parsed.data.note === undefined ? {} : { note: parsed.data.note }),
      requestId: ctx.ids.requestId,
    });
    return { status: 200, body: { data: result } };
  } catch (error) {
    return mapReviewError(ctx, error);
  }
}
