/**
 * F4 — vendor image upload (fresh-api).
 * Accepts a base64 data URL (or external HTTPS URL), stores an assets row.
 * The DYO configurator pool picks up gemstone images automatically.
 */
import type { AnyClient } from './db.js';
import { StateError } from './validation.js';
import { storeImage, removeStoredImage } from './media.js';

function err(message: string, status: number): Error {
  const e = new StateError(message);
  (e as Error & { status?: number }).status = status;
  return e;
}

export interface ImageUploadResult {
  asset_id: number;
  url: string;
  role: string;
}

export async function uploadImage(
  client: AnyClient,
  vendorCode: string,
  itemRef: string,
  imageData: string,
  alt: string | undefined,
): Promise<ImageUploadResult> {
  // validate the item belongs to this vendor (gemstone first, then product)
  let ownerId: number | null = null;
  let ownerKind = 'gemstone';

  const gem = await client.query(
    `SELECT g.id FROM fresh.gemstones g JOIN fresh.vendors v ON v.id = g.vendor_id
     WHERE g.ref = $1 AND v.code = $2`,
    [itemRef, vendorCode.toUpperCase()],
  );
  if (gem.rows[0]) {
    ownerId = Number(gem.rows[0].id);
  } else {
    const prod = await client.query(
      `SELECT p.id FROM fresh.products p JOIN fresh.vendors v ON v.id = p.vendor_id
       WHERE p.ref = $1 AND v.code = $2`,
      [itemRef, vendorCode.toUpperCase()],
    );
    if (prod.rows[0]) { ownerId = Number(prod.rows[0].id); ownerKind = 'product'; }
  }
  if (ownerId == null) throw err(`item '${itemRef}' not found in vendor's inventory`, 404);

  // validate image data
  let url: string;
  const dataUrl = /^data:(image\/(?:jpeg|png|webp|gif|avif));base64,([A-Za-z0-9+/=\s]+)$/.exec(imageData);
  if (dataUrl) {
    const buffer = Buffer.from(dataUrl[2]!, 'base64');
    if (buffer.length > 2 * 1024 * 1024) throw err('image too large (max 2 MB)', 422);
    const stored = await storeImage(buffer, dataUrl[1]!);
    url = stored.url;
  } else if (imageData.startsWith('https://')) {
    // external URL: store as-is
    url = imageData;
  } else {
    throw err('image must be a base64 data URL (data:image/…) or an HTTPS URL', 422);
  }

  // count existing images (≤10 per item per the media rules)
  const { rows: countRows } = await client.query(
    `SELECT count(*)::int AS n FROM fresh.assets WHERE owner_kind = $1 AND owner_id = $2 AND kind = 'IMAGE'`,
    [ownerKind, ownerId],
  );
  const existingCount = Number(countRows[0]?.n ?? 0);
  if (existingCount >= 10) throw err('media limit reached (max 10 images per item)', 409);

  const role = existingCount === 0 ? 'PRIMARY' : 'GALLERY';
  const position = existingCount;

  const { rows } = await client.query(
    `INSERT INTO fresh.assets (owner_kind, owner_id, role, kind, url, position, alt)
     VALUES ($1,$2,$3,'IMAGE',$4,$5,$6) RETURNING id`,
    [ownerKind, ownerId, role, url, position, alt ?? null],
  );
  const assetId = Number(rows[0].id);
  return { asset_id: assetId, url, role };
}

export async function deleteImage(client: AnyClient, vendorCode: string, itemRef: string, assetId: number): Promise<void> {
  const { rows } = await client.query(
    `DELETE FROM fresh.assets a
     WHERE a.id = $1 AND a.owner_id = (
       SELECT CASE WHEN a2.owner_kind = 'gemstone' THEN (SELECT id FROM fresh.gemstones WHERE ref = $2 AND vendor_id = (SELECT id FROM fresh.vendors WHERE code = $3))
                   ELSE (SELECT id FROM fresh.products WHERE ref = $2 AND vendor_id = (SELECT id FROM fresh.vendors WHERE code = $3)) END
       FROM fresh.assets a2 WHERE a2.id = $1
     )
     RETURNING a.url`,
    [assetId, itemRef, vendorCode.toUpperCase()],
  );
  if (!rows[0]) throw err(`asset ${assetId} not found or not owned by you`, 404);
  await removeStoredImage(String(rows[0].url));
}
