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
import { DomainError } from '@maihan/domain';
import {
  CertificateReviewError,
  decideCertificate,
  getCertificateForReview,
  listPendingCertificates,
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
