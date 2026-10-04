# 17 CERTIFICATE INTELLIGENCE

**Package:** `technical_design/` doc 17 of 40
**Authority:** `PROJECT_SOURCE_OF_TRUTH.md` sections 4.4 (D6), 8.10, 11.8, 18.
**Evidence status:** artefacts `[OBSERVED]`; document schema `[UNKNOWN]`; pipeline `[INFERRED / PROPOSED]`.

---

## Purpose

Define the pipeline end to end: upload, storage, OCR, extraction, validation, cross-check, anomaly detection, human review, verification, publication, and AI/search availability. Guarantee that unverified information is never exposed as verified.

## Evidence position

`[OBSERVED]` Certificate and appraisal artefacts exist as images on a strict path convention:

| Artefact | Observed path | Count reference |
|---|---|---|
| Stone certificate | `/stone/{gemRef}/cert/{gemRef}_nsc_web.jpg` | `entities/media/{report,appraisal}.json` |
| SARIN gemological report | `/stone/{gemRef}/sarin/{gemRef}_low_rep.jpg` | same |
| Stone appraisal | `/stone/{gemRef}/appraisal/{gemRef}_appraisal.jpg` | same |
| Configuration appraisal | `/previewandpast/{sku}/appraisal/{sku}_nsc_web.jpg` | media path stems |

`[OBSERVED]` `crawler.sqlite.documents` holds **0 rows**.

`[UNKNOWN]` Lab name, certificate number, issue date, treatment declaration, signature, report schema. No captured field contains any of them.

**Therefore: artefacts observed, schema unknown.** This is precisely why OCR adds value, and precisely why confidence must be preserved end to end.

Defect D6 in Phase 0 corrected the package's implication that no certificate artefacts exist. It did not establish a schema.

## Pipeline

```text
Upload (presigned R2 PUT)
  -> content sniff, size and dimension cap, virus scan
  -> store under certificates/{subject}/{uuid} in a PRIVATE bucket
  -> certificates row created, verification_status = UNVERIFIED
  -> CertificateUploaded event
  -> job: certificates.extract
  -> OCR / vision extraction against a strict schema
  -> Zod validation of every extracted field
  -> numeric sanity checks and unit normalisation
  -> cross-check against structured data and the source slug
  -> per-field confidence scoring
  -> anomaly detection (nine checks)
  -> route: all fields >= threshold and no ERROR anomaly -> CROSS_CHECKED
            otherwise -> REQUIRES_REVIEW, queued for a human
  -> human review
  -> CertificateApproved event
  -> verification_status = VERIFIED
  -> published to storefront, search and AI retrieval
```

## Entities

| Table | Rows at import | Purpose |
|---|---|---|
| `certificates` | one per observed artefact path | The document. No populated fields until review |
| `certificate_ocr_runs` | 0 | One per extraction attempt, with model, version, cost, latency |
| `certificate_extractions` | 0 | **One row per extracted field** with confidence and bbox |
| `certificate_anomalies` | 0 | Detected conflicts |
| `certificate_reviews` | 0 | Human decisions, including field overrides |
| `verification_events` | 0 | Append-only trust ledger |

At import, `certificates` rows are created with `kind`, subject reference, `source_url` and `verification_status='UNVERIFIED'`, and **no** lab, number or date. That is the honest starting state.

## Extraction contract

The model returns strict JSON. Free text is accepted only for fields declared free text.

```json
{
  "lab_name":   { "value": "Sarine", "confidence": 0.94, "bbox": [120,80,300,40] },
  "report_type":{ "value": "SARIN",  "confidence": 0.91, "bbox": [120,130,240,30] },
  "certificate_number": { "value": null, "confidence": 0.0, "bbox": null },
  "issue_date": { "value": "2026-03-14", "confidence": 0.88, "bbox": [420,130,180,30] },
  "stone": {
    "weight_ct": { "value": 2.87, "confidence": 0.97, "bbox": [120,220,160,30] },
    "length_mm": { "value": 9.84, "confidence": 0.93, "bbox": [320,220,140,30] },
    "width_mm":  { "value": 7.82, "confidence": 0.93, "bbox": [320,255,140,30] },
    "depth_mm":  { "value": 5.32, "confidence": 0.91, "bbox": [320,290,140,30] }
  },
  "treatments": [ { "value": "HEAT_TREATED", "confidence": 0.86 } ],
  "origin":     { "value": "Nigeria", "confidence": 0.54 }
}
```

Every field is persisted to `certificate_extractions` with `model_provider`, `model_name`, `model_version`, `prompt_version`, `bbox` and `evidence_status='INFERRED'`. A field absent from the response gets confidence **0.0**, never an implicit pass. `verification_status` defaults to `EXTRACTED` per field.

## Confidence policy

| Band | Confidence | Treatment |
|---|---|---|
| High | >= 0.90 | Auto-accepted; promoted to `CROSS_CHECKED` if cross-checks pass |
| Medium | 0.70 - 0.89 | Accepted but flagged; surfaced as "extracted, unverified" |
| Low | 0.50 - 0.69 | Routed to human review; never displayed as fact |
| Rejected | < 0.50 | Stored as rejected; the field reads as NULL everywhere |

**Document-level verification threshold: every material field >= 0.90 and no unresolved ERROR anomaly, plus human approval.** Verification is a whole-document decision, not a per-field one.

The charter's worked example is encoded literally: origin `Nigeria` at confidence 0.54 is stored as `extracted_value='Nigeria', confidence=0.54, verification_status='EXTRACTED'` and is **never** rendered as `Origin: Nigeria`.

## Cross-checks

Each check compares OCR output against structured data. These are possible precisely because the migration produced per-stone rows (ADR-009).

| Check | Rule | Severity |
|---|---|---|
| `WEIGHT_MISMATCH_SLUG` | OCR total differs from the source slug weight or `gemstones.total_weight_ct` by more than 2% | ERROR |
| `WEIGHT_MISMATCH_SUM` | for pairs, OCR weights do not sum to `total_weight_ct` | ERROR |
| `DIMENSION_IMPOSSIBLE` | implied density outside 1.5-4.5 g/cm3 for the stated species | ERROR |
| `DIMENSION_MISMATCH` | OCR dimensions differ from `gemstone_stones` by more than 5% | WARN |
| `ORIGIN_CONFLICT` | OCR origin differs from `gemstones.origin_id` | WARN |
| `TREATMENT_CONFLICT` | OCR declares a treatment that `treatments` marks `UNKNOWN` | ERROR |
| `NUMBER_MISMATCH` | certificate number present in OCR but not stored, or vice versa | WARN |
| `LOW_CONFIDENCE` | any material field below 0.85 | WARN |
| `MULTIPLE_STONES_DETECTED` | a document describes more stones than `gemstone.stone_count` | WARN |

The pair weight-sum check is only possible because `gemstone_stones` exists. Storing a concatenated weight string would have made this check impossible.

## State machine

```text
UNVERIFIED --extract--> EXTRACTED --cross-check--> CROSS_CHECKED --approve--> VERIFIED
     |                     |                            |                      |
     |                     |                            |                      +--> REJECTED
     |                     +--> REJECTED                +--> REJECTED
     +--> REJECTED
```

| From | To | Guard | Actor |
|---|---|---|---|
| UNVERIFIED | EXTRACTED | at least one field extracted | system |
| EXTRACTED | CROSS_CHECKED | all fields >= 0.85 and no ERROR anomaly | system |
| EXTRACTED | flagged for review | any field < 0.85, or a WARN/ERROR anomaly | system |
| CROSS_CHECKED | VERIFIED | reviewer approves; may override fields | human |
| any | REJECTED | reviewer rejects, or document integrity failure | human or system |

Every transition writes a `verification_events` row and an `audit_logs` row. The ledger is append-only.

## Read-model enforcement (INV-07)

`certificate_public` is the only table the storefront and the AI read:

```sql
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
```

The `LEFT JOIN LATERAL ... ORDER BY extracted_at DESC LIMIT 1` replaced an earlier `max(run_id)` formulation during Phase 0 (defect D-08), because PostgreSQL has no `max()` for `uuid`.

Because the rule lives in one view, **no caller can bypass it**. The storefront renders a value as verified truth only when `field_status = 'VERIFIED'`; otherwise it shows the value with a confidence badge and an explicit "unverified" label.

## API

| Method | Path | Auth | Idempotency |
|---|---|---|---|
| POST | `/certificates` | owner or admin | required |
| GET | `/certificates/{id}` | owner or admin | - |
| POST | `/certificates/{id}/extract` | admin | required |
| POST | `/certificates/{id}/review` | admin | required |
| GET | `/gemstones/{gemRef}/certificates` | public | - |
| GET | `/certificates/{id}/anomalies` | admin | - |
| POST | `/certificates/{id}/cross-check` | system | required |

## Validation rules

1. Upload content sniffed, not extension-trusted; size and dimension capped; animated images rejected.
2. OCR output must satisfy the extraction schema; malformed output is retried once with a stricter prompt, then dead-lettered.
3. Every numeric field is unit-normalised (ct, mm).
4. Confidence must be within [0, 1]; an out-of-range value is a schema failure.
5. A reviewer override records both the original and the override value.
6. Only a `TRUST_REVIEWER` or `ADMIN_SUPER` may approve.

## Error handling

| Code | Status | Meaning |
|---|---|---|
| `CERTIFICATE_UPLOAD_REJECTED` | 400 | Failed validation, scan or size cap |
| `CERTIFICATE_OCR_FAILED` | 422 | Extraction produced no usable output |
| `CERTIFICATE_LOW_CONFIDENCE` | 422 | Below threshold; requires review |
| `CERTIFICATE_ANOMALY` | 422 | An ERROR anomaly is unresolved |
| `CERTIFICATE_NOT_VERIFIED` | 200 with flag | Returned to the AI; never "certified" |
| `CERTIFICATE_ACCESS_DENIED` | 403 | Private document, unauthorised caller |

## Security boundaries

- Documents live in a **private** R2 bucket. Public access is disabled at the bucket level.
- Access requires an authorization check followed by a short-lived signed URL.
- Document URLs never appear in public page source.
- Every access is audited.
- OCR sends the image to a vision model; the prompt contains instructions only, and the image is treated as untrusted data that can never influence the prompt (doc 18).
- Uploaded files are virus-scanned and EXIF-stripped.

## Observability

Metrics: OCR runs, success and failure rate, mean confidence distribution, auto-verify rate, review queue depth and age, anomaly counts by type and severity, cost and latency per run. Alerts on failure-rate spikes, a mean-confidence drop (a model or prompt regression), and a growing review backlog.

## Testing requirements

| Test | Proves |
|---|---|
| Upload security | Executable, oversized, malformed and MIME-mismatched uploads rejected |
| Extraction schema | Malformed JSON rejected; strict retry; then dead-letter |
| Confidence bands | Boundary values 0.49, 0.50, 0.69, 0.70, 0.85, 0.90 behave exactly as specified |
| Charter example | Origin at 0.54 renders as extracted and unverified, never as fact |
| Each cross-check | One test per rule with synthetic fixtures |
| State machine | Legal and illegal transitions |
| View enforcement | `certificate_public` withholds below-0.50 values |
| Reviewer override | Overriding one field leaves the document status and other fields unchanged |
| Ledger | Every transition writes a `verification_events` and an `audit_logs` row |
| AI interaction | `get_certificate` returns `UNVERIFIED` for anything below `VERIFIED` |
| Access | Unauthorised callers cannot obtain a signed URL |

## Failure modes

| Failure | Behaviour |
|---|---|
| Upload fails | Retriable job; certificate stays UNVERIFIED; customer notified |
| OCR provider error | Retry on the fallback chain, then DEAD_LETTER and alert |
| Malformed OCR | Schema failure recorded; one strict retry; then review queue |
| Partial extraction | Stored with per-field confidence; routed to review |
| ERROR anomaly | Never auto-advances; review queue; storefront shows "verification pending" |
| Reviewer unavailable | Document stays EXTRACTED or CROSS_CHECKED; storefront shows unverified |
| Redis down | Job queue falls back to Postgres polling |

## Implementation constraints

1. Never auto-promote OCR to verified truth without human approval.
2. Never render a field as verified unless `field_status = 'VERIFIED'`.
3. Documents are private; signed URLs only.
4. Every transition is ledgered.
5. The AI may read certificates through the view; it may never write one.

## Evidence status

`[OBSERVED]`: the four artefact path conventions, 0 rows in `documents`. `[UNKNOWN]`: the entire document schema. `[INFERRED / PROPOSED]`: the pipeline, confidence thresholds, cross-check rules, state machine and view semantics. The view itself was created and introspected on live PostgreSQL during Phase 0, including the fix for the missing `verification_status` column on `certificate_extractions` (defect D-09).