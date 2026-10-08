/**
 * tools/migrate — stage "certificates" (Phase 2 Global Task 18 = plan
 * detailed task 18, epic E2.7).
 *
 * Plan task 18 (verbatim): "Implement certificate artefact extraction from
 * `/cert`, `/sarin`, `/appraisal` paths." Done when "Certificate rows
 * created, all `UNVERIFIED`, no populated fields".
 *
 * ARTEFACT EXTRACTION FROM PATH CONVENTION ONLY (doc 17). Four observed
 * conventions:
 *
 *   /stone/{gemRef}/cert/{gemRef}_nsc_web.jpg          -> CERTIFICATE
 *   /stone/{gemRef}/sarin/{gemRef}_low_rep.jpg         -> GEM_REPORT
 *   /stone/{gemRef}/appraisal/{gemRef}_appraisal.jpg   -> APPRAISAL
 *   /previewandpast/{sku}/appraisal/{sku}_nsc_web.jpg  -> APPRAISAL
 *
 * "one per observed artefact path" (doc 17) — so rows are deduplicated by
 * PATHNAME and the first observed URL for that path is retained verbatim
 * as `source_url` (query-string variants of one artefact file are one
 * document, not several).
 *
 * The DOCUMENT SCHEMA IS `[UNKNOWN]` (doc 17, defect D6): no lab name, no
 * certificate number, no issue date, no report type, no grading, no
 * measurements, no treatment, no authenticity. Therefore every imported row
 * carries `verification_status='UNVERIFIED'` and NULL in every unsupported
 * column. NO OCR, NO vision, NO document parsing, NO binary fetch — the
 * bytes are never read. Nothing is inferred from a sibling artefact or from
 * the subject's own structured data.
 *
 * Subject association is by the path's own segment only:
 *   - `stone/{ref}/...`      -> `gemstones.gem_ref = upper(ref)`
 *   - `previewandpast/{sku}` -> `products` by observed or derived SKU
 * The `certificates_subject_ck` CHECK demands a subject; an unresolvable
 * artefact is a HALF (never a fabricated subject, never a dropped row).
 *
 * Cross-check: `entities/media/{report,appraisal}.json` (defect D6's only
 * structured evidence that these artefacts exist) — every artefact path
 * named there must be present in the imported set, or the stage halts.
 *
 * Not implemented (phase scope): OCR pipeline, extraction runs, reviews,
 * verification, publication.
 *
 * Idempotency (gate V17): NOT EXISTS-guarded insert by `source_url`, plus a
 * determinism check that pre-existing rows agree with the recomputed
 * classification.
 */
import { readFileSync } from 'node:fs';

import type { StageContext } from './context.js';
import { jsonLines } from './context.js';

/**
 * Corpus census of distinct artefact PATHS (media_analyzed.jsonl,
 * [VERIFIED] path conventions). Per-subject multi-file cases are real and
 * kept: `stone/k568/cert` holds 2 files, and five refs hold 2 SARIN
 * reports each (35 refs, 40 report paths).
 */
export const EXPECTED_ARTEFACTS = 1_135;
export const EXPECTED_STONE_CERTIFICATES = 36;
export const EXPECTED_STONE_REPORTS = 40;
export const EXPECTED_STONE_APPRAISALS = 35;
export const EXPECTED_CONFIGURATION_APPRAISALS = 1_024;

export interface CertificatesStageResult {
  readonly artefacts: number;
  readonly inserted: number;
  readonly certificates: number;
  readonly reports: number;
  readonly appraisals: number;
  readonly gemstoneSubjects: number;
  readonly productSubjects: number;
  readonly entityArtefactsCovered: number;
}

const ARTEFACT_PATH = /^\/(stone|previewandpast)\/([^/]+)\/(cert|sarin|appraisal)\//;

type DocumentKind = 'CERTIFICATE' | 'GEM_REPORT' | 'APPRAISAL';

interface Artefact {
  readonly pathname: string;
  readonly sourceUrl: string;
  readonly family: string;
  readonly subjectSegment: string;
  readonly kind: DocumentKind;
  readonly stem: string;
  readonly capturedRole: string | null;
}

function kindFor(role: string): DocumentKind | null {
  if (role === 'cert') return 'CERTIFICATE';
  if (role === 'sarin') return 'GEM_REPORT';
  if (role === 'appraisal') return 'APPRAISAL';
  return null;
}

/** Path-only classification — no bytes, no network, no parsing. */
export function classifyCertificatePath(pathname: string): Artefact | null {
  const match = ARTEFACT_PATH.exec(pathname);
  if (match === null) return null;
  const family = match[1] ?? '';
  const subjectSegment = match[2] ?? '';
  const role = match[3] ?? '';
  const kind = kindFor(role);
  if (kind === null) return null;
  const stem = pathname.slice(0, pathname.lastIndexOf('/'));
  return Object.freeze({
    pathname,
    sourceUrl: '',
    family,
    subjectSegment,
    kind,
    stem,
    capturedRole: null,
  });
}

/** Execute the certificate-artefact stage (corpus mode holds the counts). */
export async function runCertificates(ctx: StageContext, options?: { corpus?: boolean }): Promise<CertificatesStageResult> {
  const db = ctx.db;

  // 1. collect the artefact paths (dedupe by pathname; first URL wins).
  const byPathname = new Map<string, Artefact>();
  for await (const { record } of jsonLines(ctx.artifactPath('media_analyzed.jsonl'))) {
    const url = record['image_url'];
    if (typeof url !== 'string' || url.length === 0) continue;
    let pathname: string;
    try {
      pathname = new URL(url).pathname;
    } catch {
      continue;
    }
    if (byPathname.has(pathname)) continue;
    const artefact = classifyCertificatePath(pathname);
    if (artefact === null) continue;
    const role = record['role'];
    byPathname.set(
      pathname,
      Object.freeze({
        ...artefact,
        sourceUrl: url,
        capturedRole: typeof role === 'string' ? role : null,
      }),
    );
  }
  const artefacts = [...byPathname.values()].sort((a, b) => a.pathname.localeCompare(b.pathname));

  const counts = {
    CERTIFICATE: artefacts.filter((a) => a.kind === 'CERTIFICATE').length,
    GEM_REPORT: artefacts.filter((a) => a.kind === 'GEM_REPORT').length,
    APPRAISAL: artefacts.filter((a) => a.kind === 'APPRAISAL').length,
  };
  if (options?.corpus !== false) {
    if (artefacts.length !== EXPECTED_ARTEFACTS) {
      throw new Error(`certificates: found ${String(artefacts.length)} artefact paths, expected the corpus's ${String(EXPECTED_ARTEFACTS)}`);
    }
    if (counts.CERTIFICATE !== EXPECTED_STONE_CERTIFICATES || counts.GEM_REPORT !== EXPECTED_STONE_REPORTS) {
      throw new Error(`certificates: ${String(counts.CERTIFICATE)} stone certificates / ${String(counts.GEM_REPORT)} reports, expected ${String(EXPECTED_STONE_CERTIFICATES)}/${String(EXPECTED_STONE_REPORTS)}`);
    }
    const stoneAppraisals = artefacts.filter((a) => a.family === 'stone' && a.kind === 'APPRAISAL').length;
    const configAppraisals = artefacts.filter((a) => a.family === 'previewandpast').length;
    if (stoneAppraisals !== EXPECTED_STONE_APPRAISALS || configAppraisals !== EXPECTED_CONFIGURATION_APPRAISALS) {
      throw new Error(`certificates: ${String(stoneAppraisals)} stone / ${String(configAppraisals)} configuration appraisals, expected ${String(EXPECTED_STONE_APPRAISALS)}/${String(EXPECTED_CONFIGURATION_APPRAISALS)}`);
    }
  }

  // 2. cross-check the independent entity evidence (defect D6): every
  //    artefact path it names must exist in the imported set.
  const entityPaths = new Set<string>();
  for (const artifact of ['report.json', 'appraisal.json']) {
    const parsed = JSON.parse(readFileSync(ctx.artifactPath(artifact), 'utf8')) as unknown;
    if (!Array.isArray(parsed)) throw new Error(`certificates: ${artifact} is not a JSON array`);
    for (const entry of parsed) {
      const url = (entry as { asset_url?: unknown } | null)?.asset_url;
      if (typeof url !== 'string') continue;
      try {
        entityPaths.add(new URL(url).pathname);
      } catch {
        throw new Error(`certificates: ${artifact} holds an unparseable asset_url`);
      }
    }
  }
  const covered = [...entityPaths].filter((p) => byPathname.has(p));
  if (covered.length !== entityPaths.size) {
    const missing = [...entityPaths].filter((p) => !byPathname.has(p)).slice(0, 5);
    throw new Error(`certificates: ${String(entityPaths.size - covered.length)} artefact path(s) recorded in entities/media are absent from the corpus (e.g. ${missing.join(', ')})`);
  }

  // 3. resolve subjects from canonical rows.
  const gemstoneIds = new Map<string, string>();
  for (const row of (await db.query<{ gem_ref: string; id: string }>('SELECT gem_ref, id::text AS id FROM gemstones')).rows) {
    gemstoneIds.set(row.gem_ref.toUpperCase(), row.id);
  }
  const productIds = new Map<string, string>();
  for (const row of (await db.query<{ source_sku: string | null; source_sku_derived: string | null; id: string }>(
    `SELECT source_sku, source_sku_derived, id::text AS id FROM products`,
  )).rows) {
    for (const sku of [row.source_sku, row.source_sku_derived]) {
      if (sku !== null && sku.length > 0) productIds.set(sku.toUpperCase(), row.id);
    }
  }

  const payloadRows = artefacts.map((a) => {
    const key = a.subjectSegment.toUpperCase();
    if (a.family === 'stone') {
      const gemstoneId = gemstoneIds.get(key);
      if (gemstoneId === undefined) throw new Error(`certificates: artefact ${a.pathname} has no canonical gemstone for ${a.subjectSegment}`);
      return { ...a, gemstoneId, productId: null };
    }
    const productId = productIds.get(key);
    if (productId === undefined) throw new Error(`certificates: artefact ${a.pathname} has no canonical product for ${a.subjectSegment}`);
    return { ...a, gemstoneId: null, productId };
  });

  // 4. insert — NOT EXISTS by source_url; every document fields NULL,
  //    verification_status UNVERIFIED, state ACTIVE (the schema default:
  //    the document exists and is current; publication is governed by
  //    verification_status, INV-07).
  let inserted = 0;
  const BATCH = 2_000;
  for (let start = 0; start < payloadRows.length; start += BATCH) {
    const batch = payloadRows.slice(start, start + BATCH);
    const payload = JSON.stringify(batch.map((row) => ({
      url: row.sourceUrl,
      kind: row.kind,
      gemstoneId: row.gemstoneId,
      productId: row.productId,
      stem: row.stem,
      family: row.family,
      subjectSegment: row.subjectSegment,
      capturedRole: row.capturedRole,
    })));
    const result = await db.query(
      `INSERT INTO certificates (kind, gemstone_id, product_id, verification_status, state, source_url, metadata)
       SELECT (x->>'kind')::document_kind,
              (x->>'gemstoneId')::uuid,
              (x->>'productId')::uuid,
              'UNVERIFIED', 'ACTIVE',
              x->>'url',
              jsonb_build_object(
                'source_path_stem', x->>'stem',
                'family', x->>'family',
                'subject_segment', x->>'subjectSegment',
                'artefact_convention', 'technical_design/17 path convention',
                'captured_role', x->>'capturedRole',
                'evidence_artifact', 'media_analyzed.jsonl',
                'schema_status', 'UNKNOWN — no document schema exists in the corpus (defect D6)')
         FROM jsonb_array_elements($1::jsonb) AS x
        WHERE NOT EXISTS (SELECT 1 FROM certificates c WHERE c.source_url = x->>'url')`,
      [payload],
    );
    inserted += result.rowCount ?? 0;
  }

  // 5. determinism check on pre-existing rows.
  const disagree = await db.query<{ n: string }>(
    `SELECT count(*)::text AS n
       FROM certificates c
       JOIN jsonb_array_elements($1::jsonb) AS x ON x->>'url' = c.source_url
      WHERE c.kind::text <> x->>'kind'
         OR coalesce(c.gemstone_id::text, '') <> coalesce(x->>'gemstoneId', '')
         OR coalesce(c.product_id::text, '') <> coalesce(x->>'productId', '')
         OR c.verification_status::text <> 'UNVERIFIED'`,
    [JSON.stringify(payloadRows.map((r) => ({ url: r.sourceUrl, kind: r.kind, gemstoneId: r.gemstoneId, productId: r.productId })))],
  );
  if (Number(disagree.rows[0]?.n ?? '0') !== 0) {
    throw new Error('certificates: a stored certificate disagrees with the recomputed artefact classification (determinism violation)');
  }

  // 6. invariants: no OCR happened, no unsupported field was invented, and
  //    nothing was verified or published.
  const violations = await db.query<{ n: string }>(
    `SELECT count(*)::text AS n FROM certificates
      WHERE verification_status <> 'UNVERIFIED'
         OR lab_name IS NOT NULL
         OR certificate_number IS NOT NULL
         OR issue_date IS NOT NULL
         OR report_type IS NOT NULL
         OR confidence_overall IS NOT NULL
         OR configuration_id IS NOT NULL
         OR source_url IS NULL
         OR metadata->>'evidence_artifact' IS NULL`,
  );
  if (Number(violations.rows[0]?.n ?? '0') !== 0) {
    throw new Error(`certificates: ${String(violations.rows[0]?.n)} certificate row(s) carry a populated/verified document field`);
  }
  const total = await db.query<{ n: string }>('SELECT count(*)::text AS n FROM certificates');
  if (Number(total.rows[0]?.n ?? '0') !== artefacts.length) {
    throw new Error(`certificates: ${String(total.rows[0]?.n)} certificate rows exist for ${String(artefacts.length)} artefact paths`);
  }

  return {
    artefacts: artefacts.length,
    inserted,
    certificates: counts.CERTIFICATE,
    reports: counts.GEM_REPORT,
    appraisals: counts.APPRAISAL,
    gemstoneSubjects: payloadRows.filter((r) => r.gemstoneId !== null).length,
    productSubjects: payloadRows.filter((r) => r.productId !== null).length,
    entityArtefactsCovered: covered.length,
  };
}