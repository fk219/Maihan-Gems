/**
 * tools/migrate — stage "assets" (Phase 2 Global Task 17 = plan detailed
 * task 17, epic E2.6).
 *
 * Plan task 17 (verbatim): "Implement media classification by path stem per
 * the Source of Truth 27.2 table; disposition chrome and JavaScript as
 * SKIPPED with a reason (V16)." Done when "Gate V16 green; chrome
 * dispositioned SKIPPED".
 *
 * Input: `media_analyzed.jsonl` (241,961 records [OBSERVED][VERIFIED]).
 * The captured `role` field is unusable (defect D7: 94.7% 'unknown'), so
 * classification is RE-DERIVED from the path stem (ADR-016) — a pure
 * function of the source URL. Metadata/references only: NO binary is
 * fetched, NO OCR, NO visual analysis, NO external request. The bytes are a
 * later pipeline's job (SoT 27.3); this stage only classifies and
 * dispositions.
 *
 * One `assets` row per DISTINCT source_url (the row represents the FILE;
 * page attachment is `asset_usages`, a later stage). Records without an
 * `image_url` (9,415 [VERIFIED]) produce NO row — the absence is reported
 * in the stage output, never padded with a fabricated URL.
 *
 * SKIPPED is a first-class terminal state with an explicit reason stored in
 * `processing_error` (doc 24 §4: every record ends in a known state with a
 * recorded reason). Rules from SoT 27.2, in order:
 *
 *   1. `.js`/`.mjs`/`/_nuxt/` -> OTHER/OTHER, SKIPPED 'javascript_bundle'
 *      (defect D4; V16). The corpus contains ZERO such URLs in this input —
 *      D4's 7,776 JS bundles live in `crawler.sqlite.assets`, which this
 *      stage does not read — but the rule is enforced regardless so a JS
 *      URL can never yield a catalogue media kind.
 *   2. vendor hosts (chat-system.47thst.com, p.sitemana.com) -> SKIPPED.
 *   3. phone-video host: `/thumbnails/` -> IMAGE/THUMBNAIL, `/mp4/` ->
 *      VIDEO_360/GALLERY, else SKIPPED unmapped.
 *   4. product CDN (images.thenaturalsapphirecompany.com): final stem
 *      segment under the observed family prefix selects kind+role exactly
 *      per the SoT table (stone image/lifestyleimage/cert/sarin/appraisal,
 *      setting image, previewandpast image/appraisal, prongs image).
 *      Unmapped CDN stems (e.g. `previewandpast/{sku}/imagemodel`,
 *      `preview/{id}/lifestyleimage`) are SKIPPED with the stem named —
 *      classified only when an authoritative rule covers the stem; a
 *      guess is never written as a fact.
 *   5. origin host (naturalgemstones.com): images/normal mainMenu, filters,
 *      logos, layout, hi-res -> chrome SKIPPED; packaging, details ->
 *      PENDING (global assets, P2); unmapped origin stems -> SKIPPED.
 *   6. any other host -> SKIPPED unmapped-host.
 *
 * Not implemented (phase scope): no fetching, no HEAD validation, no
 * checksum, no variants, no asset_usages attachment, no OCR.
 *
 * Idempotency (gate V17): NOT EXISTS-guarded insert by source_url, plus a
 * post-insert determinism check that pre-existing rows agree with the
 * recomputed classification (a disagreement halts; it is never silently
 * rewritten).
 */
import type { StageContext } from './context.js';
import { jsonLines } from './context.js';

/** SoT 27.1 [VERIFIED]: 241,961 media records. */
export const EXPECTED_MEDIA_RECORDS = 241_961;
/** SoT §4.2 [VERIFIED]: 9,415 records have no `image_url`. */
export const EXPECTED_MISSING_URL = 9_415;

export const ORIGIN_HOST = 'naturalgemstones.com';
export const PRODUCT_CDN_HOST = 'images.thenaturalsapphirecompany.com';
export const PHONE_VIDEO_HOST = 'phone-video.naturalgemstones.com';
export const CHAT_VENDOR_HOST = 'chat-system.47thst.com';
export const UNKNOWN_VENDOR_HOST = 'p.sitemana.com';

export type MediaKind =
  | 'IMAGE' | 'LIFESTYLE' | 'VIDEO_360' | 'VIDEO' | 'MODEL_3D'
  | 'CERTIFICATE' | 'REPORT' | 'APPRAISAL' | 'DOCUMENT' | 'OTHER';
export type MediaRole =
  | 'PRIMARY' | 'GALLERY' | 'THUMBNAIL' | 'LOGO' | 'PACKAGING' | 'DETAIL'
  | 'PRONG' | 'CERTIFICATE' | 'REPORT' | 'APPRAISAL' | 'PREVIEW_RENDER'
  | 'SCENE_3D' | 'OTHER';
export type AssetState = 'PENDING' | 'SKIPPED';

export interface Classification {
  readonly kind: MediaKind;
  readonly role: MediaRole;
  readonly state: AssetState;
  /** terminal reason for SKIPPED rows; null for PENDING rows */
  readonly reason: string | null;
}

const JS_PATH = /(\.m?js$|\.m?js\?|\/_nuxt\/)/;

/** The parent-directory stem of a URL path ('/stone/k1/image' -> '/stone/k1/image' stem '/stone/k1'). */
export function pathStem(path: string): string {
  const cut = path.lastIndexOf('/');
  return cut <= 0 ? path : path.slice(0, cut);
}

/**
 * Deterministic path-stem classification (SoT 27.2). Pure: the same URL
 * always yields the same result, with no network or state involved.
 */
export function classifyMediaAsset(sourceUrl: string): Classification {
  const parsed = new URL(sourceUrl);
  const host = parsed.hostname.toLowerCase();
  const path = parsed.pathname.toLowerCase();
  const stem = pathStem(path);
  const segments = path.split('/').filter((s) => s.length > 0);
  const family = segments[0] ?? '';

  // 1. JavaScript (defect D4) — checked FIRST, terminal, gate V16.
  if (JS_PATH.test(path) || path.includes('.js')) {
    return { kind: 'OTHER', role: 'OTHER', state: 'SKIPPED', reason: 'javascript_bundle (D4)' };
  }

  // 2. vendor hosts.
  if (host === CHAT_VENDOR_HOST) {
    return { kind: 'IMAGE', role: 'OTHER', state: 'SKIPPED', reason: 'third_party_chat_vendor' };
  }
  if (host === UNKNOWN_VENDOR_HOST) {
    return { kind: 'IMAGE', role: 'OTHER', state: 'SKIPPED', reason: 'third_party_vendor_unknown' };
  }

  // 3. phone-video host (SoT 27.2 thumbnails/mp4 rows).
  if (host === PHONE_VIDEO_HOST) {
    if (path.includes('/thumbnails/')) {
      return { kind: 'IMAGE', role: 'THUMBNAIL', state: 'PENDING', reason: null };
    }
    if (path.includes('/mp4/')) {
      return { kind: 'VIDEO_360', role: 'GALLERY', state: 'PENDING', reason: null };
    }
    return { kind: 'IMAGE', role: 'THUMBNAIL', state: 'SKIPPED', reason: `unmapped_phone_video_stem:${stem}` };
  }

  // 4. product CDN — the role segment is path index 2 (the stem's segment
  //    under `/{family}/{entity}/`, i.e. the path element ABOVE the
  //    filename): `/stone/k1/image/x.jpg` -> role segment `image`.
  if (host === PRODUCT_CDN_HOST) {
    const roleSeg = segments[2] ?? '';
    if (family === 'stone') {
      if (roleSeg === 'image') return { kind: 'IMAGE', role: 'PRIMARY', state: 'PENDING', reason: null };
      if (roleSeg === 'lifestyleimage') return { kind: 'LIFESTYLE', role: 'GALLERY', state: 'PENDING', reason: null };
      if (roleSeg === 'cert') return { kind: 'CERTIFICATE', role: 'CERTIFICATE', state: 'PENDING', reason: null };
      if (roleSeg === 'sarin') return { kind: 'REPORT', role: 'REPORT', state: 'PENDING', reason: null };
      if (roleSeg === 'appraisal') return { kind: 'APPRAISAL', role: 'APPRAISAL', state: 'PENDING', reason: null };
    } else if (family === 'setting' && roleSeg === 'image') {
      return { kind: 'IMAGE', role: 'GALLERY', state: 'PENDING', reason: null };
    } else if (family === 'previewandpast') {
      if (roleSeg === 'image') return { kind: 'IMAGE', role: 'PREVIEW_RENDER', state: 'PENDING', reason: null };
      if (roleSeg === 'appraisal') return { kind: 'APPRAISAL', role: 'APPRAISAL', state: 'PENDING', reason: null };
    } else if (family === 'prongs' && roleSeg === 'image') {
      return { kind: 'IMAGE', role: 'DETAIL', state: 'PENDING', reason: null };
    }
    return { kind: 'IMAGE', role: 'OTHER', state: 'SKIPPED', reason: `unmapped_product_cdn_stem:${stem}` };
  }

  // 5. origin host — chrome families and global assets (SoT 27.2).
  if (host === ORIGIN_HOST) {
    if (path.startsWith('/images/normal/mainmenu')) {
      return { kind: 'IMAGE', role: 'LOGO', state: 'SKIPPED', reason: 'site_chrome_navigation_icons' };
    }
    if (path.startsWith('/images/normal/filters')) {
      return { kind: 'IMAGE', role: 'OTHER', state: 'SKIPPED', reason: 'ui_filter_swatches' };
    }
    if (path.startsWith('/images/normal/logos') || path.startsWith('/images/normal/layout') || path.startsWith('/images/hi-res')) {
      return { kind: 'IMAGE', role: 'LOGO', state: 'SKIPPED', reason: 'brand_assets' };
    }
    if (path.startsWith('/images/normal/packaging')) {
      return { kind: 'IMAGE', role: 'PACKAGING', state: 'PENDING', reason: null };
    }
    if (path.startsWith('/images/normal/details')) {
      return { kind: 'IMAGE', role: 'DETAIL', state: 'PENDING', reason: null };
    }
    return { kind: 'IMAGE', role: 'OTHER', state: 'SKIPPED', reason: `unmapped_origin_stem:${stem}` };
  }

  // 6. unknown host — never fetched, never guessed.
  return { kind: 'OTHER', role: 'OTHER', state: 'SKIPPED', reason: `unmapped_host:${host}` };
}

export interface AssetsStageResult {
  readonly recordsSeen: number;
  readonly recordsWithoutUrl: number;
  readonly distinctUrls: number;
  readonly inserted: number;
  readonly pending: number;
  readonly skipped: number;
  readonly topSkipReasons: readonly string[];
}

interface AssetRow {
  readonly url: string;
  readonly kind: string;
  readonly role: string;
  readonly state: string;
  readonly reason: string | null;
  readonly host: string;
  readonly stem: string;
  readonly alt: string | null;
  readonly title: string | null;
  readonly position: number;
}

/** Execute the media-classification stage (corpus mode holds SoT counts). */
export async function runAssets(ctx: StageContext, options?: { corpus?: boolean }): Promise<AssetsStageResult> {
  const db = ctx.db;

  // 1. read + classify. First record per distinct URL wins alt/title/position
  //    (file order — deterministic, documented).
  let recordsSeen = 0;
  let recordsWithoutUrl = 0;
  const rowsByUrl = new Map<string, AssetRow>();
  for await (const { record } of jsonLines(ctx.artifactPath('media_analyzed.jsonl'))) {
    recordsSeen += 1;
    const url = record['image_url'];
    if (typeof url !== 'string' || url.length === 0) {
      recordsWithoutUrl += 1;
      continue;
    }
    if (rowsByUrl.has(url)) continue;
    const c = classifyMediaAsset(url);
    const parsed = new URL(url);
    const alt = record['alt'];
    const title = record['title'];
    const position = record['position'];
    rowsByUrl.set(url, Object.freeze({
      url,
      kind: c.kind,
      role: c.role,
      state: c.state,
      reason: c.reason,
      host: parsed.hostname.toLowerCase(),
      stem: pathStem(parsed.pathname),
      alt: typeof alt === 'string' && alt.length > 0 ? alt : null,
      title: typeof title === 'string' && title.length > 0 ? title : null,
      position: typeof position === 'number' && Number.isInteger(position) && position >= 0 && position <= 32_767 ? position : 0,
    }));
  }

  if (options?.corpus !== false) {
    if (recordsSeen !== EXPECTED_MEDIA_RECORDS) {
      throw new Error(`assets: processed ${recordsSeen} media records, expected the SoT's exact ${EXPECTED_MEDIA_RECORDS}`);
    }
    if (recordsWithoutUrl !== EXPECTED_MISSING_URL) {
      throw new Error(`assets: ${recordsWithoutUrl} records lack an image_url, expected the SoT's ${EXPECTED_MISSING_URL}`);
    }
  }

  const rows = [...rowsByUrl.values()].sort((a, b) => a.url.localeCompare(b.url));
  const pendingRows = rows.filter((r) => r.state === 'PENDING');
  const skippedRows = rows.filter((r) => r.state === 'SKIPPED');

  // 2. insert, NOT EXISTS-guarded by source_url (the table's natural key);
  //    batched through jsonb so one statement owns one slice of the file.
  let inserted = 0;
  const BATCH = 2_000;
  for (let start = 0; start < rows.length; start += BATCH) {
    const batch = rows.slice(start, start + BATCH);
    const payload = JSON.stringify(batch);
    const result = await db.query(
      `INSERT INTO assets (kind, role, source_url, source_host, source_path_stem,
                           processing_state, processing_error, alt_text, title, position,
                           provenance_kind, evidence_status, import_batch_id)
       SELECT (x->>'kind')::media_kind, (x->>'role')::media_role, x->>'url', x->>'host', x->>'stem',
              (x->>'state')::asset_processing_state, x->>'reason', x->>'alt', x->>'title',
              (x->>'position')::smallint,
              'SOURCE_CRAWL', 'EXTRACTED', $1::uuid
         FROM jsonb_array_elements($2::jsonb) AS x
        WHERE NOT EXISTS (SELECT 1 FROM assets a WHERE a.source_url = x->>'url')`,
      [ctx.importBatchId, payload],
    );
    inserted += result.rowCount ?? 0;
  }

  // 3. determinism check: any pre-existing row whose stored classification
  //    disagrees with the recomputed rule set halts — never silently redone.
  const disagree = await db.query<{ n: string }>(
    `SELECT count(*)::text AS n
       FROM assets a
       JOIN jsonb_array_elements($1::jsonb) AS x ON x->>'url' = a.source_url
      WHERE a.kind::text <> x->>'kind'
         OR a.role::text <> x->>'role'
         OR a.processing_state::text <> x->>'state'
         OR coalesce(a.processing_error, '') <> coalesce(x->>'reason', '')`,
    [JSON.stringify(rows.map((r) => ({ url: r.url, kind: r.kind, role: r.role, state: r.state, reason: r.reason })))],
  );
  if (Number(disagree.rows[0]?.n ?? '0') !== 0) {
    throw new Error('assets: a stored asset classification disagrees with the recomputed rules (determinism violation)');
  }

  // 4. gate V16 — no JavaScript-derived asset may exist: every JS URL row
  //    must be OTHER+SKIPPED, and no JS URL may carry a catalogue kind.
  const v16 = await db.query<{ n: string }>(
    `SELECT count(*)::text AS n FROM assets
      WHERE (source_url ~* '\\.(m?js)(\\?|$)' OR source_url LIKE '%/_nuxt/%')
        AND (kind <> 'OTHER' OR processing_state <> 'SKIPPED')`,
  );
  if (Number(v16.rows[0]?.n ?? '0') !== 0) {
    throw new Error(`assets: gate V16 FAILED — ${String(v16.rows[0]?.n)} JavaScript-derived asset(s) hold a catalogue kind`);
  }

  // 5. phase-2 states: only PENDING (awaiting the fetch pipeline) and
  //    SKIPPED (terminal disposition) may exist; nothing is ever fetched here.
  const badState = await db.query<{ n: string }>(
    `SELECT count(*)::text AS n FROM assets WHERE processing_state NOT IN ('PENDING', 'SKIPPED')`,
  );
  if (Number(badState.rows[0]?.n ?? '0') !== 0) {
    throw new Error('assets: a non-phase-2 processing state exists (the fetch pipeline has not run)');
  }

  const reasonCounts = new Map<string, number>();
  for (const row of skippedRows) {
    const key = (row.reason ?? 'unspecified').split(':')[0] ?? 'unspecified';
    reasonCounts.set(key, (reasonCounts.get(key) ?? 0) + 1);
  }
  const topSkipReasons = [...reasonCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 6)
    .map(([reason, count]) => `${reason}=${String(count)}`);

  return {
    recordsSeen,
    recordsWithoutUrl,
    distinctUrls: rows.length,
    inserted,
    pending: pendingRows.length,
    skipped: skippedRows.length,
    topSkipReasons,
  };
}
