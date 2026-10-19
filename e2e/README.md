# e2e/ — Playwright specs (ADR-021 ACCEPTED 2026-10-07).

ADR-021 is **Accepted** (see technical_design/40 and the resolution note in
INITIAL_IMPLEMENTATION_PLAN.md section 23.4): Playwright is the E2E driver and
is already a devDependency of apps/web. The prior "empty by design" freeze is
lifted.

The browser E2E specs required by plan section 23.1 (critical journeys in a
real browser, every PR) are still TO BE WRITTEN — the HTTP-level journeys are
covered by apps/web/src/api/ecommerce-e2e.spec.ts (Vitest, in-process API).
Adding Playwright specs and their config here is the remaining work; nothing
blocks their installation any more.
