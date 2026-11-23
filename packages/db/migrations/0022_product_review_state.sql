-- 0022_product_review_state
-- INV-08 — the derived-identity review decision becomes an explicit column.
--
-- ADR-024 rejects evidence and approval facts held in JSON blobs: they are not
-- filterable, indexable or gate-enforceable in an incident. The Phase 12 Stage E
-- workaround wrote `derived_identity_review.review_state` into
-- `products.structured_extra`; this migration promotes the decision to real
-- columns so the queue and the INV-08 gate filter on an indexed value.
--
-- Expand-only: four NULLABLE columns, one FK and one partial index. No column
-- is dropped, no constraint is weakened and `structured_extra` is not modified.
-- The historical JSON key stays on existing rows as an untouched record, but no
-- application read path uses it after this migration.
--
-- `review_state` is nullable on purpose: NULL means "no decision recorded"
-- (the queue's UNREVIEWED sentinel). The backfill marks every derived identity
-- PENDING so the queue state is explicit rather than implied by absence;
-- non-derived products stay NULL and are outside the INV-08 queue.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS review_state TEXT
    CHECK (review_state IN ('PENDING', 'APPROVED', 'REJECTED')),
  ADD COLUMN IF NOT EXISTS review_note TEXT,
  -- Reviewer identity is a real user row, never free text.
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
--> statement-breakpoint

-- Backfill from the JSON-era workaround. An existing APPROVED/REJECTED decision
-- is carried forward verbatim so a decided row cannot be re-decided after the
-- cut-over; every other derived identity starts PENDING. The JSON is read here
-- once and left in place byte-for-byte.
UPDATE products
   SET review_state = CASE
         WHEN structured_extra #>> '{derived_identity_review,review_state}'
              IN ('APPROVED', 'REJECTED')
           THEN structured_extra #>> '{derived_identity_review,review_state}'
         ELSE 'PENDING'
       END
 WHERE source_sku IS NULL
   AND source_sku_derived IS NOT NULL
   AND review_state IS NULL;
--> statement-breakpoint

-- The queue filters on the decision and the INV-08 gate reads it directly; a
-- partial index keeps the index small because the vast majority of products
-- carry no review decision at all.
CREATE INDEX IF NOT EXISTS products_review_state_idx
  ON products (review_state)
  WHERE review_state IS NOT NULL;
