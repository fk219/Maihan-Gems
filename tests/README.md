# tests/ — integration, security and load specs (ADR-021 ACCEPTED 2026-10-07).

ADR-021 is **Accepted** (see technical_design/40 and the resolution note in
INITIAL_IMPLEMENTATION_PLAN.md section 23.4): Vitest covers unit, domain,
integration and contract layers, and its suites already live next to the code
they test (`packages/**/src/**/*.spec.ts`, `apps/web/src/api/*.spec.ts`). The
prior "empty by design" freeze is lifted.

Still open per ADR-021's resolution note: the LOAD-TEST tool (k6 candidate)
was never selected — it remains a deferred decision. Security-matrix and
chaos specs may be added here freely.
