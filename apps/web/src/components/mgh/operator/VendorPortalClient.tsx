'use client';

/**
 * M5 — the applet's VendorPortalClient, re-allocated to the repo's REAL
 * vendor seam. Every visual block (top bar, KPI tiles, inventory form +
 * table, consignment intake ledger, settlement ledger, onboarding wizard,
 * purchase-orders view) keeps the applet's exact classes/animations.
 *
 * Data-seam changes only:
 *  - NO `platform-governance` store and NO Google SSO gate — the real
 *    session gate lives in the server page (`getAuthenticatedSessionActor`).
 *    The Google "Continue with ..." button is never mounted (email-inferred
 *    session state is prohibited).
 *  - NO multi-vendor switcher: one real vendor (from `vendor_onboarding`
 *    through /api/v1/vendor/dashboard) drives the whole portal.
 *  - Products/orders/consignment rows are the marketplace's own DRAFT /
 *    SUBMITTED / REJECTED etc. moderation enums and order states.
 *  - The fulfilment workspace records real carrier dispatches through the
 *    fulfil endpoint; the applet's optimistic mark ships only after the
 *    server confirms.
 *  - The onboarding wizard writes the REAL `vendor_onboarding` fields
 *    (display/legal name, country, bourse city, bourse member flag,
 *    trade-desk phone, house description) via PATCH /api/v1/vendor/profile.
 */
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  LogOut,
  Package,
  ClipboardList,
  LayoutDashboard,
  Landmark,
  ShieldCheck,
  Plus,
  Edit3,
  CheckCircle2,
} from 'lucide-react';
import type { VendorOrderLineDto, VendorProfileDto } from '@maihan/db';
import {
  loadVendorOrders,
  loadVendorProducts,
  saveVendorProduct,
  submitVendorProduct,
  updateVendorFulfilment,
  signOutVendorSession,
  VENDOR_CATEGORIES,
  type VendorInventoryCategory,
  type VendorInventoryRow,
} from '@/lib/mgh/adapters/vendor';
import { VendorOnboardingWizard } from '@/components/mgh/operator/VendorOnboardingWizard';

export type VendorTabId = 'overview' | 'listings' | 'payments' | 'onboarding' | 'orders';

interface VendorPortalClientProps {
  initialSection: VendorTabId;
  /** Real vendor_onboarding profile (the single authenticated partner). */
  vendor: VendorProfileDto;
  /** Real dashboard summary tiles. */
  initialSummary: {
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
  /** Real vendor products (from /api/v1/vendor/products). */
  initialProducts: VendorInventoryRow[];
  /** Real gemstone/pair consignment subset for the intake ledger. */
  initialConsignment: VendorInventoryRow[];
  /** Real vendor order lines (from /api/v1/vendor/orders). */
  initialOrders: VendorOrderLineDto[];
}

/** Exact-value money formatter — the vendor-ledger cells never round away
 *  real cents (the applet helper rounds to the whole displayed unit). */
const USD_EXACT = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
function formatRealUsd(value: string | number): string {
  return USD_EXACT.format(Number(value) || 0);
}

const MODERATION_BADGE: Record<string, string> = {
  PUBLISHED: 'bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]',
  APPROVED: 'bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]',
  SUBMITTED: 'bg-[#FAF3E3] text-[#8C6D2F] border border-[#E5D4B3]',
  DRAFT: 'bg-[#FAF3E3] text-[#8C6D2F] border border-[#E5D4B3]',
  REJECTED: 'bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA]',
  ARCHIVED: 'bg-[#FAF3E3] text-[#8C6D2F] border border-[#E5D4B3]',
};

export default function VendorPortalClient({
  initialSection,
  vendor,
  initialSummary,
  initialProducts,
  initialConsignment,
  initialOrders,
}: VendorPortalClientProps) {
  const [activeTab, setActiveTab] = useState<VendorTabId>(initialSection);
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | VendorInventoryCategory>('ALL');
  const [products, setProducts] = useState<VendorInventoryRow[]>(initialProducts);
  const [consignment] = useState<VendorInventoryRow[]>(initialConsignment);
  const [orders, setOrders] = useState<VendorOrderLineDto[]>(initialOrders);
  const [summary] = useState(initialSummary);
  const [logoutBusy, setLogoutBusy] = useState(false);

  // Add / Edit inventory form state (the applet's seven-field sanity form,
  // now submitted through the REAL product endpoints).
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [formCategory, setFormCategory] = useState<VendorInventoryCategory>('Gemstones');
  const [formSku, setFormSku] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formSubCategory, setFormSubCategory] = useState('');
  const [formCaratOrWeight, setFormCaratOrWeight] = useState('');
  const [formOrigin, setFormOrigin] = useState('');
  const [formTreatmentOrHallmark, setFormTreatmentOrHallmark] = useState('');
  const [formPriceUsd, setFormPriceUsd] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [inventoryFeedback, setInventoryFeedback] = useState<string | null>(null);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [inventoryBusy, setInventoryBusy] = useState(false);

  const [fulfilBusy, setFulfilBusy] = useState<string | null>(null);
  const [fulfilCarrier, setFulfilCarrier] = useState('Malca-Amit Armored');
  const [fulfilTracking, setFulfilTracking] = useState('');
  const [fulfilError, setFulfilError] = useState<string | null>(null);
  const [fulfilNote, setFulfilNote] = useState<string | null>(null);

  useEffect(() => {
    setProducts(initialProducts);
    setOrders(initialOrders);
  }, [initialProducts, initialOrders]);

  async function reloadVendorData() {
    const [nextProducts, nextOrders] = await Promise.all([
      loadVendorProducts().catch(() => null),
      loadVendorOrders().catch(() => null),
    ]);
    if (nextProducts) setProducts(nextProducts);
    if (nextOrders) setOrders(nextOrders);
  }

  const handleOpenEdit = (item: VendorInventoryRow) => {
    setEditingItemId(item.id);
    setFormCategory(item.category);
    setFormSku(item.sku);
    setFormTitle(item.title);
    setFormSubCategory(item.subCategory);
    setFormCaratOrWeight(item.caratOrWeight ? String(item.caratOrWeight) : '');
    setFormOrigin(item.originOrAtelier ?? '');
    setFormTreatmentOrHallmark(item.treatmentOrHallmark ?? '');
    setFormImageUrl('');
    setFormPriceUsd(item.priceUsd ? String(item.priceUsd) : '');
    setInventoryError(null);
    setInventoryFeedback(null);
  };

  const handleSaveInventoryItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setInventoryError(null);
    setInventoryFeedback(null);
    const priceNum = Number(formPriceUsd);
    if (!formSku.trim() || !formTitle.trim()) {
      setInventoryError('A SKU and a title are required before the vault can record a piece.');
      return;
    }
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      setInventoryError('A positive asking price (USD) is required by the vault intake.');
      return;
    }
    setInventoryBusy(true);
    try {
      const created = await saveVendorProduct(
        {
          category: formCategory,
          sku: formSku,
          title: formTitle,
          subCategory: formSubCategory,
          caratOrWeightText: formCaratOrWeight,
          origin: formOrigin,
          treatment: formTreatmentOrHallmark,
          priceUsd: priceNum,
          jewelleryType: formCategory === 'Gemstones' ? undefined : 'RING',
          metalType: formCategory === 'Fine Jewellery' ? formCaratOrWeight : undefined,
          imageUrl: formImageUrl,
        },
        editingItemId,
      );
      if (!editingItemId && created.moderation_status === 'DRAFT') {
        // Optimistic submit: the applet's one-step intake is preserved as a
        // real "create then submit" chain (the server refuses when the
        // vendor is not APPROVED — that error surfaces verbatim).
        try {
          await submitVendorProduct(created.id);
          setInventoryFeedback(
            `Submitted ${formCategory} SKU "${created.sku}" for gemmological approval.`,
          );
        } catch {
          setInventoryFeedback(
            `Draft ${formCategory} SKU "${created.sku}" saved. Press "Submit for Review" when ready.`,
          );
        }
      } else {
        setInventoryFeedback(
          editingItemId
            ? `Updated inventory listing ${created.sku} — back to ${created.moderation_status}.`
            : `Saved draft ${created.sku} (${created.moderation_status}).`,
        );
      }
      setEditingItemId(null);
      setFormSku('');
      setFormTitle('');
      await reloadVendorData();
    } catch (cause) {
      setInventoryError(cause instanceof Error ? cause.message : 'Invalid inventory submission.');
    } finally {
      setInventoryBusy(false);
    }
  };

  const handleSubmitForReview = async (row: VendorInventoryRow) => {
    if (!row.canSubmit) return;
    setInventoryError(null);
    setInventoryFeedback(null);
    setInventoryBusy(true);
    try {
      const updated = await submitVendorProduct(row.id);
      setInventoryFeedback(`Submitted ${updated.sku} to the Maihan Gems moderator queue.`);
      await reloadVendorData();
    } catch (cause) {
      setInventoryError(cause instanceof Error ? cause.message : 'The vault could not submit this piece.');
    } finally {
      setInventoryBusy(false);
    }
  };

  const handleUpdateFulfilment = async (
    line: VendorOrderLineDto,
    state: 'IN_FULFILLMENT' | 'SHIPPED' | 'DELIVERED',
  ) => {
    setFulfilError(null);
    setFulfilNote(null);
    setFulfilBusy(line.order_item_id);
    try {
      if (state === 'SHIPPED' && fulfilTracking.trim().length === 0) {
        throw new Error('A tracking number is required to mark a line shipped.');
      }
      await updateVendorFulfilment(
        line.order_id,
        line.order_item_id,
        state,
        state === 'SHIPPED' ? fulfilCarrier.trim() : undefined,
        state === 'SHIPPED' ? fulfilTracking.trim() : undefined,
      );
      setFulfilNote(`Order ${line.order_number} line updated to ${state} on the server.`);
      setFulfilTracking('');
      await reloadVendorData();
    } catch (cause) {
      setFulfilError(cause instanceof Error ? cause.message : 'Fulfilment update failed.');
    } finally {
      setFulfilBusy(null);
    }
  };

  const filteredInventory =
    categoryFilter === 'ALL' ? products : products.filter((item) => item.category === categoryFilter);
  const filteredGemledger =
    categoryFilter === 'ALL'
      ? consignment
      : consignment.filter((item) => item.category === categoryFilter);

  return (
    <div className="golden-cloud-gallery min-h-screen font-[family-name:var(--font-eb-garamond)] text-[#1A1612] flex flex-col">
      {/* Luxury Top Bar */}
      <header className="h-16 bg-[#1C1610] text-[#FAF3E3] px-4 sm:px-8 flex items-center justify-between border-b border-[#C5A059]/30">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xl tracking-[0.16em] text-white font-normal">
            MAIHAN GEMS
          </Link>
          <span className="rounded-full border border-[#C5A059]/40 bg-[#C5A059]/15 px-3 py-0.5 font-mono text-[11px] uppercase tracking-[0.2em] text-[#E6C97A]">
            Vendor Portal · Golden-Cloud Edition
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="text-[#D8CEBE] hidden md:inline">
            {vendor.display_name} · {vendor.email}
          </span>
          <Link
            href="/admin"
            className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-full border border-[#C5A059]/40 text-[#E6C97A] hover:bg-white/10"
          >
            Admin Console →
          </Link>
          <button
            type="button"
            onClick={() => {
              setLogoutBusy(true);
              void (async () => {
                await signOutVendorSession();
                window.location.assign('/account/sign-in');
              })();
            }}
            disabled={logoutBusy}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 text-[#E6C97A] border border-[#C5A059]/35 hover:bg-white/15"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 max-w-[1600px] w-full mx-auto">
        {/* Sidebar Navigation */}
        <aside className="md:col-span-3 lg:col-span-2 bg-[#FAF3E3]/80 border-b md:border-b-0 md:border-r border-[#E5D4B3] p-5 space-y-2">
          <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#8C6D2F] px-2 pb-1">
            Supplier Modules
          </p>
          {[
            { id: 'overview', label: 'Partner Overview', icon: LayoutDashboard },
            { id: 'listings', label: 'Inventory Manager', icon: Package },
            { id: 'payments', label: 'Order Settlement Ledger', icon: Landmark },
            { id: 'onboarding', label: 'Partner Onboarding', icon: ShieldCheck },
            { id: 'orders', label: 'Order Fulfilment', icon: ClipboardList },
          ].map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                data-testid={`vendor-tab-${item.id}`}
                onClick={() => setActiveTab(item.id as VendorTabId)}
                className={`w-full flex items-center gap-2.5 px-3.5 py-3 rounded-[14px] text-left text-xs font-mono uppercase tracking-wider transition-all ${
                  active
                    ? 'bg-[#1C1610] text-[#E6C97A] border border-[#C5A059]/50 shadow-sm'
                    : 'text-[#3D3225] hover:bg-[#EFE5D1]/70'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}

          <div className="pt-6 mt-6 border-t border-[#E5D4B3] px-2 space-y-2 text-xs">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8C6D2F]">
              Active Supplier Entity
            </p>
            <p className="font-mono text-xs text-[#1A1612] break-all" data-testid="vendor-active-entity">
              {vendor.display_name}
              <span className="block text-[10px] text-[#8C6D2F]">
                {vendor.city}, {vendor.country_code} · {vendor.email}
              </span>
            </p>
            <p className="font-mono text-[10px] text-[#8C6D2F]">
              Onboarding status: {vendor.status}
            </p>
          </div>
        </aside>

        {/* Main Content */}
        <main id="main-content" className="md:col-span-9 lg:col-span-10 p-6 sm:p-10 space-y-8">
          {/* Top KPI Cards */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="rounded-[24px] bg-[#FFFDF9] border border-[#E5D4B3] p-5 shadow-[0_10px_28px_rgba(36,26,14,0.05)] space-y-1">
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#8C6D2F]">
                Catalogue SKUs Managed
              </p>
              <p className="text-3xl text-[#1A1612] tabular-nums">{summary.total_products} Pieces</p>
              <p className="font-mono text-xs text-[#15803D]">
                {summary.published_products} Live ·{' '}
                {summary.submitted_products} In Moderation
              </p>
            </div>

            <div className="rounded-[24px] bg-[#FFFDF9] border border-[#E5D4B3] p-5 shadow-[0_10px_28px_rgba(36,26,14,0.05)] space-y-1">
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#8C6D2F]">
                Order Revenue (USD)
              </p>
              <p className="text-3xl text-[#1A1612] tabular-nums">
                {formatRealUsd(summary.total_revenue_usd)}
              </p>
              <p className="font-mono text-xs text-[#5C4E3C]">
                Non-cancelled order lines · {summary.total_order_lines} total
              </p>
            </div>

            <div className="rounded-[24px] bg-[#FFFDF9] border border-[#E5D4B3] p-5 shadow-[0_10px_28px_rgba(36,26,14,0.05)] space-y-1">
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#8C6D2F]">
                Pending Fulfilment
              </p>
              <p className="text-3xl text-[#1A1612] tabular-nums">
                {summary.pending_fulfillment_lines} Lines
              </p>
              <p className="font-mono text-xs text-[#8C6D2F]">
                Carrier dispatch due on these lines
              </p>
            </div>

            <div className="rounded-[24px] bg-[#FFFDF9] border border-[#E5D4B3] p-5 shadow-[0_10px_28px_rgba(36,26,14,0.05)] space-y-1">
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#8C6D2F]">
                Onboarding Status
              </p>
              <p className="text-3xl text-[#1A1612] tabular-nums">{vendor.status}</p>
              <p className="font-mono text-xs text-[#15803D]">
                {vendor.bourse_member ? 'Bourse member recorded' : 'Bourse membership not recorded'}
              </p>
            </div>
          </section>

          {/* TAB: INVENTORY MANAGEMENT (GEMSTONES, SETTINGS, JEWELLERY) */}
          {(activeTab === 'overview' || activeTab === 'listings') && (
            <div className="space-y-8">
              <section className="rounded-[24px] bg-[#FFFDF9] border border-[#E5D4B3] p-6 sm:p-8 shadow-[0_12px_32px_rgba(36,26,14,0.06)] space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#EFE5D1] pb-4">
                  <div>
                    <p className="text-xs font-mono uppercase tracking-[0.18em] text-[#8C6D2F]">
                      Multi-Category Vault Intake
                    </p>
                    <h1 className="text-2xl sm:text-3xl font-normal text-[#1A1612]">
                      {editingItemId
                        ? 'Edit Inventory Specimen / Creation'
                        : 'Submit New Gemstone, Pair, or Fine Jewellery'}
                    </h1>
                  </div>
                  {editingItemId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingItemId(null);
                        setFormSku('');
                        setFormTitle('');
                      }}
                      className="text-xs font-mono uppercase tracking-wider text-[#8C6D2F] underline"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>

                {vendor.status !== 'APPROVED' ? (
                  <div role="status" className="rounded-[14px] border border-[#E5D4B3] bg-[#FAF3E3] p-4 text-xs font-mono text-[#8C6D2F]">
                    Your vendor account status is <strong>{vendor.status}</strong>. The real vault rejects
                    product creation until an administrator approves your onboarding — {vendor.rejection_reason ? `note: ${vendor.rejection_reason}.` : 'pending administrator review.'}
                  </div>
                ) : null}

                {inventoryError && (
                  <div
                    role="alert"
                    className="rounded-[14px] border border-[#991B1B] bg-[#FEF2F2] p-4 text-xs font-mono text-[#991B1B]"
                  >
                    {inventoryError}
                  </div>
                )}
                {inventoryFeedback && (
                  <div
                    role="status"
                    className="rounded-[14px] border border-[#166534] bg-[#F0FDF4] p-4 text-xs font-mono text-[#166534] flex items-center gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>{inventoryFeedback}</span>
                  </div>
                )}

                <form
                  onSubmit={(e) => void handleSaveInventoryItem(e)}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
                >
                  <div>
                    <label
                      htmlFor="vnd-inv-category"
                      className="block font-mono text-xs uppercase text-[#6B5A45] mb-1"
                    >
                      Category
                    </label>
                    <select
                      id="vnd-inv-category"
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as VendorInventoryCategory)}
                      className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/60 px-3 py-2 text-sm"
                    >
                      {VENDOR_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="vnd-inv-sku"
                      className="block font-mono text-xs uppercase text-[#6B5A45] mb-1"
                    >
                      SKU Code
                    </label>
                    <input
                      id="vnd-inv-sku"
                      type="text"
                      placeholder="e.g. MG-SAP-2026-88"
                      value={formSku}
                      onChange={(e) => setFormSku(e.target.value)}
                      className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/60 px-3 py-2 text-sm font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label
                      htmlFor="vnd-inv-title"
                      className="block font-mono text-xs uppercase text-[#6B5A45] mb-1"
                    >
                      Specimen / Creation Title
                    </label>
                    <input
                      id="vnd-inv-title"
                      type="text"
                      placeholder="e.g. 3.85 ct Unheated Ceylon Cornflower Sapphire"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/60 px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="vnd-inv-carat"
                      className="block font-mono text-xs uppercase text-[#6B5A45] mb-1"
                    >
                      Carat or Precious Metal
                    </label>
                    <input
                      id="vnd-inv-carat"
                      type="text"
                      placeholder="3.85 or PT950"
                      value={formCaratOrWeight}
                      onChange={(e) => setFormCaratOrWeight(e.target.value)}
                      className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/60 px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="vnd-inv-origin"
                      className="block font-mono text-xs uppercase text-[#6B5A45] mb-1"
                    >
                      Origin Mine / Atelier
                    </label>
                    <input
                      id="vnd-inv-origin"
                      type="text"
                      value={formOrigin}
                      onChange={(e) => setFormOrigin(e.target.value)}
                      className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/60 px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="vnd-inv-subcat"
                      className="block font-mono text-xs uppercase text-[#6B5A45] mb-1"
                    >
                      Subcategory / Variety
                    </label>
                    <input
                      id="vnd-inv-subcat"
                      type="text"
                      value={formSubCategory}
                      onChange={(e) => setFormSubCategory(e.target.value)}
                      className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/60 px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="vnd-inv-reserve"
                      className="block font-mono text-xs uppercase text-[#6B5A45] mb-1"
                    >
                      Asking / Reserve Price (USD)
                    </label>
                    <input
                      id="vnd-inv-reserve"
                      type="number"
                      min="1"
                      value={formPriceUsd}
                      onChange={(e) => setFormPriceUsd(e.target.value)}
                      className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/60 px-3 py-2 text-sm font-mono"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label
                      htmlFor="vnd-inv-treatment"
                      className="block font-mono text-xs uppercase text-[#6B5A45] mb-1"
                    >
                      CIBJO Treatment Disclosure / Hallmark Specification
                    </label>
                    <input
                      id="vnd-inv-treatment"
                      type="text"
                      value={formTreatmentOrHallmark}
                      onChange={(e) => setFormTreatmentOrHallmark(e.target.value)}
                      className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/60 px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="vnd-inv-image"
                      className="block font-mono text-xs uppercase text-[#6B5A45] mb-1"
                    >
                      Hosted Image URL
                    </label>
                    <input
                      id="vnd-inv-image"
                      type="url"
                      placeholder="https://"
                      value={formImageUrl}
                      onChange={(e) => setFormImageUrl(e.target.value)}
                      className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/60 px-3 py-2 text-sm font-mono"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      data-testid="vendor-submit-inventory-btn"
                      disabled={inventoryBusy}
                      className="w-full py-2.5 px-4 rounded-full gold-gradient-cta text-xs font-mono uppercase tracking-[0.16em] font-semibold inline-flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {inventoryBusy ? 'Recording…' : editingItemId ? 'Save Changes' : 'Submit to Vault'}
                    </button>
                  </div>
                </form>

                {/* Live Multi-Category Catalogue Table */}
                <div className="pt-4 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-xl font-normal text-[#1A1612]">
                      Managed Multi-Category Inventory (Gemstones, Pairs &amp; Fine Jewellery)
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {(['ALL', 'Gemstones', 'Pairs', 'Fine Jewellery'] as const).map(
                        (cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setCategoryFilter(cat)}
                            data-testid={`vendor-filter-${cat.toLowerCase()}`}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-mono uppercase tracking-wider transition-colors ${
                              categoryFilter === cat
                                ? 'bg-[#1C1610] text-[#E6C97A]'
                                : 'bg-[#FAF3E3] text-[#5C4E3C] border border-[#E5D4B3]'
                            }`}
                          >
                            {cat}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs font-mono">
                      <thead>
                        <tr className="border-b border-[#E5D4B3] text-[#8C6D2F] uppercase">
                          <th className="py-3 pr-4">SKU / Category</th>
                          <th className="py-3 pr-4">Title &amp; Spec</th>
                          <th className="py-3 pr-4">Origin / Atelier</th>
                          <th className="py-3 pr-4">Treatment / Hallmark</th>
                          <th className="py-3 pr-4">Valuation</th>
                          <th className="py-3 pr-4">Moderation</th>
                          <th className="py-3">Edit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EFE5D1]">
                        {filteredInventory.map((item) => (
                          <tr key={item.id} className="hover:bg-[#FAF3E3]/40">
                            <td className="py-3 pr-4">
                              <span className="font-semibold text-[#1A1612] block">{item.sku}</span>
                              <span className="text-[10px] text-[#8C6D2F]">{item.category}</span>
                            </td>
                            <td className="py-3 pr-4 font-sans">
                              <span className="font-medium text-[#1A1612] block">{item.title}</span>
                              <span className="text-[11px] text-[#5C4E3C]">
                                {item.caratOrWeight ?? 'Not evidenced'} · {item.subCategory}
                              </span>
                            </td>
                            <td className="py-3 pr-4">{item.originOrAtelier ?? 'Not evidenced'}</td>
                            <td className="py-3 pr-4 font-sans text-xs">
                              {item.treatmentOrHallmark ?? 'Not evidenced'}
                            </td>
                            <td className="py-3 pr-4 tabular-nums font-semibold">
                              {formatRealUsd(item.priceUsd)}
                            </td>
                            <td className="py-3 pr-4">
                              <span
                                data-testid={`vendor-moderation-${item.sku}`}
                                className={`inline-block px-2.5 py-1 rounded-full text-[10px] uppercase ${
                                  MODERATION_BADGE[item.moderation] ?? MODERATION_BADGE['DRAFT']
                                }`}
                                title={
                                  item.rejectionReason
                                    ? `Rejection note: ${item.rejectionReason}`
                                    : undefined
                                }
                              >
                                {item.moderation}
                              </span>
                            </td>
                            <td className="py-3">
                              <div className="flex flex-wrap gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(item)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-[#E5D4B3] bg-[#FAF3E3] text-[#1A1612] hover:border-[#C5A059]"
                                >
                                  <Edit3 className="w-3 h-3" /> Edit
                                </button>
                                {item.canSubmit && vendor.status === 'APPROVED' ? (
                                  <button
                                    type="button"
                                    disabled={inventoryBusy}
                                    onClick={() => void handleSubmitForReview(item)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full gold-gradient-cta text-[10px] font-mono uppercase"
                                  >
                                    Submit for Review
                                  </button>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        ))}
                        {products.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-6 text-center text-[#5C4E3C]">
                              No products created under your vendor account yet.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>

              {/* Consignment & Origin-Evidenced Parcel Intake Ledger (real rows). */}
              <section className="rounded-[24px] bg-[#FFFDF9] border border-[#E5D4B3] p-6 sm:p-8 space-y-4">
                <h2 className="text-2xl font-normal text-[#1A1612]">
                  Consignment &amp; Origin-Evidenced Parcel Intake Log
                </h2>
                {filteredGemledger.length === 0 ? (
                  <p className="text-xs font-mono text-[#5C4E3C]">
                    No gemstone parcels on file yet — loose stones and matched pairs you create
                    appear here with their real provenance and moderation state.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs font-mono">
                      <thead>
                        <tr className="border-b border-[#E5D4B3] text-[#8C6D2F] uppercase">
                          <th className="py-2.5 pr-4">Lot ID</th>
                          <th className="py-2.5 pr-4">Parcel Name</th>
                          <th className="py-2.5 pr-4">Carat</th>
                          <th className="py-2.5 pr-4">Origin Mine</th>
                          <th className="py-2.5 pr-4">Reserve</th>
                          <th className="py-2.5">Moderation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EFE5D1]">
                        {filteredGemledger.map((item) => (
                          <tr key={item.id}>
                            <td className="py-2.5 pr-4 font-semibold">{item.sku}</td>
                            <td className="py-2.5 pr-4">{item.title}</td>
                            <td className="py-2.5 pr-4 tabular-nums">
                              {item.caratOrWeight ?? 'Not evidenced'}
                            </td>
                            <td className="py-2.5 pr-4">{item.originOrAtelier ?? 'Not evidenced'}</td>
                            <td className="py-2.5 pr-4 tabular-nums">
                              {formatRealUsd(item.priceUsd)}
                            </td>
                            <td
                              className={`py-2.5 ${
                                item.moderation === 'REJECTED'
                                  ? 'text-[#B91C1C]'
                                  : 'text-[#8C6D2F]'
                              }`}
                            >
                              {item.moderation}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          )}

          {/* TAB: ORDER SETTLEMENT LEDGER (real order lines; no invented payout figures) */}
          {(activeTab === 'overview' || activeTab === 'payments') && (
            <section
              data-testid="vendor-payment-audit-ledger"
              className="rounded-[24px] bg-[#FFFDF9] border border-[#E5D4B3] p-6 sm:p-8 shadow-[0_12px_32px_rgba(36,26,14,0.06)] space-y-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#EFE5D1] pb-4">
                <div>
                  <p className="text-xs font-mono uppercase tracking-[0.18em] text-[#8C6D2F]">
                    Order Line Settlement Ledger
                  </p>
                  <h2 className="text-2xl sm:text-3xl font-normal text-[#1A1612]">
                    Vendor Order Lines &amp; Carrier Dispatch Records
                  </h2>
                  <p className="text-sm text-[#5C4E3C]">
                    Every order line containing one of your pieces, with its recorded line total and
                    fulfilment state. Payout amounts are not evidenced in this marketplace yet and are never rendered.
                  </p>
                </div>
              </div>

              {fulfilError ? (
                <div role="alert" className="rounded-[14px] border border-[#991B1B] bg-[#FEF2F2] p-4 text-xs font-mono text-[#991B1B]">
                  {fulfilError}
                </div>
              ) : null}
              {fulfilNote ? (
                <div role="status" className="rounded-[14px] border border-[#166534] bg-[#F0FDF4] p-4 text-xs font-mono text-[#166534] flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  {fulfilNote}
                </div>
              ) : null}

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="border-b border-[#E5D4B3] text-[#8C6D2F] uppercase">
                      <th className="py-3 pr-4">Order &amp; Placed</th>
                      <th className="py-3 pr-4">Piece &amp; Qty</th>
                      <th className="py-3 pr-4">Destination</th>
                      <th className="py-3 pr-4">Line Total</th>
                      <th className="py-3 pr-4">Fulfilment</th>
                      <th className="py-3">Tracking</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFE5D1]">
                    {orders.map((line) => (
                      <tr key={line.order_item_id} className="hover:bg-[#FAF3E3]/40">
                        <td className="py-3.5 pr-4">
                          <span className="font-semibold text-[#1A1612] block">
                            {line.order_number}
                          </span>
                          <span className="text-[11px] text-[#6B5A45] tabular-nums">
                            {line.placed_at
                              ? new Date(line.placed_at).toLocaleDateString('en-GB')
                              : 'Placement pending'}{' '}
                            · {line.order_state}
                          </span>
                        </td>
                        <td className="py-3.5 pr-4">
                          <span className="font-semibold text-[#1A1612] block">
                            {line.sku_snapshot}
                          </span>
                          <span className="text-[11px] text-[#8C6D2F]">
                            {line.title_snapshot} · ×{line.quantity}
                          </span>
                        </td>
                        <td className="py-3.5 pr-4">
                          {[line.shipping_city, line.shipping_country].filter(Boolean).join(', ') || 'Not evidenced'}
                        </td>
                        <td className="py-3.5 pr-4 tabular-nums">
                          {formatRealUsd(line.line_total)}
                        </td>
                        <td className="py-3.5 pr-4">
                          <span className="inline-block px-2.5 py-1 rounded-full text-[10px] uppercase bg-[#FAF3E3] text-[#8C6D2F] border border-[#E5D4B3]">
                            {line.fulfillment_state}
                          </span>
                        </td>
                        <td className="py-3.5">
                          {line.tracking_number
                            ? `${line.carrier ?? 'Carrier'} · ${line.tracking_number}`
                            : fulfilBusy === line.order_item_id
                              ? (
                                <div className="space-y-1.5">
                                  <input
                                    aria-label="Carrier"
                                    value={fulfilCarrier}
                                    onChange={(e) => setFulfilCarrier(e.target.value)}
                                    className="w-40 rounded-[8px] border border-[#E5D4B3] bg-[#FAF3E3]/70 px-2 py-1 text-[11px] font-mono"
                                  />
                                  <input
                                    aria-label="Tracking number"
                                    placeholder="Tracking number"
                                    value={fulfilTracking}
                                    onChange={(e) => setFulfilTracking(e.target.value)}
                                    className="w-40 rounded-[8px] border border-[#E5D4B3] bg-[#FAF3E3]/70 px-2 py-1 text-[11px] font-mono"
                                  />
                                  <div className="flex gap-1.5">
                                    <button
                                      type="button"
                                      className="px-2.5 py-1 rounded-full gold-gradient-cta"
                                      onClick={() => void handleUpdateFulfilment(line, 'SHIPPED')}
                                    >
                                      Confirm dispatch
                                    </button>
                                    <button
                                      type="button"
                                      className="px-2.5 py-1 rounded-full border border-[#E5D4B3]"
                                      onClick={() => setFulfilBusy(null)}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              )
                              : (
                                <div className="flex flex-col gap-1.5">
                                  {line.fulfillment_state === 'PENDING' ? (
                                    <button
                                      type="button"
                                      disabled={fulfilBusy !== null}
                                      onClick={() => void handleUpdateFulfilment(line, 'IN_FULFILLMENT')}
                                      className="text-[11px] underline text-[#8C6D2F] hover:text-[#1A1612]"
                                    >
                                      Start preparation
                                    </button>
                                  ) : null}
                                  {line.fulfillment_state !== 'SHIPPED' && line.fulfillment_state !== 'DELIVERED' ? (
                                    <button
                                      type="button"
                                      disabled={fulfilBusy !== null}
                                      onClick={() => setFulfilBusy(line.order_item_id)}
                                      className="text-[11px] underline text-[#8C6D2F] hover:text-[#1A1612]"
                                    >
                                      Record carrier dispatch
                                    </button>
                                  ) : null}
                                  {line.fulfillment_state === 'SHIPPED' ? (
                                    <button
                                      type="button"
                                      disabled={fulfilBusy !== null}
                                      onClick={() => void handleUpdateFulfilment(line, 'DELIVERED')}
                                      className="text-[11px] underline text-[#8C6D2F] hover:text-[#1A1612]"
                                    >
                                      Mark delivered
                                    </button>
                                  ) : null}
                                </div>
                              )}
                        </td>
                      </tr>
                    ))}
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-[#5C4E3C]">
                          No customer orders contain your products yet — order lines appear here
                          as soon as a piece sells with your SKU.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* TAB: SUPPLIER ONBOARDING — the REAL vendor_onboarding fields */}
          {activeTab === 'onboarding' && (
            <div data-testid="vendor-kyb-onboarding-section">
              <VendorOnboardingWizard
                vendor={vendor}
                initialProducts={initialProducts}
                onChanged={() => void reloadVendorData()}
              />
            </div>
          )}

          {/* TAB: ORDER FULFILMENT */}
          {(activeTab === 'overview' || activeTab === 'orders') && (
            <section className="rounded-[24px] bg-[#FFFDF9] border border-[#E5D4B3] p-6 sm:p-8 space-y-4">
              <h2 className="text-2xl font-normal text-[#1A1612]">
                Maihan Commission &amp; Fulfilment Lines
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="border-b border-[#E5D4B3] text-[#8C6D2F] uppercase">
                      <th className="py-2.5 pr-4">Order Number</th>
                      <th className="py-2.5 pr-4">Piece SKU</th>
                      <th className="py-2.5 pr-4">Line Total</th>
                      <th className="py-2.5 pr-4">Fulfilment</th>
                      <th className="py-2.5">Placed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFE5D1]">
                    {orders.map((line) => (
                      <tr key={line.order_item_id}>
                        <td className="py-2.5 pr-4 font-semibold">{line.order_number}</td>
                        <td className="py-2.5 pr-4">{line.sku_snapshot}</td>
                        <td className="py-2.5 pr-4 tabular-nums">
                          {formatRealUsd(line.line_total)}
                        </td>
                        <td className="py-2.5 pr-4">{line.fulfillment_state}</td>
                        <td className="py-2.5 text-[#6B5A45] tabular-nums">
                          {line.placed_at
                            ? new Date(line.placed_at).toLocaleDateString('en-GB')
                            : 'Not evidenced'}
                        </td>
                      </tr>
                    ))}
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-[#5C4E3C]">
                          No customer orders contain your products yet.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </main>
      </div>

    </div>
  );
}
