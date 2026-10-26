'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Lock,
  LogOut,
  Package,
  ClipboardList,
  LayoutDashboard,
  Landmark,
  ShieldCheck,
  Plus,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Search,
} from 'lucide-react';
import type { VendorListingRecord } from '@/lib/fixtures/types';
import { formatUsd } from '@/lib/storefront-data';
import {
  InventoryCategory,
  PlatformInventoryItem,
  PaymentAuditLogEntry,
  PaymentAuditStatus,
  VendorOnboardingSubmission,
  INITIAL_PLATFORM_INVENTORY,
  INITIAL_PAYMENT_AUDIT_LOGS,
  INITIAL_VENDOR_ONBOARDING_SUBMISSIONS,
  loadStoredInventory,
  saveStoredInventory,
  loadStoredPaymentAuditLogs,
  loadStoredVendorOnboarding,
  saveStoredVendorOnboarding,
  filterPaymentAuditLogs,
  calculatePaymentLedgerMetrics,
  validateInventorySubmission,
} from '@/lib/platform-governance';
import { VendorOnboardingWizard } from '@/components/operator/VendorOnboardingWizard';

export type VendorTabId = 'overview' | 'listings' | 'payments' | 'onboarding' | 'orders';

interface VendorOrderItem {
  poNumber: string;
  vendorName: string;
  stoneSku: string;
  settlementAmountUsd: number;
  paymentTerms: string;
  status: string;
  date: string;
}

interface VendorPortalClientProps {
  initialSection: VendorTabId;
  initialAuthenticated: boolean;
  initialInviteToken?: string;
  listings: VendorListingRecord[];
  orders: VendorOrderItem[];
}

export default function VendorPortalClient({
  initialSection,
  initialAuthenticated,
  initialInviteToken = '',
  listings,
  orders,
}: VendorPortalClientProps) {
  const [authenticated, setAuthenticated] = useState<boolean>(initialAuthenticated);
  const [vendorEmail, setVendorEmail] = useState<string>('consignment@arusha-lapidary.co.tz');
  const [activeVendorId, setActiveVendorId] = useState<string>('VND-ARUSHA-01');
  const [activeVendorName, setActiveVendorName] = useState<string>(
    'Arusha Lapidary Cooperative'
  );
  const [activeTab, setActiveTab] = useState<VendorTabId>(initialSection);

  // Shared Multi-Category Inventory State
  const [inventory, setInventory] = useState<PlatformInventoryItem[]>(INITIAL_PLATFORM_INVENTORY);
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | InventoryCategory>('ALL');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [formCategory, setFormCategory] = useState<InventoryCategory>('Gemstones');
  const [formSku, setFormSku] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formSubCategory, setFormSubCategory] = useState('Sapphire · Cushion');
  const [formCaratOrWeight, setFormCaratOrWeight] = useState('3.40 ct (8.80 × 7.10 mm)');
  const [formOrigin, setFormOrigin] = useState('Merelani Block D, Tanzania');
  const [formTreatmentOrHallmark, setFormTreatmentOrHallmark] = useState(
    'No Heat (Unheated — SSEF Certified)'
  );
  const [formPriceUsd, setFormPriceUsd] = useState('14200');
  const [inventoryFeedback, setInventoryFeedback] = useState<string | null>(null);
  const [inventoryError, setInventoryError] = useState<string | null>(null);

  // Shared Payment Audit Log State
  const [paymentLogs, setPaymentLogs] = useState<PaymentAuditLogEntry[]>(
    INITIAL_PAYMENT_AUDIT_LOGS
  );
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<
    PaymentAuditStatus | 'ALL'
  >('ALL');
  const [paymentQuery, setPaymentQuery] = useState('');

  // Shared Supplier KYB & Tax Onboarding State
  const [kybSubmissions, setKybSubmissions] = useState<VendorOnboardingSubmission[]>(
    INITIAL_VENDOR_ONBOARDING_SUBMISSIONS
  );

  useEffect(() => {
    setInventory(loadStoredInventory());
    setPaymentLogs(loadStoredPaymentAuditLogs());
    setKybSubmissions(loadStoredVendorOnboarding());
  }, []);

  const handleOpenEdit = (item: PlatformInventoryItem) => {
    setEditingItemId(item.id);
    setFormCategory(item.category);
    setFormSku(item.sku);
    setFormTitle(item.title);
    setFormSubCategory(item.subCategory);
    setFormCaratOrWeight(item.caratOrWeight);
    setFormOrigin(item.originOrAtelier);
    setFormTreatmentOrHallmark(item.treatmentOrHallmark);
    setFormPriceUsd(String(item.priceUsd));
    setInventoryError(null);
    setInventoryFeedback(null);
  };

  const handleSaveInventoryItem = (e: React.FormEvent) => {
    e.preventDefault();
    setInventoryError(null);
    setInventoryFeedback(null);

    const priceNum = Number(formPriceUsd);

    const check = validateInventorySubmission({
      sku: formSku,
      title: formTitle,
      category: formCategory,
      caratOrWeight: formCaratOrWeight,
      originOrAtelier: formOrigin,
      treatmentOrHallmark: formTreatmentOrHallmark,
      priceUsd: priceNum,
    });

    if (!check.ok) {
      setInventoryError(check.error || 'Invalid inventory submission.');
      return;
    }

    if (editingItemId) {
      const next = inventory.map((item) =>
        item.id === editingItemId
          ? {
              ...item,
              category: formCategory,
              sku: formSku.trim().toUpperCase(),
              title: formTitle.trim(),
              subCategory: formSubCategory.trim() || `${formCategory} Specimen`,
              caratOrWeight: formCaratOrWeight.trim(),
              originOrAtelier: formOrigin.trim(),
              treatmentOrHallmark: formTreatmentOrHallmark.trim(),
              priceUsd: priceNum,
              updatedAt: new Date().toISOString(),
            }
          : item
      );
      setInventory(next);
      saveStoredInventory(next);
      setInventoryFeedback(`Updated inventory listing ${formSku.trim().toUpperCase()}.`);
      setEditingItemId(null);
    } else {
      const newItem: PlatformInventoryItem = {
        id: `INV-${Date.now()}`,
        sku: formSku.trim().toUpperCase(),
        title: formTitle.trim(),
        category: formCategory,
        subCategory: formSubCategory.trim() || `${formCategory} Specimen`,
        caratOrWeight: formCaratOrWeight.trim() || '3.10 ct',
        originOrAtelier: formOrigin.trim(),
        treatmentOrHallmark: formTreatmentOrHallmark.trim() || 'Unheated / Disclosed',
        priceUsd: priceNum,
        vendorId: activeVendorId,
        vendorName: activeVendorName,
        status: 'PENDING_LAB_INTAKE',
        updatedAt: new Date().toISOString(),
        reviewerNote: 'Submitted via Vendor Portal. Awaiting Geneva lab & admin review.',
        image:
          formCategory === 'Settings'
            ? '/images/gems/setting-ring.jpg'
            : formCategory === 'Fine Jewellery'
            ? '/images/elysian-ring.jpg'
            : '/images/gems/sapphire-gem.jpg',
      };
      const next = [newItem, ...inventory];
      setInventory(next);
      saveStoredInventory(next);
      setInventoryFeedback(
        `Submitted ${newItem.category} SKU "${newItem.sku}" to Geneva Vault for lab & admin approval.`
      );
    }

    setFormSku('');
    setFormTitle('');
  };

  const filteredInventory = inventory.filter((item) =>
    categoryFilter === 'ALL' ? true : item.category === categoryFilter
  );

  const filteredLogs = filterPaymentAuditLogs(paymentLogs, {
    status: paymentStatusFilter,
    query: paymentQuery,
  });

  const ledgerMetrics = calculatePaymentLedgerMetrics(filteredLogs);

  if (!authenticated) {
    return (
      <div className="golden-cloud-gallery min-h-screen font-[family-name:var(--font-eb-garamond)] text-[#1A1612] flex flex-col justify-between p-6 sm:p-12">
        <header className="max-w-lg mx-auto w-full flex items-center justify-between border-b border-[#E5D4B3] pb-4">
          <Link href="/" className="text-2xl tracking-tight text-[#1A1612]">
            MAIHAN GEMS
          </Link>
          <span className="font-mono text-xs uppercase tracking-[0.18em] text-[#8C6D2F]">
            Vendor Portal Gate
          </span>
        </header>

        <main
          id="main-content"
          className="max-w-lg mx-auto w-full rounded-[28px] bg-[#FFFDF9] border border-[#E5D4B3] p-8 sm:p-10 shadow-[0_24px_60px_rgba(36,26,14,0.12)] space-y-6"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-[#C5A059]/40 bg-[#FAF3E3] px-3.5 py-1 text-xs font-mono uppercase tracking-[0.16em] text-[#8C6D2F]">
            <Lock className="w-3.5 h-3.5" />
            Partner Lapidary &amp; Atelier Sign-In
          </div>
          <h1 className="text-3xl sm:text-4xl font-normal text-[#1A1612]">
            Vendor &amp; Mine Partner Portal
          </h1>
          <p className="text-base text-[#5C4E3C] leading-relaxed">
            Manage multi-category inventory (Gemstones, Settings, Fine Jewellery), track transparent payment &amp; payout audit ledgers, and complete Supplier KYB &amp; Tax onboarding via your Admin invitation link.
          </p>

          <button
            type="button"
            onClick={() => setAuthenticated(true)}
            className="w-full flex items-center justify-center gap-2 rounded-full border border-[#D5C29F] bg-[#FAF3E3] hover:bg-[#F3E7CC] py-3 text-xs uppercase tracking-[0.18em] font-semibold text-[#1A1612] transition-colors"
          >
            <Sparkles className="h-4 w-4 text-[#8C6D2F]" />
            Continue with Google Partner SSO
          </button>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setAuthenticated(true);
            }}
            className="space-y-4 pt-2 border-t border-[#EFE5D1]"
          >
            <div>
              <label
                htmlFor="vendor-email"
                className="block font-mono text-xs uppercase tracking-wider text-[#6B5A45] mb-1"
              >
                Partner Account Email
              </label>
              <input
                id="vendor-email"
                type="email"
                required
                value={vendorEmail}
                onChange={(e) => setVendorEmail(e.target.value)}
                className="w-full rounded-[12px] bg-[#FAF3E3]/60 border border-[#E5D4B3] px-3.5 py-2.5 text-sm"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 rounded-full gold-gradient-cta text-xs font-mono uppercase tracking-[0.18em] font-semibold"
            >
              Sign In to Partner Portal
            </button>
          </form>
        </main>

        <footer className="max-w-lg mx-auto w-full text-xs font-mono text-[#6B5A45] border-t border-[#E5D4B3] pt-4 flex justify-between">
          <span>Maihan Supply Chain Registry</span>
          <Link href="/" className="underline hover:text-[#1A1612]">
            Return to Storefront
          </Link>
        </footer>
      </div>
    );
  }

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
            {activeVendorId} · {vendorEmail}
          </span>
          <Link
            href="/admin?autostart=1"
            className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-full border border-[#C5A059]/40 text-[#E6C97A] hover:bg-white/10"
          >
            Admin Console →
          </Link>
          <button
            type="button"
            onClick={() => setAuthenticated(false)}
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
            { id: 'payments', label: 'Payment Audit Ledger', icon: Landmark },
            { id: 'onboarding', label: 'KYB & Tax Onboarding', icon: ShieldCheck },
            { id: 'orders', label: 'Purchase Orders', icon: ClipboardList },
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
            <select
              aria-label="Select Active Vendor Entity"
              value={activeVendorId}
              onChange={(e) => {
                const vId = e.target.value;
                setActiveVendorId(vId);
                if (vId === 'VND-ARUSHA-01') {
                  setActiveVendorName('Arusha Lapidary Cooperative');
                  setVendorEmail('consignment@arusha-lapidary.co.tz');
                } else if (vId === 'VND-GENEVA-03') {
                  setActiveVendorName('Geneva Master Bench #4');
                  setVendorEmail('atelier@vaucher-geneve.ch');
                } else {
                  setActiveVendorName('Bogotá & Chivor Emerald Guild');
                  setVendorEmail('exports@muzo-syndicate.co');
                }
              }}
              className="w-full rounded-[10px] border border-[#E5D4B3] bg-[#FFFDF9] px-2.5 py-2 text-xs text-[#1A1612]"
            >
              <option value="VND-ARUSHA-01">VND-ARUSHA-01 (Arusha Co-op)</option>
              <option value="VND-GENEVA-03">VND-GENEVA-03 (Geneva Bench #4)</option>
              <option value="VND-CHIVOR-04">VND-CHIVOR-04 (Chivor Guild)</option>
            </select>
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
              <p className="text-3xl text-[#1A1612] tabular-nums">{inventory.length} Lots</p>
              <p className="font-mono text-xs text-[#15803D]">
                {inventory.filter((i) => i.status === 'APPROVED_IN_VAULT').length} Live ·{' '}
                {inventory.filter((i) => i.status === 'PENDING_LAB_INTAKE').length} In Intake
              </p>
            </div>

            <div className="rounded-[24px] bg-[#FFFDF9] border border-[#E5D4B3] p-5 shadow-[0_10px_28px_rgba(36,26,14,0.05)] space-y-1">
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#8C6D2F]">
                Settled Volume
              </p>
              <p className="text-3xl text-[#1A1612] tabular-nums">
                {formatUsd(ledgerMetrics.totalSettledVolumeUsd)}
              </p>
              <p className="font-mono text-xs text-[#5C4E3C]">
                SWIFT / SEPA Reconciled
              </p>
            </div>

            <div className="rounded-[24px] bg-[#FFFDF9] border border-[#E5D4B3] p-5 shadow-[0_10px_28px_rgba(36,26,14,0.05)] space-y-1">
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#8C6D2F]">
                Escrow &amp; Pending Wire
              </p>
              <p className="text-3xl text-[#1A1612] tabular-nums">
                {formatUsd(
                  ledgerMetrics.activeEscrowHoldUsd + ledgerMetrics.pendingWirePayoutUsd
                )}
              </p>
              <p className="font-mono text-xs text-[#8C6D2F]">
                Awaiting Lab / Client Sign-off
              </p>
            </div>

            <div className="rounded-[24px] bg-[#FFFDF9] border border-[#E5D4B3] p-5 shadow-[0_10px_28px_rgba(36,26,14,0.05)] space-y-1">
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#8C6D2F]">
                KYB &amp; Tax Compliance
              </p>
              <p className="text-3xl text-[#1A1612] tabular-nums">
                {kybSubmissions.filter((k) => k.status === 'VERIFIED_PARTNER').length} Verified
              </p>
              <p className="font-mono text-xs text-[#15803D]">
                RJC / Kimberley Attested
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
                        ? 'Edit Inventory Specimen / Setting'
                        : 'Submit New Gemstone, Setting, or Fine Jewellery'}
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
                  onSubmit={handleSaveInventoryItem}
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
                      onChange={(e) => setFormCategory(e.target.value as InventoryCategory)}
                      className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/60 px-3 py-2 text-sm"
                    >
                      <option value="Gemstones">Gemstones</option>
                      <option value="Settings">Settings</option>
                      <option value="Fine Jewellery">Fine Jewellery</option>
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
                      Carat / Precious Metal
                    </label>
                    <input
                      id="vnd-inv-carat"
                      type="text"
                      placeholder="3.85 ct or PT950"
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
                      Subcategory / Cut
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

                  <div className="flex items-end">
                    <button
                      type="submit"
                      data-testid="vendor-submit-inventory-btn"
                      className="w-full py-2.5 px-4 rounded-full gold-gradient-cta text-xs font-mono uppercase tracking-[0.16em] font-semibold inline-flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {editingItemId ? 'Save Changes' : 'Submit to Vault'}
                    </button>
                  </div>
                </form>

                {/* Live Multi-Category Catalogue Table */}
                <div className="pt-4 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-xl font-normal text-[#1A1612]">
                      Managed Multi-Category Inventory (Gemstones, Settings &amp; Fine Jewellery)
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {(['ALL', 'Gemstones', 'Settings', 'Fine Jewellery'] as const).map(
                        (cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setCategoryFilter(cat)}
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
                          <th className="py-3 pr-4">Vault Status</th>
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
                                {item.caratOrWeight} · {item.subCategory}
                              </span>
                            </td>
                            <td className="py-3 pr-4">{item.originOrAtelier}</td>
                            <td className="py-3 pr-4 font-sans text-xs">
                              {item.treatmentOrHallmark}
                            </td>
                            <td className="py-3 pr-4 tabular-nums font-semibold">
                              {formatUsd(item.priceUsd)}
                            </td>
                            <td className="py-3 pr-4">
                              <span
                                className={`inline-block px-2.5 py-1 rounded-full text-[10px] uppercase ${
                                  item.status === 'APPROVED_IN_VAULT'
                                    ? 'bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]'
                                    : item.status === 'REJECTED_UNDISCLOSED_TREATMENT'
                                    ? 'bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA]'
                                    : 'bg-[#FAF3E3] text-[#8C6D2F] border border-[#E5D4B3]'
                                }`}
                              >
                                {item.status}
                              </span>
                            </td>
                            <td className="py-3">
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(item)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-[#E5D4B3] bg-[#FAF3E3] text-[#1A1612] hover:border-[#C5A059]"
                              >
                                <Edit3 className="w-3 h-3" /> Edit
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>

              {/* Original Consignment Parcels Table preserved for backwards compatibility */}
              <section className="rounded-[24px] bg-[#FFFDF9] border border-[#E5D4B3] p-6 sm:p-8 space-y-4">
                <h2 className="text-2xl font-normal text-[#1A1612]">
                  Consignment &amp; Origin-Evidenced Parcel Intake Log
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs font-mono">
                    <thead>
                      <tr className="border-b border-[#E5D4B3] text-[#8C6D2F] uppercase">
                        <th className="py-2.5 pr-4">Lot ID</th>
                        <th className="py-2.5 pr-4">Parcel Name</th>
                        <th className="py-2.5 pr-4">Carat</th>
                        <th className="py-2.5 pr-4">Origin Mine</th>
                        <th className="py-2.5 pr-4">Reserve</th>
                        <th className="py-2.5">Lab Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EFE5D1]">
                      {listings.map((item) => (
                        <tr key={item.lotId}>
                          <td className="py-2.5 pr-4 font-semibold">{item.lotId}</td>
                          <td className="py-2.5 pr-4">{item.parcelName}</td>
                          <td className="py-2.5 pr-4 tabular-nums">
                            {item.caratWeight.toFixed(2)} ct
                          </td>
                          <td className="py-2.5 pr-4">{item.originMine}</td>
                          <td className="py-2.5 pr-4 tabular-nums">
                            {formatUsd(item.askingPriceUsd)}
                          </td>
                          <td
                            className={`py-2.5 ${
                              item.inspectionState === 'REJECTED_UNDISCLOSED_TREATMENT'
                                ? 'text-[#B91C1C]'
                                : 'text-[#8C6D2F]'
                            }`}
                          >
                            {item.inspectionState}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}

          {/* TAB: VENDOR PAYMENT & PAYOUT AUDIT LOG */}
          {(activeTab === 'overview' || activeTab === 'payments') && (
            <section
              data-testid="vendor-payment-audit-ledger"
              className="rounded-[24px] bg-[#FFFDF9] border border-[#E5D4B3] p-6 sm:p-8 shadow-[0_12px_32px_rgba(36,26,14,0.06)] space-y-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#EFE5D1] pb-4">
                <div>
                  <p className="text-xs font-mono uppercase tracking-[0.18em] text-[#8C6D2F]">
                    Transparent Settlement &amp; Treasury Ledger
                  </p>
                  <h2 className="text-2xl sm:text-3xl font-normal text-[#1A1612]">
                    Vendor Payment &amp; Payout Tracking Audit Log
                  </h2>
                  <p className="text-sm text-[#5C4E3C]">
                    Immutable audit trail tracking every payment timestamp, gross order amount, net vendor payout, status, and associated Order, Customer, and Vendor IDs.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[#8C6D2F] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      aria-label="Filter payment audit logs"
                      placeholder="Search Order, User, SKU..."
                      value={paymentQuery}
                      onChange={(e) => setPaymentQuery(e.target.value)}
                      className="rounded-full border border-[#E5D4B3] bg-[#FAF3E3]/70 pl-8 pr-4 py-1.5 text-xs font-mono"
                    />
                  </div>
                  <select
                    aria-label="Filter payment status"
                    value={paymentStatusFilter}
                    onChange={(e) =>
                      setPaymentStatusFilter(
                        e.target.value as PaymentAuditStatus | 'ALL'
                      )
                    }
                    className="rounded-full border border-[#E5D4B3] bg-[#FAF3E3]/70 px-3.5 py-1.5 text-xs font-mono"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="SETTLED">SETTLED</option>
                    <option value="ESCROW_HOLD">ESCROW_HOLD</option>
                    <option value="PENDING_WIRE">PENDING_WIRE</option>
                    <option value="FLAGGED_COMPLIANCE">FLAGGED_COMPLIANCE</option>
                    <option value="REFUNDED">REFUNDED</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="border-b border-[#E5D4B3] text-[#8C6D2F] uppercase">
                      <th className="py-3 pr-4">Transaction ID &amp; Timestamp</th>
                      <th className="py-3 pr-4">Order / PO / SKU</th>
                      <th className="py-3 pr-4">Customer &amp; Vendor IDs</th>
                      <th className="py-3 pr-4">Gross Amount</th>
                      <th className="py-3 pr-4">Net Vendor Payout</th>
                      <th className="py-3 pr-4">Payment Rail</th>
                      <th className="py-3 pr-4">Status</th>
                      <th className="py-3">Audit Trail Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFE5D1]">
                    {filteredLogs.map((log) => (
                      <tr key={log.transactionId} className="hover:bg-[#FAF3E3]/40">
                        <td className="py-3.5 pr-4">
                          <span className="font-semibold text-[#1A1612] block">
                            {log.transactionId}
                          </span>
                          <span className="text-[11px] text-[#6B5A45] tabular-nums">
                            {log.timestamp}
                          </span>
                        </td>
                        <td className="py-3.5 pr-4">
                          <span className="font-semibold text-[#1A1612] block">
                            {log.orderId}
                          </span>
                          <span className="text-[11px] text-[#8C6D2F]">
                            {log.poNumber} · {log.stoneSku}
                          </span>
                        </td>
                        <td className="py-3.5 pr-4">
                          <span className="block text-[#1A1612]">
                            User: {log.customerId}
                          </span>
                          <span className="block text-[11px] text-[#6B5A45]">
                            Vendor: {log.vendorId}
                          </span>
                        </td>
                        <td className="py-3.5 pr-4 tabular-nums">
                          {formatUsd(log.grossAmountUsd)}
                        </td>
                        <td className="py-3.5 pr-4 tabular-nums font-semibold text-[#15803D]">
                          {formatUsd(log.netPayoutUsd)}
                        </td>
                        <td className="py-3.5 pr-4">{log.paymentMethod}</td>
                        <td className="py-3.5 pr-4">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-[10px] uppercase ${
                              log.status === 'SETTLED'
                                ? 'bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]'
                                : log.status === 'FLAGGED_COMPLIANCE' || log.status === 'REFUNDED'
                                ? 'bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA]'
                                : 'bg-[#FAF3E3] text-[#8C6D2F] border border-[#E5D4B3]'
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td className="py-3.5 font-sans text-xs text-[#4A3E2E] max-w-xs">
                          {log.auditNote}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* TAB: MULTI-STEP SUPPLIER KYB & TAX ONBOARDING WIZARD */}
          {activeTab === 'onboarding' && (
            <div data-testid="vendor-kyb-onboarding-section">
              <VendorOnboardingWizard
                submissions={kybSubmissions}
                initialInviteToken={initialInviteToken}
                onSubmissionsChange={(updated) => {
                  setKybSubmissions(updated);
                  saveStoredVendorOnboarding(updated);
                }}
              />
            </div>
          )}

          {/* TAB: PURCHASE ORDERS */}
          {(activeTab === 'overview' || activeTab === 'orders') && (
            <section className="rounded-[24px] bg-[#FFFDF9] border border-[#E5D4B3] p-6 sm:p-8 space-y-4">
              <h2 className="text-2xl font-normal text-[#1A1612]">
                Maison Purchase Orders
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="border-b border-[#E5D4B3] text-[#8C6D2F] uppercase">
                      <th className="py-2.5 pr-4">PO Number</th>
                      <th className="py-2.5 pr-4">Stone SKU</th>
                      <th className="py-2.5 pr-4">Settlement</th>
                      <th className="py-2.5 pr-4">Status</th>
                      <th className="py-2.5">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFE5D1]">
                    {orders.map((po) => (
                      <tr key={po.poNumber}>
                        <td className="py-2.5 pr-4 font-semibold">{po.poNumber}</td>
                        <td className="py-2.5 pr-4">{po.stoneSku}</td>
                        <td className="py-2.5 pr-4 tabular-nums">
                          {formatUsd(po.settlementAmountUsd)}
                        </td>
                        <td className="py-2.5 pr-4">{po.status}</td>
                        <td className="py-2.5 text-[#6B5A45] tabular-nums">{po.date}</td>
                      </tr>
                    ))}
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
