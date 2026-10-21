# ADR-029 — RLS runtime roles and append-only ledger enforcement

- **Context:** The 2026-10-21 deep audit found that row-level security and the
  append-only ledger claims are declared but not operational. Migration
  `0016_rls.sql` enables RLS on 6 tables (`customers`, `addresses`, `carts`,
  `orders`, `conversations`, `messages`) with 6 policies, all `USING`-only
  (no `WITH CHECK` variants for writes). No role is created or mentioned in
  any migration: a repository-wide search finds zero `CREATE ROLE`, `GRANT` or
  `REVOKE` statements. The connection pool (`packages/db/src/pool.ts`) connects
  with `DATABASE_URL` as-is — per the dev contract, the schema owner
  (`postgres`) — for whom RLS is inert: table owners and superusers bypass
  policies unless `FORCE ROW LEVEL SECURITY` is set, which it is not.
  `orders_own` has a customer branch only, with no staff branch (unlike
  `conversations_own`, which consults `app.staff`). The append-only property
  claimed for `domain_events` and `audit_logs` is comment-only:
  `0014_operations.sql:4` and :25 state that "the application role receives no
  UPDATE or DELETE grant", but no such grant structure exists to receive.

- **Alternatives:**
  - (a) Operationalise the model: migration `0022` creates `maihan_app`,
    `maihan_app_staff` (`BYPASSRLS`) and `maihan_readonly` roles; grants
    minimal DML; re-issues the six policies as role-scoped `CREATE POLICY
    ... TO maihan_app` statements with `WITH CHECK` variants for
    writes; and `pool.ts` sets a per-connection `SET ROLE` when
    `MAIHAN_APP_ROLE` is configured, so the runtime principal is never the
    owner.
  - (b) Stay on the owner/superuser dev contract and document it honestly:
    RLS remains a defence-in-depth artefact that no current principal
    exercises, recorded as such in doc 04 and the audit ledger.

- **Decision (proposed):** Option (a), recommended by the audit. Migration
  `0022_rls_runtime_roles.sql` creates the three roles, grants the minimum DML
  each needs, converts the six policies to role-scoped policies with `WITH
  CHECK` for the write path, and `pool.ts` gains a `MAIHAN_APP_ROLE` /
  `MAIHAN_APP_STAFF_ROLE` switch that issues `SET ROLE` on connect. Option (b)
  is recorded and remains available if the client prefers to defer; **no
  hedge is accepted yet** — the choice is the client's.
  `[INFERRED / PROPOSED]`

- **Reason:** Six policies that no connecting principal ever evaluates are
  documentation, not control. The security principles in AGENTS.md section 10
  name the application service layer as the primary boundary and RLS as
  defence-in-depth — but defence-in-depth that provably never fires cannot be
  relied on in depth. Role-scoped policies with `WITH CHECK` also close the
  write-side gap that `USING`-only policies leave open: a `USING` clause alone
  lets a row be inserted that the same principal could never read back. The
  staff role gives the worker and support tooling a named, auditable principal
  instead of the owner account, and makes the append-only claim on
  `domain_events` / `audit_logs` enforceable by simply not granting UPDATE or
  DELETE to `maihan_app`.

- **Consequences:** `expected-schema.ts` / `assert-schema.ts` must pin the
  role names (and the policy-to-role mapping) so schema-fidelity fails if a
  role is renamed or a policy loses its `TO` clause. The worker connects as
  `maihan_app_staff` (`BYPASSRLS`), with every bypass recorded per the intent
  already noted in `0016_rls.sql:67`. The test suite gains RLS-bound
  integration tests — connecting as each role and asserting that the policies
  now actually filter (audit findings PB-6 / R4-3) — so the runtime contract
  is regression-tested rather than assumed. `orders_own` gains its staff
  branch in the same migration, matching `conversations_own`. The `SET ROLE`
  switch must be a no-op when `MAIHAN_APP_ROLE` is unset, preserving the
  current local/Codespace dev contract unchanged.

- **Evidence:** `0016_rls.sql` (6 `ENABLE ROW LEVEL SECURITY` statements at
  lines 11-21; policies at lines 26-64, all `USING`-only; `orders_own` at
  lines 44-48 without a staff branch; `BYPASSRLS` mentioned only in a comment
  at line 67); `packages/db/src/pool.ts:40-47` (connection string used as-is,
  no role handling); `0014_operations.sql:4` and :25 (append-only claim as a
  comment only); repository-wide search: no `CREATE ROLE` / `GRANT` /
  `REVOKE` / `SET ROLE` statement exists in any migration or source file.

- **Status:** Proposed — awaiting client ratification. This draft is recorded
  in `docs/adr/` because that directory holds future ADRs; per repository rule
  it must not be marked Accepted, and migration `0022` must not be written,
  until the client ratifies the option.
