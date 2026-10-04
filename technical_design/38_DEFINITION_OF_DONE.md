# 38 DEFINITION OF DONE

**Package:** `technical_design/` doc 38 of 40
**Authority:** `PROJECT_SOURCE_OF_TRUTH.md` sections 40, 36, 37, 38, 39.
**Evidence status:** `[INFERRED]`; derived from the observed defect register and unresolved decisions.

---

## Purpose

Define what "complete" means for this rebuild, in a form that cannot be satisfied by assertion.

## 1. The core standard

A capability is done when all of the following hold. Anything less is not done, regardless of how it looks.

| # | Condition |
|---|---|
| 1 | The behaviour is implemented against a documented design |
| 2 | Every reconstructed element is labelled with its evidence status |
| 3 | The evidence status is honest: `[OBSERVED]` and `[VERIFIED]` where observed, `[INFERRED]` and `[UNKNOWN]` where not |
| 4 | A test exists that is traceable to the evidence (NFR-13) |
| 5 | All invariants that apply are enforced in the database, not only in application code |
| 6 | Every failure mode named in the design has a defined behaviour |
| 7 | Every error code in the design is implemented and returns the documented status |
| 8 | Authorization is enforced in code and covered by the role × endpoint matrix |
| 9 | Observability exists: metrics, structured logs, and an alert where warranted |
| 10 | Security boundaries hold, verified by a test rather than by review assertion |
| 11 | The AI never exceeds its authority: no mutation path, no unverified claim |
| 12 | Accessibility requirements hold on the affected surface |
| 13 | Documentation is accurate, including the unknowns |
| 14 | Observability of the feature's health is a dashboard a human can read |
| 15 | The migration gates that cover this data all pass |

## 2. Per-phase exit criteria

### Architecture and schema

- [ ] Every table in the domain model exists with the documented constraints
- [ ] Every invariant INV-01 to INV-10 is a database constraint where possible
- [ ] `certificate_public` exists and enforces the verification rule (INV-07)
- [ ] RLS policies exist for every table containing customer data
- [ ] Every index is justified by a measured query
- [ ] `statement_timeout` is set per role
- [ ] Migrations are forward-only and expand-then-contract

### Migration

- [ ] Gates V1 to V14 pass (blocking)
- [ ] Gates V15 to V17 hold publication
- [ ] Gates V18 to V20 pass (blocking)
- [ ] Gates V21 and V22 hold publication
- [ ] V17 returns a zero delta on re-run
- [ ] Every migrated field carries provenance and `evidence_status`
- [ ] Every record is in a terminal state with a recorded reason
- [ ] Per-phase counts recorded: seen, accepted, rejected, quarantined

### Storefront

- [ ] All 44,218 source URLs resolve or 301 to a target that resolves
- [ ] No redirect chains and no loops
- [ ] LCP p75 under 2.5s on product and category pages
- [ ] WCAG 2.2 AA with zero critical automated issues
- [ ] Full keyboard purchase path
- [ ] Sitemaps contain only canonical 200 URLs

### Commerce

- [ ] Four-step checkout with server checkpoints
- [ ] Order snapshots frozen at placement
- [ ] Checkout totals recomputed per request, never cached
- [ ] Price tampering rejected with 409
- [ ] Idempotency keys on every mutating endpoint
- [ ] Add-ons as separate order lines

### DYO

- [ ] State machine fully implemented, illegal transitions rejected
- [ ] Configuration hash deterministic and reproducible
- [ ] Pair reservations atomic
- [ ] Unknown compatibility yields `UNKNOWN`, never `COMPATIBLE`
- [ ] Share links expose no price, stone ref or engraving text
- [ ] Resume survives a Redis flush

### Trust

- [ ] Every certificate artefact has a record
- [ ] OCR confidence preserved per field, end to end
- [ ] No field renders as verified below `VERIFIED`
- [ ] Every transition ledgered in `verification_events` and `audit_logs`
- [ ] Documents private; signed URLs only

### AI

- [ ] No mutating tool for price, inventory, orders, payments, certificates or permissions
- [ ] No repository reachable from the AI import graph
- [ ] Grounding gate strips unverifiable claims
- [ ] Refusal behaviour correct for every NULL field
- [ ] Prompt injection suite inert
- [ ] Evaluation suite passes on all fourteen dimensions
- [ ] Every alert has an owner and a runbook

### Operations

- [ ] Every alert links to a runbook with a named owner
- [ ] Every P1 runbook rehearsed in staging
- [ ] Restore from backup rehearsed
- [ ] Secret rotation rehearsed
- [ ] Load test complete, with an artefact
- [ ] No unmeasured capacity claim in any document

## 3. Explicitly not required for completion

| Item | Reason |
|---|---|
| Full `[OBSERVED]` evidence for every behaviour | Some behaviour is genuinely `[UNKNOWN]` (payment provider, tax, inventory mechanics). `[UNKNOWN]` plus an honest refusal is an acceptable outcome; a fabricated `[OBSERVED]` is not |
| WebAR for every design | The largest cost risk with no source precedent (doc 21). Scoped delivery is the plan; a full rollout is not a completion criterion |
| RAG over all content | A curated corpus is sufficient; recall breadth is not a correctness property |
| A dedicated search cluster | Unnecessary at the observed scale; revisit on measured failure (ADR-001) |
| Microservices | Explicitly rejected in NFR-01 |

This section exists because "done" lists have a way of expanding until nothing ships. Each exclusion above is a deliberate decision, not an omission.

## 4. Documentation standards

| Rule | Detail |
|---|---|
| Evidence labels everywhere | Every factual claim in every document carries a status |
| Unknowns documented | `[UNKNOWN]` is a first-class status, not an admission of failure |
| Assumptions explicit | Every assumption has an owner and a validation path |
| Deferred decisions have triggers | A deferral names the condition that forces the decision |
| No undated claims | A capacity or performance claim carries the measurement date |
| Cross-references resolve | Every referenced document, table and gate exists |

## 5. Open decisions blocking completion

These remain `[UNKNOWN]` and are explicit open decisions. Each has a trigger and an owner.

| Decision | Current state | Forced by | Owner |
|---|---|---|---|
| Payment provider | `[UNKNOWN]`; `PaymentProvider` port designed | Before Phase 6 checkout goes live | `ADMIN_SUPER` |
| Tax calculation | `[UNKNOWN]`; engine port designed, fails closed | Before any live sale | `ADMIN_SUPER` |
| Shipping carriers and rates | `[UNKNOWN]` | Before fulfilment | `COMMERCE_OPERATOR` |
| Email provider | `[UNKNOWN]` | Before transactional email | Engineering |
| Refund policy | `[UNKNOWN]` | Before refunds are enabled | `ADMIN_SUPER` |
| Financing product | Route `[OBSERVED]`, mechanism `[UNKNOWN]` | Before the route is published | `COMMERCE_OPERATOR` |
| Protection plan product | Route `[OBSERVED]`, mechanism `[UNKNOWN]` | Before the route is published | `COMMERCE_OPERATOR` |
| Jurisdiction and statutory retention | `[UNKNOWN]` | Before relying on the retention table (doc 31) | `ADMIN_SUPER` |
| DYO ring sizing | **No evidence it was ever a feature** | Only if evidence appears | `CATALOG_MANAGER` |
| DYO engraving | **No evidence it was ever a feature** | Only if evidence appears | `CATALOG_MANAGER` |
| DYO side stones | `all_side_stones.json` is `[]` | Only if a side-stone catalogue appears | `CATALOG_MANAGER` |
| Setting and making price components | `[INFERRED]` residual | Curator review of 1,024 observations | `COMMERCE_OPERATOR` |
| 911 untyped stones | Source gap, not a migration failure | Curator assignment | `CATALOG_MANAGER` |
| 221 derived identities | `[INFERRED]`, quarantined | Curator confirmation or rejection | `MIGRATION_ENGINEER` |

The last three are the ones that decide whether the platform is genuinely launch-ready. They cannot be closed by writing code.

## 6. Release gates

| Gate | Condition |
|---|---|
| Pre-production | All phases M1-M3 complete; all blocking gates pass; storefront serves product pages |
| Production launch | Pre-production plus: payment provider chosen, tax engine live, all 44,218 redirects verified, load test passed |
| Public AI enabled | Production launch plus: evaluation suite green on all dimensions, runbooks rehearsed, grounding monitored for 30 days |
| Public WebAR enabled | Scoped asset pipeline validated on real low-tier devices, fallback matrix tested |
| Curated corpus in RAG | Trust-bearing content published with two approvers, `trust_tier` assigned |

The AI and WebAR gates are deliberately later than the store launch. Both are additive, both are deferrable, and neither should be able to hold up a functioning storefront.

## 7. Validation rules

1. A capability is not done without an evidence-linked test (NFR-13).
2. A capability is not done without an enforced invariant where an invariant applies.
3. A capability is not done with an undocumented failure mode.
4. A capability is not done with an unowned alert.
5. A capability is not done with an unverified security boundary.
6. `[UNKNOWN]` with an honest refusal **is** done; a fabricated `[OBSERVED]` is not.
7. No capacity claim without a dated measurement artefact (NFR-15).
8. An open decision is not closed by an implementation convenience.

## 8. Error handling

| Condition | Behaviour |
|---|---|
| A gate cannot be evaluated | Treated as failed. An unevaluable gate is not a passing gate |
| A runbook is unverified | The capability is not P1-ready; the gap is stated rather than assumed away |
| A `[UNKNOWN]` blocks a launch path | Name the blocked path and the decision needed; do not substitute a guess |
| A test is flaky | Fix or quarantine it. A quarantined test does not count as coverage |

## 9. Verification matrix

| Condition | Verified by |
|---|---|
| Invariants enforced | Constraint tests plus direct SQL attempts |
| Failure modes defined | Test per named mode |
| Error codes implemented | API contract test enumerating every documented code |
| Authorization enforced | Role × endpoint matrix |
| Observability present | Metric and log assertion per surface |
| Security boundary held | Attack test per boundary |
| AI authority bounded | Import-graph test plus behavioural mutation test |
| Accessibility | axe-core plus keyboard walkthrough |
| Migration gates | Automated gate suite |
| Documentation accurate | Cross-reference check; link and identifier resolution |

## 10. Testing requirements

| Test | Proves |
|---|---|
| Definition-of-done checklist | Each item has a named verification method |
| Gate evaluation | Every gate is machine-evaluable; none is a judgement call |
| Documentation cross-reference | Every referenced document, table and gate resolves |
| Open-decision register | Each open decision has an owner and a forcing condition |
| Unverified runbook detection | An unrehearsed P1 runbook blocks the relevant release gate |

## 11. Failure modes

| Failure | Behaviour |
|---|---|
| "Done" claimed without tests | Rejected; NFR-13 is not negotiable |
| Unknowns quietly dropped from docs | Documentation-accuracy failure |
| Deferrals accumulating without triggers | Open-decision review; each deferral needs a forcing condition |
| Runbooks written but never rehearsed | Gate failure for the relevant capability |
| AI enabled before grounding is monitored | Rollback; the flag exists for exactly this |
| Exclusions expanding | Reviewed each phase; the section 3 list is explicit |

## 12. Implementation constraints

1. No capability ships without an evidence-linked test.
2. Invariants are enforced in the database where possible.
3. Every alert has an owner and a runbook; every P1 runbook is rehearsed.
4. `[UNKNOWN]` plus an honest refusal is complete; a fabricated `[OBSERVED]` is not.
5. Every open decision has an owner and a forcing condition.
6. No unmeasured capacity claim appears in any document.

## Evidence status

`[INFERRED]`. The completion criteria are derived from the requirements in this package and from the observed state of the evidence. The open-decision register in section 5 is grounded in the actual gaps found during analysis: `[UNKNOWN]` payment, tax, shipping, discount and refund mechanics (doc 13), `InStock` for all 1,024 products without per-unit stock (doc 15), an inferred setting-price residual across 1,024 observations (doc 16), certificate artefacts with unknown contents (doc 17), `stone_type` populated for only 113 of 1,024 (doc 10), the 221 quarantined derived identities (doc 33), and three DYO features for which no evidence of any kind exists (doc 14).