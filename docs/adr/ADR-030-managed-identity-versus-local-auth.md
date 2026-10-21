# ADR-030 — Managed identity (IdP) versus the local scrypt auth stack

- **Context:** The architecture hierarchy assumed a managed identity provider:
  `technical_design/09_AUTH_AND_SECURITY.md:23` states `[INFERRED / PROPOSED]` a
  managed identity provider, with "No local password table. No password hashing
  code. No credential storage" (:29). No provider was ever named, and
  `SKILL_MATRIX_AND_TOOLING.md:1134` still lists any authentication library or
  provider as NOT APPROVED. In parallel, a real local auth stack was built and
  tested: memory-hard scrypt (N=16384, r=8, p=1, 16-byte salt, 64-byte key,
  `timingSafeEqual`) in `packages/db/src/auth/auth-repository.ts:83-114`;
  HMAC-SHA256-signed session tokens whose raw value is stored only as a SHA-256
  hash at rest (:143-161, :339-357); brute-force lockout after 5 failed
  attempts in a 15-minute window (:87-88, :633-654); revoke-all-sessions on
  password reset (:972-973); dummy-hash verification to prevent timing
  enumeration (:116, :594); fail-closed `MAIHAN_SESSION_SECRET` in fail-closed
  mode (:91-100). Covered by `packages/db/src/auth/auth-repository.spec.ts`.
  The schema keeps the managed-identity seam: `customers.identity_user_id` is
  commented "managed auth provider subject" (`0009_commerce.sql:11`) and six
  RLS policies compare it to `app.user_subject` (`0016_rls.sql:27-64`), but the
  local stack populates it itself (`auth-repository.ts:402`).

- **Alternatives:**
  - (a) Adopt a managed IdP (e.g. managed OIDC) for the storefront, migrating
    existing local sessions: map `identity_user_id` to the provider subject,
    accept that local `auth_sessions` rows cannot be translated into provider
    sessions (users re-authenticate once), and leave the RLS join unchanged
    because it is a string comparison, not an IdP dependency.
  - (b) Keep the local stack and amend doc 09 to say so — recommended
    short-term, because the stack is built, tested, and its controls (scrypt,
    HMAC, lockout, revoke-on-reset) are reviewed code rather than a promise.
  - (c) Hybrid: IdP for customers, local stack for staff/vendors. Two identity
    planes, two session lifecycles, and an RBAC bridge between them.

- **Decision (proposed, no branch adopted yet):** No branch is adopted. (b) is
  recorded as the recommended short-term position given the stack is built and
  tested; (a) and (c) remain live alternatives. The client chooses, and the
  outcome must be written into doc 09 and `SKILL_MATRIX_AND_TOOLING.md` §13
  before any cutover code lands. `[INFERRED / PROPOSED]`

- **Reason:** The only inconsistency is documentary, not mechanical: doc 09
  forbids a local password table while `auth_credentials` is one. Either the
  document moves (b)/(c) or the implementation moves (a). A silent drift in
  either direction is the unacceptable state, because the security posture that
  reviewers audit would no longer match the document that claims it. Under
  every branch, RLS keeps working unchanged, since `identity_user_id` vs
  `app.user_subject` is provider-agnostic.

- **Consequences:** (a) An IdP introduces an external dependency requiring an
  ADR under repository rule 5, session-migration tooling, and a one-time forced
  re-authentication; doc 09 already accepts re-authentication rather than
  silent trust on session loss. (b) Doc 09's "no local password table" line is
  superseded with the local control set described in its place;
  `SKILL_MATRIX_AND_TOOLING.md` gains the local stack as the approved
  mechanism; future IdP adoption remains possible via `identity_user_id`. (c)
  The RBAC bridge becomes the hardest component; vendor onboarding
  (`auth-repository.ts:432-467`) must be pinned to one plane. No existing
  invariant is relaxed under any branch.

- **Evidence:** Local stack as cited above in
  `packages/db/src/auth/auth-repository.ts` and its spec; IdP assumption at
  `technical_design/09_AUTH_AND_SECURITY.md:21-33`; schema seam at
  `packages/db/migrations/0009_commerce.sql:11`; RLS join at
  `packages/db/migrations/0016_rls.sql:27-64`; provider-not-named and
  client-decision status at `SKILL_MATRIX_AND_TOOLING.md:1134` and :1247.

- **Status:** Proposed — awaiting client ratification. Per repository rule,
  this draft is recorded in `docs/adr/` because that directory holds future
  ADRs; it must not be marked Accepted, and no cutover, provider contract, or
  doc 09 amendment may land until the client ratifies a branch explicitly.
