/**
 * apps/web/src/api/envelope.ts
 *
 * Task 8 — the ONE response serialiser for the catalogue API.
 *
 * SoT 10.4 / doc 07 §4: a single error envelope, a closed code registry,
 * machine-readable `details`, and request/trace correlation on every error.
 * Doc 06 conventions: `X-Trace-Id` is echoed on EVERY response.
 *
 * Mapping rules:
 *   - ZodError            -> 400 VALIDATION_FAILED, details = the issues
 *     (path + code + message), never a stringified blob.
 *   - ContractError       -> its registry code and status (contracts/errors.ts).
 *   - anything else       -> 500 INTERNAL with a fixed, non-leaking message.
 *     Raw SQL, driver text and stack traces never reach a client (doc 06).
 *
 * Correlation ids are injectable so tests are deterministic; the defaults
 * are random per request (32-hex trace, `req_` + ULID-shaped request id —
 * the shape shown in the SoT 10.4 example).
 */
import { z } from 'zod';
import {
  ContractError,
  isContractError,
  type ContractErrorCode,
} from '@maihan/contracts';

export interface CorrelationIds {
  traceId: string;
  requestId: string;
}

export const TRACE_HEADER = 'X-Trace-Id';

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function randomHex(chars: number): string {
  const bytes = new Uint8Array(Math.ceil(chars / 2));
  globalThis.crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, chars);
}

/** W3C-shaped trace id: 32 lowercase hex characters. */
export function newTraceId(): string {
  return randomHex(32);
}

/** `req_` + 26 Crockford base32 characters (ULID-shaped, time-sortable). */
export function newRequestId(): string {
  const time = Date.now();
  let timePart = '';
  let t = time;
  for (let i = 0; i < 10; i += 1) {
    timePart = CROCKFORD[t % 32] + timePart;
    t = Math.floor(t / 32);
  }
  let randomPart = '';
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  for (const byte of bytes) randomPart += CROCKFORD[byte % 32];
  return `req_${timePart}${randomPart}`;
}

export function jsonResponse(body: unknown, status: number, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...headers,
    },
  });
}

interface MappedError {
  status: number;
  code: ContractErrorCode;
  message: string;
  details?: Array<Record<string, unknown>>;
}

function zodIssues(error: z.ZodError): Array<Record<string, unknown>> {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    code: issue.code,
    message: issue.message,
  }));
}

export function mapError(error: unknown): MappedError {
  if (error instanceof z.ZodError) {
    return {
      status: 400,
      code: 'VALIDATION_FAILED',
      message: 'Request validation failed.',
      details: zodIssues(error),
    };
  }
  if (isContractError(error)) {
    const contract = error as ContractError;
    return {
      status: contract.httpStatus,
      code: contract.code,
      message: contract.message.replace(/^\[[A-Z_]+\]\s*/, ''),
      details: contract.details === null || contract.details === undefined
        ? undefined
        : contract.details.map((detail) => ({ ...detail })),
    };
  }
  // Never leak internals: no SQL, no driver text, no stack (doc 06).
  return {
    status: 500,
    code: 'INTERNAL',
    message: 'Internal error.',
  };
}

/** Build the documented error envelope + response. */
export function errorResponse(
  error: unknown,
  ids: CorrelationIds,
  extraHeaders: Record<string, string> = {},
): Response {
  const mapped = mapError(error);
  const envelope = {
    error: {
      code: mapped.code,
      message: mapped.message,
      ...(mapped.details === undefined ? {} : { details: mapped.details }),
      requestId: ids.requestId,
      traceId: ids.traceId,
    },
  };
  return jsonResponse(envelope, mapped.status, { [TRACE_HEADER]: ids.traceId, ...extraHeaders });
}

export function successResponse(
  body: unknown,
  status: number,
  ids: CorrelationIds,
  headers: Record<string, string> = {},
): Response {
  if (body instanceof ReadableStream) {
    return new Response(body as any, {
      status,
      headers: {
        'content-type': 'text/event-stream; charset=utf-8',
        'cache-control': 'no-cache, no-transform',
        'connection': 'keep-alive',
        [TRACE_HEADER]: ids.traceId,
        ...headers,
      },
    });
  }
  return jsonResponse(body, status, { [TRACE_HEADER]: ids.traceId, ...headers });
}
