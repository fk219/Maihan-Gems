-- 0018_cms_review_expansion
-- Phase 12 Stage B: the CMS review ledger (doc 22 §4 / plan task 2-3).
-- Forward-only, expand-only: no columns dropped, no constraints weakened.
-- The locked `pages.status` CHECK (DRAFT|PUBLISHED|ARCHIVED) is untouched;
-- the IN_REVIEW workflow state lives here — a page is IN_REVIEW exactly when
-- its head revision carries review_state='IN_REVIEW'.
CREATE TABLE IF NOT EXISTS page_review_state (
  revision_id  UUID PRIMARY KEY REFERENCES page_revisions(id) ON DELETE CASCADE,
  review_state TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (review_state IN ('PENDING','IN_REVIEW','APPROVED','REJECTED')),
  approved_by  UUID,
  decided_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS page_review_state_state_idx ON page_review_state (review_state);
CREATE INDEX IF NOT EXISTS page_review_state_decided_idx ON page_review_state (decided_at);
