# 36 NON-FUNCTIONAL REQUIREMENTS

**Package:** `technical_design/` doc 36 of 40
**Authority:** `PROJECT_SOURCE_OF_TRUTH.md` section 6 (NFR-01 to NFR-15), section 40.
**Evidence status:** `[OBSERVED]` where a basis is marked `E` or a `[VERIFIED]` count; `[INFERRED]` for NFR-14.

---

## Purpose

Restate the non-functional requirements as a verifiable contract, with the enforcement mechanism and the owning document for each.

## 1. The requirements

| ID | Requirement | Target | Enforcement | Owning doc |
|---|---|---|---|---|
| NFR-01 | Design for roughly 50,000 users without premature microservices | Modular monolith; extract only on measured need | Architecture test; no service split without an ADR | 01, 29 |
| NFR-02 | Storefront p75 LCP under 2.5s on product and category pages; WebAR must not regress it | `< 2.5s` p75; AR dynamically imported and lazy | Lighthouse CI per PR plus real-user Web Vitals | 30, 08, 21 |
| NFR-03 | Search p95 under 400ms filtered, under 800ms with semantic re-rank | `400ms` / `800ms` p95 | Load test per release | 30, 12 |
| NFR-04 | Price, stock and order state never served from a cache that can diverge from Postgres | Postgres authoritative; Redis advisory only | Cache inventory review; never-cached list test | 25 |
| NFR-05 | Every AI mutation path is impossible without a deterministic application service | No mutating tool; no repository in the AI import graph | Import-graph test plus the behavioural mutation test | 18 |
| NFR-06 | The AI must never emit an unverified gemological fact | Field-level provenance gate; ungrounded claims stripped | `factuality` and `no_invention_null` evaluation dimensions | 18, 17 |
| NFR-07 | Certificate OCR confidence is preserved end to end with no silent promotion | Per-field confidence; `certificate_public` view enforces it | Confidence-band tests; view-introspection test | 17 |
| NFR-08 | Provenance answerable for every migrated field | `provenance` plus `evidence_status` on every field | Migration gate; provenance-coverage test | 33, 31 |
| NFR-09 | PII never enters logs, embeddings or model context beyond the minimum required | Redaction layer; no PII in events or labels | Automated PII scan in CI | 28, 31 |
| NFR-10 | Webhook endpoints verify signatures before any processing | HMAC over the raw body, before parsing | Forgery test suite | 20, 06 |
| NFR-11 | All assets served via R2 and CDN; customer documents never public-read | Signed URLs only; private bucket | Public-URL probe test | 24, 17 |
| NFR-12 | Migration is repeatable and idempotent; re-running produces no duplicates | Deterministic keys plus `import_batches` | Gate V17 | 33 |
| NFR-13 | Every reconstructed feature has a test traceable to its evidence | Evidence-linked test matrix | CI coverage of the matrix | 32 |
| NFR-14 | Graceful degradation: catalog and search readable when AI, Redis or the vector index is down | Circuit breakers; structured and full-text search independent of vectors | Degradation test | 25, 30 |
| NFR-15 | Capacity claims validated by load test before being asserted | No unmeasured number asserted | Review rule; load-test artefact required | 30, 32 |

## 2. The five that carry the most risk

Most NFRs are ordinary engineering standards. Five of these are load-bearing for the project's central promise, and a failure in any of them is a business failure rather than a technical one.

### NFR-06 and NFR-07: never state an unverified fact

This is the requirement that separates this platform from a chatbot that occasionally guesses. `[OBSERVED]` `stone_type` is populated for only **113 of 1,024** products; `[OBSERVED]` availability was reported `InStock` for all 1,024 with no per-unit stock; certificate contents are `[UNKNOWN]` while the artefacts exist.

The data is genuinely incomplete. The requirement is what converts that incompleteness into honest refusals instead of plausible inventions, and it is enforced in code (the grounding gate, the `certificate_public` view) rather than by prompt instruction.

### NFR-04: no cache may diverge from Postgres on money or stock

`[INFERRED]` A stale price or a stale stock flag is not a performance defect; it is a customer dispute, a chargeback, or an oversold stone that cannot be delivered. The never-cached list in doc 25 section 3 exists for this reason.

### NFR-05: the AI cannot mutate

The domain is one-of-a-kind inventory and hand-set pricing. An AI that can write an availability flag or a price causes irreversible harm: a stone can be sold twice, or a price can change without a human decision. Four independent layers enforce it (doc 18 section 7).

### NFR-12: idempotent migration

The evidence package cannot be regenerated (doc 31). The migration is therefore a one-way operation, and an operator who runs it twice must not corrupt it. Gate V17 asserts this continuously rather than once.

### NFR-13: evidence-linked tests

Without it, `[INFERRED]` inferences become indistinguishable from observations over time. Someone inheriting this codebase will not know which of its claims are supported by 19,666 verified slug parses and which are a reasonable guess. The matrix in doc 32 is the mechanism that keeps that distinction from eroding.

## 3. Verification matrix

| NFR | Verified by | Test type |
|---|---|---|
| NFR-01 | Architecture test: no service boundary without an ADR; monolith import graph | Architecture |
| NFR-02 | Lighthouse CI on product and category routes; Web Vitals reporting | Performance |
| NFR-03 | Filtered and semantic search load scenarios | Performance |
| NFR-04 | Never-cached path test; cache inventory audit | Unit, integration |
| NFR-05 | Import-graph test; "set inventory to 0" behavioural test | Architecture, security |
| NFR-06 | AI evaluation: `factuality`, `no_invention_null`, `grounded_ratio` | AI evaluation |
| NFR-07 | Confidence-band boundary tests; `certificate_public` introspection | Unit, integration |
| NFR-08 | Provenance coverage assertion over all migrated rows | Migration |
| NFR-09 | PII scan of logs, traces and metric labels | Security, CI |
| NFR-10 | Signature forgery suite across all webhook endpoints | Security |
| NFR-11 | Public-URL probe on certificate and report objects | Security |
| NFR-12 | Gate V17 on every import run | Migration |
| NFR-13 | CI coverage of the evidence-linked matrix | Meta |
| NFR-14 | Degradation test with AI, Redis and the vector store disabled | Integration |
| NFR-15 | Load-test artefact required before any capacity claim | Review |

## 4. Quality attributes not captured as NFRs

These were designed for and are recorded here so they are not lost between documents.

| Attribute | Target | Owning doc |
|---|---|---|
| Correctness of money | Exact to the cent; `total == sum(components)`; no floats anywhere in a price path | 16 |
| Trust integrity | No certificate field renders as verified below `VERIFIED`; append-only verification ledger | 17 |
| Inventory accuracy | Reservations in Postgres, atomic for pairs; 15-second availability ceiling | 15 |
| Idempotency | Idempotency keys on every mutating endpoint; `job_key` on every job; `event_consumers` on delivery | 06, 26, 27 |
| Accessibility | WCAG 2.2 AA; full keyboard purchase path; no colour-only meaning | 35 |
| Auditability | Every privileged action audited with before and after state; `audit_logs` has no delete path | 23, 31 |
| Privacy | No frames leave the device; documents private; PII minimised | 21, 24, 31 |
| Observability | Every alert has an owner and a runbook; thresholds from SLOs | 28 |
| Portability | Domain code imports no platform SDK; every dependency behind a port | 29 |
| Evolvability | Modular monolith; extract only on measured need | 01, 29 |

## 5. Trade-off principles

Where requirements conflict, these decide, in order:

| Order | Principle | Consequence |
|---|---|---|
| 1 | Truth over convenience | An honest refusal beats a plausible answer (NFR-06) |
| 2 | Money and stock correctness over performance | Never cache them; recompute rather than trust (NFR-04) |
| 3 | Human decision over automation | AI proposes, a human disposes; derived data quarantines (NFR-05, INV-08) |
| 4 | Evidence over convenience | Never publish an unverified value; label the residual (NFR-07, NFR-08) |
| 5 | Measured need over architecture | Extract a service only when measurement demands it (NFR-01, NFR-15) |
| 6 | Reversibility over cleverness | Idempotent, resumable, revertible stages everywhere (NFR-12) |
| 7 | Graceful degradation over hard failure | Catalog and search survive AI, Redis and vector loss (NFR-14) |

Priority 1 over 2 sounds expensive, but the alternative is a store that occasionally tells a customer a stone is untreated when it was heat-treated. That is a different order of consequence entirely.

## 6. Validation rules

1. Every NFR names an enforcement mechanism and an owning document.
2. No NFR is satisfied by assertion; each maps to an automated test or a review rule.
3. A new NFR requires an enforcement mechanism before it is accepted.
4. Trade-offs are resolved by the section 5 ordering, not by preference.
5. Quality attributes not in the NFR table remain tracked in their owning documents.
6. Any relaxation of an NFR requires an ADR recording the reason and the accepted risk.

## 7. Error handling

| Condition | Behaviour |
|---|---|
| An NFR regression is detected in production | Roll back, then fix; the release gate exists to prevent this |
| A requirement cannot be met as written | Propose an ADR; never quietly reinterpret the requirement |
| An NFR is unmeasurable | Rewrite it to be measurable, or delete it; an unmeasurable requirement provides no protection |
| Two NFRs conflict | Apply the section 5 ordering and record the decision |

## 8. Observability

Metrics: NFR-specific signals already defined elsewhere, consolidated here: LCP p75 (NFR-02), search p95 (NFR-03), `grounded_ratio` (NFR-06), OCR mean confidence and auto-verify rate (NFR-07), provenance coverage (NFR-08), PII-scan pass rate (NFR-09), gate V17 delta (NFR-12), degradation-mode availability (NFR-14).

A single "NFR health" dashboard reports these together, so a regression in any one is visible without opening six dashboards.

## 9. Testing requirements

| Test | Proves |
|---|---|
| Requirement-to-test mapping | Every NFR resolves to at least one automated test |
| Enforcement existence | Each NFR has a named mechanism and an owning document |
| Gate coverage | CI runs every mapped test |
| Trade-off review | Conflicting requirements have a recorded decision |
| Relaxation audit | No NFR was relaxed without an ADR |

## 10. Failure modes

| Failure | Behaviour |
|---|---|
| NFR silently reinterpreted | Review failure; the document set is authoritative |
| NFR satisfied in tests but not in production | Real-user monitoring catches it (NFR-02, NFR-14) |
| New feature violates an NFR | Blocked in review with a citation to the requirement |
| Unmeasurable NFR | Rewritten or removed; it protects nothing |

## 11. Implementation constraints

1. Every NFR has a named enforcement mechanism and an owning document.
2. No NFR is satisfied by assertion alone.
3. Trade-off conflicts are resolved by the section 5 ordering.
4. Relaxing an NFR requires an ADR.
5. Unmeasurable requirements are rewritten or deleted.

## Evidence status

`[OBSERVED]`/`[VERIFIED]`: NFR-01 to NFR-13 and NFR-15 are carried from `PROJECT_SOURCE_OF_TRUTH.md` section 6 with their stated bases, including the observed counts that make NFR-06 and NFR-07 non-theoretical (113 of 1,024 typed stones, 1,024 InStock without per-unit stock, certificate artefacts with unknown contents). `[INFERRED]`: NFR-14, and the enforcement mechanisms and owning-document mapping in sections 1, 3 and 4, which are proposed in this package rather than inherited from the source-of-truth document.