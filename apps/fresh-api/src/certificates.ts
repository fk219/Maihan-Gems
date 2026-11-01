/**
 * Certificates: a vendor may attach agency reports to a stone it owns.
 * New rows start UNVERIFIED; only VERIFIED rows are exposed publicly.
 */
import type { AnyClient } from './db.js';
import { audit } from './db.js';
import { StateError } from './validation.js';

export interface CertificateInput {
  agency: string;
  cert_no: string;
  url?: string;
  issued_at?: string;
}

async function ownedGemstone(client: AnyClient, vendorCode: string, ref: string): Promise<{ id: number; vendorId: number }> {
  const { rows } = await client.query(
    `SELECT g.id, g.vendor_id FROM fresh.gemstones g JOIN fresh.vendors v ON v.id = g.vendor_id
     WHERE g.ref = $1 AND v.code = $2`,
    [ref, vendorCode.toUpperCase()],
  );
  if (!rows[0]) {
    const e = new StateError(`stone '${ref}' not found for this vendor`);
    (e as Error & { status?: number }).status = 404;
    throw e;
  }
  return { id: Number(rows[0].id), vendorId: Number(rows[0].vendor_id) };
}

export async function listVendorCertificates(client: AnyClient, vendorCode: string, ref: string) {
  const gem = await ownedGemstone(client, vendorCode, ref);
  const { rows } = await client.query(
    `SELECT id, agency, cert_no, url, issued_at::text AS issued_at, verified, note, created_at::text AS created_at
     FROM fresh.certificates WHERE owner_kind = 'gemstone' AND owner_id = $1 ORDER BY created_at DESC`,
    [gem.id],
  );
  return { ref, certificates: rows };
}

export async function addCertificate(client: AnyClient, vendorCode: string, ref: string, input: CertificateInput, actor: string) {
  const agency = input.agency.trim();
  const certNo = input.cert_no.trim();
  if (!agency || !certNo) throw new StateError('agency and cert_no are required');
  if (agency.length > 80 || certNo.length > 80) throw new StateError('agency/cert_no too long');
  if (input.url && !/^https:\/\//i.test(input.url)) throw new StateError('certificate url must be https');
  const gem = await ownedGemstone(client, vendorCode, ref);
  const count = await client.query(`SELECT count(*)::int AS n FROM fresh.certificates WHERE owner_kind='gemstone' AND owner_id=$1`, [gem.id]);
  if (Number(count.rows[0].n) >= 5) throw new StateError('at most 5 certificates per stone');
  const { rows } = await client.query(
    `INSERT INTO fresh.certificates (owner_kind, owner_id, agency, cert_no, url, issued_at)
     VALUES ('gemstone',$1,$2,$3,$4,$5)
     RETURNING id, agency, cert_no, url, issued_at::text AS issued_at, verified`,
    [gem.id, agency, certNo, input.url ?? null, input.issued_at ?? null],
  );
  await audit(client, 'CERTIFICATE_ADDED', 'gemstone', gem.id, { ref, agency, cert_no: certNo, vendor: actor }, 'vendor');
  return rows[0];
}

export async function removeCertificate(client: AnyClient, vendorCode: string, ref: string, id: number, actor: string) {
  const gem = await ownedGemstone(client, vendorCode, ref);
  const { rowCount } = await client.query(
    `DELETE FROM fresh.certificates WHERE id = $1 AND owner_kind = 'gemstone' AND owner_id = $2`,
    [id, gem.id],
  );
  if (!rowCount) throw new StateError(`certificate ${id} not found`);
  await audit(client, 'CERTIFICATE_REMOVED', 'gemstone', gem.id, { ref, certificate_id: id, vendor: actor }, 'vendor');
  return { removed: true };
}


export async function listCertificates(client: AnyClient, status: string | null) {
  const params: unknown[] = [];
  const where: string[] = [];
  if (status) { params.push(status); where.push(`c.verified = $${params.length}`); }
  const { rows } = await client.query(
    `SELECT c.id, c.agency, c.cert_no, c.url, c.issued_at::text AS issued_at, c.verified, c.note,
            c.created_at::text AS created_at,
            g.ref AS gemstone_ref, g.name AS gemstone_name, v.code AS vendor_code, v.name AS vendor_name
     FROM fresh.certificates c
     LEFT JOIN fresh.gemstones g ON c.owner_kind = 'gemstone' AND g.id = c.owner_id
     LEFT JOIN fresh.vendors v ON v.id = g.vendor_id
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY c.created_at DESC LIMIT 200`,
    params,
  );
  return rows;
}

export async function verifyCertificate(
  client: AnyClient,
  id: number,
  verified: 'UNVERIFIED' | 'VERIFIED' | 'FLAGGED',
  actor: string,
) {
  if (!['UNVERIFIED', 'VERIFIED', 'FLAGGED'].includes(verified)) throw new StateError('invalid verification state');
  const { rows } = await client.query(
    `UPDATE fresh.certificates SET verified = $2 WHERE id = $1 RETURNING id, agency, cert_no, verified`,
    [id, verified],
  );
  if (!rows[0]) {
    const e = new StateError(`certificate ${id} not found`);
    (e as Error & { status?: number }).status = 404;
    throw e;
  }
  await audit(client, `CERTIFICATE_${verified}`, 'certificate', id, { verified }, actor);
  return rows[0];
}
