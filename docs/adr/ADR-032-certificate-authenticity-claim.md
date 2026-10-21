# ADR-032 — What the certificate programme claims to customers

- **Context:** Certificates reach customers only through the INV-07 read
  model: the `certificate_public` view withholds extraction rows below 0.50
  confidence and exposes per-field `verification_status`
  (`packages/db/migrations/0017_trust_view.sql:10-25`; carried by
  `0010_trust.sql:5`); the repository reads nothing else for public display
  (`packages/db/src/certificate/certificate-repository.ts:16`, :332-340), and
  `EXPECTED_VIEWS` pins the view in schema fidelity
  (`packages/db/src/expected-schema.ts:320`). The charter makes certificate
  processing a major differentiator and forbids treating OCR output as
  automatically authoritative
  (`DISTINGUISHING_SAUCE_MASTER_ARCHITECTURE.md:842-871`); the approved
  customer-facing fallback wording is "on file, not yet verified" for anything
  without `verification_status='VERIFIED'`
  (`SKILL_MATRIX_AND_TOOLING.md:1311`). Independent lab-authenticity
  verification — calling GIA/IGI (and similar) portals to confirm a report
  number against the filed document — is NOT implemented and is a deferred
  decision: `SKILL_MATRIX_AND_TOOLING.md:721` records "Lab API integration
  deferred. No automated verification without human approval", and :800 keeps
  it "Deferred | Only if a lab integration requirement appears". The worker has
  no provider integration
  (`apps/worker/src/dispatch/jobs-runner.ts:182`), and the storefront
  `certificates` table stores `lab`, `report_number` and a `verify_url`
  reference plus a `verified_status` flag that nothing sets from a lab portal
  (`packages/db/storefront-migrations/0019_storefront_schema.sql:323-340`).

- **Alternatives:**
  - (a) Independent verification in scope: build a lab-portal verifier that
    confirms report numbers (and, where labs allow, field values) against GIA,
    IGI and other portals, recording each result with its own verification
    status.
  - (b) Out of scope, with explicit customer wording on PDP and policy pages:
    documents are reproduced as filed, not independently verified.
  - (c) Partial: verify GIA report numbers only, since GIA's public
    report-check is the most automation-friendly; other labs (GRS, SSEF, and so
    on) stay "as filed".

- **Decision (proposed, no branch adopted yet):** No branch is adopted. All
  three are recorded as live alternatives; the choice is a client decision
  because it sets a public trust claim, which is commercial posture, not a
  technical detail. `[INFERRED / PROPOSED]`

- **Reason:** The distinguishing-sauce charter makes trust a USP, and the
  strongest trust claim the system can honestly make today is transparency:
  what is shown is what was filed, with confidence and verification status
  exposed, never more. Claiming independent verification in customer-facing
  wording before a verifier exists would contradict INV-07's purpose (a
  document field that is not VERIFIED may never render as verified truth) and
  the charter's "never treat OCR output as automatically authoritative". The
  wording must therefore be decided deliberately, per branch, before launch.

- **Consequences:** Under (a), PDP/policy wording may say reports are
  independently confirmed, but a lab-portal match is not attribute truth —
  per-field INV-07 rendering still governs, each verification outcome needs its
  own recorded status and timestamp, and portal outages must fail as "not yet
  verified", never as verified. Under (b), PDP and policy pages must carry
  wording equivalent to "documents are reproduced as filed, not independently
  verified", the existing "on file, not yet verified" fallback stays the only
  verified-sounding boundary, and the trust story rests on transparency. Under
  (c), wording must name which labs are checkable, so customers with GRS or
  SSEF documents are not misled by a generic verification claim, and the
  mixed state must render distinctly per certificate. Under every branch,
  `certificate_public` and the storefront read path are unchanged.

- **Evidence:** View definition and 0.50 withholding at
  `packages/db/migrations/0017_trust_view.sql:10-25`; read-model-only access at
  `packages/db/src/certificate/certificate-repository.ts:16` and :332-340;
  view pinned at `packages/db/src/expected-schema.ts:320`; differentiator and
  OCR-authority rules at
  `DISTINGUISHING_SAUCE_MASTER_ARCHITECTURE.md:842-871`; deferral and wording
  policy at `SKILL_MATRIX_AND_TOOLING.md:721`, :800 and :1311; absent provider
  integration at `apps/worker/src/dispatch/jobs-runner.ts:182`; certificate
  fields including unused `verify_url` at
  `packages/db/storefront-migrations/0019_storefront_schema.sql:323-340`.

- **Status:** Proposed — awaiting client ratification. Per repository rule,
  this draft is recorded in `docs/adr/` because that directory holds future
  ADRs; it must not be marked Accepted, and no verifier build or public wording
  change may land until the client ratifies a branch explicitly.
