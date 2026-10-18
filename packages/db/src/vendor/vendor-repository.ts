/**
 * packages/db/src/vendor/vendor-repository.ts
 *
 * Vendor Onboarding, Profile, Product Lifecycle & Moderation, Asset Validation,
 * Inventory Management, and Multi-Vendor Order Fulfilment.
 *
 * Security & Domain Invariants:
 * - Strict vendor isolation: a vendor can only view/modify their own products
 *   and their own order line items. Cross-vendor access throws 403 FORBIDDEN.
 * - Separation of duties: a vendor can create (`DRAFT`) and submit (`SUBMITTED`)
 *   products for review, but can NEVER approve or publish their own products.
 * - Only `CATALOG_MANAGER` or `ADMIN_SUPER` may approve, reject, publish,
 *   unpublish, or archive products.
 * - Public storefront & catalog queries only return `state = 'ACTIVE'` products.
 */
import { randomBytes } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { ContractError } from '@maihan/contracts';
import type { AdminRole } from '@maihan/domain';
import type { CatalogDatabase } from '../catalog/executor.js';
import { recordNotification, type VendorOnboardingStatus } from '../auth/auth-repository.js';

export type ProductModerationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'PUBLISHED'
  | 'ARCHIVED';

export interface VendorProfileDto {
  readonly id: string;
  readonly owner_customer_id: string;
  readonly email: string;
  readonly slug: string;
  readonly display_name: string;
  readonly legal_name: string;
  readonly country_code: string;
  readonly city: string;
  readonly bourse_member: boolean;
  readonly description: string | null;
  readonly contact_phone: string | null;
  readonly status: VendorOnboardingStatus;
  readonly rejection_reason: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface VendorProductDto {
  readonly id: string;
  readonly vendor_id: string;
  readonly vendor_name: string;
  readonly sku: string;
  readonly slug: string;
  readonly title: string;
  readonly description: string | null;
  readonly kind: 'LOOSE_STONE' | 'STONE_PAIR' | 'READY_MADE';
  readonly jewellery_type: 'RING' | 'EARRINGS' | 'NECKLACE' | 'PENDANT' | 'BRACELET';
  readonly price_amount: string;
  readonly currency: string;
  readonly inventory_quantity: number;
  readonly availability: boolean;
  readonly state: string;
  readonly moderation_status: ProductModerationStatus;
  readonly rejection_reason: string | null;
  readonly total_weight_ct: string | null;
  readonly stone_type: string | null;
  readonly shape: string | null;
  readonly origin_country: string | null;
  readonly treatment_status: string | null;
  readonly metal_type: string | null;
  readonly images: readonly string[];
  readonly submitted_at: string | null;
  readonly published_at: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface CreateVendorProductInput {
  readonly sku: string;
  readonly title: string;
  readonly description?: string;
  readonly kind?: 'LOOSE_STONE' | 'STONE_PAIR' | 'READY_MADE';
  readonly jewellery_type?: 'RING' | 'EARRINGS' | 'NECKLACE' | 'PENDANT' | 'BRACELET';
  readonly price_amount: number | string;
  readonly inventory_quantity?: number;
  readonly total_weight_ct?: number | string;
  readonly stone_type?: string;
  readonly shape?: string;
  readonly origin_country?: string;
  readonly treatment_status?: string;
  readonly metal_type?: string;
  readonly images?: Array<{ url: string; mime_type?: string; bytes?: number; alt_text?: string } | string>;
}

export interface VendorOrderLineDto {
  readonly order_id: string;
  readonly order_number: string;
  readonly order_state: string;
  readonly placed_at: string | null;
  readonly order_item_id: string;
  readonly product_id: string;
  readonly sku_snapshot: string;
  readonly title_snapshot: string;
  readonly quantity: number;
  readonly unit_price: string;
  readonly line_total: string;
  readonly item_state: string;
  readonly fulfillment_id: string | null;
  readonly fulfillment_state: string;
  readonly carrier: string | null;
  readonly tracking_number: string | null;
  readonly tracking_url: string | null;
  readonly shipped_at: string | null;
  readonly delivered_at: string | null;
  readonly shipping_city: string | null;
  readonly shipping_country: string | null;
}

const ALLOWED_IMAGE_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
]);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

function validateAndNormalizeImages(
  images: CreateVendorProductInput['images'],
): Array<{ url: string; mime_type: string; bytes: number; alt_text: string }> {
  if (!images || images.length === 0) return [];
  if (images.length > 12) {
    throw new ContractError('VALIDATION_FAILED', 'A product may have at most 12 images.');
  }
  return images.map((item) => {
    const obj = typeof item === 'string' ? { url: item } : item;
    const url = (obj.url ?? '').trim();
    if (!url || (!url.startsWith('https://') && !url.startsWith('http://') && !url.startsWith('/'))) {
      throw new ContractError('VALIDATION_FAILED', `Invalid image URL: "${url}"`);
    }
    if (/\.(exe|sh|bat|php|js|html|svg)$/i.test(url.split('?')[0] ?? '')) {
      throw new ContractError('VALIDATION_FAILED', 'Unsupported or unsafe file extension for product image.');
    }
    const mime = obj.mime_type?.trim().toLowerCase() || 'image/jpeg';
    if (!ALLOWED_IMAGE_MIME.has(mime)) {
      throw new ContractError('VALIDATION_FAILED', `Unsupported image MIME type "${mime}". Allowed: JPEG, PNG, WebP, AVIF.`);
    }
    const bytes = obj.bytes ?? 1024;
    if (!Number.isFinite(bytes) || bytes <= 0 || bytes > MAX_IMAGE_BYTES) {
      throw new ContractError('VALIDATION_FAILED', 'Image file size must be between 1 byte and 10 MB.');
    }
    return {
      url,
      mime_type: mime,
      bytes,
      alt_text: obj.alt_text?.trim() || 'Product image',
    };
  });
}

export async function getVendorById(
  db: CatalogDatabase,
  vendorId: string,
): Promise<VendorProfileDto | null> {
  const res = await db.execute(sql`
    SELECT id::text AS id, payload, created_at::text AS created_at, updated_at::text AS updated_at
    FROM jobs
    WHERE id = ${vendorId} AND queue = 'vendors'
    LIMIT 1
  `);
  if (res.rows.length === 0) return null;
  const row = res.rows[0] as { id: string; payload: Record<string, unknown>; created_at: string; updated_at: string };
  const p = row.payload;
  return {
    id: row.id,
    owner_customer_id: String(p['owner_customer_id'] ?? ''),
    email: String(p['email'] ?? ''),
    slug: String(p['slug'] ?? ''),
    display_name: String(p['display_name'] ?? ''),
    legal_name: String(p['legal_name'] ?? ''),
    country_code: String(p['country_code'] ?? 'AE'),
    city: String(p['city'] ?? 'Dubai'),
    bourse_member: Boolean(p['bourse_member']),
    description: p['description'] ? String(p['description']) : null,
    contact_phone: p['contact_phone'] ? String(p['contact_phone']) : null,
    status: (p['status'] as VendorOnboardingStatus) ?? 'PENDING',
    rejection_reason: p['rejection_reason'] ? String(p['rejection_reason']) : null,
    created_at: new Date(row.created_at).toISOString(),
    updated_at: new Date(row.updated_at).toISOString(),
  };
}

export async function getVendorByOwnerCustomerId(
  db: CatalogDatabase,
  customerId: string,
): Promise<VendorProfileDto | null> {
  const res = await db.execute(sql`
    SELECT id::text AS id, payload, created_at::text AS created_at, updated_at::text AS updated_at
    FROM jobs
    WHERE job_key = ${'vendor:owner:' + customerId} AND queue = 'vendors'
    LIMIT 1
  `);
  if (res.rows.length === 0) return null;
  const row = res.rows[0] as { id: string; payload: Record<string, unknown>; created_at: string; updated_at: string };
  const p = row.payload;
  return {
    id: row.id,
    owner_customer_id: String(p['owner_customer_id'] ?? customerId),
    email: String(p['email'] ?? ''),
    slug: String(p['slug'] ?? ''),
    display_name: String(p['display_name'] ?? ''),
    legal_name: String(p['legal_name'] ?? ''),
    country_code: String(p['country_code'] ?? 'AE'),
    city: String(p['city'] ?? 'Dubai'),
    bourse_member: Boolean(p['bourse_member']),
    description: p['description'] ? String(p['description']) : null,
    contact_phone: p['contact_phone'] ? String(p['contact_phone']) : null,
    status: (p['status'] as VendorOnboardingStatus) ?? 'PENDING',
    rejection_reason: p['rejection_reason'] ? String(p['rejection_reason']) : null,
    created_at: new Date(row.created_at).toISOString(),
    updated_at: new Date(row.updated_at).toISOString(),
  };
}

export async function updateVendorProfile(
  db: CatalogDatabase,
  vendorId: string,
  actorCustomerId: string,
  input: {
    display_name?: string;
    legal_name?: string;
    country_code?: string;
    city?: string;
    bourse_member?: boolean;
    description?: string;
    contact_phone?: string;
  },
): Promise<VendorProfileDto> {
  const existing = await getVendorById(db, vendorId);
  if (!existing) {
    throw new ContractError('NOT_FOUND', 'Vendor profile not found.');
  }
  if (existing.owner_customer_id !== actorCustomerId) {
    throw new ContractError('FORBIDDEN', 'You do not have permission to modify another vendor profile.');
  }
  const updatedPayload = {
    owner_customer_id: existing.owner_customer_id,
    email: existing.email,
    slug: existing.slug,
    display_name: input.display_name?.trim() || existing.display_name,
    legal_name: input.legal_name?.trim() || existing.legal_name,
    country_code: input.country_code?.trim().toUpperCase().slice(0, 2) || existing.country_code,
    city: input.city?.trim() || existing.city,
    bourse_member: input.bourse_member ?? existing.bourse_member,
    description: input.description !== undefined ? input.description.trim() : existing.description,
    contact_phone: input.contact_phone !== undefined ? input.contact_phone.trim() : existing.contact_phone,
    status: existing.status,
    rejection_reason: existing.rejection_reason,
    created_at: existing.created_at,
    updated_at: new Date().toISOString(),
  };

  await db.execute(sql`
    UPDATE jobs SET payload = ${JSON.stringify(updatedPayload)}::jsonb, updated_at = now()
    WHERE id = ${vendorId} AND queue = 'vendors'
  `);

  return (await getVendorById(db, vendorId))!;
}

export async function listVendorsForAdmin(
  db: CatalogDatabase,
  statusFilter?: VendorOnboardingStatus,
): Promise<VendorProfileDto[]> {
  const res = await db.execute(sql`
    SELECT id::text AS id, payload, created_at::text AS created_at, updated_at::text AS updated_at
    FROM jobs
    WHERE queue = 'vendors'
    ORDER BY created_at DESC
    LIMIT 100
  `);
  const all = (res.rows as Array<{ id: string; payload: Record<string, unknown>; created_at: string; updated_at: string }>).map(
    (row) => {
      const p = row.payload;
      return {
        id: row.id,
        owner_customer_id: String(p['owner_customer_id'] ?? ''),
        email: String(p['email'] ?? ''),
        slug: String(p['slug'] ?? ''),
        display_name: String(p['display_name'] ?? ''),
        legal_name: String(p['legal_name'] ?? ''),
        country_code: String(p['country_code'] ?? 'AE'),
        city: String(p['city'] ?? 'Dubai'),
        bourse_member: Boolean(p['bourse_member']),
        description: p['description'] ? String(p['description']) : null,
        contact_phone: p['contact_phone'] ? String(p['contact_phone']) : null,
        status: (p['status'] as VendorOnboardingStatus) ?? 'PENDING',
        rejection_reason: p['rejection_reason'] ? String(p['rejection_reason']) : null,
        created_at: new Date(row.created_at).toISOString(),
        updated_at: new Date(row.updated_at).toISOString(),
      };
    },
  );
  return statusFilter ? all.filter((v) => v.status === statusFilter) : all;
}

export async function moderateVendor(
  db: CatalogDatabase,
  input: {
    vendorId: string;
    action: 'APPROVE' | 'SUSPEND' | 'REACTIVATE' | 'REJECT';
    reason?: string;
    actorSub: string;
    actorRole: AdminRole;
  },
): Promise<VendorProfileDto> {
  const existing = await getVendorById(db, input.vendorId);
  if (!existing) {
    throw new ContractError('NOT_FOUND', 'Vendor not found.');
  }

  let nextStatus: VendorOnboardingStatus;
  if (input.action === 'APPROVE' || input.action === 'REACTIVATE') {
    nextStatus = 'APPROVED';
  } else if (input.action === 'SUSPEND') {
    nextStatus = 'SUSPENDED';
  } else if (input.action === 'REJECT') {
    nextStatus = 'REJECTED';
  } else {
    throw new ContractError('VALIDATION_FAILED', `Unsupported vendor moderation action: ${input.action}`);
  }

  const updatedPayload = {
    owner_customer_id: existing.owner_customer_id,
    email: existing.email,
    slug: existing.slug,
    display_name: existing.display_name,
    legal_name: existing.legal_name,
    country_code: existing.country_code,
    city: existing.city,
    bourse_member: existing.bourse_member,
    description: existing.description,
    contact_phone: existing.contact_phone,
    status: nextStatus,
    rejection_reason: input.action === 'REJECT' || input.action === 'SUSPEND' ? (input.reason ?? 'Policy decision') : null,
    created_at: existing.created_at,
    updated_at: new Date().toISOString(),
  };

  const jobState = nextStatus === 'APPROVED' ? 'SUCCEEDED' : nextStatus === 'REJECTED' ? 'FAILED' : 'QUEUED';
  await db.execute(sql`
    UPDATE jobs
    SET payload = ${JSON.stringify(updatedPayload)}::jsonb,
        state = ${jobState}::job_state,
        updated_at = now()
    WHERE id = ${input.vendorId} AND queue = 'vendors'
  `);

  await db.execute(sql`
    INSERT INTO audit_logs (
      actor_type, action, entity_type, entity_id, before_state, after_state, reason
    ) VALUES (
      'ADMIN',
      ${'VENDOR_' + input.action},
      'vendor',
      ${input.vendorId}::uuid,
      ${JSON.stringify({ status: existing.status })}::jsonb,
      ${JSON.stringify({ status: nextStatus, actor: input.actorSub, role: input.actorRole })}::jsonb,
      ${input.reason ?? null}
    )
  `);

  if (existing.owner_customer_id) {
    await recordNotification(db, {
      customer_id: existing.owner_customer_id,
      email: existing.email,
      kind: 'VENDOR_STATUS',
      subject: `Maihan Gems vendor account status: ${nextStatus}`,
      body: `Your vendor profile "${existing.display_name}" is now ${nextStatus}.${input.reason ? ' Note: ' + input.reason : ''}`,
      metadata: { vendor_id: input.vendorId, status: nextStatus },
    });
  }

  return (await getVendorById(db, input.vendorId))!;
}

function mapProductRow(row: Record<string, unknown>): VendorProductDto {
  const extra = (row['structured_extra'] as Record<string, unknown> | null) ?? {};
  const imagesRaw = Array.isArray(extra['images']) ? extra['images'] : [];
  const images = imagesRaw.map((item) =>
    typeof item === 'string' ? item : String((item as Record<string, unknown>)['url'] ?? ''),
  ).filter(Boolean);

  const state = String(row['state'] ?? 'DRAFT');
  const modStatus = (extra['moderation_status'] as ProductModerationStatus | undefined) ??
    (state === 'ACTIVE' ? 'PUBLISHED' : state === 'ARCHIVED' ? 'ARCHIVED' : 'DRAFT');

  return {
    id: String(row['id']),
    vendor_id: String(extra['vendor_id'] ?? ''),
    vendor_name: String(extra['vendor_name'] ?? 'Maihan Vault'),
    sku: String(row['source_sku'] ?? extra['sku'] ?? `MG-${row['product_number'] ?? ''}`),
    slug: String(row['slug']),
    title: String(row['title']),
    description: row['description'] ? String(row['description']) : null,
    kind: (row['kind'] as VendorProductDto['kind']) ?? 'LOOSE_STONE',
    jewellery_type: (row['jewellery_type'] as VendorProductDto['jewellery_type']) ?? 'RING',
    price_amount: Number(row['price_amount'] ?? 0).toFixed(2),
    currency: String(row['currency'] ?? 'USD'),
    inventory_quantity: Number(extra['inventory_quantity'] ?? (row['availability'] ? 1 : 0)),
    availability: Boolean(row['availability']),
    state,
    moderation_status: modStatus,
    rejection_reason: extra['rejection_reason'] ? String(extra['rejection_reason']) : null,
    total_weight_ct: row['total_weight_ct'] !== null && row['total_weight_ct'] !== undefined ? String(row['total_weight_ct']) : null,
    stone_type: extra['stone_type'] ? String(extra['stone_type']) : null,
    shape: extra['shape'] ? String(extra['shape']) : null,
    origin_country: extra['origin_country'] ? String(extra['origin_country']) : null,
    treatment_status: extra['treatment_status'] ? String(extra['treatment_status']) : null,
    metal_type: extra['metal_type'] ? String(extra['metal_type']) : null,
    images,
    submitted_at: extra['submitted_at'] ? String(extra['submitted_at']) : null,
    published_at: row['published_at'] ? new Date(String(row['published_at'])).toISOString() : null,
    created_at: new Date(String(row['created_at'])).toISOString(),
    updated_at: new Date(String(row['updated_at'])).toISOString(),
  };
}

export async function createVendorProduct(
  db: CatalogDatabase,
  vendorId: string,
  input: CreateVendorProductInput,
): Promise<VendorProductDto> {
  const vendor = await getVendorById(db, vendorId);
  if (!vendor) {
    throw new ContractError('NOT_FOUND', 'Vendor account not found.');
  }
  if (vendor.status !== 'APPROVED') {
    throw new ContractError('FORBIDDEN', `Vendor account must be APPROVED to create products (current status: ${vendor.status}).`);
  }

  const sku = (input.sku ?? '').trim().toUpperCase();
  const title = (input.title ?? '').trim();
  if (!sku || sku.length < 2) {
    throw new ContractError('VALIDATION_FAILED', 'A unique product SKU is required.');
  }
  if (!title || title.length < 3) {
    throw new ContractError('VALIDATION_FAILED', 'Product title must be at least 3 characters.');
  }

  const priceNum = Number(input.price_amount);
  if (!Number.isFinite(priceNum) || priceNum <= 0) {
    throw new ContractError('VALIDATION_FAILED', 'Product price must be a positive amount.');
  }

  const invQty = input.inventory_quantity !== undefined ? Math.floor(Number(input.inventory_quantity)) : 1;
  if (!Number.isFinite(invQty) || invQty < 0 || invQty > 10000) {
    throw new ContractError('VALIDATION_FAILED', 'Inventory quantity must be a non-negative integer.');
  }

  const dupSku = await db.execute(sql`
    SELECT id FROM products
    WHERE (upper(source_sku) = ${sku} OR upper(structured_extra->>'sku') = ${sku})
      AND deleted_at IS NULL
    LIMIT 1
  `);
  if (dupSku.rows.length > 0) {
    throw new ContractError('IDEMPOTENCY_CONFLICT', `A product with SKU "${sku}" already exists.`);
  }

  const kind = input.kind ?? 'LOOSE_STONE';
  if (!['LOOSE_STONE', 'STONE_PAIR', 'READY_MADE'].includes(kind)) {
    throw new ContractError('VALIDATION_FAILED', 'Vendor product kind must be LOOSE_STONE, STONE_PAIR, or READY_MADE.');
  }
  const jewelleryType = input.jewellery_type ?? (kind === 'STONE_PAIR' ? 'EARRINGS' : 'RING');
  const validatedImages = validateAndNormalizeImages(input.images);

  const slugBase = `${title}-${sku}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
  const slug = `${slugBase}-${randomBytes(3).toString('hex')}`;

  const weightCt =
    input.total_weight_ct !== undefined && input.total_weight_ct !== ''
      ? Number(input.total_weight_ct)
      : null;
  if (weightCt !== null && (!Number.isFinite(weightCt) || weightCt <= 0)) {
    throw new ContractError('VALIDATION_FAILED', 'Total carat weight must be a positive number.');
  }

  const structuredExtra = {
    vendor_id: vendor.id,
    vendor_name: vendor.display_name,
    sku,
    moderation_status: 'DRAFT' as ProductModerationStatus,
    rejection_reason: null,
    inventory_quantity: invQty,
    stone_type: input.stone_type?.trim() || null,
    shape: input.shape?.trim() || null,
    origin_country: input.origin_country?.trim() || null,
    treatment_status: input.treatment_status?.trim() || null,
    metal_type: input.metal_type?.trim() || null,
    images: validatedImages,
    submitted_at: null,
  };

  const insertRes = await db.execute(sql`
    INSERT INTO products (
      kind,
      slug,
      title,
      description,
      jewellery_type,
      total_weight_ct,
      stone_count,
      price_amount,
      currency,
      price_evidence,
      state,
      availability,
      source_sku,
      sku_evidence_status,
      structured_extra
    ) VALUES (
      ${kind}::product_kind,
      ${slug},
      ${title},
      ${input.description?.trim() || null},
      ${jewelleryType}::jewellery_type,
      ${weightCt !== null ? weightCt.toFixed(3) : null},
      ${kind === 'STONE_PAIR' ? 2 : 1},
      ${priceNum.toFixed(2)},
      'USD',
      'OBSERVED',
      'DRAFT',
      ${invQty > 0},
      ${sku},
      'OBSERVED',
      ${JSON.stringify(structuredExtra)}::jsonb
    )
    RETURNING *
  `);

  const createdRow = insertRes.rows[0] as Record<string, unknown>;
  const productId = String(createdRow['id']);

  // Record asset rows for uploaded images
  for (let i = 0; i < validatedImages.length; i++) {
    const img = validatedImages[i]!;
    const assetRes = await db.execute(sql`
      INSERT INTO assets (
        kind, role, storage_provider, source_url, cdn_url, mime_type, bytes, alt_text, position, processing_state, provenance_kind, evidence_status
      ) VALUES (
        'IMAGE',
        ${i === 0 ? 'PRIMARY' : 'GALLERY'}::media_role,
        'r2',
        ${img.url},
        ${img.url},
        ${img.mime_type},
        ${img.bytes},
        ${img.alt_text},
        ${i},
        'READY',
        'ADMIN',
        'OBSERVED'
      )
      RETURNING id
    `);
    const assetId = (assetRes.rows[0] as { id: string }).id;
    await db.execute(sql`
      INSERT INTO asset_usages (asset_id, entity_type, entity_id, role, position)
      VALUES (${assetId}, 'PRODUCT', ${productId}::uuid, ${i === 0 ? 'PRIMARY' : 'GALLERY'}::media_role, ${i})
      ON CONFLICT DO NOTHING
    `);
  }

  await db.execute(sql`
    INSERT INTO audit_logs (
      actor_type, actor_id, action, entity_type, entity_id, after_state, reason
    ) VALUES (
      'VENDOR',
      ${vendor.owner_customer_id}::uuid,
      'VENDOR_PRODUCT_CREATED',
      'product',
      ${productId}::uuid,
      ${JSON.stringify({ sku, title, price: priceNum.toFixed(2), state: 'DRAFT', vendor_id: vendor.id })}::jsonb,
      'Vendor created draft product'
    )
  `);

  return mapProductRow(createdRow);
}

export async function updateVendorProduct(
  db: CatalogDatabase,
  vendorId: string,
  productId: string,
  input: Partial<CreateVendorProductInput>,
): Promise<VendorProductDto> {
  const vendor = await getVendorById(db, vendorId);
  if (!vendor || vendor.status !== 'APPROVED') {
    throw new ContractError('FORBIDDEN', 'Vendor account must be APPROVED to edit products.');
  }

  const existingRes = await db.execute(sql`
    SELECT * FROM products WHERE id = ${productId} AND deleted_at IS NULL LIMIT 1
  `);
  if (existingRes.rows.length === 0) {
    throw new ContractError('NOT_FOUND', 'Product not found.');
  }
  const row = existingRes.rows[0] as Record<string, unknown>;
  const extra = (row['structured_extra'] as Record<string, unknown> | null) ?? {};
  if (extra['vendor_id'] !== vendorId) {
    throw new ContractError('FORBIDDEN', 'You do not have permission to modify another vendor’s product.');
  }

  const nextTitle = input.title !== undefined ? input.title.trim() : String(row['title']);
  if (nextTitle.length < 3) {
    throw new ContractError('VALIDATION_FAILED', 'Product title must be at least 3 characters.');
  }

  const nextPrice =
    input.price_amount !== undefined ? Number(input.price_amount) : Number(row['price_amount']);
  if (!Number.isFinite(nextPrice) || nextPrice <= 0) {
    throw new ContractError('VALIDATION_FAILED', 'Product price must be a positive amount.');
  }

  const nextQty =
    input.inventory_quantity !== undefined
      ? Math.floor(Number(input.inventory_quantity))
      : Number(extra['inventory_quantity'] ?? 1);
  if (!Number.isFinite(nextQty) || nextQty < 0) {
    throw new ContractError('VALIDATION_FAILED', 'Inventory quantity must be non-negative.');
  }

  const nextImages =
    input.images !== undefined ? validateAndNormalizeImages(input.images) : extra['images'];

  // Any vendor edit returns the product to DRAFT so unreviewed changes cannot bypass moderation
  const updatedExtra = {
    ...extra,
    inventory_quantity: nextQty,
    stone_type: input.stone_type !== undefined ? input.stone_type.trim() || null : extra['stone_type'],
    shape: input.shape !== undefined ? input.shape.trim() || null : extra['shape'],
    origin_country: input.origin_country !== undefined ? input.origin_country.trim() || null : extra['origin_country'],
    treatment_status: input.treatment_status !== undefined ? input.treatment_status.trim() || null : extra['treatment_status'],
    metal_type: input.metal_type !== undefined ? input.metal_type.trim() || null : extra['metal_type'],
    images: nextImages,
    moderation_status: 'DRAFT' as ProductModerationStatus,
  };

  const updRes = await db.execute(sql`
    UPDATE products
    SET title = ${nextTitle},
        description = ${input.description !== undefined ? input.description.trim() || null : (row['description'] as string | null)},
        price_amount = ${nextPrice.toFixed(2)},
        availability = ${nextQty > 0},
        state = 'DRAFT',
        published_at = NULL,
        structured_extra = ${JSON.stringify(updatedExtra)}::jsonb,
        version = version + 1,
        updated_at = now()
    WHERE id = ${productId}
    RETURNING *
  `);

  await db.execute(sql`
    INSERT INTO audit_logs (
      actor_type, actor_id, action, entity_type, entity_id, before_state, after_state, reason
    ) VALUES (
      'VENDOR',
      ${vendor.owner_customer_id}::uuid,
      'VENDOR_PRODUCT_UPDATED',
      'product',
      ${productId}::uuid,
      ${JSON.stringify({ title: row['title'], price_amount: row['price_amount'], state: row['state'] })}::jsonb,
      ${JSON.stringify({ title: nextTitle, price_amount: nextPrice.toFixed(2), state: 'DRAFT', inventory_quantity: nextQty })}::jsonb,
      'Vendor updated product'
    )
  `);

  return mapProductRow(updRes.rows[0] as Record<string, unknown>);
}

export async function submitVendorProductForReview(
  db: CatalogDatabase,
  vendorId: string,
  productId: string,
): Promise<VendorProductDto> {
  const vendor = await getVendorById(db, vendorId);
  if (!vendor || vendor.status !== 'APPROVED') {
    throw new ContractError('FORBIDDEN', 'Vendor account must be APPROVED to submit products for review.');
  }

  const existingRes = await db.execute(sql`
    SELECT * FROM products WHERE id = ${productId} AND deleted_at IS NULL LIMIT 1
  `);
  if (existingRes.rows.length === 0) {
    throw new ContractError('NOT_FOUND', 'Product not found.');
  }
  const row = existingRes.rows[0] as Record<string, unknown>;
  const extra = (row['structured_extra'] as Record<string, unknown> | null) ?? {};
  if (extra['vendor_id'] !== vendorId) {
    throw new ContractError('FORBIDDEN', 'You do not have permission to submit another vendor’s product.');
  }

  const currentMod = (extra['moderation_status'] as ProductModerationStatus | undefined) ?? 'DRAFT';
  if (currentMod !== 'DRAFT' && currentMod !== 'REJECTED') {
    throw new ContractError('UNPROCESSABLE', `Product in state "${currentMod}" cannot be submitted for review.`);
  }

  const updatedExtra = {
    ...extra,
    moderation_status: 'SUBMITTED' as ProductModerationStatus,
    submitted_at: new Date().toISOString(),
    rejection_reason: null,
  };

  const updRes = await db.execute(sql`
    UPDATE products
    SET structured_extra = ${JSON.stringify(updatedExtra)}::jsonb,
        version = version + 1,
        updated_at = now()
    WHERE id = ${productId}
    RETURNING *
  `);

  await db.execute(sql`
    INSERT INTO audit_logs (
      actor_type, actor_id, action, entity_type, entity_id, before_state, after_state, reason
    ) VALUES (
      'VENDOR',
      ${vendor.owner_customer_id}::uuid,
      'VENDOR_PRODUCT_SUBMITTED',
      'product',
      ${productId}::uuid,
      ${JSON.stringify({ moderation_status: currentMod })}::jsonb,
      ${JSON.stringify({ moderation_status: 'SUBMITTED' })}::jsonb,
      'Vendor submitted product for moderation review'
    )
  `);

  return mapProductRow(updRes.rows[0] as Record<string, unknown>);
}

export async function listVendorProducts(
  db: CatalogDatabase,
  vendorId: string,
): Promise<VendorProductDto[]> {
  const res = await db.execute(sql`
    SELECT * FROM products
    WHERE deleted_at IS NULL
      AND structured_extra->>'vendor_id' = ${vendorId}
    ORDER BY created_at DESC
    LIMIT 100
  `);
  return (res.rows as Array<Record<string, unknown>>).map(mapProductRow);
}

export async function moderateProductByAdmin(
  db: CatalogDatabase,
  input: {
    productId: string;
    action: 'APPROVE' | 'REJECT' | 'PUBLISH' | 'UNPUBLISH' | 'ARCHIVE';
    reason?: string;
    actorSub: string;
    actorRole: AdminRole;
  },
): Promise<VendorProductDto> {
  const existingRes = await db.execute(sql`
    SELECT * FROM products WHERE id = ${input.productId} AND deleted_at IS NULL LIMIT 1
  `);
  if (existingRes.rows.length === 0) {
    throw new ContractError('NOT_FOUND', 'Product not found.');
  }
  const row = existingRes.rows[0] as Record<string, unknown>;
  const extra = (row['structured_extra'] as Record<string, unknown> | null) ?? {};
  const priorState = String(row['state'] ?? 'DRAFT');
  const priorMod = (extra['moderation_status'] as ProductModerationStatus | undefined) ?? 'DRAFT';

  let nextState: 'DRAFT' | 'ACTIVE' | 'ARCHIVED' = 'DRAFT';
  let nextMod: ProductModerationStatus = priorMod;
  let publishedAtSql = sql`published_at`;

  if (input.action === 'APPROVE') {
    nextMod = 'APPROVED';
    nextState = 'DRAFT';
  } else if (input.action === 'PUBLISH') {
    nextMod = 'PUBLISHED';
    nextState = 'ACTIVE';
    publishedAtSql = sql`now()`;
  } else if (input.action === 'REJECT') {
    if (!input.reason || input.reason.trim().length === 0) {
      throw new ContractError('VALIDATION_FAILED', 'A rejection reason is required when rejecting a product.');
    }
    nextMod = 'REJECTED';
    nextState = 'DRAFT';
    publishedAtSql = sql`NULL`;
  } else if (input.action === 'UNPUBLISH') {
    nextMod = 'APPROVED';
    nextState = 'DRAFT';
    publishedAtSql = sql`NULL`;
  } else if (input.action === 'ARCHIVE') {
    nextMod = 'ARCHIVED';
    nextState = 'ARCHIVED';
    publishedAtSql = sql`NULL`;
  } else {
    throw new ContractError('VALIDATION_FAILED', `Unsupported product moderation action: ${input.action}`);
  }

  const updatedExtra = {
    ...extra,
    moderation_status: nextMod,
    rejection_reason: input.action === 'REJECT' ? input.reason!.trim() : null,
    reviewed_by: input.actorSub,
    reviewed_at: new Date().toISOString(),
  };

  const updRes = await db.execute(sql`
    UPDATE products
    SET state = ${nextState}::product_state,
        published_at = ${publishedAtSql},
        structured_extra = ${JSON.stringify(updatedExtra)}::jsonb,
        version = version + 1,
        updated_at = now()
    WHERE id = ${input.productId}
    RETURNING *
  `);

  await db.execute(sql`
    INSERT INTO audit_logs (
      actor_type, action, entity_type, entity_id, before_state, after_state, reason
    ) VALUES (
      'ADMIN',
      ${'PRODUCT_' + input.action},
      'product',
      ${input.productId}::uuid,
      ${JSON.stringify({ state: priorState, moderation_status: priorMod })}::jsonb,
      ${JSON.stringify({ state: nextState, moderation_status: nextMod, actor: input.actorSub, role: input.actorRole })}::jsonb,
      ${input.reason ?? null}
    )
  `);

  const vendorId = extra['vendor_id'] ? String(extra['vendor_id']) : null;
  if (vendorId) {
    const vendor = await getVendorById(db, vendorId);
    if (vendor && vendor.owner_customer_id) {
      await recordNotification(db, {
        customer_id: vendor.owner_customer_id,
        email: vendor.email,
        kind: 'PRODUCT_MODERATION',
        subject: `Product "${String(row['title'])}" moderation update: ${nextMod}`,
        body: `Your product "${String(row['title'])}" is now ${nextMod} (storefront state: ${nextState}).${input.reason ? ' Reason: ' + input.reason : ''}`,
        metadata: { product_id: input.productId, moderation_status: nextMod, state: nextState },
      });
    }
  }

  return mapProductRow(updRes.rows[0] as Record<string, unknown>);
}

export async function listVendorOrders(
  db: CatalogDatabase,
  vendorId: string,
): Promise<VendorOrderLineDto[]> {
  const res = await db.execute(sql`
    SELECT
      o.id::text AS order_id,
      o.order_number,
      o.state::text AS order_state,
      o.placed_at::text AS placed_at,
      o.shipping_address,
      oi.id::text AS order_item_id,
      oi.product_id::text AS product_id,
      oi.sku_snapshot,
      oi.title_snapshot,
      oi.quantity,
      oi.unit_price::text AS unit_price,
      oi.line_total::text AS line_total,
      oi.state AS item_state,
      f.id::text AS fulfillment_id,
      f.state AS fulfillment_state,
      f.carrier,
      f.tracking_number,
      f.tracking_url,
      f.shipped_at::text AS shipped_at,
      f.delivered_at::text AS delivered_at
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    JOIN products p ON p.id = oi.product_id
    LEFT JOIN LATERAL (
      SELECT id, state, carrier, tracking_number, tracking_url, shipped_at, delivered_at
      FROM fulfillments fl
      WHERE fl.order_id = o.id
        AND (fl.order_item_id = oi.id OR fl.order_item_id IS NULL)
      ORDER BY fl.created_at DESC
      LIMIT 1
    ) f ON true
    WHERE p.structured_extra->>'vendor_id' = ${vendorId}
    ORDER BY o.created_at DESC
    LIMIT 100
  `);

  return (res.rows as Array<Record<string, unknown>>).map((row) => {
    const addr = (row['shipping_address'] as Record<string, unknown> | null) ?? {};
    return {
      order_id: String(row['order_id']),
      order_number: String(row['order_number']),
      order_state: String(row['order_state']),
      placed_at: row['placed_at'] ? new Date(String(row['placed_at'])).toISOString() : null,
      order_item_id: String(row['order_item_id']),
      product_id: String(row['product_id']),
      sku_snapshot: String(row['sku_snapshot']),
      title_snapshot: String(row['title_snapshot']),
      quantity: Number(row['quantity'] ?? 1),
      unit_price: String(row['unit_price']),
      line_total: String(row['line_total']),
      item_state: String(row['item_state'] ?? 'PENDING'),
      fulfillment_id: row['fulfillment_id'] ? String(row['fulfillment_id']) : null,
      fulfillment_state: String(row['fulfillment_state'] ?? row['item_state'] ?? 'PENDING'),
      carrier: row['carrier'] ? String(row['carrier']) : null,
      tracking_number: row['tracking_number'] ? String(row['tracking_number']) : null,
      tracking_url: row['tracking_url'] ? String(row['tracking_url']) : null,
      shipped_at: row['shipped_at'] ? new Date(String(row['shipped_at'])).toISOString() : null,
      delivered_at: row['delivered_at'] ? new Date(String(row['delivered_at'])).toISOString() : null,
      shipping_city: addr['city'] ? String(addr['city']) : null,
      shipping_country: addr['country_code'] ? String(addr['country_code']) : null,
    };
  });
}

export async function updateVendorOrderFulfillment(
  db: CatalogDatabase,
  input: {
    vendorId: string;
    orderId: string;
    orderItemId: string;
    state: 'IN_FULFILLMENT' | 'SHIPPED' | 'DELIVERED';
    carrier?: string;
    trackingNumber?: string;
    trackingUrl?: string;
  },
): Promise<VendorOrderLineDto> {
  const vendor = await getVendorById(db, input.vendorId);
  if (!vendor || vendor.status !== 'APPROVED') {
    throw new ContractError('FORBIDDEN', 'Vendor account must be APPROVED to update fulfilment.');
  }

  // Verify the order item belongs to this vendor
  const itemCheck = await db.execute(sql`
    SELECT oi.id, oi.order_id, oi.state AS item_state, p.structured_extra->>'vendor_id' AS item_vendor_id,
           o.customer_id::text AS customer_id, o.email, o.order_number, o.state::text AS order_state
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    JOIN orders o ON o.id = oi.order_id
    WHERE oi.id = ${input.orderItemId} AND oi.order_id = ${input.orderId}
    LIMIT 1
  `);
  if (itemCheck.rows.length === 0) {
    throw new ContractError('NOT_FOUND', 'Order item not found.');
  }
  const itemRow = itemCheck.rows[0] as {
    id: string;
    order_id: string;
    item_state: string;
    item_vendor_id: string | null;
    customer_id: string | null;
    email: string;
    order_number: string;
    order_state: string;
  };
  if (itemRow.item_vendor_id !== input.vendorId) {
    throw new ContractError('FORBIDDEN', 'You do not have permission to update fulfilment for another vendor’s order item.');
  }

  if (input.state === 'SHIPPED' && (!input.carrier?.trim() || !input.trackingNumber?.trim())) {
    throw new ContractError('VALIDATION_FAILED', 'Carrier and tracking number are required when marking an item as SHIPPED.');
  }

  await db.execute(sql`
    UPDATE order_items
    SET state = ${input.state}
    WHERE id = ${input.orderItemId}
  `);

  const shippedAtSql = input.state === 'SHIPPED' || input.state === 'DELIVERED' ? sql`now()` : sql`NULL`;
  const deliveredAtSql = input.state === 'DELIVERED' ? sql`now()` : sql`NULL`;

  await db.execute(sql`
    INSERT INTO fulfillments (
      order_id, order_item_id, kind, carrier, tracking_number, tracking_url, state, shipped_at, delivered_at
    ) VALUES (
      ${input.orderId}::uuid,
      ${input.orderItemId}::uuid,
      'SHIPMENT',
      ${input.carrier?.trim() || null},
      ${input.trackingNumber?.trim() || null},
      ${input.trackingUrl?.trim() || null},
      ${input.state},
      ${shippedAtSql},
      ${deliveredAtSql}
    )
  `);

  // Check if all items in the order have progressed to update parent order state
  const allItemsRes = await db.execute(sql`
    SELECT state FROM order_items WHERE order_id = ${input.orderId}
  `);
  const itemStates = (allItemsRes.rows as Array<{ state: string }>).map((r) => r.state);
  const allDelivered = itemStates.every((s) => s === 'DELIVERED');
  const anyFulfillingOrShipped = itemStates.some((s) => s === 'IN_FULFILLMENT' || s === 'SHIPPED' || s === 'DELIVERED');

  let nextOrderState: string | null = null;
  if (allDelivered && itemRow.order_state !== 'FULFILLED') {
    nextOrderState = 'FULFILLED';
  } else if (anyFulfillingOrShipped && (itemRow.order_state === 'PAID' || itemRow.order_state === 'PENDING_PAYMENT')) {
    nextOrderState = 'IN_FULFILLMENT';
  }

  if (nextOrderState) {
    await db.execute(sql`
      UPDATE orders
      SET state = ${nextOrderState}::order_state,
          fulfilled_at = CASE WHEN ${nextOrderState} = 'FULFILLED' THEN now() ELSE fulfilled_at END,
          version = version + 1,
          updated_at = now()
      WHERE id = ${input.orderId}
    `);
    await db.execute(sql`
      INSERT INTO order_events (order_id, from_state, to_state, actor_type, actor_id, reason, metadata)
      VALUES (
        ${input.orderId}::uuid,
        ${itemRow.order_state}::order_state,
        ${nextOrderState}::order_state,
        'VENDOR',
        ${vendor.owner_customer_id}::uuid,
        ${'Vendor updated line fulfilment to ' + input.state},
        ${JSON.stringify({ carrier: input.carrier ?? null, tracking_number: input.trackingNumber ?? null })}::jsonb
      )
    `);
  }

  await db.execute(sql`
    INSERT INTO audit_logs (
      actor_type, actor_id, action, entity_type, entity_id, before_state, after_state, reason
    ) VALUES (
      'VENDOR',
      ${vendor.owner_customer_id}::uuid,
      'VENDOR_FULFILLMENT_UPDATED',
      'order',
      ${input.orderId}::uuid,
      ${JSON.stringify({ item_state: itemRow.item_state })}::jsonb,
      ${JSON.stringify({ item_state: input.state, carrier: input.carrier ?? null, tracking_number: input.trackingNumber ?? null })}::jsonb,
      'Vendor updated order line fulfilment'
    )
  `);

  if (itemRow.customer_id) {
    await recordNotification(db, {
      customer_id: itemRow.customer_id,
      email: itemRow.email,
      kind: 'SHIPMENT_UPDATE',
      subject: `Order ${itemRow.order_number} shipment update: ${input.state}`,
      body: `Your piece in order ${itemRow.order_number} is now ${input.state}.${input.carrier ? ` Carrier: ${input.carrier} (${input.trackingNumber ?? ''})` : ''}`,
      metadata: { order_id: input.orderId, state: input.state, carrier: input.carrier, tracking_number: input.trackingNumber },
    });
  }

  const updatedLines = await listVendorOrders(db, input.vendorId);
  const match = updatedLines.find((l) => l.order_item_id === input.orderItemId);
  if (!match) {
    throw new ContractError('INTERNAL', 'Updated order line could not be reloaded.');
  }
  return match;
}
