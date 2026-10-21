# ADR-028 — INV-03 and INV-08 enforcement positions (row 2026-10-21 deep audit)

- **Context:** The 2026-10-21 deep audit found two invariants whose stated
  enforcement does not match their actual enforcement. INV-03 (a single
  gemstone may attach only to RING, PENDANT, NECKLACE or BRACELET — i.e. never
  to EARRINGS) is enforced only as runtime predicates: the DYO compatibility
  engine filters `s.jewellery_type <> 'EARRINGS'` in
  `findCompatibleSettingsForStone` (`packages/db/src/dyo/dyo-repository.ts:475`
  and :501). No database CHECK exists; the schema carries the INV-02 pair of
  constraints (`products_no_pair_on_non_earrings_ck`,
  `products_earrings_need_pair_ck`, added in `0005_catalog_core.sql:281-286`,
  plus the DYO-side `dyo_pair_is_earrings_ck` in `0007_dyo.sql`) but no
  single-stone counterpart. INV-08 (an inferred identifier may never become a
  confirmed external reference without `review_state='APPROVED'`) has no
  schema enforcement at all: the `review_state` enum created in
  `0002_enums.sql:13` is dead code — no column in any migration uses it — and
  the derived-SKU approval flow lives entirely at application level.

- **Alternatives:**
  - *INV-03:* (a) keep application-level enforcement only, documenting the gap
    in this ADR; (b) add the missing CHECK constraints; (c) enforce via a
    trigger.
  - *INV-08:* (a) adopt the existing `review_state` enum as a
    `gemstones.ref_review_state` column, following the TEXT + CHECK pattern
    used for `page_review_state` in `0018_cms_review_expansion.sql`; (b) decide
    explicitly that approval stays application-level (the audit's option
    labelled IIA), in which case `PROJECT_SOURCE_OF_TRUTH.md` wording must be
    amended to say so.

- **Decision (proposed, both branches open):**
  - *INV-03:* (b). A new migration adds `products_no_single_on_earrings_ck`
    alongside the existing `products_no_pair_on_non_earrings_ck` /
    `products_earrings_need_pair_ck` pair from `0005_catalog_core.sql`, plus a
    `dyo_earrings_need_single_ck`-style mirror in the `0007` DYO chain, so the
    two attachment invariants rest on the same kind of constraint. A trigger
    (c) is rejected as harder to reason about than a declarative CHECK.
  - *INV-08:* **No branch is adopted yet.** Both (a) and (b) are recorded as
    live alternatives; the client chooses. Either outcome is acceptable to the
    audit provided it is written down in an authoritative document.
  `[INFERRED / PROPOSED]`

- **Reason:** INV-01/INV-02 are enforced by named CHECK constraints; INV-03 is
  the odd one out, and a repository predicate is one refactor away from
  silence. A CHECK makes the invariant hold for every writer, including the
  migration tooling and future staff tooling, not only the DYO engine. For
  INV-08 the gap is governance rather than mechanics: either the database
  carries the review state (giving the gate a column to filter on) or the
  registry says plainly that approval is an application concern. The
  unacceptable option is the current one, where the enum exists, is cited by
  the invariant's wording, and enforces nothing.

- **Consequences:** If INV-03's branch is ratified, `expected-schema.ts` and
  `introspect.ts` must change in the same commit — the CHECK and CHECK-class
  totals (`EXPECTED_COUNTS.check`, `check_class_total`) and the
  `NAMED_INVARIANTS` list — so `pnpm run schema-fidelity` passes without
  weakening any existing assertion. INV-01 and INV-02 are never weakened:
  this ADR only adds a constraint beside them, never relaxes them. If INV-08's
  branch (a) is ratified, a migration adds the column and the approval service
  cuts over; if (b) is ratified, the `review_state` enum is either dropped in a
  follow-up migration or formally recorded as reserved, and
  `PROJECT_SOURCE_OF_TRUTH.md` gains the application-level wording. Runtime
  predicates in `dyo-repository.ts` remain in place under every branch;
  database enforcement is additive.

- **Evidence:** Runtime predicate observed at
  `packages/db/src/dyo/dyo-repository.ts:475` and :501 (`jewellery_type <>
  'EARRINGS'`), tested in `dyo-repository.spec.ts:111-138`; constraint pair at
  `0005_catalog_core.sql:281-286`; `review_state` enum created at
  `0002_enums.sql:13` with zero consuming columns across all migrations;
  `page_review_state` TEXT + CHECK pattern at
  `0018_cms_review_expansion.sql:7-16`; expected-count coupling in
  `packages/db/src/expected-schema.ts` and `packages/db/src/introspect.ts`.

- **Status:** Proposed — awaiting client ratification. Per repository rule,
  this draft is recorded here because `docs/adr/` holds future ADRs; it must
  not be marked Accepted, and no code change under either branch may land,
  until the client ratifies both positions explicitly.
