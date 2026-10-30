import { z } from 'zod';
import type { AnyClient } from './db.js';
import { audit } from './db.js';
import {
  mintGemstoneCode, mintProductCode, mintDesignCode, settingCode,
} from './mint.js';
import {
  gemstoneSubmissionSchema, settingSubmissionSchema, productSubmissionSchema,
  resolveVariety, resolveOptional, resolveTreatmentIds, resolveId,
  VocabError, StateError, JT_LETTER,
} from './validation.js';
type GemstoneSubmission = z.infer<typeof gemstoneSubmissionSchema>;
type SettingSubmission = z.infer<typeof settingSubmissionSchema>;
type ProductSubmission = z.infer<typeof productSubmissionSchema>;

const norm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'x';
const title = (s: string): string => s.split(/[\s-]+/).filter(Boolean).map((w) => w[0]!.toUpperCase() + w.slice(1)).join(' ');

export interface VendorRow { id: number; code: string; name: string; country: string | null; status: string }

export async function loadVendor(client: AnyClient, code: string): Promise<VendorRow> {
  const { rows } = await client.query(`SELECT id, code, name, country, status FROM fresh.vendors WHERE code = $1`, [code.toUpperCase()]);
  if (!rows[0]) throw new StateError(`unknown vendor '${code}'`);
  const v = rows[0]!;
  const ob = await client.query(`SELECT status FROM fresh.vendor_onboarding WHERE vendor_id = $1`, [v.id]);
  if (!ob.rows[0] || ob.rows[0]!.status !== 'APPROVED') {
    throw new StateError(`vendor '${v.code}' onboarding is not APPROVED (submissions blocked)`);
  }
  return { id: Number(v.id), code: String(v.code), name: String(v.name), country: v.country as string | null, status: String(v.status) };
}

// V-AE-001 → AE001
export function vendorSegment(code: string): string {
  const m = code.match(/^V-([A-Za-z]{2})-0*(\d+)$/);
  if (!m) throw new StateError(`vendor code '${code}' does not follow V-{CC}-{NNN}`);
  return `${m[1]!.toUpperCase()}${m[2]!.padStart(3, '0')}`;
}

async function mintSlug(client: AnyClient, table: string, parts: Array<string | null | undefined>): Promise<string> {
  const base = norm(parts.filter(Boolean).map(String).join('-'));
  let slug = base;
  let n = 2;
  for (;;) {
    const { rowCount } = await client.query(`SELECT 1 FROM fresh.${table} WHERE slug = $1`, [slug]);
    if (!rowCount) return slug;
    slug = `${base}-${n++}`;
  }
}

async function insertGemstone(client: AnyClient, vendor: VendorRow, p: GemstoneSubmission): Promise<string> {
  const variety = await resolveVariety(client, p.variety);
  const colourId = await resolveOptional(client, 'gemstone_colours', 'slug', p.colour, 'colour');
  const originId = await resolveOptional(client, 'gemstone_origins', 'slug', p.origin, 'origin');
  const shapeId = await resolveOptional(client, 'shapes', 'slug', p.shape, 'shape');
  const clarityId = await resolveOptional(client, 'clarities', 'code', p.clarity, 'clarity');
  const treatmentIds = await resolveTreatmentIds(client, p.treatments);

  const ref = await mintGemstoneCode(client, p.kind, variety.familyCode, variety.code, vendorSegment(vendor.code));
  const name = [p.colour ? title(p.colour) : null, title(variety.slug), `${p.weight_ct}ct`, p.shape ? title(p.shape) : null].filter(Boolean).join(' ');
  const slug = await mintSlug(client, 'gemstones', [p.colour ? norm(p.colour) : null, variety.slug, p.shape ? norm(p.shape) : null, `${p.weight_ct}ct`, p.kind === 'PAIR' ? 'pair' : null]);

  const { rows } = await client.query(
    `INSERT INTO fresh.gemstones (ref, slug, name, variety_id, colour_id, origin_id, shape_id, clarity_id, kind, pieces,
       weight_ct, description, price_amount, currency, quantity, status, origin_type, vendor_id, vendor_ref)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,1,$15,$16,$17,$18) RETURNING id`,
    [ref, slug, name, variety.id, colourId, originId, shapeId, clarityId,
      p.kind, p.kind === 'PAIR' ? 2 : 1, p.weight_ct, p.description ?? null,
      p.price_amount ?? null, p.currency, p.price_amount != null ? 'ACTIVE' : 'DRAFT',
      p.origin_type, vendor.id, p.vendor_ref],
  );
  const gemId = Number(rows[0]!.id);
  for (const t of treatmentIds) {
    await client.query(`INSERT INTO fresh.gemstone_treatments (gemstone_id, treatment_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [gemId, t]);
  }
  return ref;
}

async function insertSetting(client: AnyClient, vendor: VendorRow, p: SettingSubmission): Promise<string> {
  if ((p.min_ct == null) !== (p.max_ct == null)) throw new VocabError('min_ct and max_ct must be provided together');
  const jtId = await resolveId(client, 'jewellery_types', 'code', p.jewellery_type, 'jewellery type');
  const metalId = await resolveId(client, 'metals', 'code', p.metal.toUpperCase(), 'metal');
  const styleId = await resolveOptional(client, 'setting_styles', 'slug', p.style, 'style');

  const designCode = await mintDesignCode(client);
  const ref = settingCode(JT_LETTER[p.jewellery_type]!, designCode, p.metal.toUpperCase(), vendorSegment(vendor.code));
  const name = [p.style ? title(p.style) : null, title(p.jewellery_type), 'Setting', p.metal.toUpperCase()].filter(Boolean).join(' ');
  const slug = await mintSlug(client, 'settings', [p.style, p.jewellery_type.toLowerCase(), 'setting', p.metal.toLowerCase(), designCode.toLowerCase()]);

  await client.query(
    `INSERT INTO fresh.settings (ref, slug, sku, name, design_code, jewellery_type_id, style_id, metal_id, description,
       price_amount, currency, status, vendor_id, vendor_ref, min_ct, max_ct)
     VALUES ($1,$2,$1,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
    [ref, slug, name, designCode, jtId, styleId, metalId, p.description ?? null,
      p.price_amount ?? null, p.currency, p.price_amount != null ? 'ACTIVE' : 'DRAFT',
      vendor.id, p.vendor_ref, p.min_ct ?? null, p.max_ct ?? null],
  );
  return ref;
}

async function insertProduct(client: AnyClient, vendor: VendorRow, p: ProductSubmission): Promise<string> {
  const jtId = await resolveId(client, 'jewellery_types', 'code', p.jewellery_type, 'jewellery type');
  const _metalId = await resolveId(client, 'metals', 'code', p.metal.toUpperCase(), 'metal');
  let _varietyId: number | null = null, varietySlug: string | null = null;
  if (p.variety) {
    const v = await resolveVariety(client, p.variety);
    _varietyId = v.id; varietySlug = v.slug;
  }
  const _shapeId = await resolveOptional(client, 'shapes', 'slug', p.shape, 'shape');

  const ref = await mintProductCode(client, JT_LETTER[p.jewellery_type]!, 'M', p.metal.toUpperCase(), vendorSegment(vendor.code));
  const name = [varietySlug ? title(varietySlug) : 'Gemstone', p.style ? title(p.style) : null, title(p.jewellery_type), p.shape ? title(p.shape) : null, p.metal.toUpperCase()].filter(Boolean).join(' ');
  const slug = await mintSlug(client, 'products', [varietySlug, p.style, p.shape ? norm(p.shape) : null, p.jewellery_type.toLowerCase(), p.metal.toLowerCase(), ref.toLowerCase()]);

  await client.query(
    `INSERT INTO fresh.products (ref, slug, name, jewellery_type_id, kind, price_amount, currency, status, vendor_id, vendor_ref)
     VALUES ($1,$2,$3,$4,'READY_MADE',$5,$6,$7,$8,$9)`,
    [ref, slug, name, jtId, p.price_amount ?? null, p.currency,
      p.price_amount != null ? 'ACTIVE' : 'DRAFT', vendor.id, p.vendor_ref],
  );
  return ref;
}

export interface ApproveResult { ref: string; kind: string }

export async function approveSubmission(client: AnyClient, submissionId: number, adminActor: string): Promise<ApproveResult> {
  const locked = await client.query(
    `SELECT id, vendor_id, submission_kind, payload, status FROM fresh.vendor_submissions WHERE id = $1 FOR UPDATE`,
    [submissionId],
  );
  const sub = locked.rows[0];
  if (!sub) throw new StateError(`submission ${submissionId} not found`);
  if (sub.status !== 'SUBMITTED') throw new StateError(`submission ${submissionId} is '${sub.status}', only SUBMITTED can be approved`);

  const vq = await client.query(`SELECT id, code, name, country, status FROM fresh.vendors WHERE id = $1`, [sub.vendor_id]);
  const v = vq.rows[0]!;
  const vendor: VendorRow = { id: Number(v.id), code: String(v.code), name: String(v.name), country: v.country as string | null, status: String(v.status) };

  let ref: string;
  const kind = String(sub.submission_kind);
  if (kind === 'gemstone') {
    ref = await insertGemstone(client, vendor, gemstoneSubmissionSchema.parse(sub.payload));
  } else if (kind === 'setting') {
    ref = await insertSetting(client, vendor, settingSubmissionSchema.parse(sub.payload));
  } else if (kind === 'product') {
    ref = await insertProduct(client, vendor, productSubmissionSchema.parse(sub.payload));
  } else {
    throw new VocabError(`unknown submission kind '${kind}'`);
  }

  await client.query(
    `UPDATE fresh.vendor_submissions SET status = 'APPROVED', resulting_ref = $2, reviewed_by = $3, reviewed_at = now() WHERE id = $1`,
    [submissionId, ref, adminActor],
  );
  await audit(client, 'APPROVE_SUBMISSION', 'vendor_submission', submissionId, { ref, kind });
  return { ref, kind };
}

export async function rejectSubmission(client: AnyClient, submissionId: number, note: string, adminActor: string): Promise<void> {
  const { rowCount } = await client.query(
    `UPDATE fresh.vendor_submissions SET status = 'REJECTED', reviewer_note = $2, reviewed_by = $3, reviewed_at = now()
     WHERE id = $1 AND status = 'SUBMITTED'`,
    [submissionId, note, adminActor],
  );
  if (!rowCount) throw new StateError(`submission ${submissionId} not found or not SUBMITTED`);
  await audit(client, 'REJECT_SUBMISSION', 'vendor_submission', submissionId, { note });
}

export async function listSubmissions(client: AnyClient, status: string | null, vendorCode: string | null) {
  const params: unknown[] = [];
  const where: string[] = [];
  if (status) { params.push(status); where.push(`s.status = $${params.length}`); }
  if (vendorCode) {
    params.push(vendorCode.toUpperCase());
    where.push(`v.code = $${params.length}`);
  }
  const { rows } = await client.query(
    `SELECT s.id, s.submission_kind, s.status, s.payload, s.resulting_ref, s.created_at,
            s.reviewer_note, s.reviewed_at, v.code AS vendor_code
     FROM fresh.vendor_submissions s JOIN fresh.vendors v ON v.id = s.vendor_id
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY s.id DESC LIMIT 100`,
    params,
  );
  return rows;
}
