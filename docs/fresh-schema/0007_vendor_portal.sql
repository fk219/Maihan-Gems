-- FRESH CLEAN SCHEMA — 0007 vendor portal (technical_design/43 §3)
-- Supply side: onboarding + submissions + moderation. Only APPROVED submissions
-- enter the catalogue (app mints our semantic code via code_counters).

BEGIN;

CREATE TABLE fresh.vendor_onboarding (
  id           bigserial PRIMARY KEY,
  vendor_id    bigint NOT NULL UNIQUE REFERENCES fresh.vendors(id) ON DELETE CASCADE,
  legal_name   text NOT NULL,
  contact_name text NOT NULL,
  email        text NOT NULL,
  phone        text,
  website      text,
  country      char(2),
  tax_id       text,
  status       text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','SUSPENDED','REJECTED')),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at  timestamptz,
  reviewed_by  text,
  note         text
);

CREATE TABLE fresh.vendor_submissions (
  id              bigserial PRIMARY KEY,
  vendor_id       bigint NOT NULL REFERENCES fresh.vendors(id) ON DELETE CASCADE,
  submission_kind text NOT NULL CHECK (submission_kind IN ('gemstone','setting','product')),
  payload         jsonb NOT NULL,                    -- vendor fields incl. their vendor_ref
  status          text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','SUBMITTED','APPROVED','REJECTED')),
  reviewer_note   text,
  reviewed_by     text,
  resulting_ref   text,                              -- our semantic code once approved
  created_at      timestamptz NOT NULL DEFAULT now(),
  reviewed_at     timestamptz
);
CREATE INDEX vendor_submissions_vendor_idx ON fresh.vendor_submissions (vendor_id, status);

COMMIT;
