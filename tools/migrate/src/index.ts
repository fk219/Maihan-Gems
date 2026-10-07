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
 * The pipeline rules it implements (AGENTS.md 9, technical_design/33; plan
 * task 10):
 *
 *   - The spine is urls.jsonl, joined with specifications.jsonl and
 *     pages_analyzed.jsonl. NEVER products.jsonl alone. products.jsonl holds
 *     1,245 records = 2.4% of commerce URLs and is NOT the catalogue.
 *   - Every migration-critical artifact is SHA-256-gated against
 *     docs/evidence/MANIFEST.md BEFORE it is consumed; a mismatch refuses
 *     the run naming artifact/expected/actual/stage. Never silently.
 *   - Stage state is durable (import_batches), resumable, idempotent:
 *     a rerun skips completed stages and never corrupts completed work.
 *   - Staging loads VERBATIM. Normalisation happens only in the canonical
 *     stage. Normalising during load destroys the ability to answer "what
 *     did the source actually say", which the whole evidence discipline
 *     depends on. (Phase 2 stage implementations.)
 *   - Gate V17: a second run must change zero rows (idempotency).
 *   - Conflicts go to staging_conflicts, both sides, NEVER auto-resolved.
 *   - Failures are quarantined with a reason and counted, NEVER silently
 *     dropped.
 *   - Every migrated row carries evidence_status, source_url, import_batch_id
 *     and, where useful, raw_spec.
 *   - The 221 derived DYO identities stay source_sku_derived,
 *     sku_evidence_status='INFERRED', every attribute column null,
 *     state='DRAFT', unpublished. Never manufacture a source SKU.
 *
 * The source archive is read from a configured path at runtime, never from
 * the repository. It must never be modified: crawler.sqlite and raw HTML are
 * read-only, permanently.
 *
 * Layout per technical_design/03 (plan task 10 scope; the pipeline itself is
 * Phase 2, declared as future stages in src/stages.ts):
 *   src/manifest.ts  parse docs/evidence/MANIFEST.md; SHA-256 artifact gating
 *   src/state.ts     durable stage state over import_batches
 *   src/stages.ts    the ordered, identity-ful stage registry
 *   src/run.ts       resumable/idempotent/hash-gated runner
 *   src/cli.ts       bin maihan-migrate: plan | run | status
 *   src/index.ts     this package doc; the library surface re-exports the
 *                    runner and registry (standalone — never app-imported).
 */
export { parseManifest, resolveArchiveRoot, verifyArtifact, ArtifactVerificationError, ManifestError, type ParsedManifest, type ManifestArtifact } from './manifest.js';
export { STAGES, stageById, requiredArtifactsFor, type StageDefinition } from './stages.js';
export { MigrationState, type StageStateRow } from './state.js';
export { runStages, type RunOptions, type StageOutcome } from './run.js';
