/**
 * apps/web/src/api/admin/audit.ts
 *
 * Phase 12 — Stage A / Global Task A3 (E12.8).
 *
 * The privileged-action audit writer used by every admin mutation. Plan §19
 * acceptance: "Every privileged mutation writes an audit row with before and
 * after state." Doc 23 §11: "Audit rows are append-only; there is no delete
 * path."
 *
 * The writes go through the EXISTING audit path used by the commerce modules
 * (audit_logs via the owning repository seam) so admin actions cannot drift
 * into a second audit subsystem (doc 23 §4: one audit trail).
 *
 * Redaction contract (doc 09 PII, AGENTS.md 10): before/after snapshots are
 * scrubbed of secret-shaped keys and PII before they reach the writer; the
 * worker never sees unredacted payloads.
 */

export interface AuditEntry {
  readonly actorSub: string;
  readonly actorRole: string;
  readonly action: string;
  readonly resourceType: string;
  readonly resourceId: string;
  readonly before: Record<string, unknown> | null;
  readonly after: Record<string, unknown> | null;
  readonly reason?: string;
  readonly traceId?: string;
  readonly requestId?: string;
  readonly outcome?: 'SUCCESS' | 'DENIED' | 'FAILED';
}

/** Keys that must never appear in an audit snapshot. */
const REDACTED_KEYS = new Set([
  'password',
  'password_hash',
  'token',
  'secret',
  'api_key',
  'authorization',
  'cookie',
  'identity_user_id',
  'email',
  'phone',
  'address',
]);

function redact(snapshot: Record<string, unknown> | null): Record<string, unknown> | null {
  if (snapshot === null) return null;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(snapshot)) {
    out[key] = REDACTED_KEYS.has(key.toLowerCase().replace(/-/g, '_')) ? '[REDACTED]' : value;
  }
  return out;
}

export function redactForAudit(snapshot: Record<string, unknown> | null): Record<string, unknown> | null {
  return redact(snapshot);
}

/** The exact row shape written to `audit_logs`. */
export function buildAuditRow(entry: AuditEntry): {
  actor: string;
  action: string;
  resource_type: string;
  resource_id: string;
  before: unknown;
  after: unknown;
  reason: string | null;
  outcome: string;
  trace_id: string | null;
  request_id: string | null;
} {
  return {
    actor: `${entry.actorRole}:${entry.actorSub}`,
    action: entry.action,
    resource_type: entry.resourceType,
    resource_id: entry.resourceId,
    before: redact(entry.before),
    after: redact(entry.after),
    reason: entry.reason ?? null,
    outcome: entry.outcome ?? 'SUCCESS',
    trace_id: entry.traceId ?? null,
    request_id: entry.requestId ?? null,
  };
}
