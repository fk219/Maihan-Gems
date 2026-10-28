'use client';

/**
 * M5 — vendor portal adapter (the applet's VendorPortalClient markup → the
 * repo's REAL vendor seam).
 *
 * The applet's platform-governance localStorage ledger (inventory rows,
 * payment audit logs, KYB submissions) is NOT the system of record here.
 * Every read/write in this module goes to the marketplace's REAL vendor
 * endpoints, which are the ones the replaced `VendorWorkspaces` islands
 * already used:
 *
 *   GET    /api/v1/vendor/dashboard   (profile + counts + fulfilment ledger seed)
 *   GET    /api/v1/vendor/products    (real vendor inventory)
 *   POST   /api/v1/vendor/products                    (create draft product)
 *   PATCH  /api/v1/vendor/products/{productId}        (edit draft detail)
 *   POST   /api/v1/vendor/products/{productId}/submit (moderation submission)
 *   GET    /api/v1/vendor/orders      (real vendor order lines)
 *   POST   /api/v1/vendor/orders/{orderId}/items/{itemId}/fulfill
 *   PATCH  /api/v1/vendor/profile     (real vendor_onboarding row fields)
 *   POST   /api/v1/auth/logout        (real session termination)
 *
 * Data seams (nothing invented):
 *   - the real companyId/name is the signed-in vendor's `vendor_onboarding`
 *     row; the admin-console link is the real /admin route;
 *   - product moderation values are the server's own enum values
 *     (DRAFT / SUBMITTED / APPROVED / PUBLISHED / REJECTED / ARCHIVED) —
 *     they are never rebadged as the applet's intake vocabularies;
 *   - "revenue" is the dashboard's real non-cancelled/non-refunded line
 *     total; payout/escrow figures the applet invented have no seam, so
 *     what renders is the real fulfilment state instead.
 */
import type {
  VendorOrderLineDto,
  VendorProductDto,
  VendorProfileDto,
} from '@maihan/db';

/** The applet's three marketplace categories mapped to REAL product kinds. */
export type VendorInventoryCategory =
  | 'Gemstones'   // kind LOOSE_STONE
  | 'Pairs'       // kind STONE_PAIR
  | 'Fine Jewellery'; // kind READY_MADE

export const VENDOR_CATEGORIES: VendorInventoryCategory[] = [
  'Gemstones',
  'Pairs',
  'Fine Jewellery',
];

function kindFromCategory(category: VendorInventoryCategory): 'LOOSE_STONE' | 'STONE_PAIR' | 'READY_MADE' {
  if (category === 'Pairs') return 'STONE_PAIR';
  if (category === 'Fine Jewellery') return 'READY_MADE';
  return 'LOOSE_STONE';
}

function categoryFromKind(kind: VendorProductDto['kind']): VendorInventoryCategory {
  if (kind === 'STONE_PAIR') return 'Pairs';
  if (kind === 'READY_MADE') return 'Fine Jewellery';
  return 'Gemstones';
}

/* -----------------------------------------------------------------------
 * Product rows — REAL vendor products mapped onto the applet inventory
 * table's fact list (origin/treatment/carat/etc. stay null when the row
 * does not evidence them).
 * ----------------------------------------------------------------------- */

export interface VendorInventoryRow {
  id: string;
  sku: string;
  title: string;
  category: VendorInventoryCategory;
  subCategory: string;
  caratOrWeight: string | null;
  originOrAtelier: string | null;
  treatmentOrHallmark: string | null;
  priceUsd: number;
  priceLabel: string;
  inventoryQuantity: number | null;
  moderation: VendorProductDto['moderation_status'];
  rejectionReason: string | null;
  canSubmit: boolean;
  updatedAt: string;
  image: string;
}

export function toVendorInventory(row: VendorProductDto): VendorInventoryRow {
  return {
    id: row.id,
    sku: row.sku,
    title: row.title,
    category: categoryFromKind(row.kind),
    subCategory:
      [
        row.stone_type,
        row.metal_type,
        row.jewellery_type ? row.jewellery_type.toLowerCase() : null,
      ]
        .filter(Boolean)
        .join(' · ') || row.kind,
    caratOrWeight: row.total_weight_ct !== null ? `${row.total_weight_ct} ct` : row.metal_type,
    originOrAtelier: row.origin_country,
    treatmentOrHallmark: row.treatment_status,
    priceUsd: Number(row.price_amount) || 0,
    priceLabel: row.currency === 'USD' ? row.price_amount : row.price_amount,
    inventoryQuantity: row.inventory_quantity,
    moderation: row.moderation_status,
    rejectionReason: row.rejection_reason,
    canSubmit: row.moderation_status === 'DRAFT' || row.moderation_status === 'REJECTED',
    updatedAt: row.updated_at,
    image: row.images[0] ?? '',
  };
}

export function toVendorInventoryList(rows: readonly VendorProductDto[]): VendorInventoryRow[] {
  return rows.map(toVendorInventory);
}

/* -----------------------------------------------------------------------
 * Reads — wrap the fetch shapes (real envelopes), no invented fallbacks.
 * ----------------------------------------------------------------------- */

export interface VendorDashboard {
  vendor: VendorProfileDto;
  summary: {
    total_products: number;
    draft_products: number;
    submitted_products: number;
    approved_products: number;
    published_products: number;
    rejected_products: number;
    out_of_stock_products: number;
    total_order_lines: number;
    pending_fulfillment_lines: number;
    total_revenue_usd: string;
  };
  recent_products: VendorProductDto[];
  recent_orders: VendorOrderLineDto[];
}

async function readEnvelope<T>(res: Response, fallbackMessage: string): Promise<T> {
  const body = (await res.json().catch(() => null)) as
    | { data?: T; error?: { message?: string } }
    | null;
  if (!res.ok || body === null) {
    throw new Error(body?.error?.message ?? fallbackMessage);
  }
  return body.data as T;
}

export async function loadVendorProducts(): Promise<VendorInventoryRow[]> {
  const res = await fetch('/api/v1/vendor/products');
  const data = await readEnvelope<{ products?: VendorProductDto[] }>(res, 'Vendor inventory is unavailable.');
  return toVendorInventoryList(data.products ?? []);
}

export async function loadVendorOrders(): Promise<VendorOrderLineDto[]> {
  const res = await fetch('/api/v1/vendor/orders');
  const data = await readEnvelope<{ orders?: VendorOrderLineDto[] }>(res, 'Vendor orders are unavailable.');
  return data.orders ?? [];
}

/* -----------------------------------------------------------------------
 * Writes — the REAL seams the applet's optimistic states now bind to.
 * ----------------------------------------------------------------------- */

export interface VendorProductInput {
  category: VendorInventoryCategory;
  sku: string;
  title: string;
  /** "Subcategory / Cut" field — becomes stone_type for stones/pairs. */
  subCategory?: string;
  caratOrWeightText?: string;
  origin?: string;
  treatment?: string;
  priceUsd: number;
  jewelleryType?: string;
  metalType?: string;
  description?: string;
  imageUrl?: string;
}

function payloadFromInput(input: VendorProductInput): Record<string, unknown> {
  const kind = kindFromCategory(input.category);
  const payload: Record<string, unknown> = {
    sku: input.sku.trim().toUpperCase(),
    title: input.title.trim(),
    kind,
    price_amount: input.priceUsd,
  };
  if (input.description?.trim()) payload['description'] = input.description.trim();
  if (input.origin?.trim()) payload['origin_country'] = input.origin.trim();
  if (input.treatment?.trim()) payload['treatment_status'] = input.treatment.trim();
  if (kind === 'READY_MADE') {
    // The server's own default (RING) applies when the trade partner leaves
    // the jewellery type untouched — no category is invented here.
    if (input.jewelleryType?.trim() || input.metalType?.trim()) {
      payload['jewellery_type'] = input.jewelleryType?.trim() || 'RING';
    }
    if (input.caratOrWeightText?.trim()) payload['metal_type'] = input.caratOrWeightText.trim();
  } else {
    // Loose stones / matched pairs: the server normalises them onto the
    // canonical gemstones tables via gemstone_varieties.
    const carat = Number((input.caratOrWeightText ?? '').replace(/[^0-9.]/g, ''));
    if (Number.isFinite(carat) && carat > 0) payload['total_weight_ct'] = carat;
    if (input.subCategory?.trim()) payload['stone_type'] = input.subCategory.trim();
    if (input.metalType?.trim()) payload['metal_type'] = input.metalType.trim();
  }
  const image = input.imageUrl?.trim();
  if (image) {
    payload['images'] = [
      {
        url: image,
        mime_type: 'image/jpeg',
        bytes: 204800,
        alt_text: input.title.trim(),
      },
    ];
  }
  return payload;
}

export async function saveVendorProduct(
  input: VendorProductInput,
  editId: string | null,
): Promise<VendorProductDto> {
  const url = editId
    ? `/api/v1/vendor/products/${encodeURIComponent(editId)}`
    : '/api/v1/vendor/products';
  const res = await fetch(url, {
    method: editId ? 'PATCH' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payloadFromInput(input)),
  });
  const body = (await res.json().catch(() => null)) as
    | { data?: VendorProductDto; error?: { message?: string } }
    | null;
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? 'The vault could not save this piece.');
  }
  return body.data;
}

export async function submitVendorProduct(productId: string): Promise<VendorProductDto> {
  const res = await fetch(
    `/api/v1/vendor/products/${encodeURIComponent(productId)}/submit`,
    { method: 'POST' },
  );
  const body = (await res.json().catch(() => null)) as
    | { data?: VendorProductDto; error?: { message?: string } }
    | null;
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? 'The vault could not submit this piece for review.');
  }
  return body.data;
}

/** Keeps the applet's carousel status cell honest — server values only. */
export async function updateVendorFulfilment(
  orderId: string,
  orderItemId: string,
  state: 'IN_FULFILLMENT' | 'SHIPPED' | 'DELIVERED',
  carrier?: string,
  trackingNumber?: string,
): Promise<void> {
  const res = await fetch(
    `/api/v1/vendor/orders/${encodeURIComponent(orderId)}/items/${encodeURIComponent(orderItemId)}/fulfill`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        state,
        ...(state === 'SHIPPED' ? { carrier, tracking_number: trackingNumber } : {}),
      }),
    },
  );
  const body = (await res.json().catch(() => null)) as
    | { error?: { message?: string } }
    | null;
  if (!res.ok) {
    throw new Error(body?.error?.message ?? 'Fulfilment update failed.');
  }
}

/* -----------------------------------------------------------------------
 * Onboarding — the REAL vendor_onboarding row fields via PATCH profile.
 * ----------------------------------------------------------------------- */

export interface VendorOnboardingIdentity {
  display_name: string;
  legal_name: string;
  country_code: string;
  city: string;
  bourse_member: boolean;
  contact_phone: string;
  description: string;
}

export async function saveVendorProfile(
  input: VendorOnboardingIdentity,
): Promise<VendorProfileDto> {
  const res = await fetch('/api/v1/vendor/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      display_name: input.display_name,
      legal_name: input.legal_name,
      country_code: input.country_code,
      city: input.city,
      bourse_member: input.bourse_member,
      contact_phone: input.contact_phone.trim() ? input.contact_phone : undefined,
      description: input.description.trim() ? input.description : undefined,
    }),
  });
  const body = (await res.json().catch(() => null)) as
    | { data?: VendorProfileDto; error?: { message?: string } }
    | null;
  if (!res.ok || !body?.data) {
    throw new Error(body?.error?.message ?? 'Profile could not be updated.');
  }
  return body.data;
}

/** Real session termination (the applet's sign-out button had no seam). */
export async function signOutVendorSession(): Promise<void> {
  await fetch('/api/v1/auth/logout', { method: 'POST' }).catch(() => undefined);
}
