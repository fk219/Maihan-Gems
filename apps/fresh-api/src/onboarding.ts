import type { AnyClient } from './db.js';
import { audit } from './db.js';
import { mintVendorCode } from './mint.js';
import { vendorOnboardingSchema, StateError } from './validation.js';
import { newToken, hashKey } from './auth.js';

export interface OnboardResult { vendorCode: string; status: string }

export async function createVendor(client: AnyClient, body: unknown): Promise<OnboardResult> {
  const p = vendorOnboardingSchema.parse(body);
  const country = p.country.toUpperCase();
  const code = await mintVendorCode(client, country);
  const { rows } = await client.query(
    `INSERT INTO fresh.vendors (code, name, country, status) VALUES ($1,$2,$3,'DRAFT') RETURNING id`,
    [code, p.name, country],
  );
  const vendorId = Number(rows[0]!.id);
  await client.query(
    `INSERT INTO fresh.vendor_onboarding (vendor_id, legal_name, contact_name, email, phone, website, country, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'PENDING')`,
    [vendorId, p.legal_name, p.contact_name, p.email, p.phone ?? null, p.website ?? null, country],
  );
  await audit(client, 'CREATE_VENDOR', 'vendor', vendorId, { code, country, email: p.email });
  return { vendorCode: code, status: 'PENDING' };
}

async function setOnboarding(client: AnyClient, code: string, onboardingStatus: string, vendorStatus: string, actor: string, note: string | null): Promise<void> {
  const vq = await client.query(`SELECT id, status FROM fresh.vendors WHERE code = $1`, [code.toUpperCase()]);
  const v = vq.rows[0];
  if (!v) throw new StateError(`unknown vendor '${code}'`);
  const { rowCount, rows } = await client.query(
    `UPDATE fresh.vendor_onboarding SET status = $2, reviewed_by = $3, reviewed_at = now(), note = COALESCE($4, note)
     WHERE vendor_id = $1 RETURNING id`,
    [v.id, onboardingStatus, actor, note],
  );
  if (!rowCount) throw new StateError(`no onboarding record for vendor '${code}'`);
  await client.query(`UPDATE fresh.vendors SET status = $2 WHERE id = $1`, [v.id, vendorStatus]);
  await audit(client, `ONBOARDING_${onboardingStatus}`, 'vendor', Number(rows[0]!.id), { code, vendorStatus });
}

export async function approveOnboarding(client: AnyClient, code: string, actor: string): Promise<OnboardResult & { apiKey: string }> {
  const vq = await client.query(`SELECT id, status FROM fresh.vendors WHERE code = $1`, [code.toUpperCase()]);
  const v = vq.rows[0];
  if (!v) throw new StateError(`unknown vendor '${code}'`);
  const key = newToken();
  const { rowCount, rows } = await client.query(
    `UPDATE fresh.vendor_onboarding SET status = 'APPROVED', reviewed_by = $2, reviewed_at = now(), api_key_hash = $3
     WHERE vendor_id = $1 RETURNING id`,
    [v.id, actor, key.hash],
  );
  if (!rowCount) throw new StateError(`no onboarding record for vendor '${code}'`);
  await client.query(`UPDATE fresh.vendors SET status = 'ACTIVE' WHERE id = $1`, [v.id]);
  await audit(client, 'ONBOARDING_APPROVED', 'vendor', Number(rows[0]!.id), { code: code.toUpperCase(), vendorStatus: 'ACTIVE' });
  return { vendorCode: code.toUpperCase(), status: 'ACTIVE', apiKey: key.raw };
}

export const rejectOnboarding = (client: AnyClient, code: string, note: string, actor: string) =>
  setOnboarding(client, code, 'REJECTED', 'ARCHIVED', actor, note);

export const suspendOnboarding = (client: AnyClient, code: string, note: string, actor: string) =>
  setOnboarding(client, code, 'SUSPENDED', 'ARCHIVED', actor, note);

// vendor authentication: code + API key (hash verified, vendor must be ACTIVE)
export async function verifyVendor(client: AnyClient, code: string, apiKey: string | undefined): Promise<void> {
  if (!apiKey) {
    const e = new StateError('vendor API key required (X-Vendor-Key)');
    (e as Error & { status?: number }).status = 401;
    throw e;
  }
  const { rows } = await client.query(
    `SELECT 1 FROM fresh.vendors v JOIN fresh.vendor_onboarding o ON o.vendor_id = v.id
     WHERE v.code = $1 AND v.status = 'ACTIVE' AND o.status = 'APPROVED' AND o.api_key_hash = $2`,
    [code.toUpperCase(), hashKey(apiKey)],
  );
  if (!rows[0]) {
    const e = new StateError('invalid vendor code/key');
    (e as Error & { status?: number }).status = 401;
    throw e;
  }
}

export async function getVendor(client: AnyClient, code: string) {
  const { rows } = await client.query(
    `SELECT v.id, v.code, v.name, v.country, v.status, o.legal_name, o.contact_name, o.email, o.status AS onboarding_status
     FROM fresh.vendors v LEFT JOIN fresh.vendor_onboarding o ON o.vendor_id = v.id WHERE v.code = $1`,
    [code.toUpperCase()],
  );
  if (!rows[0]) throw new StateError(`unknown vendor '${code}'`);
  const conflict = await client.query(`SELECT count(*)::int AS submissions FROM fresh.vendor_submissions WHERE vendor_id = $1`, [rows[0]!.id]);
  return { ...rows[0], submissions: conflict.rows[0]!.submissions };
}

