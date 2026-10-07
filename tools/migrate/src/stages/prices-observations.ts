/**
 * tools/migrate — stage "prices-observations" (Phase 2 Global Task 16 = plan
 * detailed task 14, epic E2.5).
 *
 * Plan task 16 (verbatim): "Implement price recovery from
 * `pages_analyzed.jsonl` plus residual derivation into
 * `price_model_observations`." Done when "1,024 prices recovered; residual
 * non-zero for every row".
 *
 * Evidence recovery ONLY. From each priced page (defect D8: price exists
 * ONLY in pages_analyzed — JSON-LD `offers` + the D9 specification strings):
 *
 *   - `price_entries`: the PRODUCT subject carries the OBSERVED total
 *     (evidence 'OBSERVED'); the (design, metal) SETTING_VARIANT parent gets
 *     an INFERRED residual entry per doc 16 ("curators confirm and promote";
 *     gate V15 holds publication until then).
 *   - `price_model_observations`: 1,024 rows with the observed total,
 *     weight, per-carat, gem_component = ppc x total weight (EXTRACTED),
 *     implied_making = total - gem_component — non-zero for every row — and
 *     ratio = total / gem_component.
 *
 * Numeric discipline (doc 16 "Money representation"): exact cents and
 * milli-carats via integer arithmetic; the ratio's 4dp form comes from
 * scaled integer division; pythonic money handling is FORBIDDEN (decimal
 * strings end to end). NO floats in a price path.
 *
 * NOT implemented: no pricing engine, no discount engine, no dynamic pricing.
 *
 * IDEMPOTENCY (gate V17): every write is either an ON CONFLICT DO NOTHING
 * upsert, a NOT EXISTS-guarded insert, or a WHERE-guarded UPDATE; a deep
 * rerun executes all writes and changes zero rows.
 */
import { type TokenResult } from '@maihan/domain';
import type { StageContext } from './context.js';
import { jsonLines } from './context.js';
import { loadTokenizedSpecifications } from './tokenize-stones.js';
import { figuresOf, ppcOf } from './canonical-catalog.js';

export const EXPECTED_PRICES = 1_024;

export interface PricesStageResult {
  readonly pagesSeen: number;
  readonly pricesRecovered: number;
  readonly productEntryCount: number;
  readonly variantEntryCount: number;
  readonly observations: number;
  readonly productRowsUpdated: number;
  readonly gemstoneRowsUpdated: number;
}

// ---------------------------------------------------------------------------
// Exact decimal helpers (integer cents / milli-carats; no floats)
// ---------------------------------------------------------------------------

/** '$12,000' -> 1_200_000 cents; '7213' -> 721_300; '7213.45' -> 721_345. */
export function centsOfDecimal(text: string): number {
  const clean = text.replace(/[$,]/g, '').trim();
  const m = /^(\d+)(?:\.(\d*))?$/.exec(clean);
  if (m === null) throw new Error(`prices: not a decimal money text: ${text}`);
  const whole = m[1] ?? '0';
  const frac = (m[2] ?? '').padEnd(2, '0').slice(0, 2);
  return Number(whole) * 100 + Number(frac === '' ? '0' : frac);
}

/** '2.87' (carats) -> 2_870 milli-carats. */
export function milliCarats(text: string): number {
  const m = /^(\d+)(?:\.(\d*))?$/.exec(text);
  if (m === null) throw new Error(`prices: not a decimal carat text: ${text}`);
  const whole = m[1] ?? '0';
  const frac = (m[2] ?? '').padEnd(3, '0').slice(0, 3);
  return Number(whole) * 1_000 + Number(frac === '' ? '0' : frac);
}

/** Money from integer cents -> '7213.00' (decimal string, never a float). */
export function centsToMoney(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(Math.round(cents));
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

/** Carats from integer milli-carats -> '5.980'. */
export function milliToCarats(milli: number): string {
  return (milli / 1_000).toFixed(3);
}

/** ratio = total/gem, floor-truncated at 4dp by scaled integer division. */
export function scaledRatio4(totalCents: number, gemCents: number): string {
  if (gemCents <= 0) throw new Error('prices: non-positive gem component; the ratio is undefined');
  const scaled = Math.floor((totalCents * 10_000) / gemCents);
  return (scaled / 10_000).toFixed(4);
}

// ---------------------------------------------------------------------------
// Page-record extraction
// ---------------------------------------------------------------------------

interface OffersView {
  readonly price: unknown;
  readonly priceCurrency: unknown;
  readonly priceValidUntil: unknown;
  readonly availability: unknown;
}

export interface PricedRecord {
  readonly sourceUrl: string;
  readonly totalCents: number;
  readonly currency: string;
  readonly validUntil: string | null; // JSON-LD date literal, verbatim
  readonly inStock: boolean | null;
  /** exact carat figures of the D9 weight tokens, e.g. ['2.87','3.11'] */
  readonly weightFigures: readonly string[];
  readonly ppmCents: number | null;
  readonly gemRefResolved: string | null;
}

/**
 * Pull the observed commercial facts out of one page record. Returns null
 * when the page has no usable JSON-LD offer (the 221 failed fetches have no
 * captured page at all — the absence stays honest, never padded).
 */
export function extractPricedRecord(
  record: Record<string, unknown>,
  weightField: TokenResult | undefined,
  ppcField: TokenResult | undefined,
  gemRefResolved: string | null,
): PricedRecord | null {
  const url = record['url'];
  if (typeof url !== 'string') return null;
  const product = record['product'];
  const productJson = product !== null && typeof product === 'object' ? (product as Record<string, unknown>)['json'] : undefined;
  if (productJson === undefined || productJson === null || typeof productJson !== 'object') return null;
  const structured = ((productJson as Record<string, unknown>)['structured_data'] ?? null) as Record<string, unknown> | null;
  if (structured === null) return null;
  const offersRaw = structured['offers'];
  const firstOffer = Array.isArray(offersRaw) ? (offersRaw[0] as Record<string, unknown> | undefined) : (offersRaw as Record<string, unknown> | null | undefined);
  if (firstOffer === undefined || firstOffer === null) return null;
  const offers = firstOffer as unknown as OffersView;
  const priceText = typeof offers.price === 'number' ? String(offers.price) : (typeof offers.price === 'string' ? offers.price : null);
  if (priceText === null) return null;
  const currency = typeof offers.priceCurrency === 'string' ? offers.priceCurrency : 'USD';
  const weightFigures = figuresOf(weightField);
  if (weightFigures.length === 0) return null;
  const ppcText = ppcOf(ppcField);
  const ppcCents = ppcText === null ? null : centsOfDecimal(ppcText);
  return Object.freeze({
    sourceUrl: url,
    totalCents: centsOfDecimal(priceText),
    currency,
    validUntil: typeof offers.priceValidUntil === 'string' ? offers.priceValidUntil : null,
    inStock: typeof offers.availability === 'string' ? offers.availability.endsWith('InStock') : null,
    weightFigures,
    ppmCents: ppcCents,
    gemRefResolved,
  });
}

function gemRefOf(fields: TokenResult | undefined): string | null {
  return fields !== undefined && fields.tokens.length > 0 ? String(fields.tokens[0]).toUpperCase() : null;
}

// ---------------------------------------------------------------------------
// The runner
// ---------------------------------------------------------------------------

/** The (design, metal) variant sku per source URL, from the staging DYO parse. */
interface VariantRow {
  readonly source_url: string;
  readonly derived_sku: string;
}

/** Execute the price-recovery stage (corpus mode holds the 1,024 expectation). */
export async function runPricesObservations(ctx: StageContext, options?: { corpus?: boolean }): Promise<PricesStageResult> {
  const db = ctx.db;
  const tokenized = await loadTokenizedSpecifications(ctx.artifactPath('specifications.jsonl'));

  // per-source-URL (design, metal) variant sku for the residual entries
  const variantRows = await db.query<VariantRow>(
    `SELECT source_url, derived_sku FROM staging_parsed_urls WHERE url_family = 'DYO' AND derived_sku IS NOT NULL ORDER BY source_url`,
  );
  const variantBySourceUrl = new Map<string, string>(variantRows.rows.map((r) => [r.source_url, r.derived_sku]));

  // 1. per-page extraction
  let pagesSeen = 0;
  const records: PricedRecord[] = [];
  for await (const { record } of jsonLines(ctx.artifactPath('pages_analyzed.jsonl'))) {
    pagesSeen += 1;
    const url = record['url'];
    if (typeof url !== 'string') continue;
    const pageFields = tokenized.get(url);
    const priced = extractPricedRecord(record, pageFields?.['weight'], pageFields?.['per_carat_price_help'], gemRefOf(pageFields?.['item_id']));
    if (priced !== null) records.push(priced);
  }
  if (options?.corpus !== false && records.length !== EXPECTED_PRICES) {
    throw new Error(`prices-observations: recovered ${records.length} prices, expected the exact ${EXPECTED_PRICES} corpus`);
  }

  // 2. per-record residual derivation (doc 16); halts on any non-positive
  //    weight, missing per-carat evidence or a ZERO residual.
  let observations = 0;
  const residualByVariant = new Map<string, number>();
  const observationRows: Record<string, unknown>[] = [];
  for (const priced of records) {
    const totalMilli = priced.weightFigures.reduce((acc, figure) => acc + milliCarats(figure), 0);
    if (totalMilli <= 0) throw new Error(`prices-observations: non-positive total weight for ${priced.sourceUrl}`);
    if (priced.ppmCents === null) throw new Error(`prices-observations: missing per-carat evidence for ${priced.sourceUrl}`);
    const exactProduct = priced.ppmCents * totalMilli;
    if (exactProduct % 1_000 !== 0) throw new Error(`prices-observations: inexact gem component for ${priced.sourceUrl}`);
    const gemCents = exactProduct / 1_000;
    const making = priced.totalCents - gemCents;
    if (making === 0) throw new Error(`prices-observations: residual derivation is ZERO for ${priced.sourceUrl} — contradicts the verified price model`);
    const variantSku = variantBySourceUrl.get(priced.sourceUrl) ?? null;
    if (variantSku !== null) {
      const prior = residualByVariant.get(variantSku);
      if (prior === undefined || making < prior) residualByVariant.set(variantSku, making);
    }
    observationRows.push({
      source_url: priced.sourceUrl,
      total: centsToMoney(priced.totalCents),
      weight: milliToCarats(totalMilli),
      ppc: priced.ppmCents === null ? null : centsToMoney(priced.ppmCents),
      gem: centsToMoney(gemCents),
      making: centsToMoney(making),
      ratio: scaledRatio4(priced.totalCents, gemCents),
    });
    observations += 1;
  }

  // 3. durable writes (every one idempotent):
  //    3a. the price list (deterministic natural key)
  let listRef: string | undefined = (
    await db.query<{ id: string }>(
      `INSERT INTO price_lists (code, name, currency, state)
       VALUES ('SOURCE_CAPTURE_V1', 'Recovered source prices (capture-time evidence)', 'USD', 'ACTIVE')
       ON CONFLICT (code) DO NOTHING
       RETURNING id::text AS id`,
    )
  ).rows[0]?.id;
  if (listRef === undefined) {
    listRef = (await db.query<{ id: string }>('SELECT id::text AS id FROM price_lists WHERE code = $1', ['SOURCE_CAPTURE_V1'])).rows[0]?.id;
  }
  if (listRef === undefined) throw new Error('prices-observations: the price list did not upsert');

  //    3b. price_model_observations — NOT EXISTS-guarded insert by source_url
  //        (the table has no unique key; identical content is never re-inserted)
  const payload = JSON.stringify(observationRows);
  const obsWrite = await db.query(
    `INSERT INTO price_model_observations (product_id, source_url, observed_total, observed_weight, observed_ppc, gem_component, implied_making, ratio, import_batch_id)
     SELECT prod.id::uuid, o.x->>'source_url',
            (o.x->>'total')::numeric, (o.x->>'weight')::numeric, (o.x->>'ppc')::numeric,
            (o.x->>'gem')::numeric, (o.x->>'making')::numeric, (o.x->>'ratio')::numeric,
            $2::uuid
       FROM jsonb_array_elements($1::jsonb) AS o(x)
       JOIN products prod ON prod.source_url = o.x->>'source_url'
      WHERE NOT EXISTS (
        SELECT 1 FROM price_model_observations existing
         WHERE existing.source_url = o.x->>'source_url'
           AND existing.observed_total = (o.x->>'total')::numeric
           AND existing.observed_weight = (o.x->>'weight')::numeric
           AND existing.observed_ppc = (o.x->>'ppc')::numeric
           AND existing.gem_component = (o.x->>'gem')::numeric
           AND existing.implied_making = (o.x->>'making')::numeric
           AND existing.ratio = (o.x->>'ratio')::numeric)`,
    [payload, ctx.importBatchId],
  );
  ctx.write(`  prices-observations: observation inserts accepted ${String(obsWrite.rowCount ?? 0)}`);


  //    3c. price_entries PRODUCT subjects (observed totals). NOT EXISTS by
  //        subject identity: valid_from defaults to now(), so a second run
  //        would sail past any (…, valid_from) conflict — this guard makes
  //        the rerun a strict no-op, and a differing pre-existing amount is
  //        a determinism violation, halted rather than duplicated.
  const productEntries = await db.query(
    `INSERT INTO price_entries (price_list_id, subject_type, subject_id, amount, currency, evidence_status)
     SELECT $1::uuid, 'PRODUCT', prod.id::uuid, (o.x->>'total')::numeric, 'USD', 'OBSERVED'
       FROM jsonb_array_elements($2::jsonb) AS o(x)
       JOIN products prod ON prod.source_url = o.x->>'source_url'
      WHERE NOT EXISTS (
        SELECT 1 FROM price_entries pe
         WHERE pe.price_list_id = $1::uuid
           AND pe.subject_type = 'PRODUCT'
           AND pe.subject_id = prod.id)`,
    [listRef, payload],
  );
  const entryMismatch = await db.query<{ n: string }>(
    `SELECT count(*)::text AS n
       FROM price_entries pe
       JOIN jsonb_array_elements($1::jsonb) AS o(x) ON true
       JOIN products prod ON prod.source_url = o.x->>'source_url' AND prod.id = pe.subject_id
      WHERE pe.price_list_id = $2::uuid
        AND pe.subject_type = 'PRODUCT'
        AND (pe.amount <> (o.x->>'total')::numeric OR pe.evidence_status <> 'OBSERVED')`,
    [payload, listRef],
  );
  if (Number(entryMismatch.rows[0]?.n ?? '0') !== 0) {
    throw new Error('prices-observations: an existing PRODUCT price entry disagrees with the recovered evidence (determinism violation)');
  }

  //    3d. the INFERRED residual entries for the (design, metal) parents
  let variantEntries = 0;
  for (const [sku, making] of [...residualByVariant.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const existing = await db.query<{ id: string; amount: string; evidence: string }>(
      `SELECT pe.id::text AS id, pe.amount::text AS amount, pe.evidence_status::text AS evidence
         FROM price_entries pe
         JOIN setting_variants v ON v.id = pe.subject_id AND v.sku = $2
        WHERE pe.price_list_id = $1 AND pe.subject_type = 'SETTING_VARIANT'`,
      [listRef, sku],
    );
    if (existing.rows.length > 0) {
      const row = existing.rows[0];
      if (row === undefined || row.amount !== centsToMoney(making) || row.evidence !== 'INFERRED') {
        throw new Error(`prices-observations: existing residual entry for ${sku} disagrees with the recovered evidence (determinism violation)`);
      }
      continue;
    }
    const variantId = (await db.query<{ id: string }>('SELECT id::text AS id FROM setting_variants WHERE sku = $1', [sku])).rows[0]?.id;
    if (variantId === undefined) {
      throw new Error(`prices-observations: residual variant ${sku} has no canonical setting variant row (gate V21)`);
    }
    const r = await db.query(
      `INSERT INTO price_entries (price_list_id, subject_type, subject_id, amount, currency, evidence_status)
       VALUES ($1::uuid, 'SETTING_VARIANT', $2::uuid, $3, 'USD', 'INFERRED')
       ON CONFLICT (price_list_id, subject_type, subject_id, valid_from) DO NOTHING`,
      [listRef, variantId, centsToMoney(making)],
    );
    variantEntries += r.rowCount ?? 0;
  }

    //    3e. currency discipline: the corpus is USD (100%); anything else halts.
  for (const priced of records) {
    if (priced.currency !== 'USD') {
      throw new Error(`prices-observations: non-USD price evidence (${priced.currency}) for ${priced.sourceUrl}`);
    }
  }

  //    3f. the priced products' rows (WHERE-guarded UPDATE; deep rerun: zero)
  const orderedRecords = [...records].sort((a, b) => a.sourceUrl.localeCompare(b.sourceUrl));
  const pricedUrls = orderedRecords.map((priced) => priced.sourceUrl);
  const pricedPayloads = orderedRecords.map((priced) => JSON.stringify({
    total: centsToMoney(priced.totalCents),
    validUntil: priced.validUntil,
    inStock: priced.inStock,
  }));
  const productUpdate = await db.query(
    `UPDATE products p
        SET price_amount = (d.payload_text::jsonb->>'total')::numeric,
            price_evidence = 'OBSERVED',
            price_valid_until = (d.payload_text::jsonb->>'validUntil')::date,
            availability = COALESCE((d.payload_text::jsonb->>'inStock')::boolean, TRUE)
       FROM (SELECT UNNEST($1::text[]) AS source_url, UNNEST($2::text[]) AS payload_text) AS d
      WHERE p.source_url = d.source_url
        AND (p.price_amount IS DISTINCT FROM (d.payload_text::jsonb->>'total')::numeric
          OR p.price_evidence <> 'OBSERVED'
          OR p.price_valid_until IS DISTINCT FROM (d.payload_text::jsonb->>'validUntil')::date
          OR p.availability IS DISTINCT FROM COALESCE((d.payload_text::jsonb->>'inStock')::boolean, TRUE))`,
    [pricedUrls, pricedPayloads],
  );
  const productRowsUpdated = productUpdate.rowCount ?? 0;

  //    3g. the gemstone rows' single per-carat value. Stability gate: every
  //        ref's ppc is a STRICTLY single value across its pages (verified
  //        corpus property); two different values for one ref halts — never
  //        an average.
  const ppcByRef = new Map<string, number>();
  for (const priced of orderedRecords) {
    const ref = priced.gemRefResolved;
    if (ref === null) continue;
    const ppc = priced.ppmCents;
    if (ppc === null) continue;
    const prior = ppcByRef.get(ref);
    if (prior !== undefined && prior !== ppc) {
      throw new Error(`prices-observations: unstable per-carat evidence for ${ref} (${String(prior)} vs ${String(ppc)})`);
    }
    ppcByRef.set(ref, ppc);
  }
  const gemRefs = [...ppcByRef.keys()].sort((a, b) => a.localeCompare(b));
  const gemPayload = JSON.stringify(gemRefs.map((ref) => ({
    gemRef: ref,
    amount: centsToMoney(ppcByRef.get(ref) as number),
  })));
  const gemstoneUpdate = await db.query(
    `UPDATE gemstones g
        SET price_per_carat = (o.x->>'amount')::numeric,
            price_evidence = 'EXTRACTED',
            availability_source = 'schema.org/InStock'
       FROM jsonb_array_elements($1::jsonb) AS o(x)
      WHERE g.gem_ref = o.x->>'gemRef'
        AND (g.price_per_carat IS DISTINCT FROM (o.x->>'amount')::numeric
          OR g.price_evidence <> 'EXTRACTED'
          OR g.availability_source IS DISTINCT FROM 'schema.org/InStock')`,
    [gemPayload],
  );
  const gemstoneRowsUpdated = gemstoneUpdate.rowCount ?? 0;

  return {
    pagesSeen,
    pricesRecovered: records.length,
    productEntryCount: productEntries.rowCount ?? 0,
    variantEntryCount: variantEntries,
    observations,
    productRowsUpdated,
    gemstoneRowsUpdated,
  };
}
