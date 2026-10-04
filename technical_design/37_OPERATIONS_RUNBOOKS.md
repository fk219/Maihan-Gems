# 37 OPERATIONS RUNBOOKS

**Package:** `technical_design/` doc 37 of 40
**Authority:** `PROJECT_SOURCE_OF_TRUTH.md` sections 31, 32, 29, 33.
**Evidence status:** `[INFERRED]`.

---

## Purpose

Define the operational procedures for the failures this platform can actually produce. Each runbook is a document, an owner, and a decision procedure.

**A runbook that is written during an incident is a wish.**

## 1. Severity model

| Severity | Definition | Response |
|---|---|---|
| P1 | Revenue loss, data loss, security exposure, or a trust violation | Immediate page; incident commander; status update to stakeholders |
| P2 | Degradation with a workaround available | Business-hours ticket |
| P3 | Detection only; needs a human decision | Digest |

Two P1 examples specific to this platform, both of which are silent by nature:

- The AI is stating unverified gemological facts. No customer complains; they simply believe a wrong origin or treatment.
- A stone was sold twice. Both customers are satisfied until the second order cannot be fulfilled.

## 2. Runbook index

| ID | Scenario | Severity | Owner |
|---|---|---|---|
| RB-01 | AI grounding regression | P1 | `AI_OPERATIONS` |
| RB-02 | Availability or reservation corruption | P1 | `COMMERCE_OPERATOR` |
| RB-03 | Price anomaly | P1 | `COMMERCE_OPERATOR` |
| RB-04 | Certificate verification bypass | P1 | `TRUST_REVIEWER` |
| RB-05 | Payment divergence | P1 | `COMMERCE_OPERATOR` |
| RB-06 | Database connection exhaustion | P1 | Engineering |
| RB-07 | Redis unavailable | P2 | Engineering |
| RB-08 | Queue backlog or dead-letter storm | P2 | Engineering |
| RB-09 | Outbox backlog | P2 | Engineering |
| RB-10 | Search zero-result spike | P2 | Engineering |
| RB-11 | Asset ingest failure | P2 | Engineering |
| RB-12 | Migration stage failure | P1 | `MIGRATION_ENGINEER` |
| RB-13 | Redirect break | P2 | Engineering |
| RB-14 | WhatsApp delivery failure | P2 | `CONCIERGE_AGENT` lead |
| RB-15 | Provider outage | P2 | Engineering |
| RB-16 | Secret exposure | P1 | Security |

## 3. RB-01: AI grounding regression

**Signal:** `grounded_ratio` below 0.6, or a rising refusal rate for a field that should be answerable.

1. Disable AI synthesis with the feature flag. The store keeps working; search and browse are unaffected.
2. Check the most recent deploy: prompt version, model change, retrieval weight change, chunking change.
3. Re-run the evaluation suite against the previous known-good prompt.
4. If the regression is from a prompt or model change, roll back. Do not hot-patch a prompt in production.
5. If the regression is from data, check for a bulk price or certificate update that changed `evidence_status`.
6. Sample 20 interactions manually and confirm no unverified claim was served **before** re-enabling.
7. If any unverified claim reached a customer, assess notification scope. Trust failure, not a bug fix.

Step 6 is not optional. A metric returning to normal does not prove no incorrect statement was made.

## 4. RB-02: availability or reservation corruption

**Signal:** `ALREADY_RESERVED` spike, or a product showing available while reserved.

1. Identify affected reservations in Postgres, which is authoritative. Redis is advisory and may be discarded entirely.
2. Determine whether the cause is double booking, an unreleased reservation, or an availability write.
3. For double booking: order by `created_at`; honour the earlier reservation; contact the later customer personally before cancelling anything.
4. For an unreleased reservation: run the expiry sweeper; verify the customer's checkout state first so a live payment is not disrupted.
5. Flush the availability cache. It has a 15-second ceiling and needs no special handling beyond that.
6. Audit `audit_logs` for any availability write without an operator action behind it.

Never resolve a double booking by cancelling the earlier order. That inverts the rule that the first reservation wins.

## 5. RB-03: price anomaly

**Signal:** residual-ratio shift, a `PRICE_CHANGED` rate spike, or a customer-reported total mismatch.

1. Freeze publishing: disable price edits and publication-hold overrides.
2. Determine the scope: one product, one setting family, or everything. The scope tells you whether it is an edit or a systemic bug.
3. Compare current `price_entries` against `price_model_observations`, which holds the observed source values.
4. If the anomaly traces to a bulk operation, use the bulk undo window.
5. If orders were placed at the wrong price, follow RB-05 for the refund path.
6. Reconcile: every order total must equal `sum(components)` of its snapshot at the recorded rule version.

## 6. RB-04: certificate verification bypass

**Signal:** a field rendering as verified below `VERIFIED`, or an auto-verify rate above expectation.

1. Disable certificate auto-verification.
2. Query `verification_events` for any promotion lacking a reviewer actor. A system-only promotion to `VERIFIED` is a defect.
3. Identify affected documents and any rendered pages that displayed the field as verified.
4. Correct the `verification_status` and re-check every dependent surface.
5. Assess whether any published claim needs retraction. A wrong certificate claim is a P1 trust event.

## 7. RB-05: payment divergence

**Signal:** capture webhook lag beyond threshold, or a local order state differing from the provider.

1. **Do not retry captures automatically.** A duplicate capture is a real financial event.
2. Reconcile order by order against provider state using the idempotency key as the join.
3. For a capture recorded locally but absent at the provider, re-query before acting.
4. For a capture at the provider but absent locally, create the missing record with the provider reference; never invent a capture.
5. For a genuine double capture, refund the duplicate with a reference to both provider ids.
6. Reconcile daily regardless: `critical` queue job, `payment.reconcile`.

## 8. RB-06: database connection exhaustion

**Signal:** pool wait above threshold; `statement_timeout` errors rising.

1. Identify the offending query from `pg_stat_statements`. It is almost always a reporting or export query.
2. Shed reporting load first. It is not revenue-bearing.
3. Check for a missing index on a recently changed query.
4. Shed non-critical background queues before reducing transactional capacity.
5. **Never** shed checkout or payment to serve analytics.
6. Confirm recovery, then address the root cause before resuming background load.

## 9. RB-07: Redis unavailable

**Signal:** cache bypass rate rises to 100%.

1. No action is required for correctness. Postgres serves everything; the site is slower.
2. Rate limits fall back to `rate_limit_counters`. If that path is also unavailable, fail closed on abuse-sensitive endpoints.
3. Distributed locks fall back to Postgres advisory locks, so no lock is incorrectly released.
4. Availability reads go to Postgres uncached; the 15-second ceiling no longer applies, so **availability is now exact**. This is a degradation in latency and an improvement in accuracy.
5. Rebuild the cache gradually once Redis returns; do not warm everything at once.

## 10. RB-08: queue backlog

**Signal:** depth or oldest-job age beyond threshold.

1. Identify the queue. `critical` or `maintenance` is a P1; `assets` is a P2.
2. Check whether the cause is a slow handler, a failing dependency or insufficient workers.
3. Scale workers for `assets` and `default`.
4. For `critical`, never scale blindly: these are ordered. Scale per aggregate instead.
5. If a poison message blocks the queue, dead-letter it and continue.
6. If backlog exceeds the acceptable window, tell the affected team. A silent delay is worse than a stated delay.

## 11. RB-12: migration stage failure

1. **Do not patch the target database by hand.** Fix the code and re-run the stage.
2. Confirm the phase's gate status. A blocking gate failure means the phase did not complete.
3. Resume from the cursor. Migration jobs never blind-retry.
4. Verify the evidence package hashes are unchanged; a hash change means the source was modified, which invalidates the run.
5. Re-run the gates, not just the failing one. A parser change can affect phases already complete.
6. Confirm V17 returns a zero delta once fixed.

## 12. RB-16: secret exposure

1. Rotate immediately. Do not investigate first.
2. Review `audit_logs` and access logs for use of the exposed credential.
3. Invalidate provider-side tokens where the provider supports it.
4. Update all environments that shared the secret.
5. Record what was accessed during the exposure window, since that determines notification scope.
6. Add a detection so the same secret cannot be reintroduced: the CI secret scan.

## 13. Communication principles

| Principle | Detail |
|---|---|
| Say the impact, not just the outage | "Two stones may have been sold twice" is actionable; "elevated error rates" is not |
| Trust failures are P1 regardless of volume | One wrong origin claim is a different class of problem |
| No internal identifiers in customer communication | No customer ids, provider references or internal hostnames |
| State what you know and what you do not | A bounded "we know X, investigating Y" beats a confident guess |
| Never speculate on cause in a customer-facing update | Speculation becomes a commitment later |

## 14. Validation rules

1. Every alert links to a runbook with a named owner.
2. Every runbook is rehearsed at least once per quarter in a non-production environment.
3. A P1 runbook that has never been executed is marked unverified until it is.
4. Every runbook's signal is a metric or log query an operator can actually run.
5. No runbook instructs an operator to hand-edit production data.
6. Every data-destructive step requires a second confirmation.

## 15. Testing requirements

| Test | Proves |
|---|---|
| Alert-to-runbook link | Every alert resolves to a runbook with an owner |
| Rehearsal | Each P1 runbook is executed in staging per quarter |
| Signal validity | Every signal query returns data in a staging fixture |
| Ordering | RB-05 never triggers an automatic capture retry |
| No hand-edits | No runbook step mutates production data outside a documented tool |
| Recovery | Each rehearsal records actual timings, which replace the estimates |

## 16. Failure modes

| Failure | Behaviour |
|---|---|
| Runbook is wrong at execution time | Fix it immediately after the incident; an incorrect runbook is a finding |
| No runbook exists | Write one during the incident, then verify it in staging |
| Alert with no runbook | Treat as a P2 defect in the alerting system itself |
| Runbook depends on one person | Fix the dependency; tribal knowledge is an availability risk |
| Communication delayed | Update stakeholders with what is known, even without a resolution |

## 17. Implementation constraints

1. Every alert has an owner and a linked runbook.
2. P1 runbooks are rehearsed quarterly and marked unverified until executed.
3. No runbook step hand-edits production data.
4. Trust failures are P1 regardless of affected volume.
5. Payment captures are never retried automatically.

## Evidence status

`[INFERRED]` throughout. No operational history exists to reconstruct: the source provided no telemetry, no incident record and no on-call documentation. The scenarios are derived from the failure modes each document in this package names, which is why RB-01, RB-02 and RB-04 centre on trust and inventory failures rather than on infrastructure outages: those are the failures this domain produces, and they are the ones with no customer-visible error to trigger a support ticket.