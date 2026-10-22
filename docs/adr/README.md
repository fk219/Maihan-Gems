# Phase 1 Task 1 — workspace skeleton.
#
# This directory holds the ADR markdown files (technical_design/03).
#
# The 24 ADRs currently live in technical_design/40_ARCHITECTURE_DECISION_RECORDS.md,
# which is the rank-3 authority for all ADR text. They are NOT duplicated here.
#
# The migration target for this directory is unresolved and is NOT a Task 1
# decision:
#
#   - technical_design/03 says "ADR markdown (doc 40)" — ambiguous between
#     "the ADRs described in doc 40" and "a copy of doc 40".
#   - Whether the accepted ADRs are MOVED into docs/adr/ as individual files, or
#     whether doc 40 stays canonical and docs/adr/ holds only future ADRs, is a
#
# Drafts added during the audit remediation (all Proposed until ratified):
#   ADR-028 invariants, ADR-029 RLS runtime, ADR-030 identity, ADR-031 payouts,
#   ADR-032 authenticity claim, ADR-033 FX/currency lock, ADR-034 RMA+saved-DYO.
#     plan-owner decision. Moving them would break the rank-3 authority chain in
#     AGENTS.md section 3, and every cross-document "doc 40" reference.
#
# No files are created here until that is decided. ADR governance that IS
# already binding: a superseded ADR is never deleted, the reasoning chain is
# preserved, and two reviewers are required for any decision affecting money,
# inventory or trust.
