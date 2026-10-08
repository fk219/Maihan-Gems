/**
 * tools/migrate — the ordered stage registry (plan task 10; doc 33 "Phasing"
 * M1-M9; plan tasks 11-20 as DECLARED future work, not implementation).
 *
 * Requirements held here:
 *   - stage identities are explicit and stable (ALPHABET-free constants);
 *   - dependency order is the registry order: a failed stage stops every
 *     dependent stage downstream;
 *   - artifact requirements are declared per stage; the runner verifies each
 *     artifact's SHA-256 against the manifest BEFORE the stage executes;
 *   - future catalogue stages are DECLARED (empty definitions with their
 *     authoritative artifact sets and gates) and refuse execution until
 *     their plan task lands. This satisfies "support future data migration
 *     stages" without implementing any Phase 2 pipeline.
 */
import type { ManifestArtifact, ParsedManifest } from './manifest.js';

export interface StageDefinition {
  /** Stable identity; durable state key. */
  readonly id: string;
  readonly description: string;
  /** Ordered artifacts whose SHA-256 must match the manifest before executing. */
  readonly requiredArtifacts: 'ALL_MANIFEST' | 'NONE' | readonly string[];
  readonly implemented: boolean;
  /** What the NOT IMPLEMENTED stage must wait for (plan task reference). */
  readonly blockedBy?: string;
}

export const STAGES: readonly StageDefinition[] = Object.freeze([
  {
    id: 'verify-artifacts',
    description: 'Verify every manifest artifact: SHA-256 against docs/evidence/MANIFEST.md, read-only',
    requiredArtifacts: 'ALL_MANIFEST',
    implemented: true,
  },
  {
    id: 'migrate-schema',
    description: 'Apply the ordered DDL migration chain (packages/db runMigrations)',
    requiredArtifacts: 'NONE',
    implemented: true,
  },
  {
    id: 'seed-reference',
    description: 'Seed the authoritative reference vocabulary (15 metals, 8 jewellery types, 22 setting styles, treatments, intensities, clarities)',
    requiredArtifacts: 'NONE',
    implemented: true,
  },
  // --- Future catalogue migration stages: DECLARED, not implemented --------
  // Each names the artifacts its plan task consumes and the gates doc 33
  // assigns. Execution refuses with a clear stage/blockedBy failure until
  // the corresponding task lands; nothing below is Phase 1 scope.
  {
    id: 'extract-staging',
    description: 'Load urls.jsonl verbatim into staging_source_pages (44,218 rows unchanged)',
    requiredArtifacts: ['urls.jsonl'],
    implemented: true,
  },
  {
    id: 'parse-slugs',
    description: 'Five-family slug classifier into staging_parsed_urls; gates V1, V2 at 100%; V14 counts',
    requiredArtifacts: ['urls.jsonl'],
    implemented: true,
  },
  {
    id: 'tokenize-stones',
    description: 'D9 multi-value tokenizer producing gemstone_stones rows; gates V8, V9 on all 113 pairs',
    requiredArtifacts: ['specifications.jsonl', 'products.jsonl'],
    implemented: true,
  },
  {
    id: 'canonical-catalog',
    description: 'Canonical upserts in dependency order: taxonomy, stones, pairs, settings, 10,349 variants, products; gates V4-V7, V10, V12, V13',
    requiredArtifacts: ['specifications.jsonl', 'products.jsonl'],
    implemented: true,
  },
  {
    id: 'derived-identities',
    description: 'The 221 derived-identity write path; gate V18 (INFERRED, null attributes, DRAFT) and V20 (0 collisions)',
    requiredArtifacts: ['products.jsonl'],
    implemented: true,
  },
  {
    id: 'prices-observations',
    description: 'Price recovery from pages_analyzed.jsonl into price_model_observations; 1,024 prices; gate V15',
    requiredArtifacts: ['pages_analyzed.jsonl'],
    implemented: true,
  },
  {
    id: 'assets',
    description: 'Media classification by path stem with explicit JS/chrome skip; gate V16',
    requiredArtifacts: ['media_analyzed.jsonl'],
    implemented: true,
  },
  {
    id: 'certificates',
    description: 'Certificate artefact extraction from /cert, /sarin, /appraisal paths; all UNVERIFIED',
    requiredArtifacts: ['media_analyzed.jsonl', 'report.json', 'appraisal.json'],
    implemented: true,
  },
  {
    id: 'cms-redirects',
    description: 'CMS pages, navigation and the 44,218 redirect rows from the doc 34 mapping',
    requiredArtifacts: ['urls.jsonl'],
    implemented: true,
  },
  {
    id: 'knowledge-embeddings',
    description: 'Knowledge documents and embeddings (1024-dim HNSW, content-hash-reentrant)',
    requiredArtifacts: ['media_analyzed.jsonl'],
    implemented: false,
    blockedBy: 'plan task 20 / Phase 2+',
  },
  {
    id: 'compatibility',
    description: 'ALLOW compatibility evidence from the 1,024 observed (setting, stone) pairs; conflict ledger completion',
    requiredArtifacts: [],
    implemented: true,
  },
  {
    id: 'verify-gates',
    description: 'Gate runner V1-V22 plus the V17 idempotency check (second run: zero row changes)',
    requiredArtifacts: 'ALL_MANIFEST',
    implemented: true,
  },
] as const);

export function stageById(id: string): StageDefinition | undefined {
  return STAGES.find((s) => s.id === id);
}

/** The artifacts a stage must verify, resolved from a parsed manifest by name. */
export function requiredArtifactsFor(stage: StageDefinition, manifest: ParsedManifest): readonly ManifestArtifact[] {
  if (stage.requiredArtifacts === 'NONE') return [];
  if (stage.requiredArtifacts === 'ALL_MANIFEST') return manifest.artifacts;
  const resolved: ManifestArtifact[] = [];
  for (const name of stage.requiredArtifacts) {
    const match = manifest.artifacts.find((a) => a.artifact === name);
    if (match === undefined) {
      throw new Error(`manifest: stage ${stage.id} requires artifact "${name}" which the manifest does not record`);
    }
    resolved.push(match);
  }
  return resolved;
}
