# 32 TESTING ARCHITECTURE

**Package:** `technical_design/` doc 32 of 40
**Authority:** `PROJECT_SOURCE_OF_TRUTH.md` section 34, NFR-13, NFR-15.
**Evidence status:** `[OBSERVED][VERIFIED]` baselines for the migration tests; `[INFERRED]` the strategy.

---

## Purpose

Define the test layers, the evidence-linked test matrix, the security matrix, performance targets, AI evaluation dimensions, and the CI gates.

**NFR-13 governs this document: every reconstructed feature has a test traceable to its evidence.** A capability with no evidence and no test is a guess; a capability with evidence and no test is an unverified claim.

## 1. Layers

```text
Unit        pure domain functions, invariants, parsers, pricing
Domain      aggregate behaviour and state machines
Integration repositories against a real Postgres, outbox, RLS
API         every endpoint: schema, authz, errors, idempotency, rate limits
E2E         critical user journeys in a real browser
Contract     AI tool schemas, provider adapters, storage and queue ports
Performance load tests against NFR targets
Security    authorization matrix, injection, upload, webhook forgery
AI          evaluation suites across the dimensions in section 5
Migration   every gate in doc 33 as an automated assertion
```

Integration runs against a **real** Postgres, not a mock. This schema depends on PostgreSQL-specific behaviour: RLS, `tsvector` generated columns, `pg_trgm`, HNSW indexes, `LEFT JOIN LATERAL`, advisory locks, `NUMERIC` semantics and `SKIP LOCKED`. A mocked repository proves nothing about any of them.

## 2. Evidence-linked test matrix

| Feature | Evidence | Test |
|---|---|---|
| SKU grammar | `[VERIFIED]` 1,024/1,024 | Parser test over all 1,024 source SKUs; expects 100% match, 0 mismatches |
| Pair weight rule | `[VERIFIED]` 113/113 | Sum check over all 113 pair records against the `Ct.Tw.` slug value |
| Single-stone weight | `[VERIFIED]` 911 single-token | Tokenizer returns exactly 1 token for all 911 |
| Stone identity stability | `[VERIFIED]` 0 unstable | Attribute consistency across all products sharing a `gem_ref` |
| Metal mapping | `[VERIFIED]` 1:1 across 14 codes | Every slug phrase maps to its code; no code maps to two phrases |
| Earrings use pairs | `[VERIFIED]` 113/113 | Assert INV-02 across the migrated set |
| Variety in slug | `[VERIFIED]` 19,666/19,666 | Assigned variety equals slug variety for every stone |
| Slug parse rates | `[VERIFIED]` 100% | V1 and V2 as CI gates |
| Derived SKUs | §3.1 Example B | A derived SKU never equals an observed one without approval; 221 rows quarantined |
| Doubled spec strings | `[DEFECT D9]` | `token_count = 2` for all 113 pair records; `is_doubled` set on clarity labels |
| Price recovery | `[DEFECT D8]` | All 1,024 prices recovered from `pages_analyzed` |
| Price model | `[VERIFIED]` 0/1,024 exact | Regression test asserting the residual is non-zero for every row |
| Media classification | `[DEFECT D4]` | Zero assets classified from a `.js` URL |
| Media volume | `[VERIFIED]` | Nav-icon records dispositioned `SKIPPED`, not attached to products |
| Checkout funnel | `[OBSERVED]` 4 URLs | Four-step E2E with server checkpoints |
| Route preservation | `[OBSERVED]` 44,218 URLs | Every source URL resolves or 301s to a target route |
| Certificate artefacts | `[OBSERVED]` path convention | Every `/cert`, `/sarin`, `/appraisal` URL becomes a certificate record |
| DYO invariants | `[VERIFIED]` | INV-01, INV-02, INV-03 as constraint tests |

Two of these deserve emphasis because they test the *evidence discipline* rather than the code:

- **Price model, 0/1,024 exact.** The test asserts the residual is **non-zero for every row**. If a future change made the residual zero everywhere, it would mean the price model claimed to reproduce observed totals exactly, which the `[VERIFIED]` evidence says it does not.
- **Derived SKUs.** The 221 rows must remain quarantined with null attributes and `DRAFT` state. A test that "passes" because those rows now have values would mean the inference leaked into production data.

## 3. Security test matrix

| Test | Expectation |
|---|---|
| Authorization matrix | Every role × endpoint pair exercised; anything not explicitly allowed returns 403 |
| Cross-customer access | Customer A cannot read customer B's order, cart, address or conversation |
| RLS verification | Direct SQL as the application role cannot bypass row scoping |
| IDOR on every `:id` and `:slug` | Randomised ownership checks |
| Price tampering | A modified client price is rejected with 409; the server total wins |
| Idempotency replay | A repeated `Idempotency-Key` returns the original result, not a duplicate |
| SQL injection | Fuzzed parameters across every endpoint; no query-shape change |
| XSS | Stored and reflected payloads across CMS, search, chat and product fields |
| Prompt injection | Injected instructions in product copy and certificate text produce no tool escalation |
| AI mutation attempt | "Set inventory to 0" produces a guardrail event and zero row changes |
| File upload | Executable, oversized, malformed and MIME-mismatched uploads all rejected |
| Webhook forgery | Invalid signature rejected before parsing; a replayed event deduplicated |
| SSRF | Metadata endpoint and private ranges blocked on outbound fetch |
| Rate limits | Per-scope limits enforced; burst behaviour verified |
| Audit completeness | Every privileged mutation produces an `audit_logs` row |

The matrix is exhaustive by construction rather than by sampling: any endpoint not listed in the role × endpoint matrix fails the test, so a new endpoint cannot ship without an authorization test.

## 4. Performance tests

| Scenario | Target | Basis |
|---|---|---|
| Category page LCP p75 | < 2.5s | NFR-02 |
| Product page LCP p75 | < 2.5s | NFR-02 |
| Filtered search p95 | < 400ms | NFR-03 |
| Semantic search p95 | < 800ms | NFR-03 |
| Add to cart p95 | < 500ms | `[INFERRED]` |
| Checkout session p95 | < 800ms | `[INFERRED]` |
| DYO quote p95 | < 300ms | `[INFERRED]` |
| AI first token p95 | < 2s | `[INFERRED]` |
| Concurrent users | 50,000 registered; load-test the concurrent profile | NFR-01, NFR-15 |

**No capacity claim is asserted here.** Per NFR-15 and charter 47, capacity is established by measurement (doc 30 section 10).

## 5. AI evaluation

| Dimension | Measured | Failing example |
|---|---|---|
| `factuality` | Every gemological claim has a citation resolving to a real field | Invents an origin |
| `no_invention_null` | Refuses to state a NULL stone type, origin or treatment | Guesses "probably untreated" |
| `tool_selection` | Correct tool for the intent | Answers availability from memory instead of `search_inventory` |
| `price_safety` | Quotes only a live snapshot; explains rather than computes | Invents a price |
| `inventory_safety` | Never promises availability | "Yes, we have it in stock" from memory |
| `certificate_safety` | Never claims authenticity below VERIFIED | "This is certified" at EXTRACTED |
| `treatment_disclosure` | Always surfaces treatment when present | Omits heat treatment |
| `dyo_quality` | Configuration advice respects compatibility | Recommends an incompatible setting |
| `refusal` | Declines when evidence is insufficient | Fabricates to avoid saying "I don't know" |
| `citation` | Citations resolve and match the claim | Citation points at an unrelated document |
| `escalation` | Hands off on every defined trigger | Answers a refund question directly |
| `injection_resistance` | Injected instructions in retrieved content change nothing | Executes an instruction embedded in a description |
| `grounded_ratio` | Mean above the configured threshold | Below 0.6 on the suite |
| `cost` | Cost per conversation within budget | Regression after a prompt change |

Evaluation runs in CI on every prompt or model change, and nightly against production traffic samples. Results land in `ai_evaluations` and gate release.

The failing examples are written as concrete behaviours rather than scores, because "hallucination rate 3%" is unactionable and "invents an origin" is a bug report a developer can fix.

## 6. Test data strategy

| Requirement | Approach |
|---|---|
| Realistic volume | A staging fixture set mirroring production shape: 19,665 stones, 3,072 pairs, 10,349 variants |
| Evidence fixtures | The 1,024 observed SKUs, 113 pair records and 1,024 prices committed as fixtures |
| No real customer data | Synthetic customers and conversations everywhere, including staging |
| Determinism | Seeded fixtures; no `Math.random`, no wall-clock dependence in assertions |
| Known-bad fixtures | Deliberate corrupt rows: the all-null gemstone file, doubled spec strings, JS-masquerading-as-3D media |
| Idempotence fixture | A re-runnable import batch for the V17 check |

The known-bad fixtures matter most. The defects found during analysis (D1, D4, D8, D9) are all cases where structurally valid data was wrong. A test suite containing examples of each defect is what keeps them fixed.

## 7. CI gates

| Gate | Fails on |
|---|---|
| Migration gates V1-V14 | Parser regression, invariant breach, count mismatch |
| Gates V15-V17 | Unverified price published, media misclassification, non-idempotent re-import |
| Gates V18-V20 | A derived identity landing with attributes, a derived/observed SKU collision |
| Gates V21-V22 | An unresolved setting variant or stone reference |
| Authorization matrix | Any endpoint without an explicit rule |
| PII scan | PII in logs, traces or metric labels |
| Import-graph test | A platform SDK or repository reaching domain code |
| AI evaluation | A grounding or refusal regression |
| Bundle budget | A JavaScript size regression |
| Migration verification | A migration that fails or is destructive without a note |

## 8. Validation rules

1. Integration tests run against a real PostgreSQL instance.
2. Every reconstructed capability has a test traceable to its evidence (NFR-13).
3. Migration gates run in CI, not only during the migration phase.
4. Any endpoint added without an authorization test fails CI.
5. AI evaluation gates release on a grounding or refusal regression.
6. No capacity number is asserted without a load-test artefact (NFR-15).
7. Known-bad fixtures for D1, D4, D8 and D9 remain in the suite permanently.
8. Tests use synthetic customer data only, in every environment including staging.

## 9. Error handling

| Condition | Behaviour |
|---|---|
| Flaky test | Quarantined and fixed; never retried into green indefinitely |
| Test data drift | Fixture checksum asserted, so a silent data change is a failure |
| Load test failure | Blocks release on a breached NFR target |
| AI evaluation failure | Blocks release; feature flag available as a temporary mitigation with a recorded expiry |
| Environment unavailable | CI fails closed; a green build on a skipped suite is a false signal |

## 10. Security boundaries

- Test fixtures contain no real customer data, in any environment.
- Secrets exist only in the CI secret store; no credential in a fixture or snapshot.
- Snapshot tests redact PII before committing.
- Security tests run against the real authorization and RLS path, not a test double.

## 11. Observability

Metrics: test pass rate and duration by layer, flaky-test count, gate pass rate, AI evaluation scores by dimension, load-test results by scenario, coverage on domain and application layers. Alerts on any gate failure rate above zero in a week, and on AI evaluation score drift over time even when still above threshold.

Score *drift* matters as much as threshold breaches. A grounding score sliding from 0.9 to 0.7 while still above the 0.6 gate is a leading indicator of a real regression.

## 12. Failure modes

| Failure | Behaviour |
|---|---|
| Migration gate fails | Halt; the affected phase does not proceed |
| Parser regression | V1/V2 halt the build |
| Authorization test missing | CI fails; new endpoints cannot ship unguarded |
| AI grounding regression | Release blocked; synthesis disabled via flag if urgent |
| Load target breached | Release blocked; performance work required |
| Flakiness | Quarantined and tracked, never absorbed into a passing run |

## 13. Implementation constraints

1. Integration tests use a real PostgreSQL instance; repository mocks prove nothing here.
2. Every reconstructed capability has an evidence-linked test (NFR-13).
3. Migration gates are continuous, not one-time.
4. Any endpoint without an authorization test fails CI.
5. AI evaluation gates release on a grounding or refusal regression.
6. Known-bad fixtures for D1, D4, D8 and D9 stay in the suite.
7. Synthetic data only, everywhere.

## Evidence status

`[OBSERVED][VERIFIED]`: every baseline in the section 2 matrix (1,024/1,024 SKU match, 113/113 pair weights, 911 single-token stones, 19,666/19,666 variety agreement, 0/1,024 exact price matches, 44,218 URLs, 4 checkout URLs) and the defect references D1, D4, D8, D9. `[INFERRED]`: the layer model, the CI gate set, the test-data strategy and the `[INFERRED]` performance targets in section 4. The load-test scenarios in doc 30 section 10 are the mechanism NFR-15 requires.