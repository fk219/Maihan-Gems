-- 0017_trust_view
-- Authority: PROJECT_SOURCE_OF_TRUTH.md section 18.7 (statement verbatim);
-- placement per technical_design/04 section "Migration ordering": migration
-- 0017 carries the certificate_public view.
-- Read-model enforcement of INV-07: a single database view is the only thing
-- the storefront and the AI read. The storefront renders a value as verified
-- truth only when field_status = 'VERIFIED'; the view withholds values below
-- 0.50 confidence, so no caller can bypass the rule.

CREATE VIEW certificate_public AS
SELECT c.id, c.kind, c.gemstone_id, c.configuration_id, c.product_id,
       c.verification_status, c.confidence_overall, c.lab_name,
       e.field_name, e.normalized_value, e.numeric_value,
       e.confidence, e.verification_status AS field_status
FROM certificates c
LEFT JOIN LATERAL (
  SELECT x.field_name, x.normalized_value, x.numeric_value,
         x.confidence, x.verification_status
  FROM certificate_extractions x
  WHERE x.certificate_id = c.id
  ORDER BY x.extracted_at DESC
  LIMIT 1
) e ON TRUE
WHERE c.deleted_at IS NULL
  AND (e.normalized_value IS NULL OR e.confidence >= 0.50);
