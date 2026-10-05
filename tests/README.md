# tests/ — empty by design. ADR-021 is OPEN.
#
# Integration, security and load specs live here (technical_design/03). The
# runner is NOT selected: technical_design/40 ADR-021 is Proposed, not Accepted,
# and technical_design/02 lists the unit runner as OPEN.
#
# SKILL_MATRIX_AND_TOOLING.md 13.4 forbids installing any test framework until
# ADR-021 is resolved. This includes the unit runner, the property-testing
# library, the E2E driver, the load tool, the accessibility auditor, the secret
# scanner, the PII scanner and the AI evaluation harness.
#
# One exception exists and is NOT exercised by this task: SKILL_MATRIX 7.3
# permits preparing test FIXTURES and test DATA, because they are data rather
# than framework. The observed 1,024-SKU corpus is such a fixture and is
# required regardless of runner. It cannot be prepared here anyway: it lives in
# the source archive, which is absent from this environment.
#
# No spec and no runner config may be added here before ADR-021 is resolved.
