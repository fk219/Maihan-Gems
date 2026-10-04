# 09 AUTH AND SECURITY

**Package:** `technical_design/` doc 09 of 40
**Authority:** `PROJECT_SOURCE_OF_TRUTH.md` sections 15.2, 16.5, 24.2, 28 (security architecture), 8.16 (RLS).
**Evidence status:** `[INFERRED / PROPOSED]`. The source's authentication mechanism, provider, customer model and admin are explicitly `[UNKNOWN]`.

---

## Purpose

Define the complete security control set: identity, authorization, RLS, secrets, PII, injection classes, uploads, webhooks, AI-specific threats, audit, and payment boundaries.

## Principles

1. **Every control exists outside the LLM.** No security property depends on model behaviour.
2. **Identity, customer record and authorization are three separate things.** Merging them is a defect.
3. **Least privilege by default**, verified by the role matrix.
4. **Fail closed** on money, trust and authorization; **fail open** only on cache.
5. **Least data.** Collect nothing not required; log nothing sensitive.

## Authentication

`[INFERRED / PROPOSED]` A managed identity provider. The Source of Truth requires a managed provider and does not name one; selection is an implementation decision recorded against doc 02.

```text
provider session  ->  customers.identity_user_id  ->  authorization decisions
```

- No local password table. No password hashing code. No credential storage.
- Session cookie: HttpOnly, Secure, SameSite=Lax, short max-age with rotation on refresh.
- Session state is never stored only in Redis; a Redis flush forces re-authentication, not silent trust.
- `app.user_subject` (RLS) and `app.staff` (admin bypass) are set by the application service **after** authorization, never from client input.
- `customers.email` is `CITEXT`; verification timestamp recorded separately from the address.

**Guest browsing and guest carts** are supported without an account. A guest cart is identified by a server-held `app.anonymous_session_id`, not by anything the client asserts beyond its cookie.

## Authorization

Three layers, in order. All three must pass.

| Layer | Mechanism | Failure mode it catches |
|---|---|---|
| 1. Policy | `application/policies/` pure functions `(actor, resource, action) -> Decision` | Logic bugs |
| 2. RLS | 6 tables, 6 policies (doc 04) | A missed policy in layer 1 |
| 3. Owning module | Cross-module calls go through the owner's service | A policy in the wrong module |

Roles (doc 23): `ADMIN_SUPER`, `CATALOG_MANAGER`, `CONTENT_EDITOR`, `CONTENT_PUBLISHER`, `COMMERCE_OPERATOR`, `TRUST_REVIEWER`, `CONCIERGE_AGENT`, `AI_OPERATIONS`, `MIGRATION_ENGINEER`, `READ_ONLY_ANALYST`.

Rules:
- A policy denial returns 403 with an internal reason only. Rule text is never returned, so the rule set is not enumerable from outside.
- `BYPASSRLS` exists on exactly one role, used by admin paths, and every bypass is written to `audit_logs`.
- The application role holds no `UPDATE` or `DELETE` grant on `audit_logs`, `domain_events`, `verification_events`, `order_events` or `messages`.

## Row-Level Security

Six tables, six policies (validated in Phase 0). Enablement without a policy denies all rows, which is why a CI test asserts the pairing.

| Table | Scope |
|---|---|
| `customers` | `identity_user_id` |
| `addresses` | via owned customer |
| `carts` | owned customer **or** matching anonymous session |
| `orders` | via owned customer |
| `conversations` | owned **or** staff |
| `messages` | via owned conversation |

Neon connects over the network, so RLS is **defence in depth, not the primary boundary**. The primary boundary is the application service.

## Secrets

| Control | Rule |
|---|---|
| Storage | Platform secret manager only |
| Prohibited | Secrets in code, in the database, in `feature_flags`, in logs, in error messages |
| Access | Per-service least privilege; rotation without redeploy |
| Webhook secrets | Per provider, per environment |
| CI | Secret scan blocks merge |
| Leaked secret | Treat as compromised; rotate first, investigate second |

## PII

| Class | Examples | Rule |
|---|---|---|
| Direct | name, email, phone, address | Never in logs, metrics, analytics, embeddings |
| Indirect | order contents, birth date, zodiac data | Same |
| Ephemeral | session id, trace id | Allowed, hashed where an identifier is not needed |
| Card data | PAN, CVV | **Never reaches our servers**; provider-hosted fields only |

Redaction happens before any log, any model call and any analytics event. `messages.content_redacted` is the only AI content retained beyond the conversation.

Rights: export and erasure cascade across `messages`, `tool_calls`, `conversations`, `assets` and `customer_profiles`; `ai_interactions` retains de-identified aggregates only.

## Injection classes

| Class | Control |
|---|---|
| SQL | Parameterised queries or the query builder exclusively. No string concatenation. Identifiers from a whitelist |
| Command | No shell invocation in request handling |
| Template | No server-side evaluation of user input |
| SSRF | Outbound fetch host allow-list; private and metadata IP ranges blocked; no user-supplied URL in a fetch path |
| XSS | React escaping; no `dangerouslySetInnerHTML` with unsanitised input; CMS rich text sanitised against an explicit tag and attribute allow-list |
| CSRF | SameSite cookies plus a double-submit token on state-changing requests |
| Clickjacking | CSP `frame-ancestors 'none'` |
| CSP | Strict `default-src`, per-route nonce, **no `unsafe-eval` in production** |
| Open redirect | Redirect targets resolved against the `redirects` table; no user-supplied absolute URLs |

## File uploads

```text
presign -> client PUT direct to a private R2 prefix
       -> content sniffing (not extension)
       -> size cap, dimension cap, animated-image rejection
       -> virus scan
       -> EXIF stripped
       -> storage key generated server-side, never derived from user input
```

The application never proxies customer bytes. Certificates, reports and appraisals live in a **private** bucket; access requires an authorization check followed by a short-lived signed URL. Catalogue imagery may be public via CDN.

## Webhooks

Fixed order, no exceptions:

```text
1 read raw body
2 verify signature (constant-time compare) over the raw body
3 check timestamp tolerance (<= 5 minutes) to block replay
4 reject with 401 before parsing anything
5 persist to webhook_receipts keyed by (provider, external_event_id)
6 respond 2xx immediately
7 process asynchronously
```

Never follow a URL supplied in a payload. Never trust a payload amount; re-derive from `order_items`.

## AI-specific security

| Threat | Control | Layer |
|---|---|---|
| Prompt injection via product copy | Retrieved text is delimited, labelled untrusted, never placed in the system prompt | Code |
| Prompt injection via certificate OCR | OCR output is typed data, never instructions | Code |
| Tool abuse | Fixed registry; per-intent allow-lists; `authorization()` before `execute()` | Code |
| Tool replay | Per-turn nonce binds tool results to their turn | Code |
| Data exfiltration | Tools return only schema-declared fields; no bulk export tool exists | Code |
| Unauthorized mutation | No mutating tool for price, inventory, orders, payments, certificates, permissions | Structural (ADR-003) |
| Output injection into the DOM | Output schema-validated and rendered as text | Code |
| Cost abuse | Per-surface budgets, concurrency semaphores, `max_tokens` caps, abort propagation | Code |
| PII in prompts | Redaction before send | Code |
| Certificate leakage | Unverified fields withheld by `certificate_public` | Database view |
| Hallucinated gemological fact | Grounding gate strips unverifiable claims | Code |
| Refusal failure | Refusal rules per null field, evaluation-gated | Code + eval |

Four independent layers guard mutation, per `PROJECT_SOURCE_OF_TRUTH.md` 16.7. The prompt is the fourth and weakest; it is never the sole control.

## Audit logging

Every privileged mutation writes `audit_logs` with actor type and id, action, entity type and id, before state, after state, reason, `trace_id`, hashed IP and user agent. Append-only; no update or delete grant. PII is hashed. Retention is policy-driven, not indefinite.

Audited actions include: catalogue edit and publish, derived-reference approval, price change, discount create, refund approval, certificate review, RLS-bypass admin access, permission change, bulk operation, import batch execution.

## Payment boundaries

- Card data never touches our servers; the provider hosts the fields.
- Webhooks are the only trusted channel for payment state; verified by signature and reconciled against `payments`.
- Amounts are re-derived server-side from `order_items`; a client-supplied amount is ignored.
- Refunds above a configured threshold require dual authorisation.
- `PaymentProvider` is an interface; no provider SDK appears in domain or application code.

## Security gates (blocking for release)

| Gate | Requirement |
|---|---|
| SG-1 | Zero unauthorized cross-customer access |
| SG-2 | Every mutating endpoint idempotent |
| SG-3 | Prices computed server-side only |
| SG-4 | Webhook signatures verified before parsing |
| SG-5 | Uploads validated, scanned, capped |
| SG-6 | Documents private, served by signed URL |
| SG-7 | No secrets in code, database or logs |
| SG-8 | Every privileged mutation audited |
| SG-9 | No RLS-enabled table without a policy |
| SG-10 | AI cannot reach any write path |
| SG-11 | Prompt injection from retrieved content is inert |
| SG-12 | No unverified certificate field renders as fact |
| SG-13 | SQL injection surface eliminated |
| SG-14 | No PII in logs, analytics or embeddings |
| SG-15 | Rate limits enforced per scope |

## Validation rules

1. CI: role x route authorization matrix, complete.
2. CI: RLS cross-customer test per table.
3. CI: no handler imports a repository.
4. CI: no provider SDK outside `integrations` and `packages/ai`.
5. CI: secret scan.
6. CI: dependency audit.
7. CI: AI import-graph test proving no write path.

## Error handling

Security failures return generic messages. An authorization denial does not distinguish "does not exist" from "not permitted" on customer-owned resources, to prevent enumeration. Audit detail goes to the log, not the response.

## Observability

Security events as first-class metrics: authorization denials by policy, RLS violations, signature failures, upload rejections, injection detections, tool denials, secret-scan hits. Alerts on denial spikes and any signature-failure spike, which indicate probing.

## Testing requirements

Full matrix in `INITIAL_IMPLEMENTATION_PLAN.md` section 26. Additionally: authorization matrix per endpoint; RLS cross-customer per table; IDOR fuzzing on every id and slug; CSRF test; SSRF test against the metadata endpoint; upload abuse suite; webhook forgery and replay; prompt-injection suite using real product descriptions; a test that the AI mutation attempt changes zero rows.

## Failure modes

| Failure | Response |
|---|---|
| RLS policy missing | CI gate SG-9 blocks; production drift alerts on denial spike |
| Policy bypass in one module | Cross-customer test catches |
| Secret leaked | Rotate first |
| Webhook signature failure spike | Alert; possible probing |
| Upload bypass | Size and MIME assertions at the presign step, not only after upload |
| AI write path appears | Import-graph test fails the build |

## Implementation constraints

1. No control may rely on a prompt.
2. No PII in logs, metrics, analytics or embeddings.
3. Verify before parse, always.
4. RLS enabled implies a policy.
5. Fail closed on money, trust and authorization.

## Evidence status

`[INFERRED / PROPOSED]` for every control. The source's authentication, authorization, admin, payment, secrets, PII handling and audit systems are all `[UNKNOWN]`. `[OBSERVED]` source facts used: `/auth` and `/verify-email` exist as routes, and a third-party chat widget with named agent portraits exists at `chat-system.47thst.com` (Katherine, Amrita, Lauren, Charlotte), which evidences a human-handoff surface but reveals nothing about its implementation.