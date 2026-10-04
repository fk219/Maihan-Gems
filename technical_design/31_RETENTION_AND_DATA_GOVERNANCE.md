# 31 RETENTION AND DATA GOVERNANCE

**Package:** `technical_design/` doc 31 of 40
**Authority:** `PROJECT_SOURCE_OF_TRUTH.md` section 41, NFR-09, NFR-08.
**Evidence status:** `[OBSERVED]` for the source-evidence retention classes; `[INFERRED]` for runtime retention policy.

**Nothing has been deleted. This document is a recommendation only.**

## 1. Two distinct problems

| Problem | Subject | Risk if wrong |
|---|---|---|
| Evidence retention | The crawler artefacts under `naturalgemstones/` and `reverse_engineered/` | Irrecoverable loss of facts that cannot be re-derived |
| Runtime retention | Customer, conversation, telemetry and job data in the new platform | Regulatory exposure and unbounded growth |

Evidence retention is the higher-stakes of the two, because several artefacts **cannot be recreated by re-crawling**: a dead source host, a changed page, or a lost price that existed only in a JSON-LD blob.

## 2. Evidence retention

### A. Must remain permanently

| Item | Reason |
|---|---|
| `crawler.sqlite` (+ `-wal`, `-shm`) | The only relational source of truth. `documents`, `links` and `media_assets` are 0 rows, but the **schema** is the only record of what the crawler intended to capture. Cheap to keep, impossible to recreate. Checkpoint the WAL before archiving, or the 26 MB `-wal` may hold committed rows absent from the main file |
| `urls.jsonl` (30.5 MB) | **The migration spine.** All 44,218 URLs, including the 33,934 commerce URLs absent from `products.jsonl` |
| `specifications.jsonl` (4.9 MB) | The 13 gemstone attribute fields for 1,024 products, and the D9 concatenated values |
| `pages_analyzed.jsonl` (468 MB) | **The only source of price, availability and JSON-LD.** Deleting it loses all 1,024 prices permanently (D8). The highest-value large file |
| `products.jsonl` (929 KB) | Observed `product.sku` ground truth, required to validate the slug parser (V3) |
| `media_analyzed.jsonl` (179 MB) | The asset URL inventory with host and path stem, the basis for asset classification |
| `entities/media/report.json`, `appraisal.json` (63 KB) | The only structured evidence that certificate and report artefacts exist (D6) |
| `raw/source_snapshots/manifest.jsonl` (24 MB) | HTML SHA-256 hashes, enabling integrity verification of any re-crawl |
| `taxonomy.json` (26 KB) | Field value distributions with counts, used to seed reference data and validate normalizers |
| `PROJECT_SOURCE_OF_TRUTH.md` | The durable reference |

`pages_analyzed.jsonl` at 468 MB is the clearest case in the entire package: its size makes it look disposable, and its loss would permanently destroy the only record of what every product cost.

### B. Safely consolidated, then archivable

| Item | Consolidated into |
|---|---|
| `route_patterns.json`, `architecture/routes/*` | Route map and cardinalities (doc 33, doc 34) |
| `database_blueprint.json`, `schema/proposed_database/*` | Superseded by the validated schema (doc 04); the blueprint was explicitly `INFERRED` and is now obsolete |
| `conceptual_entities.json`, `functional_model.json` | Domain model (doc 05) |
| `ai_context/**` | Functional requirements, domain, observability, testing |
| `architecture_handoff/**` | ADRs, known unknowns, phases |
| `00_README.md` through `20_VALIDATION_AND_QA*` | Evidence hierarchy and summary |
| `qa_report*.json`, `dataset_manifest.json`, `validation/validation_report.json` | Defect register (docs 33, 39) |
| `schema.json`, `table_summaries.json`, `database_inventory.json` | Database architecture (doc 04) |
| `exports/*.csv`, `exports/products.jsonl` | Redundant with the JSONL datasets and `crawler.sqlite` |
| `examples/**` | Worked examples |
| `entities/products/*.json`, `all_*.json` | Redundant with `crawler.sqlite.products` plus the JSONL datasets |

Consolidation is only legitimate when the destination genuinely contains the information. Archiving a file whose content was summarised rather than preserved is data loss wearing a filing label.

### C. Can be regenerated

| Item | Regeneration path |
|---|---|
| `pages.jsonl` | Query `crawler.sqlite` |
| `relationships.jsonl` | Re-derive from `pages`, `products`, `specifications`, `assets` |
| `page_links.jsonl` | Re-extract from `raw_html` |
| `media.jsonl` | Re-derive from the `assets` table |
| `dyo_evidence.jsonl`, `functional_signals.jsonl` | Re-derive from HTML |
| `source_relationships.jsonl` | Re-derive |
| `products/*.json`, `pages/*.json` | Re-derive |
| `raw_html/**` (1.5 GB, 43,149 files) | **Only 1,024 files (1.4 GB) contain real content.** The 43,149 error shells are worthless. If retention budget matters, drop the error shells and keep the 1,024 real files, losing no evidence |

The error-shell observation is worth stating precisely: 97.6% of `raw_html` by file count is an error page. Retaining it costs 1.5 GB and preserves nothing.

### D. Archive, do not delete

| Item | Reason |
|---|---|
| `raw_html/` (1,024 real files, 1.4 GB) | Not needed for the designed migration, since every required attribute is already extracted. But it is the **only** ground truth if a later requirement needs a DOM fact nobody extracted. Compressed to roughly 15-20%, this is cheap insurance |
| `DISTINGUISHING_SAUCE_MASTER_ARCHITECTURE.md` | Authoritative for vision and charter |
| `crawler.sqlite-wal` (26 MB) | Checkpoint into the main file first, then archive |

### E. Contains actual source data

Retain: the per-entity JSON extracts and the gemstone, product, page and media entity files that are not already covered by categories A to D.

## 3. Provenance as the governance primitive

NFR-08 requires an answer to "where did this value come from?" for every migrated field.

| Mechanism | Purpose |
|---|---|
| `provenance` table | field, source artefact, source locator, evidence status, confidence, extraction version |
| `evidence_status` column | `OBSERVED` / `EXTRACTED` / `PATTERN` / `INFERRED` / `UNKNOWN` per field |
| `source_url` retained verbatim | on assets and imported rows |
| `import_batches` | batch id, input hashes, counts, timestamps |

Without this, a wrong value is merely wrong; with it, a wrong value is traceable to the exact artefact and parser that produced it, and therefore correctable. Provenance is what makes the entire evidence discipline operational rather than aspirational.

## 4. Runtime retention

| Data | Retention | Basis |
|---|---|---|
| Orders, payments, refunds | **Permanent** | financial record |
| `audit_logs` | **Permanent** | trust and integrity; no delete path |
| `verification_events` | **Permanent** | certificate trust ledger |
| `domain_events` | **Permanent** | integration history |
| Price snapshots | Permanent on an order; otherwise 90 days | auditability |
| `configuration_snapshot`, `gem_snapshot`, `document_snapshot` | Permanent when referenced by an order | historical rendering after expiry |
| Tax records | Per applicable legal requirement `[UNKNOWN]` | jurisdiction-dependent |
| Customer PII | Life of account plus the statutory period | data protection |
| `ai_interactions` aggregates | 24 months, de-identified | cost and quality analysis |
| AI conversation content | 90 days after conversation closure | service need |
| `guardrail_events` | 12 months | security review |
| Redis session state | 24h idle | ephemeral |
| DYO draft configurations | 30 days after `expires_at` | resume need |
| Price quotes | to `expires_at` | ephemeral |
| Inventory reservations | to `expires_at` plus 30 days | dispute window |
| Assets (orphans) | 90 days after last reference | storage |
| Telemetry (metrics, traces, logs) | 30 days hot, 13 months cold | cost and debugging |
| `jobs` and `dead_letters` | 90 days | operations |
| `outbox_events` | 90 days after publication | integration debugging |
| Import batches | Permanent | migration audit |

Permanent categories are not deletable through any application path. Soft delete is permitted only on `products`, `cms_pages`, `knowledge_documents` and `assets` (INV-10), never on orders, payments, `audit_logs` or `domain_events`.

## 5. Deletion and subject access

| Request | Behaviour |
|---|---|
| Account deletion | Anonymises the customer row; cascades to `messages`, `tool_calls`, `guardrail_events` |
| Retained aggregates | `ai_interactions` keeps de-identified cost and quality rows |
| Financial records | Retained; the legal obligation overrides the deletion request, and the customer is told so |
| Media | Customer-uploaded images removed from the private bucket; source `raw_html` in the evidence package is unaffected, since it is our research material, not customer data |
| Audit | `audit_logs` entries are retained and anonymised rather than deleted |
| Verification ledger | Retained; it describes our trust decisions, not the customer's content |

Cascading deletion is only honest because both channels write to the same tables (doc 20 section 13), so a WhatsApp conversation is deleted with a web conversation without a bespoke path.

## 6. PII handling (NFR-09)

| Rule | Detail |
|---|---|
| Minimisation | PII enters model context only when the conversation requires it |
| Redaction | A redaction layer strips PII before logging (doc 28) |
| No PII in embeddings | `customer_profiles` and conversation content are excluded from the knowledge corpus |
| No PII in events | Event payloads carry no PII (doc 26) |
| No PII in telemetry | Enforced by an automated scan (doc 28) |
| EXIF stripped | GPS removed from every uploaded image on ingest (doc 24) |

## 7. Validation rules

1. `pages_analyzed.jsonl` is never deleted or archived without a verified copy elsewhere.
2. The WAL is checkpointed before any `crawler.sqlite` archive.
3. Every asset reaches a terminal state with a reason; no silent drops (doc 24).
4. `audit_logs`, `verification_events`, `domain_events`, orders and payments have no delete path.
5. Soft delete is restricted to `products`, `cms_pages`, `knowledge_documents`, `assets`.
6. Every migrated field carries provenance and `evidence_status`.
7. Retention enforcement runs monthly and reports rather than silently deletes where a legal hold may apply.
8. Account deletion anonymises rather than deletes where a financial or trust record exists, and says so.

## 8. Error handling

| Condition | Behaviour |
|---|---|
| Retention job fails | Retry, then alert; nothing is deleted in a failed state |
| Legal hold in effect | Skip deletion, record the hold, alert |
| Deletion partially fails | Report per record; never claim completion |
| Orphan asset | Detected weekly; retained 90 days, then removed |
| Provenance missing for a field | Migration gate fails; the field is quarantined rather than imported (INV-05, INV-08) |

## 9. Security boundaries

- Retention enforcement runs as a privileged job with an audit row per deletion batch.
- No application role can delete from a permanent-retention table.
- Deletion of customer data is itself audited, so compliance can prove what happened.
- Legal holds block deletion at the database level, not only in application code.

## 10. Observability

Metrics: rows approaching retention expiry by table, deletions performed per run, orphan assets, quarantined records, unresolved conflicts, provenance coverage percentage, deletion-request completion time. Alerts on provenance coverage below 100% (an unmigrated field is an unanswerable field) and on retention jobs failing.

## 11. Testing requirements

| Test | Proves |
|---|---|
| WAL checkpoint | Archived `crawler.sqlite` contains the same rows as the live file plus WAL |
| Provenance coverage | Every migrated field resolves to a source artefact and a locator |
| No delete path | Attempting to delete from `audit_logs`, orders or payments fails |
| Soft-delete restriction | Attempting a soft delete outside the four permitted tables fails |
| Cascade | Account deletion removes conversation content across both channels |
| Retention dry run | A dry run reports exactly what would be deleted before anything is deleted |
| Legal hold | A held record survives a retention run and the hold is reported |
| EXIF | GPS is absent from every stored image variant |
| No PII in corpus | The knowledge index contains no customer data |
| Regeneration claim | Each category C artefact is genuinely re-derivable from retained sources |

## 12. Failure modes

| Failure | Behaviour |
|---|---|
| Evidence file lost | Unrecoverable for prices and the URL spine; prevented by retention class A and dual copies |
| Over-eager retention | Legal hold and per-category rules; dry runs before deletion |
| Silent asset deletion | Terminal-state requirement with a reason (doc 24) |
| Provenance gap | Migration gate quarantines the row rather than importing it |
| Deletion request incomplete | Per-record reporting, never a false completion claim |
| Growth in telemetry | 30-day hot, 13-month cold; cost reviewed monthly |

## 13. Implementation constraints

1. `pages_analyzed.jsonl`, `urls.jsonl`, `specifications.jsonl`, `crawler.sqlite` and `taxonomy.json` are permanently retained.
2. Checkpoint the WAL before archiving `crawler.sqlite`.
3. `audit_logs`, `verification_events`, `domain_events`, orders and payments have no delete path.
4. Every migrated field carries provenance and `evidence_status` (NFR-08).
5. Retention jobs report before deleting and never delete under a legal hold.
6. PII never enters logs, embeddings, model context or events beyond the minimum required (NFR-09).

## Evidence status

`[OBSERVED][VERIFIED]` for categories A to E: every file name, size and count above is taken from the observed package, including the D8 finding that makes `pages_analyzed.jsonl` the sole price source, the D6 media entity files, the D9 concatenated values in `specifications.jsonl`, and the observation that only 1,024 of 43,149 `raw_html` files contain real content. `[INFERRED]` for the runtime retention table in section 4 and for the legal positions in section 5, which depend on a jurisdiction that remains `[UNKNOWN]` and is an explicit open decision (doc 38).