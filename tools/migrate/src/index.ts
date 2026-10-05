/**
 * tools/migrate — the import pipeline CLI (staging -> canonical).
 *
 * Owns state: none in the application sense. It transforms the reverse-
 * engineering evidence into the canonical domain.
 * Must never contain: any import from apps/*.
 *
 * It is STANDALONE. Migration tooling must never be imported by a runtime app
 * (technical_design/03), and it must never reach a runtime bundle.
 *
 * The pipeline rules it will implement (AGENTS.md 9, technical_design/33):
 *
 *   - The spine is urls.jsonl, joined with specifications.jsonl and
 *     pages_analyzed.jsonl. NEVER products.jsonl alone. products.jsonl holds
 *     1,245 records = 2.4% of commerce URLs and is NOT the catalogue.
 *   - Staging loads VERBATIM. Normalisation happens only in the canonical
 *     stage. Normalising during load destroys the ability to answer "what did
 *     the source actually say", which the whole evidence discipline depends on.
 *   - Stages 1-5 are fully deterministic given identical input hashes.
 *   - Gate V17: a second run must change zero rows (idempotency).
 *   - Conflicts go to staging_conflicts, both sides, NEVER auto-resolved.
 *   - Failures are quarantined with a reason and counted, NEVER silently dropped.
 *   - Every migrated row carries evidence_status, source_url, import_batch_id
 *     and, where useful, raw_spec.
 *   - The 221 derived DYO identities stay source_sku_derived,
 *     sku_evidence_status='INFERRED', every attribute column null, state='DRAFT',
 *     unpublished. Never manufacture a source SKU.
 *
 * The source archive is read from a configured path at runtime, never from the
 * repository. It must never be modified: crawler.sqlite and raw HTML are
 * read-only, permanently.
 *
 * Phase 1 Task 1 scope: workspace skeleton only. The pipeline is Phase 1 Task
 * 10 and requires the source archive, which is not present in this environment.
 * The `bin` entry above is declared but dist/cli.js does not exist yet; it
 * becomes real at Task 10.
 *
 * Layout per technical_design/03:
 *   src/stages/     extract, stage, parse, validate, canonical, search, embed, verify
 *   src/parsers/    pure slug/SKU/spec parsers
 *   src/gates/      V1-V22 as executable assertions
 *   src/cli.ts
 */
export {};
