# 23 ADMIN CONSOLE AND RBAC ARCHITECTURE

**Package:** `technical_design/` doc 23 of 40
**Authority:** `PROJECT_SOURCE_OF_TRUTH.md` section 23.
**Evidence status:** entirely `[INFERRED / PROPOSED]`.

---

## Purpose

Define the admin surface, its modules, the role model, enforcement layers, AI assist rules, and bulk-operation safety.

## 1. Evidence position

`[OBSERVED][DEFECT]` `/admin` does **not** appear anywhere in the 44,218-URL inventory, and `19_AI_IMPLEMENTATION_CHECKLIST.md` instructs us to assume no admin backend existed.

**No source admin screen is claimed here.** This document is a proposal, and the absence of evidence is itself the design input: an admin console is a required *new* capability, and it is where the 221 derived references, the inferred prices and the 911 untyped stones must be resolved before anything reaches the storefront.

## 2. Modules

| Module | Key screens |
|---|---|
| Dashboard | sales, conversion, DYO funnel, AI metrics, job health, review queues |
| Products | list, edit, publish, bulk edit, price, SEO, media |
| Gemstones | 19,665 stones and 3,072 pairs: attributes, documents, availability, provenance |
| Settings | 951 designs, 10,349 variants: compatibility rules, pricing, media |
| DYO | configuration lookup by hash or SKU, rule editor, price rule version |
| Taxonomy | varieties, colours, origins, shapes, clarities, treatments, metals |
| Inventory | availability, reservations, bulk adjust with audit |
| Orders | list, detail, timeline, refunds, fulfilment, document issuance |
| Customers | list, detail, addresses, conversations, consent state |
| Certificates | review queue, anomalies, verification ledger |
| Content | pages, blocks, revisions, navigation, redirects, SEO |
| Media | asset library, processing failures, orphans, usage |
| AI | conversations, tool-call audit, guardrail events, evaluation runs, prompt versions |
| Migration | import batches, staging conflicts, derived-reference approvals |
| Operations | jobs, dead letters, domain events, webhooks, feature flags, audit log |

The volume asymmetry drives the UI: 19,665 stones, 10,349 variants, 9,812 DYO configurations and 44,218 URLs mean every editing screen is a **filterable, virtualised, server-paginated list** with bulk actions. A paginated table is not viable at this scale.

## 3. Authorization

RBAC with resource-level scoping. `[INFERRED / PROPOSED]`; the source is `[UNKNOWN]`.

| Role | Scope |
|---|---|
| `ADMIN_SUPER` | everything |
| `CATALOG_MANAGER` | products, gemstones, settings, taxonomy, media |
| `CONTENT_EDITOR` | content, navigation, SEO |
| `CONTENT_PUBLISHER` | content plus approval |
| `COMMERCE_OPERATOR` | orders, refunds, fulfilment, inventory |
| `TRUST_REVIEWER` | certificates, anomalies |
| `CONCIERGE_AGENT` | assigned conversations, customer read |
| `AI_OPERATIONS` | conversations, tool calls, evaluations, guardrails |
| `MIGRATION_ENGINEER` | import batches, conflicts, derived approvals |
| `READ_ONLY_ANALYST` | dashboards only, no PII |

`READ_ONLY_ANALYST` being PII-free by role rather than by UI hiding is deliberate. A dashboard that merely hides a column is one query away from exposing a customer's address.

## 4. Enforcement

| Layer | Mechanism |
|---|---|
| Policy | `policies/` per application service, written once and shared by API and admin |
| Database | RLS via a `BYPASSRLS` role that only the trusted server role holds |
| Application | Admin API handlers call the same services as customer-facing routes |
| Audit | Every privileged action written to `audit_logs` with before and after state |

The critical property: **the admin console has no privileged data path of its own.** It calls the same application services as the storefront. If a policy allows an admin action, it is a real policy, inspectable and testable, not an admin-only bypass.

## 5. AI assist in admin

Draft copy, facet suggestions, and DYO compatibility rule drafting, all human-reviewed.

| Rule | Detail |
|---|---|
| Provenance | Every proposal recorded with `provenance_kind='AI_SUGGESTED'` |
| State | `review_state='PENDING'` |
| Publication | An AI suggestion can **never** be published directly |
| Audit | The approving human is recorded separately from the proposing model |

`[OBSERVED]` `entities/gemstones/all_gemstones.json` is 11 KB of all-null objects. That file is the concrete argument against unattended AI extraction writing production rows: the platform already contains a cautionary example of an automated extraction that produced structurally valid, completely empty data.

## 6. Bulk operations

| Rule | Detail |
|---|---|
| Preview | Every bulk edit previews the change set before applying |
| Approval | Records who approved it |
| Audit | One `audit_logs` row per affected entity |
| Reversibility | Bounded window via `page_revisions`-style snapshots |
| Destructive | Requires typed confirmation |

At this scale bulk operations are the normal case, not an exception: 911 stones need a stone type, and `price_entries` derived from 1,024 observations need review. Both are bulk operations, so the safety machinery is on the critical path for the initial data load, not an edge case.

## 7. Concurrency and conflict handling

| Concern | Approach |
|---|---|
| Concurrent edit | `version` column; 409 on mismatch with a diff view |
| Bulk vs single edit | Bulk snapshot captures the pre-state; single edits during a bulk are detected and reported |
| Long bulk operations | Job-backed with progress, cancellable, resumable |
| Preview staleness | A preview carries a token bound to the source version; a changed source invalidates it |

A stale preview applying to changed data is how bulk edits cause silent data loss, so the preview token is bound to the source version rather than trusted as a snapshot in time.

## 8. Validation rules

1. Every admin mutation goes through an application service with a policy check.
2. Roles are assigned server-side; the client never asserts a role.
3. Bulk operations above a threshold require a second approver, matching the inventory rule in doc 15.
4. Every privileged action writes `audit_logs` with before and after state.
5. `AI_SUGGESTED` rows cannot reach PUBLISHED without a named human approver.
6. Destructive operations require typed confirmation matching the target identifier.
7. `READ_ONLY_ANALYST` responses never include PII, enforced server-side.

## 9. API

Admin routes live under `/api/v1/admin/*` and mirror the module structure. Every route declares its required role in OpenAPI, and the generated client derives the UI's visible actions from that declaration, so the UI cannot offer an action the policy would deny.

| Pattern | Purpose |
|---|---|
| `GET /admin/{resource}` | server-paginated, filterable, sort-whitelisted |
| `GET /admin/{resource}/{id}/history` | audit trail for one entity |
| `POST /admin/{resource}/bulk/preview` | returns a preview token and diff |
| `POST /admin/{resource}/bulk/apply` | applies with the preview token |
| `POST /admin/{resource}/bulk/revert` | within the bounded window |

## 10. Error handling

| Code | Status | Meaning |
|---|---|---|
| `FORBIDDEN` | 403 | Role lacks the capability |
| `VERSION_CONFLICT` | 409 | Concurrent edit; diff returned |
| `PREVIEW_STALE` | 409 | Source changed since preview |
| `DUAL_APPROVAL_REQUIRED` | 409 | Bulk operation above the threshold |
| `AI_SUGGESTION_NOT_PUBLISHABLE` | 409 | Attempt to publish an unreviewed proposal |
| `CONFIRMATION_MISMATCH` | 400 | Typed confirmation did not match |
| `BULK_JOB_FAILED` | 202 with job id | Job-backed bulk failed; partial state reported per row |

## 11. Security boundaries

- No admin-only database role for application code; one `BYPASSRLS` role, server-side only.
- Session cookies are `HttpOnly`, `Secure`, `SameSite=Strict`, with step-up auth for destructive actions.
- Admin access is IP-allowlisted where the network permits, and always MFA.
- Audit rows are append-only; there is no delete path for `audit_logs`.
- Analyst exports are PII-scrubbed server-side, not in the browser.
- Bulk applies are rate-limited and capped per request to bound blast radius.

## 12. Observability

Metrics: admin actions by role and module, authorization denials, bulk operation volume and failure rate, preview staleness rate, review queue depth per queue, time-to-approve for certificates and derived references. Alerts on a spike in denials (misconfiguration or credential compromise), on bulk failures, and on review queues not draining.

## 13. Testing requirements

| Test | Proves |
|---|---|---|
| Policy matrix | Every role against every module matches the scope table |
| Shared path | Admin and storefront calls hit the same service and the same policy |
| RLS | Direct DB access as the application role cannot read across tenants or read `audit_logs` deletes |
| Analyst PII | No PII field appears in any analyst payload |
| AI suggestion gate | An `AI_SUGGESTED` row cannot publish without a human approver |
| Bulk preview staleness | A source change invalidates the preview |
| Audit completeness | Every privileged action writes before and after state |
| Conflict | Concurrent edit yields 409 and a usable diff |
| Typed confirmation | A destructive action cannot execute without exact confirmation |
| Scale | List endpoints paginate and filter at 19,665 rows without full-table reads |

## 14. Failure modes

| Failure | Behaviour |
|---|---|
| Role misconfiguration | Denials alert; `ADMIN_SUPER` reviewed on a schedule |
| Bulk partially fails | Per-row outcome reported; revert within the window |
| Concurrent curator edits | 409 with diff; no silent overwrite |
| Review backlog | Alert with queue age; publication gates visible on the dashboard |
| AI assist unavailable | Manual editing unaffected; assist is additive only |
| Audit write failure | The privileged action fails closed; it does not proceed unaudited |

## 15. Implementation constraints

1. The admin console uses the same application services as the storefront; no privileged data path of its own.
2. Every privileged action is audited with before and after state; audit failure fails closed.
3. `AI_SUGGESTED` content never publishes without a named human approver.
4. Bulk operations preview, approve, audit and are revertible.
5. `READ_ONLY_ANALYST` never receives PII.

## Evidence status

Entirely `[INFERRED / PROPOSED]`. `[OBSERVED]` only the negative finding that `/admin` is absent from the 44,218-URL inventory and the instruction to assume no admin backend, plus the all-null `all_gemstones.json` artefact used as the argument in section 5. No admin screen, role or workflow is claimed as observed.