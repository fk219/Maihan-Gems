# 24 ASSET AND MEDIA ARCHITECTURE

**Package:** `technical_design/` doc 24 of 40
**Authority:** `PROJECT_SOURCE_OF_TRUTH.md` section 27.
**Evidence status:** `[OBSERVED][VERIFIED]` for volumes and hosts; `[INFERRED]` for the classification and pipeline.

---

## Purpose

Define media classification, the ingestion pipeline, storage and delivery, variant generation, private document handling, and the disposition of the roughly 174,000 chrome records.

## 1. Evidence position

`[OBSERVED][VERIFIED]` **241,961 media records** across **5 hosts** and **3,749 path stems**.

`[DEFECT D7]` **94.7%** carry `role='unknown'`, so the captured classification is unusable as imported.

`[DEFECT D4]` **7,778 records** are JavaScript bundles misfiled as 3D or 360 media.

The volume is the design driver. Roughly 174,000 records are site chrome and roughly 44,480 are genuine product media, so the pipeline must dispose of most of the dataset explicitly rather than importing it.

## 2. Re-classification rules

The path stem becomes the classifier. Deterministic, complete, and it replaces the unusable `role` field entirely.

| Path stem | `kind` | `role` | Fetch priority |
|---|---|---|---|
| `stone/{ref}/image` | IMAGE | PRIMARY or GALLERY | P0 |
| `stone/{ref}/lifestyleimage` | LIFESTYLE | GALLERY | P1 |
| `stone/{ref}/cert` | CERTIFICATE | CERTIFICATE | P1, private |
| `stone/{ref}/sarin` | REPORT | REPORT | P1, private |
| `stone/{ref}/appraisal` | APPRAISAL | APPRAISAL | P1, private |
| `setting/{code}/image` | IMAGE | GALLERY | P0 |
| `previewandpast/{sku}/image` | IMAGE | PREVIEW_RENDER | P1, regenerable |
| `previewandpast/{sku}/appraisal` | APPRAISAL | APPRAISAL | P1, private |
| `prongs/{code}/image` | IMAGE | DETAIL | P2 |
| `images/normal/mainMenu` | IMAGE | LOGO | skip: site chrome |
| `images/normal/packaging` | IMAGE | PACKAGING | P2, global |
| `images/normal/filters` | IMAGE | OTHER | skip: UI swatches |
| `images/normal/details` | IMAGE | DETAIL | P2, global |
| `images/normal/logos`, `layout`, `hi-res` | IMAGE | LOGO | skip |
| `phone-video.../thumbnails/` | IMAGE | THUMBNAIL | P2 |
| `phone-video.../mp4/` | VIDEO_360 | GALLERY | P2, lazy |
| `static/images/*.jpg` (47thst) | IMAGE | OTHER | skip: chat vendor |
| `/_nuxt/*.js` | OTHER | OTHER | **skip: JavaScript, per D4** |

Two consequences that change the import shape:

1. **~174,000 of 241,961 records are site chrome.** They are recorded as global assets, never attached to products. Importing them per-product would multiply the asset table by an order of magnitude for zero benefit.
2. **~44,480 records are genuine product media**, concentrated on a few thousand distinct source URLs once deduplicated by `checksum_sha256`.

## 3. Ingestion pipeline

```text
Source URL (from media_analyzed, preserved verbatim)
  -> classify by host and path stem                     (deterministic, section 2)
  -> skip chrome, JavaScript and vendor assets
  -> deduplicate by checksum_sha256
  -> HEAD: content-type, bytes, last-modified
  -> fetch to a temporary R2 prefix
  -> validate: really an image or video, sane dimensions, not an error page
  -> strip EXIF, especially GPS
  -> generate variants: thumb-200, card-400, hero-750, zoom-1500, webp, avif
  -> write asset + asset_variants rows
  -> attach via asset_usages to the owning entity
  -> emit AssetProcessed
```

| Decision | Rationale |
|---|---|
| `source_url` retained verbatim | The provenance chain back to the evidence package is never broken |
| `role='unknown'` discarded, stem-derived kept | Original preserved in `metadata` for audit |
| Deduplicate by checksum before fetching | Avoids paying for the same bytes thousands of times |
| Fetch by priority P0/P1/P2 | A usable storefront lands before the long tail completes |
| EXIF stripped before any variant | GPS in a stone photo is a privacy leak; stripping after variants would re-leak it |
| Not-an-image validation | Source hosts return HTML error pages with 200 status; content sniffing catches it |

The HTML-error-page case is the common failure mode in any legacy media import, and content sniffing rather than content-type is what catches it.

## 4. Storage and delivery

| Layer | Technology | Purpose |
|---|---|---|
| Durable object store | Cloudflare R2 | originals and derived renditions |
| Image CDN | ImageKit | format negotiation, resizing, quality, focal points |
| Private documents | R2 private bucket plus signed URLs | certificates, reports, appraisals |
| Video | R2 plus CDN, HLS where needed | 360-degree and white-glove video |

`assets.processing_state` values: `PENDING`, `FETCHING`, `VALIDATING`, `PROCESSING`, `READY`, `FAILED`, `SKIPPED`.

`SKIPPED` with a reason is a **first-class terminal state**. Without it, ~50% of the dataset would be silently dropped, and a silent drop is indistinguishable from a fetch failure. Explicit disposition means every one of the 241,961 records ends in a known state with a recorded reason.

## 5. Variant strategy

| Variant | Size | Use |
|---|---|---|
| thumb | 200 | search results, cart line items |
| card | 400 | listing cards, comparison rows |
| hero | 750 | product hero, collection headers |
| zoom | 1500 | product detail zoom |
| formats | WebP, AVIF | negotiated by the CDN |

| Rule | Detail |
|---|---|
| Source of truth | The original in R2; variants are regenerable |
| Focal point | Per-entity, set by a curator, honoured by the CDN for `hero` and `zoom` |
| Regeneration | A new variant set is a job; originals are never rewritten |
| `SKIPPED` for unnecessary renditions | A thumbnail-only asset does not get a 1500 zoom |

Focal points matter more than usual here because jewellery and gemstones are photographed on plain backgrounds where a naive centre crop frequently cuts off a ring's band.

## 6. Private documents

Certificate, report and appraisal artefacts follow the four observed path conventions (doc 17) and are handled as private from the first byte:

| Control | Detail |
|---|---|
| Bucket | Private R2 bucket; public access disabled at the bucket level |
| Delivery | Short-lived signed URLs, authorization checked before signing |
| Provenance | Never in public page source, never in a sitemap, never in an `og:image` |
| Audit | Every access logged |
| EXIF | Stripped on ingest, same as public media |

Certificates must not appear in an Open Graph image. A grading report is commercially sensitive, and leaking one through a social preview is a real and common failure.

## 7. Entities

| Table | Purpose |
|---|---|
| `assets` | one row per distinct object: source_url, kind, role, checksum, bytes, dimensions, state, skip reason |
| `asset_variants` | asset, variant name, format, width, height, bytes, key |
| `asset_usages` | asset, entity type, entity id, role, sort order |
| `webar_assets` | the 3D pipeline (doc 21) |

`asset_usages` rather than a column on `assets`, because a single asset legitimately serves multiple entities after deduplication: the same image can be primary on one product and gallery on another.

## 8. Validation rules

1. Every asset ends in `READY`, `FAILED` or `SKIPPED` with a reason. No other terminal state is permitted.
2. `checksum_sha256` is unique per distinct object; duplicates share one asset row.
3. `kind` and `role` are stem-derived; an imported `role='unknown'` never survives as a classification.
4. Content is sniffed, never trusted from content-type.
5. Dimensions must be within a sane range; anything else is `FAILED`.
6. EXIF is stripped before variant generation.
7. Private documents are never served from a public bucket or a permanent URL.
8. `source_url` is non-null on every imported asset.

## 9. API

| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/assets` | `CATALOG_MANAGER` | filtered, server-paginated |
| GET | `/assets/{id}` | `CATALOG_MANAGER` | includes usages and variants |
| POST | `/assets/upload-url` | `CATALOG_MANAGER` | presigned PUT to a temp prefix |
| POST | `/assets/{id}/attach` | `CATALOG_MANAGER` | creates an `asset_usages` row |
| PATCH | `/assets/{id}/focal-point` | `CATALOG_MANAGER` | per-entity focal point |
| POST | `/assets/{id}/reprocess` | `CATALOG_MANAGER` | regenerates variants |
| GET | `/documents/{certificateId}/url` | owner or `TRUST_REVIEWER` | short-lived signed URL, audited |
| GET | `/media/report` | `READ_ONLY_ANALYST` | state counts, skip reasons, orphans |

## 10. Error handling

| Code | Status | Behaviour |
|---|---|---|
| `ASSET_FETCH_FAILED` | job retry | backoff, then `FAILED` with the reason |
| `ASSET_NOT_AN_IMAGE` | job | `FAILED`; HTML error page returned with 200 |
| `ASSET_SOURCE_UNREACHABLE` | job | `FAILED`; flags a vendoring requirement |
| `ASSET_OVER_DIMENSION_LIMIT` | job | `FAILED`, recorded, not silently downscaled |
| `VARIANT_GENERATION_FAILED` | job retry | original still `READY`; degradation is explicit |
| `SIGNED_URL_DENIED` | 403 | authorization failed before signing |
| `ASSET_NOT_FOUND` | 404 | unknown id |

## 11. Security boundaries

- Private buckets for certificates, reports and appraisals; public access disabled.
- Short-lived signed URLs only, always after an authorization check.
- EXIF stripped on ingest, GPS included.
- Uploads are content-sniffed, size-capped and virus-scanned.
- No document URL in page source, sitemaps or social metadata.

## 12. Observability

Metrics: assets by state, skip reasons, fetch success rate by host, dedupe ratio, variant generation latency, bytes stored, private-document access count, orphan count. Alerts on a rising fetch failure rate for a host (vendor risk) and on the orphan count (ingestion bug).

The dedupe ratio is worth watching explicitly: if it drops below expectation, something is defeating the checksum and the import cost rises with it.

## 13. Testing requirements

| Test | Proves |
|---|---|
| Classification | Every one of the 3,749 path stems maps to the expected kind and role |
| D4 exclusion | No `/_nuxt/*.js` record becomes an asset |
| Chrome disposition | All ~174,000 chrome records are `SKIPPED` with a reason, not dropped |
| Dedupe | Identical checksums produce one asset row and multiple usages |
| Content sniffing | An HTML page served as 200 is `FAILED` |
| EXIF | GPS is absent from every variant |
| Private documents | No certificate URL is publicly reachable without a valid signed URL |
| Regeneration | Variants rebuild from the original without refetching |
| Focal point | `hero` and `zoom` crops honour the stored focal point |
| State completeness | Every ingested record reaches a terminal state with a reason |

## 14. Failure modes

| Failure | Behaviour |
|---|---|
| Source host unreachable | `FAILED` with `ASSET_SOURCE_UNREACHABLE`; vendoring task raised |
| HTML error page with 200 | Sniffing catches it; recorded as `FAILED` |
| R2 unavailable | Ingest pauses; the storefront serves what is already `READY` |
| ImageKit unavailable | R2 originals still serve; degradation is visible, not a blank image |
| Variant job backlog | Originals render; the dashboard shows the backlog |
| Duplicate asset explosion | Checksum dedupe; ratio monitored |
| Privacy leak of a certificate | Private bucket plus signed URLs; a public URL is a security incident, not a bug |

## 15. Implementation constraints

1. The path stem is the classifier; imported `role` values are never trusted.
2. `SKIPPED` with a reason is terminal and mandatory; no silent drops.
3. `source_url` is always retained, so provenance is never broken.
4. Certificates, reports and appraisals are private from ingest to delivery.
5. EXIF is stripped before variants are generated.

## Evidence status

`[OBSERVED][VERIFIED]`: 241,961 records, 5 hosts, 3,749 path stems, 94.7% `role='unknown'` (D7), 7,778 misfiled JavaScript bundles (D4), the four private-document path conventions, and `phone-video` 360 media. `[INFERRED]`: the classification table, the ~174,000/~44,480 split (arithmetic from the observed counts, not an observed partition), the pipeline order, variant set and delivery topology.