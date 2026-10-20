-- 0020_vendor_onboarding
-- Authority: ADR-027 (jobs normalization; ratified in
-- technical_design/40_ARCHITECTURE_DECISION_RECORDS.md on 2026-10-20).
--
-- Completes audit finding F-06/M-03/R1-3: vendor profile state was the last
-- permanent entity still overloaded into the 90-day-retention `jobs` queue
-- table (queue='vendors', job_type='VENDOR_PROFILE'), which violates
-- technical_design/27 (§1: jobs is a transient work queue, not a system of
-- record) and would silently destroy vendor profiles at retention sweep time.
--
-- Expand migration (ADR-020 discipline): create the real table, idempotently
-- backfill from existing jobs rows preserving ids/timestamps, then contract by
-- deleting ONLY the migrated VENDOR_PROFILE rows (other queues untouched).

CREATE TABLE IF NOT EXISTS vendor_onboarding (
  id                UUID PRIMARY KEY,
  owner_customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  email             CITEXT NOT NULL,
  slug              TEXT NOT NULL,
  display_name      TEXT NOT NULL,
  legal_name        TEXT NOT NULL,
  country_code      CHAR(2) NOT NULL DEFAULT 'AE',
  city              TEXT NOT NULL DEFAULT 'Dubai',
  bourse_member     BOOLEAN NOT NULL DEFAULT false,
  description       TEXT,
  contact_phone     TEXT,
  status            TEXT NOT NULL DEFAULT 'PENDING'
                    CHECK (status IN ('PENDING','APPROVED','REJECTED','SUSPENDED')),
  rejection_reason  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS vendor_onboarding_owner_idx
  ON vendor_onboarding (owner_customer_id);
CREATE UNIQUE INDEX IF NOT EXISTS vendor_onboarding_slug_idx
  ON vendor_onboarding (slug);
CREATE INDEX IF NOT EXISTS vendor_onboarding_status_idx
  ON vendor_onboarding (status, created_at DESC);

-- ---------------------------------------------------------------------------
-- Idempotent backfill: jobs(queue='vendors') -> vendor_onboarding.
-- Payload columns are extracted with defaults mirroring the repository's own
-- read mapping so no live state is lost or altered.
-- ---------------------------------------------------------------------------
INSERT INTO vendor_onboarding (
  id, owner_customer_id, email, slug, display_name, legal_name,
  country_code, city, bourse_member, description, contact_phone,
  status, rejection_reason, created_at, updated_at
)
SELECT
  j.id,
  (j.payload->>'owner_customer_id')::uuid,
  lower(trim(coalesce(j.payload->>'email', ''))),
  coalesce(j.payload->>'slug', ''),
  coalesce(j.payload->>'display_name', ''),
  coalesce(j.payload->>'legal_name', coalesce(j.payload->>'display_name', '')),
  upper(coalesce(left(j.payload->>'country_code', 2), 'AE')),
  coalesce(j.payload->>'city', 'Dubai'),
  coalesce((j.payload->>'bourse_member')::boolean, false),
  j.payload->>'description',
  j.payload->>'contact_phone',
  coalesce(j.payload->>'status', 'PENDING'),
  j.payload->>'rejection_reason',
  j.created_at,
  j.updated_at
FROM jobs j
WHERE j.queue = 'vendors'
  AND j.job_type = 'VENDOR_PROFILE'
  AND (j.payload->>'owner_customer_id') IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Contract: remove the migrated rows from the queue table. Scoped strictly to
-- queue='vendors' AND job_type='VENDOR_PROFILE'; every other queue row keeps
-- its lifecycle. Safe to run alongside the old code path because the backfill
-- above already copied the data (and re-running the backfill after a rollback
-- restores it from... nowhere — hence this delete only lands with the cutover
-- commit that reads exclusively from vendor_onboarding).
-- ---------------------------------------------------------------------------
DELETE FROM jobs
WHERE queue = 'vendors' AND job_type = 'VENDOR_PROFILE'
  AND id IN (SELECT id FROM vendor_onboarding);
