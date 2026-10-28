// @ts-nocheck
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Compass,
  Globe,
  LayoutDashboard,
  Lock,
  LogOut,
  Plus,
  RefreshCw,
  Terminal,
  Package,
  Landmark,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type {
  AiOpsJobRecord,
  RedirectRuleRecord,
  SeoMetadataRecord,
} from '@/lib/mgh/fixtures/types';
import { validateRedirectUpsert, formatUsd } from '@/lib/mgh/storefront-data';
import {
  InventoryCategory,
  InventoryApprovalStatus,
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
  saveStoredPaymentAuditLogs,
  loadStoredVendorOnboarding,
  saveStoredVendorOnboarding,
  filterPaymentAuditLogs,
  calculatePaymentLedgerMetrics,
  validateInventorySubmission,
  createAdminVendorInvite,
} from '@/lib/mgh/platform-governance';
import { AuditLedger } from '@/components/mgh/operator/AuditLedger';

export type AdminTabId =
  | 'overview'
  | 'inventory'
  | 'payments'
  | 'vendors'
  | 'seo'
  | 'navigation'
  | 'ai-ops';

interface NavigationConfigShape {
  header: { id: string; label: string; href: string; group: string }[];
  megaMenuColumns: { title: string; links: { label: string; href: string }[] }[];
  footer: { label: string; href: string }[];
}

interface AdminConsoleClientProps {
  initialSection: AdminTabId;
  initialAuthenticated: boolean;
  initialSeoEntries: SeoMetadataRecord[];
  initialRedirects: RedirectRuleRecord[];
  initialNavigation: NavigationConfigShape;
  initialAiJobs: AiOpsJobRecord[];
  initialAiLogs: string[];
}

export default function AdminConsoleClient({
  initialSection,
  initialAuthenticated,
  initialSeoEntries,
  initialRedirects,
  initialNavigation,
  initialAiJobs,
  initialAiLogs,
}: AdminConsoleClientProps) {
  const [authenticated, setAuthenticated] = useState<boolean>(initialAuthenticated);
  const [operatorEmail, setOperatorEmail] = useState<string>('archivist@maihangems.com');
  const [operatorPassphrase, setOperatorPassphrase] = useState<string>('');
  const [activeTab, setActiveTab] = useState<AdminTabId>(initialSection);

  // Multi-Category Vault Inventory State
  const [inventory, setInventory] = useState<PlatformInventoryItem[]>(INITIAL_PLATFORM_INVENTORY);
  const [invCategoryFilter, setInvCategoryFilter] = useState<'ALL' | InventoryCategory>('ALL');
  const [newInvCategory, setNewInvCategory] = useState<InventoryCategory>('Gemstones');
  const [newInvSku, setNewInvSku] = useState('');
  const [newInvTitle, setNewInvTitle] = useState('');
  const [newInvSpec, _setNewInvSpec] = useState('4.20 ct · Cushion Cut');
  const [newInvOrigin, setNewInvOrigin] = useState('Ratnapura, Sri Lanka');
  const [newInvTreatment, setNewInvTreatment] = useState('No Heat (SSEF #129901)');
  const [newInvPrice, setNewInvPrice] = useState('16000');
  const [invStatusMsg, setInvStatusMsg] = useState<string | null>(null);
  const [invErrorMsg, setInvErrorMsg] = useState<string | null>(null);

  // Payment Audit Log & Payout Ledger State
  const [paymentLogs, setPaymentLogs] = useState<PaymentAuditLogEntry[]>(
    INITIAL_PAYMENT_AUDIT_LOGS
  );
  const [paymentStatusFilter, _setPaymentStatusFilter] = useState<
    PaymentAuditStatus | 'ALL'
  >('ALL');
  const [paymentQuery, _setPaymentQuery] = useState('');
  const [newTxOrderId, _setNewTxOrderId] = useState('ORD-2026-9099');
  const [newTxPoNumber, _setNewTxPoNumber] = useState('PO-MHG-2026-109');
  const [newTxCustomerId, _setNewTxCustomerId] = useState('USR-CLAIRE-8841');
  const [newTxVendorId, _setNewTxVendorId] = useState('VND-ARUSHA-01');
  const [newTxSku, _setNewTxSku] = useState('MG-TZ-0131');
  const [newTxGrossUsd, _setNewTxGrossUsd] = useState('14800');
  const [newTxStatus, _setNewTxStatus] = useState<PaymentAuditStatus>('SETTLED');
  const [newTxAuditNote, _setNewTxAuditNote] = useState(
    'Verified treasury wire settlement and released vendor payout.'
  );
  const [_paymentFeedback, setPaymentFeedback] = useState<string | null>(null);

  // Supplier KYB & Tax Onboarding Review + Admin-Only Vendor Invitation State
  const [kybList, setKybList] = useState<VendorOnboardingSubmission[]>(
    INITIAL_VENDOR_ONBOARDING_SUBMISSIONS
  );
  const [kybFeedback, setKybFeedback] = useState<string | null>(null);
  const [inviteCompanyName, setInviteCompanyName] = useState('Colombian Muzo Emerald Syndicate SAS');
  const [inviteContactName, setInviteContactName] = useState('Alejandro Restrepo');
  const [inviteContactEmail, setInviteContactEmail] = useState('vault@muzosyndicate.co');
  const [inviteCountry, setInviteCountry] = useState('Colombia');
  const [inviteCategory, setInviteCategory] = useState<InventoryCategory>('Gemstones');
  const [generatedInviteLink, setGeneratedInviteLink] = useState<string>(
    '/vendor?invite=INV-MHG-2026-8841'
  );
  const [generatedInviteToken, setGeneratedInviteToken] = useState<string>(
    'INV-MHG-2026-8841'
  );
  const [copiedInvite, setCopiedInvite] = useState<boolean>(false);

  // SEO & Redirect State
  const [seoEntries, setSeoEntries] = useState<SeoMetadataRecord[]>(initialSeoEntries);
  const [newSeoPath, setNewSeoPath] = useState('');
  const [newSeoTitle, setNewSeoTitle] = useState('');
  const [newSeoDesc, setNewSeoDesc] = useState('');
  const [seoMessage, setSeoMessage] = useState<string | null>(null);

  const [redirects, setRedirects] = useState<RedirectRuleRecord[]>(initialRedirects);
  const [sourcePath, setSourcePath] = useState('');
  const [destinationPath, setDestinationPath] = useState('');
  const [statusCode, setStatusCode] = useState<301 | 302 | 307 | 308>(301);
  const [redirectConflict, setRedirectConflict] = useState<string | null>(null);
  const [redirectSuccess, setRedirectSuccess] = useState<string | null>(null);

  // Navigation Editor State
  const [navConfig, setNavConfig] = useState<NavigationConfigShape>(initialNavigation);
  const [selectedSurface, setSelectedSurface] = useState<
    'header' | 'footer' | 'mega-menu'
  >('header');
  const [newNavLabel, setNewNavLabel] = useState('');
  const [newNavHref, setNewNavHref] = useState('');

  // AI-Ops Queue & Guarded Requeue State
  const [aiJobs, setAiJobs] = useState<AiOpsJobRecord[]>(initialAiJobs);
  const [aiLogs, setAiLogs] = useState<string[]>(initialAiLogs);
  const [requeueTargetJobId, setRequeueTargetJobId] = useState<string | null>(null);
  const [requeueAuditNote, setRequeueAuditNote] = useState<string>('');
  const [requeueConfirmChecked, setRequeueConfirmChecked] = useState<boolean>(false);
  const [requeueError, setRequeueError] = useState<string | null>(null);

  useEffect(() => {
    setInventory(loadStoredInventory());
    setPaymentLogs(loadStoredPaymentAuditLogs());
    setKybList(loadStoredVendorOnboarding());
  }, []);

  const handleUpdateInventoryStatus = (
    itemId: string,
    nextStatus: InventoryApprovalStatus
  ) => {
    const updated = inventory.map((item) =>
      item.id === itemId
        ? { ...item, status: nextStatus, updatedAt: new Date().toISOString() }
        : item
    );
    setInventory(updated);
    saveStoredInventory(updated);
    const target = updated.find((i) => i.id === itemId);
    setInvStatusMsg(
      `Updated ${target?.sku} (${target?.category}) status to ${nextStatus}.`
    );
  };

  const handleAdminAddInventory = (e: React.FormEvent) => {
    e.preventDefault();
    setInvErrorMsg(null);
    setInvStatusMsg(null);

    const priceNum = Number(newInvPrice);
    const validation = validateInventorySubmission({
      sku: newInvSku,
      title: newInvTitle,
      category: newInvCategory,
      caratOrWeight: newInvSpec,
      originOrAtelier: newInvOrigin,
      treatmentOrHallmark: newInvTreatment,
      priceUsd: priceNum,
    });

    if (!validation.ok) {
      setInvErrorMsg(validation.error || 'Invalid inventory item.');
      return;
    }

    const created: PlatformInventoryItem = {
      id: `INV-${Date.now()}`,
      sku: newInvSku.trim().toUpperCase(),
      title: newInvTitle.trim(),
      category: newInvCategory,
      subCategory: `${newInvCategory} · Direct Vault`,
      caratOrWeight: newInvSpec.trim(),
      originOrAtelier: newInvOrigin.trim(),
      treatmentOrHallmark: newInvTreatment.trim(),
      priceUsd: priceNum,
      vendorId: 'VND-GENEVA-03',
      vendorName: 'Maihan Direct Geneva Vault',
      status: 'APPROVED_IN_VAULT',
      updatedAt: new Date().toISOString(),
      reviewerNote: 'Added directly by Geneva Vault Archivist.',
      image:
        newInvCategory === 'Settings'
          ? '/mgh/images/gems/setting-ring.jpg'
          : newInvCategory === 'Fine Jewellery'
          ? '/mgh/images/elysian-ring.jpg'
          : '/mgh/images/gems/sapphire-gem.jpg',
    };

    const next = [created, ...inventory];
    setInventory(next);
    saveStoredInventory(next);
    setInvStatusMsg(
      `Added ${created.category} "${created.sku}" directly as APPROVED_IN_VAULT.`
    );
    setNewInvSku('');
    setNewInvTitle('');
  };

  const handleUpdatePaymentStatus = (
    transactionId: string,
    nextStatus: PaymentAuditStatus
  ) => {
    const updated = paymentLogs.map((log) =>
      log.transactionId === transactionId
        ? {
            ...log,
            status: nextStatus,
            timestamp: new Date().toISOString(),
            auditNote: `${log.auditNote} · [Admin ${operatorEmail} updated status to ${nextStatus}]`,
          }
        : log
    );
    setPaymentLogs(updated);
    saveStoredPaymentAuditLogs(updated);
    setPaymentFeedback(`Audit entry ${transactionId} transitioned to ${nextStatus}.`);
  };

  const _handleRecordAuditTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const gross = Number(newTxGrossUsd) || 10000;
    const fee = Math.round(gross * 0.12);
    const net = gross - fee;
    const entry: PaymentAuditLogEntry = {
      transactionId: `TXN-2026-${Date.now().toString().slice(-5)}`,
      timestamp: new Date().toISOString(),
      orderId: newTxOrderId.trim(),
      poNumber: newTxPoNumber.trim(),
      customerId: newTxCustomerId.trim(),
      vendorId: newTxVendorId.trim(),
      vendorName:
        newTxVendorId === 'VND-ARUSHA-01'
          ? 'Arusha Lapidary Cooperative'
          : 'Geneva Master Bench #4',
      stoneSku: newTxSku.trim(),
      direction: 'OUTBOUND_VENDOR_PAYOUT',
      grossAmountUsd: gross,
      platformCommissionUsd: fee,
      netPayoutUsd: net,
      currency: 'USD',
      paymentMethod: 'SWIFT_TREASURY_WIRE',
      status: newTxStatus,
      referenceHash: `UETR-MHG-WIRE-${Date.now().toString().slice(-4)}`,
      actorEmail: operatorEmail,
      auditNote: newTxAuditNote.trim() || 'Recorded by Geneva Vault Archivist.',
    };
    const next = [entry, ...paymentLogs];
    setPaymentLogs(next);
    saveStoredPaymentAuditLogs(next);
    setPaymentFeedback(
      `Recorded immutable payment audit log ${entry.transactionId} for Order ${entry.orderId}.`
    );
  };

  const handleUpdateKybStatus = (
    applicationId: string,
    nextStatus: VendorOnboardingSubmission['status'],
    note: string
  ) => {
    const updated = kybList.map((sub) =>
      sub.applicationId === applicationId
        ? {
            ...sub,
            status: nextStatus,
            reviewerAuditNote: note,
            updatedAt: new Date().toISOString(),
          }
        : sub
    );
    setKybList(updated);
    saveStoredVendorOnboarding(updated);
    setKybFeedback(`Supplier KYB dossier ${applicationId} updated to ${nextStatus}.`);
  };

  const handleCreateVendorInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCompanyName.trim() || !inviteContactEmail.trim()) return;

    const result = createAdminVendorInvite(kybList, {
      legalBusinessName: inviteCompanyName,
      primaryContactName: inviteContactName || 'Vault Compliance Director',
      primaryContactEmail: inviteContactEmail,
      jurisdictionCountry: inviteCountry || 'Switzerland',
      invitedByAdmin: operatorEmail,
      primarySupplyCategory: inviteCategory,
    });

    if (!result.ok || !result.invite) {
      setKybFeedback(result.error || 'Unable to generate vendor invite.');
      return;
    }

    setKybList(result.updatedList);
    saveStoredVendorOnboarding(result.updatedList);

    const link = result.inviteUrlPath || `/vendor?invite=${result.invite.inviteToken}`;
    setGeneratedInviteToken(result.invite.inviteToken || '');
    setGeneratedInviteLink(link);
    setCopiedInvite(false);
    setKybFeedback(
      `Provisioned Vendor ID ${result.invite.vendorId} for "${result.invite.legalBusinessName}". Share onboarding link ${link} with the supplier.`
    );
  };

  const handleSeoUpsert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSeoPath.trim() || !newSeoTitle.trim()) return;
    const normalizedPath = newSeoPath.startsWith('/')
      ? newSeoPath.trim()
      : `/${newSeoPath.trim()}`;

    setSeoEntries((prev) => {
      const existingIndex = prev.findIndex((item) => item.routePath === normalizedPath);
      const updatedEntry: SeoMetadataRecord = {
        id: existingIndex >= 0 ? prev[existingIndex].id : `SEO-${Date.now()}`,
        routePath: normalizedPath,
        title: newSeoTitle.trim(),
        description: newSeoDesc.trim() || 'Curated Maihan Gems archival route.',
        canonicalUrl: `https://maihangems.example.com${normalizedPath}`,
        noindex: false,
        updatedAt: '2026-10-26T08:00:00Z',
      };
      if (existingIndex >= 0) {
        const clone = [...prev];
        clone[existingIndex] = updatedEntry;
        return clone;
      }
      return [updatedEntry, ...prev];
    });

    setSeoMessage(`Upserted canonical SEO metadata for ${normalizedPath}`);
    setNewSeoPath('');
    setNewSeoTitle('');
    setNewSeoDesc('');
  };

  const handleAddRedirect = (e: React.FormEvent) => {
    e.preventDefault();
    setRedirectConflict(null);
    setRedirectSuccess(null);

    const validation = validateRedirectUpsert(redirects, {
      sourcePath,
      destinationPath,
      statusCode,
    });

    if (!validation.ok) {
      setRedirectConflict(validation.message);
      return;
    }

    const newRule: RedirectRuleRecord = {
      id: `RED-${Date.now()}`,
      sourcePath: sourcePath.trim(),
      destinationPath: destinationPath.trim(),
      statusCode,
      createdAt: '2026-10-26',
      note: 'Operator-created rule',
    };

    setRedirects((prev) => [newRule, ...prev]);
    setRedirectSuccess(
      `Registered HTTP ${newRule.statusCode} redirect from ${newRule.sourcePath} → ${newRule.destinationPath}`
    );
    setSourcePath('');
    setDestinationPath('');
  };

  const handleAddNavItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNavLabel.trim() || !newNavHref.trim()) return;
    if (selectedSurface === 'header') {
      setNavConfig((prev) => ({
        ...prev,
        header: [
          ...prev.header,
          {
            id: `nav-${Date.now()}`,
            label: newNavLabel.trim(),
            href: newNavHref.trim(),
            group: 'header',
          },
        ],
      }));
    } else if (selectedSurface === 'footer') {
      setNavConfig((prev) => ({
        ...prev,
        footer: [
          ...prev.footer,
          { label: newNavLabel.trim(), href: newNavHref.trim() },
        ],
      }));
    } else {
      setNavConfig((prev) => ({
        ...prev,
        megaMenuColumns: prev.megaMenuColumns.map((col, idx) =>
          idx === 0
            ? {
                ...col,
                links: [
                  ...col.links,
                  { label: newNavLabel.trim(), href: newNavHref.trim() },
                ],
              }
            : col
        ),
      }));
    }
    setNewNavLabel('');
    setNewNavHref('');
  };

  const handleExecuteGuardedRequeue = (e: React.FormEvent) => {
    e.preventDefault();
    setRequeueError(null);
    if (!requeueTargetJobId) return;

    if (!requeueConfirmChecked || requeueAuditNote.trim().length < 6) {
      setRequeueError(
        'Guarded Requeue blocked: You must check the operator confirmation box and enter an audit reason (min 6 chars).'
      );
      return;
    }

    setAiJobs((prev) =>
      prev.map((job) =>
        job.jobId === requeueTargetJobId
          ? {
              ...job,
              status: 'RUNNING',
              attempts: job.attempts + 1,
              lastError: null,
              auditNote: requeueAuditNote.trim(),
              updatedAt: '2026-10-26T08:15:00Z',
            }
          : job
      )
    );

    setAiLogs((prev) => [
      `[2026-10-26T08:15:00Z] INFO  job=${requeueTargetJobId} Operator ${operatorEmail} executed guarded dead-letter requeue. Audit note: "${requeueAuditNote.trim()}"`,
      ...prev,
    ]);

    setRequeueTargetJobId(null);
    setRequeueAuditNote('');
    setRequeueConfirmChecked(false);
  };

  const filteredInventory = inventory.filter((item) =>
    invCategoryFilter === 'ALL' ? true : item.category === invCategoryFilter
  );
  const filteredPayments = filterPaymentAuditLogs(paymentLogs, {
    status: paymentStatusFilter,
    query: paymentQuery,
  });
  const paymentMetrics = calculatePaymentLedgerMetrics(filteredPayments);

  if (!authenticated) {
    return (
      <div className="golden-cloud-gallery min-h-screen font-[family-name:var(--font-eb-garamond)] text-[#1A1612] flex flex-col justify-between p-6 sm:p-12">
        <header className="max-w-lg mx-auto w-full flex items-center justify-between border-b border-[#E5D4B3] pb-4">
          <Link href="/" className="text-2xl tracking-tight text-[#1A1612]">
            MAIHAN GEMS
          </Link>
          <span className="font-mono text-xs uppercase tracking-[0.18em] text-[#8C6D2F]">
            Admin Console Gate
          </span>
        </header>

        <main
          id="main-content"
          className="max-w-lg mx-auto w-full rounded-[28px] bg-[#FFFDF9] border border-[#E5D4B3] p-8 sm:p-10 shadow-[0_24px_60px_rgba(36,26,14,0.12)] space-y-6"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-[#C5A059]/40 bg-[#FAF3E3] px-3.5 py-1 text-xs font-mono uppercase tracking-[0.14em] text-[#8C6D2F]">
            <Lock className="w-3.5 h-3.5" />
            Operator Authentication Required
          </div>
          <h1 className="text-3xl sm:text-4xl font-normal text-[#1A1612]">
            Sign In to Maihan Vault Operations
          </h1>
          <p className="text-base text-[#5C4E3C] leading-relaxed">
            Access multi-category inventory governance, vendor payment &amp; payout audit ledgers, supplier KYB verification, SEO rules, and dead-letter AI-ops queues.
          </p>

          <button
            type="button"
            onClick={() => setAuthenticated(true)}
            className="w-full flex items-center justify-center gap-2 rounded-full border border-[#D5C29F] bg-[#FAF3E3] hover:bg-[#F3E7CC] py-3 text-xs uppercase tracking-[0.18em] font-semibold text-[#1A1612] transition-colors"
          >
            <Sparkles className="h-4 w-4 text-[#8C6D2F]" />
            Authenticate with Google Workspace SSO
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
                htmlFor="admin-email"
                className="block font-mono text-xs uppercase tracking-wider text-[#6B5A45] mb-1"
              >
                Operator Email
              </label>
              <input
                id="admin-email"
                type="email"
                required
                value={operatorEmail}
                onChange={(e) => setOperatorEmail(e.target.value)}
                className="w-full rounded-[12px] bg-[#FAF3E3]/60 border border-[#E5D4B3] px-3.5 py-2.5 text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="admin-passphrase"
                className="block font-mono text-xs uppercase tracking-wider text-[#6B5A45] mb-1"
              >
                Hardware Key / Passphrase
              </label>
              <input
                id="admin-passphrase"
                type="password"
                placeholder="Enter operator passphrase"
                value={operatorPassphrase}
                onChange={(e) => setOperatorPassphrase(e.target.value)}
                className="w-full rounded-[12px] bg-[#FAF3E3]/60 border border-[#E5D4B3] px-3.5 py-2.5 text-sm"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 rounded-full gold-gradient-cta text-xs font-mono uppercase tracking-[0.18em] font-semibold"
            >
              Authenticate Operator Session
            </button>
          </form>
        </main>

        <footer className="max-w-lg mx-auto w-full text-xs font-mono text-[#6B5A45] border-t border-[#E5D4B3] pt-4 flex justify-between">
          <span>Vault Security Protocol</span>
          <Link href="/" className="underline hover:text-[#1A1612]">
            Return to Storefront
          </Link>
        </footer>
      </div>
    );
  }

  return (
    <div className="golden-cloud-gallery min-h-screen font-[family-name:var(--font-eb-garamond)] text-[#1A1612] flex flex-col">
      {/* Luxury Header */}
      <header className="h-16 bg-[#1C1610] text-[#FAF3E3] px-4 sm:px-8 flex items-center justify-between border-b border-[#C5A059]/30">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xl tracking-[0.16em] text-white font-normal">
            MAIHAN GEMS
          </Link>
          <span className="rounded-full border border-[#C5A059]/40 bg-[#C5A059]/15 px-3 py-0.5 font-mono text-[11px] uppercase tracking-[0.2em] text-[#E6C97A]">
            Admin Console · Vault Governance
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="text-[#D8CEBE] hidden sm:inline">{operatorEmail}</span>
          <Link
            href="/vendor?autostart=1"
            className="hidden md:inline-flex items-center px-3 py-1.5 rounded-full border border-[#C5A059]/40 text-[#E6C97A] hover:bg-white/10"
          >
            Vendor Portal →
          </Link>
          <button
            type="button"
            onClick={() => setAuthenticated(false)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 text-[#E6C97A] border border-[#C5A059]/35 hover:bg-white/15"
          >
            <LogOut className="w-3.5 h-3.5" />
            Lock Session
          </button>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 max-w-[1600px] w-full mx-auto">
        {/* Left Navigation Rail */}
        <aside className="md:col-span-3 lg:col-span-2 bg-[#FAF3E3]/80 border-b md:border-b-0 md:border-r border-[#E5D4B3] p-5 space-y-1.5">
          <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#8C6D2F] px-2 pb-1">
            Governance Modules
          </p>
          {[
            { id: 'overview', label: 'Overview & KPIs', icon: LayoutDashboard },
            { id: 'inventory', label: 'Inventory Approval', icon: Package },
            { id: 'payments', label: 'Payment Audit Log', icon: Landmark },
            { id: 'vendors', label: 'Vendor KYB Review', icon: ShieldCheck },
            { id: 'seo', label: 'SEO & Redirects', icon: Globe },
            { id: 'navigation', label: 'Navigation Trees', icon: Compass },
            { id: 'ai-ops', label: 'AI-Ops Queue', icon: Terminal },
          ].map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                data-testid={`admin-tab-${item.id}`}
                onClick={() => setActiveTab(item.id as AdminTabId)}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-[14px] text-left text-xs font-mono uppercase tracking-wider transition-all ${
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

          <div className="pt-6 mt-6 border-t border-[#E5D4B3] px-3 space-y-2">
            <p className="font-mono text-[11px] uppercase tracking-wider text-[#8C6D2F]">
              Cross-Surface Links
            </p>
            <Link
              href="/vendor?autostart=1"
              className="block text-xs font-mono text-[#1A1612] hover:text-[#8C6D2F] underline"
            >
              Vendor Portal →
            </Link>
            <Link
              href="/account/overview"
              className="block text-xs font-mono text-[#1A1612] hover:text-[#8C6D2F] underline"
            >
              Multi-Role Account →
            </Link>
            <Link
              href="/policy"
              className="block text-xs font-mono text-[#1A1612] hover:text-[#8C6D2F] underline"
            >
              Legal &amp; Compliance Hub →
            </Link>
          </div>
        </aside>

        {/* Main Panel */}
        <main id="main-content" className="md:col-span-9 lg:col-span-10 p-6 sm:p-10 space-y-8">
          {/* Vault KPIs */}
          <section
            aria-label="Vault Operational KPIs"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
          >
            <div className="rounded-[24px] bg-[#FFFDF9] border border-[#E5D4B3] p-5 shadow-[0_10px_28px_rgba(36,26,14,0.05)] space-y-1">
              <p className="font-mono text-[11px] uppercase tracking-wider text-[#8C6D2F]">
                Vault Inventory Valuation
              </p>
              <p className="text-3xl text-[#1A1612] tabular-nums">
                {formatUsd(
                  inventory.reduce((acc, item) => acc + item.priceUsd, 0)
                )}
              </p>
              <p className="font-mono text-xs text-[#15803D]">
                {inventory.length} Total Lots · 100% Lab Evidenced
              </p>
            </div>

            <div className="rounded-[24px] bg-[#FFFDF9] border border-[#E5D4B3] p-5 shadow-[0_10px_28px_rgba(36,26,14,0.05)] space-y-1">
              <p className="font-mono text-[11px] uppercase tracking-wider text-[#8C6D2F]">
                Settled Ledger Volume
              </p>
              <p className="text-3xl text-[#1A1612] tabular-nums">
                {formatUsd(paymentMetrics.totalSettledVolumeUsd)}
              </p>
              <p className="font-mono text-xs text-[#5C4E3C]">
                {paymentLogs.length} Audited Payment Events
              </p>
            </div>

            <div className="rounded-[24px] bg-[#FFFDF9] border border-[#E5D4B3] p-5 shadow-[0_10px_28px_rgba(36,26,14,0.05)] space-y-1">
              <p className="font-mono text-[11px] uppercase tracking-wider text-[#8C6D2F]">
                Escrow &amp; Pending Wire
              </p>
              <p className="text-3xl text-[#1A1612] tabular-nums">
                {formatUsd(paymentMetrics.activeEscrowHoldUsd)}
              </p>
              <p className="font-mono text-xs text-[#8C6D2F]">
                {formatUsd(paymentMetrics.pendingWirePayoutUsd)} Pending Wire
              </p>
            </div>

            <div className="rounded-[24px] bg-[#FFFDF9] border border-[#E5D4B3] p-5 shadow-[0_10px_28px_rgba(36,26,14,0.05)] space-y-1">
              <p className="font-mono text-[11px] uppercase tracking-wider text-[#8C6D2F]">
                Supplier KYB &amp; AI-Ops Queue
              </p>
              <p className="text-3xl text-[#1A1612] tabular-nums">
                {kybList.length} Suppliers
              </p>
              <p className="font-mono text-xs text-[#15803D]">
                {aiJobs.filter((j) => j.status === 'DEAD_LETTER').length} AI-Ops Halted
              </p>
            </div>
          </section>

          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="border-b border-[#E5D4B3] pb-4">
                <h1 className="text-3xl sm:text-4xl font-normal text-[#1A1612]">
                  Vault Operations, Inventory &amp; Treasury Governance
                </h1>
                <p className="text-base text-[#5C4E3C] mt-1">
                  Centralized command console for multi-category inventory approval (Gemstones, Settings, Fine Jewellery), transparent vendor payout audit logs, supplier KYB compliance, and SEO/AI-ops telemetry.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="rounded-[24px] bg-[#FFFDF9] border border-[#E5D4B3] p-6 space-y-3 shadow-[0_10px_28px_rgba(36,26,14,0.05)]">
                  <h2 className="text-2xl font-normal text-[#1A1612]">
                    Inventory Approval &amp; Vault Intake
                  </h2>
                  <p className="text-sm text-[#5C4E3C]">
                    Approve, edit, or reject loose gemstones, architectural settings, and fine jewellery submitted by mine partners.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('inventory')}
                    className="px-5 py-2.5 rounded-full gold-gradient-cta text-xs font-mono uppercase tracking-wider font-semibold"
                  >
                    Open Inventory Manager
                  </button>
                </div>

                <div className="rounded-[24px] bg-[#FFFDF9] border border-[#E5D4B3] p-6 space-y-3 shadow-[0_10px_28px_rgba(36,26,14,0.05)]">
                  <h2 className="text-2xl font-normal text-[#1A1612]">
                    Transparent Payment Audit Ledger
                  </h2>
                  <p className="text-sm text-[#5C4E3C]">
                    Track every payment timestamp, order/user/vendor ID, platform commission, and escrow wire payout release.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('payments')}
                    className="px-5 py-2.5 rounded-full gold-gradient-cta text-xs font-mono uppercase tracking-wider font-semibold"
                  >
                    Open Payment Ledger
                  </button>
                </div>

                <div className="rounded-[24px] bg-[#FFFDF9] border border-[#E5D4B3] p-6 space-y-3 shadow-[0_10px_28px_rgba(36,26,14,0.05)]">
                  <h2 className="text-2xl font-normal text-[#1A1612]">
                    Supplier KYB &amp; Tax Verification
                  </h2>
                  <p className="text-sm text-[#5C4E3C]">
                    Review supplier corporate registration, mining export licenses, and tax/IBAN credentials.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('vendors')}
                    className="px-5 py-2.5 rounded-full gold-gradient-cta text-xs font-mono uppercase tracking-wider font-semibold"
                  >
                    Review KYB Dossiers
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* INVENTORY TAB */}
          {activeTab === 'inventory' && (
            <div className="space-y-8" data-testid="admin-inventory-section">
              <div className="border-b border-[#E5D4B3] pb-4 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-normal text-[#1A1612]">
                    Multi-Category Inventory Governance (Gemstones, Settings &amp; Fine Jewellery)
                  </h1>
                  <p className="text-sm text-[#5C4E3C]">
                    Approve vendor submissions to go live on the storefront, reject non-compliant parcels, or add direct Geneva Vault pieces.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(['ALL', 'Gemstones', 'Settings', 'Fine Jewellery'] as const).map(
                    (cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setInvCategoryFilter(cat)}
                        className={`px-4 py-1.5 rounded-full text-xs font-mono uppercase tracking-wider ${
                          invCategoryFilter === cat
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

              {invErrorMsg && (
                <div
                  role="alert"
                  className="rounded-[14px] border border-[#991B1B] bg-[#FEF2F2] p-4 text-xs font-mono text-[#991B1B]"
                >
                  {invErrorMsg}
                </div>
              )}
              {invStatusMsg && (
                <div
                  role="status"
                  className="rounded-[14px] border border-[#166534] bg-[#F0FDF4] p-4 text-xs font-mono text-[#166534] flex items-center gap-2"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{invStatusMsg}</span>
                </div>
              )}

              {/* Direct Vault Add Form */}
              <section className="rounded-[24px] bg-[#FFFDF9] border border-[#E5D4B3] p-6 space-y-4">
                <h2 className="text-xl font-normal text-[#1A1612]">
                  Add Direct Vault Specimen / Setting / Jewellery
                </h2>
                <form
                  onSubmit={handleAdminAddInventory}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end"
                >
                  <div>
                    <label
                      htmlFor="adm-inv-cat"
                      className="block font-mono text-xs uppercase text-[#6B5A45] mb-1"
                    >
                      Category
                    </label>
                    <select
                      id="adm-inv-cat"
                      value={newInvCategory}
                      onChange={(e) =>
                        setNewInvCategory(e.target.value as InventoryCategory)
                      }
                      className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/60 px-3 py-2 text-sm"
                    >
                      <option value="Gemstones">Gemstones</option>
                      <option value="Settings">Settings</option>
                      <option value="Fine Jewellery">Fine Jewellery</option>
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="adm-inv-sku"
                      className="block font-mono text-xs uppercase text-[#6B5A45] mb-1"
                    >
                      SKU
                    </label>
                    <input
                      id="adm-inv-sku"
                      type="text"
                      placeholder="MG-2026-990"
                      value={newInvSku}
                      onChange={(e) => setNewInvSku(e.target.value)}
                      className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/60 px-3 py-2 text-sm font-mono"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="adm-inv-title"
                      className="block font-mono text-xs uppercase text-[#6B5A45] mb-1"
                    >
                      Title
                    </label>
                    <input
                      id="adm-inv-title"
                      type="text"
                      placeholder="4.20 ct Unheated Padparadscha Sapphire"
                      value={newInvTitle}
                      onChange={(e) => setNewInvTitle(e.target.value)}
                      className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/60 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="adm-inv-origin"
                      className="block font-mono text-xs uppercase text-[#6B5A45] mb-1"
                    >
                      Origin / Atelier
                    </label>
                    <input
                      id="adm-inv-origin"
                      type="text"
                      value={newInvOrigin}
                      onChange={(e) => setNewInvOrigin(e.target.value)}
                      className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/60 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="adm-inv-lab"
                      className="block font-mono text-xs uppercase text-[#6B5A45] mb-1"
                    >
                      Treatment / Lab Dossier
                    </label>
                    <input
                      id="adm-inv-lab"
                      type="text"
                      value={newInvTreatment}
                      onChange={(e) => setNewInvTreatment(e.target.value)}
                      className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/60 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="adm-inv-reserve"
                      className="block font-mono text-xs uppercase text-[#6B5A45] mb-1"
                    >
                      Price (USD)
                    </label>
                    <input
                      id="adm-inv-reserve"
                      type="number"
                      value={newInvPrice}
                      onChange={(e) => setNewInvPrice(e.target.value)}
                      className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/60 px-3 py-2 text-sm font-mono"
                    />
                  </div>
                  <div>
                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 rounded-full gold-gradient-cta text-xs font-mono uppercase tracking-wider font-semibold"
                    >
                      + Publish to Vault
                    </button>
                  </div>
                </form>
              </section>

              {/* Inventory Approval Table */}
              <section className="rounded-[24px] bg-[#FFFDF9] border border-[#E5D4B3] p-6 overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="border-b border-[#E5D4B3] text-[#8C6D2F] uppercase">
                      <th className="py-3 pr-4">SKU &amp; Category</th>
                      <th className="py-3 pr-4">Title &amp; Origin</th>
                      <th className="py-3 pr-4">Vendor Partner</th>
                      <th className="py-3 pr-4">Treatment / Hallmark</th>
                      <th className="py-3 pr-4">Valuation</th>
                      <th className="py-3 pr-4">Status</th>
                      <th className="py-3">Governance Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFE5D1]">
                    {filteredInventory.map((item) => (
                      <tr key={item.id} className="hover:bg-[#FAF3E3]/40">
                        <td className="py-3.5 pr-4">
                          <span className="font-semibold text-[#1A1612] block">{item.sku}</span>
                          <span className="text-[10px] text-[#8C6D2F]">{item.category}</span>
                        </td>
                        <td className="py-3.5 pr-4 font-sans">
                          <span className="font-medium text-[#1A1612] block">{item.title}</span>
                          <span className="text-xs text-[#5C4E3C]">
                            {item.caratOrWeight} · {item.originOrAtelier}
                          </span>
                        </td>
                        <td className="py-3.5 pr-4">
                          <span className="block text-[#1A1612]">{item.vendorId}</span>
                          <span className="text-[11px] text-[#6B5A45] font-sans">
                            {item.vendorName}
                          </span>
                        </td>
                        <td className="py-3.5 pr-4 font-sans text-xs">
                          {item.treatmentOrHallmark}
                        </td>
                        <td className="py-3.5 pr-4 tabular-nums font-semibold text-[#1A1612]">
                          {formatUsd(item.priceUsd)}
                        </td>
                        <td className="py-3.5 pr-4">
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
                        <td className="py-3.5">
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateInventoryStatus(item.id, 'APPROVED_IN_VAULT')
                              }
                              className="px-2.5 py-1 rounded-full bg-[#15803D] text-white text-[10px] uppercase tracking-wider hover:bg-[#166534]"
                            >
                              Approve Live
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateInventoryStatus(
                                  item.id,
                                  'REJECTED_UNDISCLOSED_TREATMENT'
                                )
                              }
                              className="px-2.5 py-1 rounded-full bg-[#B91C1C] text-white text-[10px] uppercase tracking-wider hover:bg-[#991B1B]"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </div>
          )}

          {/* PAYMENTS & AUDIT LEDGER TAB */}
          {activeTab === 'payments' && (
            <AuditLedger
              logs={paymentLogs}
              operatorEmail={operatorEmail}
              onUpdateStatus={handleUpdatePaymentStatus}
              onAddTransaction={(entry) => {
                const next = [entry, ...paymentLogs];
                setPaymentLogs(next);
                saveStoredPaymentAuditLogs(next);
              }}
            />
          )}

          {/* VENDOR INVITATION & KYB / TAX ONBOARDING REVIEW TAB */}
          {activeTab === 'vendors' && (
            <div className="space-y-8" data-testid="admin-vendor-kyb-section">
              <div className="border-b border-[#E5D4B3] pb-4 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#8C6D2F] block mb-1">
                    Admin-Only Supplier Provisioning &amp; KYB Governance
                  </span>
                  <h1 className="text-3xl font-normal text-[#1A1612]">
                    Create Vendor Invitation Link &amp; KYB Verification Queue
                  </h1>
                  <p className="text-sm text-[#5C4E3C]">
                    Suppliers cannot self-register. Create an invited vendor profile below to generate a unique onboarding link (<code>/vendor?invite=...</code>) for the 4-step KYB &amp; tax wizard.
                  </p>
                </div>
              </div>

              {kybFeedback && (
                <div
                  role="status"
                  data-testid="admin-vendor-invite-feedback"
                  className="rounded-[14px] border border-[#166534] bg-[#F0FDF4] p-4 text-xs font-mono text-[#166534] flex items-center gap-2"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{kybFeedback}</span>
                </div>
              )}

              {/* Admin-Only Vendor Creation & Onboarding Link Generator */}
              <section
                data-testid="admin-create-vendor-invite-panel"
                className="rounded-[24px] bg-[#FFFDF9] border border-[#E5D4B3] p-6 space-y-5 shadow-[0_12px_32px_rgba(26,22,18,0.04)]"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EFE5D1] pb-4">
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#8C6D2F] block">
                      Exclusive Admin Authority
                    </span>
                    <h2 className="text-xl font-normal text-[#1A1612]">
                      Provision New Vendor &amp; Generate Onboarding Link
                    </h2>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-[#FAF3E3] border border-[#E5D4B3] font-mono text-[11px] text-[#8C6D2F]">
                    Self-Signup Disabled · Invite Link Required
                  </span>
                </div>

                <form
                  onSubmit={handleCreateVendorInvite}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end"
                >
                  <div>
                    <label
                      htmlFor="adm-inv-company"
                      className="block font-mono text-[11px] uppercase text-[#6B5A45] mb-1"
                    >
                      Legal Business Name
                    </label>
                    <input
                      id="adm-inv-company"
                      data-testid="adm-invite-company-input"
                      type="text"
                      required
                      value={inviteCompanyName}
                      onChange={(e) => setInviteCompanyName(e.target.value)}
                      className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/50 px-3 py-2 text-xs text-[#1A1612]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="adm-inv-contact"
                      className="block font-mono text-[11px] uppercase text-[#6B5A45] mb-1"
                    >
                      Primary Officer
                    </label>
                    <input
                      id="adm-inv-contact"
                      type="text"
                      required
                      value={inviteContactName}
                      onChange={(e) => setInviteContactName(e.target.value)}
                      className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/50 px-3 py-2 text-xs text-[#1A1612]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="adm-inv-email"
                      className="block font-mono text-[11px] uppercase text-[#6B5A45] mb-1"
                    >
                      Supplier Corporate Email
                    </label>
                    <input
                      id="adm-inv-email"
                      data-testid="adm-invite-email-input"
                      type="email"
                      required
                      value={inviteContactEmail}
                      onChange={(e) => setInviteContactEmail(e.target.value)}
                      className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/50 px-3 py-2 text-xs font-mono text-[#1A1612]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="adm-inv-country"
                      className="block font-mono text-[11px] uppercase text-[#6B5A45] mb-1"
                    >
                      Jurisdiction &amp; Specialization
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        id="adm-inv-country"
                        type="text"
                        required
                        value={inviteCountry}
                        onChange={(e) => setInviteCountry(e.target.value)}
                        className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/50 px-2.5 py-2 text-xs text-[#1A1612]"
                      />
                      <select
                        aria-label="Primary supply category"
                        value={inviteCategory}
                        onChange={(e) =>
                          setInviteCategory(e.target.value as InventoryCategory)
                        }
                        className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/50 px-2 py-2 text-xs font-mono text-[#1A1612]"
                      >
                        <option value="Gemstones">Gemstones</option>
                        <option value="Settings">Settings</option>
                        <option value="Fine Jewellery">Jewellery</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <button
                      type="submit"
                      data-testid="adm-generate-vendor-invite-btn"
                      className="w-full py-2.5 px-4 rounded-full gold-gradient-cta text-xs font-mono uppercase tracking-wider font-semibold"
                    >
                      + Generate Invite Link
                    </button>
                  </div>
                </form>

                {generatedInviteLink && (
                  <div
                    data-testid="adm-generated-invite-box"
                    className="rounded-[16px] border border-[#D4B872] bg-[#FAF3E3]/80 p-4 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5">
                      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8C6D2F] block">
                        Shareable Vendor Onboarding Link (Token: {generatedInviteToken})
                      </span>
                      <code
                        data-testid="adm-generated-invite-url"
                        className="font-mono text-xs font-semibold text-[#1A1612] break-all"
                      >
                        {generatedInviteLink}
                      </code>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof navigator !== 'undefined' && navigator.clipboard) {
                            navigator.clipboard.writeText(
                              `${window.location.origin}${generatedInviteLink}`
                            );
                          }
                          setCopiedInvite(true);
                        }}
                        className="px-3.5 py-1.5 rounded-full border border-[#8C6D2F] bg-[#FFFDF9] text-xs font-mono uppercase tracking-wider text-[#1A1612] hover:bg-[#FAF3E3]"
                      >
                        {copiedInvite ? 'Copied Link' : 'Copy Onboarding Link'}
                      </button>
                      <Link
                        href={generatedInviteLink}
                        data-testid="adm-open-invite-link"
                        className="px-4 py-1.5 rounded-full bg-[#1A1612] text-[#FFFDF9] text-xs font-mono uppercase tracking-wider hover:bg-[#332B22]"
                      >
                        Open Onboarding Wizard →
                      </Link>
                    </div>
                  </div>
                )}
              </section>

              <section className="rounded-[24px] bg-[#FFFDF9] border border-[#E5D4B3] p-6 overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="border-b border-[#E5D4B3] text-[#8C6D2F] uppercase">
                      <th className="py-3 pr-4">Application &amp; Invite Token</th>
                      <th className="py-3 pr-4">Legal Entity &amp; Structure</th>
                      <th className="py-3 pr-4">Reg No. &amp; Tax ID</th>
                      <th className="py-3 pr-4">Mining / Assay License</th>
                      <th className="py-3 pr-4">IBAN / SWIFT</th>
                      <th className="py-3 pr-4">Status</th>
                      <th className="py-3">Compliance Decision</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFE5D1]">
                    {kybList.map((sub) => (
                      <tr key={sub.applicationId} className="hover:bg-[#FAF3E3]/40">
                        <td className="py-3.5 pr-4">
                          <span className="font-semibold text-[#1A1612] block">
                            {sub.applicationId}
                          </span>
                          <span className="text-[11px] text-[#8C6D2F] block">
                            {sub.vendorId} · {sub.submittedAt.slice(0, 10)}
                          </span>
                          {sub.inviteToken && (
                            <Link
                              href={`/vendor?invite=${sub.inviteToken}`}
                              className="inline-block mt-1 text-[10px] text-[#1A1612] underline hover:text-[#8C6D2F]"
                            >
                              /vendor?invite={sub.inviteToken}
                            </Link>
                          )}
                        </td>
                        <td className="py-3.5 pr-4 font-sans">
                          <span className="font-semibold text-[#1A1612] block">
                            {sub.legalBusinessName}
                          </span>
                          <span className="text-xs text-[#5C4E3C] block">
                            {sub.jurisdictionCountry} · {sub.primaryContactName}
                          </span>
                          {sub.entityStructure && (
                            <span className="font-mono text-[10px] text-[#8C6D2F]">
                              {sub.entityStructure}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 pr-4">
                          <span className="block">{sub.registrationNumber}</span>
                          <span className="text-[11px] text-[#8C6D2F]">
                            {sub.taxIdType}: {sub.taxIdNumber}
                          </span>
                        </td>
                        <td className="py-3.5 pr-4">{sub.miningOrLapidaryLicenseRef}</td>
                        <td className="py-3.5 pr-4">
                          <span className="block">{sub.ibanOrAccountNumber}</span>
                          <span className="text-[11px] text-[#6B5A45]">{sub.swiftBicCode}</span>
                        </td>
                        <td className="py-3.5 pr-4">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-[10px] uppercase ${
                              sub.status === 'VERIFIED_PARTNER'
                                ? 'bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]'
                                : sub.status === 'ACTION_REQUIRED'
                                ? 'bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA]'
                                : sub.status === 'INVITED_PENDING_ONBOARDING'
                                ? 'bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]'
                                : 'bg-[#FAF3E3] text-[#8C6D2F] border border-[#E5D4B3]'
                            }`}
                          >
                            {sub.status}
                          </span>
                        </td>
                        <td className="py-3.5">
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateKybStatus(
                                  sub.applicationId,
                                  'VERIFIED_PARTNER',
                                  'Approved by Geneva Compliance Officer after license & tax verification.'
                                )
                              }
                              className="px-2.5 py-1 rounded-full bg-[#15803D] text-white text-[10px] uppercase tracking-wider hover:bg-[#166534]"
                            >
                              Verify Partner
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateKybStatus(
                                  sub.applicationId,
                                  'ACTION_REQUIRED',
                                  'Additional beneficial ownership or export license renewal required.'
                                )
                              }
                              className="px-2.5 py-1 rounded-full bg-[#B91C1C] text-white text-[10px] uppercase tracking-wider hover:bg-[#991B1B]"
                            >
                              Request Docs
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </div>
          )}

          {/* SEO & REDIRECTS TAB */}
          {activeTab === 'seo' && (
            <div className="space-y-10">
              <div className="border-b border-[#E5D4B3] pb-3">
                <h1 className="text-3xl font-normal text-[#1A1612]">
                  SEO Metadata &amp; HTTP Redirect Manager
                </h1>
                <p className="text-sm text-[#5C4E3C]">
                  Upsert canonical metadata per route and enforce non-conflicting 301/302/307/308 redirects.
                </p>
              </div>

              <section className="rounded-[24px] bg-[#FFFDF9] border border-[#E5D4B3] p-6 space-y-5">
                <h2 className="text-2xl font-normal text-[#1A1612]">
                  Redirect Rules (301 / 302 / 307 / 308)
                </h2>
                <form
                  onSubmit={handleAddRedirect}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
                >
                  <div className="sm:col-span-4">
                    <label
                      htmlFor="redir-source"
                      className="block font-mono text-xs uppercase text-[#6B5A45] mb-1"
                    >
                      Source Path
                    </label>
                    <input
                      id="redir-source"
                      type="text"
                      placeholder="/catalogue/tanzanite"
                      value={sourcePath}
                      onChange={(e) => setSourcePath(e.target.value)}
                      className="w-full rounded-[12px] bg-[#FAF3E3]/60 border border-[#E5D4B3] px-3 py-2 text-sm font-mono"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <label
                      htmlFor="redir-target"
                      className="block font-mono text-xs uppercase text-[#6B5A45] mb-1"
                    >
                      Destination Path
                    </label>
                    <input
                      id="redir-target"
                      type="text"
                      placeholder="/varieties/tanzanite"
                      value={destinationPath}
                      onChange={(e) => setDestinationPath(e.target.value)}
                      className="w-full rounded-[12px] bg-[#FAF3E3]/60 border border-[#E5D4B3] px-3 py-2 text-sm font-mono"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="redir-code"
                      className="block font-mono text-xs uppercase text-[#6B5A45] mb-1"
                    >
                      HTTP Status
                    </label>
                    <select
                      id="redir-code"
                      value={statusCode}
                      onChange={(e) =>
                        setStatusCode(Number(e.target.value) as 301 | 302 | 307 | 308)
                      }
                      className="w-full rounded-[12px] bg-[#FAF3E3]/60 border border-[#E5D4B3] px-3 py-2 text-sm font-mono"
                    >
                      <option value={301}>301 Permanent</option>
                      <option value={302}>302 Found</option>
                      <option value={307}>307 Temporary</option>
                      <option value={308}>308 Permanent</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <button
                      type="submit"
                      className="w-full py-2.5 px-3 rounded-full gold-gradient-cta text-xs font-mono uppercase tracking-wider font-semibold"
                    >
                      Add Rule
                    </button>
                  </div>
                </form>

                {redirectConflict && (
                  <div
                    role="alert"
                    className="p-4 rounded-[14px] bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-xs font-mono flex items-center gap-2"
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{redirectConflict}</span>
                  </div>
                )}

                {redirectSuccess && (
                  <div
                    role="status"
                    className="p-3 rounded-[14px] bg-[#F0FDF4] border border-[#BBF7D0] text-[#15803D] text-xs font-mono flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{redirectSuccess}</span>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs font-mono">
                    <thead>
                      <tr className="border-b border-[#E5D4B3] text-[#8C6D2F] uppercase">
                        <th className="py-2 pr-4">Source Path</th>
                        <th className="py-2 pr-4">Destination Path</th>
                        <th className="py-2 pr-4">Status Code</th>
                        <th className="py-2">Note</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EFE5D1]">
                      {redirects.map((r) => (
                        <tr key={r.id}>
                          <td className="py-2.5 pr-4 text-[#1A1612]">{r.sourcePath}</td>
                          <td className="py-2.5 pr-4 text-[#8C6D2F]">
                            {r.destinationPath}
                          </td>
                          <td className="py-2.5 pr-4 tabular-nums">{r.statusCode}</td>
                          <td className="py-2.5 text-[#5C4E3C]">{r.note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="rounded-[24px] bg-[#FFFDF9] border border-[#E5D4B3] p-6 space-y-5">
                <h2 className="text-2xl font-normal text-[#1A1612]">
                  Route Metadata Upsert
                </h2>
                <form
                  onSubmit={handleSeoUpsert}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
                >
                  <div className="sm:col-span-3">
                    <label
                      htmlFor="seo-route"
                      className="block font-mono text-xs uppercase text-[#6B5A45] mb-1"
                    >
                      Route Path
                    </label>
                    <input
                      id="seo-route"
                      type="text"
                      placeholder="/varieties/tanzanite"
                      value={newSeoPath}
                      onChange={(e) => setNewSeoPath(e.target.value)}
                      className="w-full rounded-[12px] bg-[#FAF3E3]/60 border border-[#E5D4B3] px-3 py-2 text-sm font-mono"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <label
                      htmlFor="seo-title"
                      className="block font-mono text-xs uppercase text-[#6B5A45] mb-1"
                    >
                      Document Title
                    </label>
                    <input
                      id="seo-title"
                      type="text"
                      placeholder="Merelani Tanzanite Lots | Maihan Gems"
                      value={newSeoTitle}
                      onChange={(e) => setNewSeoTitle(e.target.value)}
                      className="w-full rounded-[12px] bg-[#FAF3E3]/60 border border-[#E5D4B3] px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label
                      htmlFor="seo-desc"
                      className="block font-mono text-xs uppercase text-[#6B5A45] mb-1"
                    >
                      Meta Description
                    </label>
                    <input
                      id="seo-desc"
                      type="text"
                      placeholder="Laboratory-evidenced loose stones..."
                      value={newSeoDesc}
                      onChange={(e) => setNewSeoDesc(e.target.value)}
                      className="w-full rounded-[12px] bg-[#FAF3E3]/60 border border-[#E5D4B3] px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <button
                      type="submit"
                      className="w-full py-2.5 px-3 rounded-full bg-[#1C1610] text-[#E6C97A] text-xs font-mono uppercase tracking-wider"
                    >
                      Upsert SEO
                    </button>
                  </div>
                </form>

                {seoMessage && (
                  <p className="text-xs font-mono text-[#15803D]">{seoMessage}</p>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#E5D4B3] font-mono text-[#8C6D2F] uppercase">
                        <th className="py-2 pr-4">Route</th>
                        <th className="py-2 pr-4">Title</th>
                        <th className="py-2 pr-4">Indexing</th>
                        <th className="py-2">Updated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EFE5D1]">
                      {seoEntries.map((item) => (
                        <tr key={item.id}>
                          <td className="py-2.5 pr-4 font-mono text-[#8C6D2F]">
                            {item.routePath}
                          </td>
                          <td className="py-2.5 pr-4 font-medium">{item.title}</td>
                          <td className="py-2.5 pr-4 font-mono text-[#5C4E3C]">
                            {item.noindex ? 'noindex' : 'index,follow'}
                          </td>
                          <td className="py-2.5 font-mono text-[#5C4E3C] tabular-nums">
                            {item.updatedAt}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}

          {/* NAVIGATION TAB */}
          {activeTab === 'navigation' && (
            <div className="space-y-6">
              <div className="border-b border-[#E5D4B3] pb-3">
                <h1 className="text-3xl font-normal text-[#1A1612]">
                  Storefront Navigation Tree Editor
                </h1>
                <p className="text-sm text-[#5C4E3C]">
                  Inspect and append links across Header, Footer, and Mega-Menu navigation surfaces.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {(['header', 'footer', 'mega-menu'] as const).map((surf) => (
                  <button
                    key={surf}
                    type="button"
                    onClick={() => setSelectedSurface(surf)}
                    className={`px-4 py-2 rounded-full text-xs font-mono uppercase tracking-wider border ${
                      selectedSurface === surf
                        ? 'bg-[#1C1610] text-[#E6C97A] border-[#C5A059]'
                        : 'bg-[#FFFDF9] text-[#1A1612] border-[#E5D4B3]'
                    }`}
                  >
                    {surf} surface
                  </button>
                ))}
              </div>

              <div className="rounded-[24px] bg-[#FFFDF9] border border-[#E5D4B3] p-6 space-y-6">
                {selectedSurface === 'header' && (
                  <ul className="divide-y divide-[#EFE5D1] bg-[#FAF3E3]/50 border border-[#E5D4B3] rounded-[16px]">
                    {navConfig.header.map((item, idx) => (
                      <li
                        key={item.id}
                        className="px-4 py-3 flex items-center justify-between text-sm"
                      >
                        <span className="font-medium">
                          <span className="font-mono text-xs text-[#8C6D2F] mr-3 tabular-nums">
                            #{idx + 1}
                          </span>
                          {item.label}
                        </span>
                        <span className="font-mono text-xs text-[#8C6D2F]">
                          {item.href}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {selectedSurface === 'footer' && (
                  <ul className="divide-y divide-[#EFE5D1] bg-[#FAF3E3]/50 border border-[#E5D4B3] rounded-[16px]">
                    {navConfig.footer.map((item, idx) => (
                      <li
                        key={`${item.href}-${idx}`}
                        className="px-4 py-3 flex items-center justify-between text-sm"
                      >
                        <span className="font-medium">{item.label}</span>
                        <span className="font-mono text-xs text-[#8C6D2F]">
                          {item.href}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {selectedSurface === 'mega-menu' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {navConfig.megaMenuColumns.map((col) => (
                      <div
                        key={col.title}
                        className="rounded-[16px] bg-[#FAF3E3]/50 border border-[#E5D4B3] p-4 space-y-2"
                      >
                        <h3 className="text-lg border-b border-[#E5D4B3] pb-1">
                          {col.title}
                        </h3>
                        <ul className="space-y-1.5 text-xs">
                          {col.links.map((lnk) => (
                            <li key={lnk.href} className="flex justify-between">
                              <span>{lnk.label}</span>
                              <span className="font-mono text-[#8C6D2F]">{lnk.href}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}

                <form
                  onSubmit={handleAddNavItem}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end pt-2"
                >
                  <div className="sm:col-span-5">
                    <label
                      htmlFor="nav-label"
                      className="block font-mono text-xs uppercase text-[#6B5A45] mb-1"
                    >
                      Link Label
                    </label>
                    <input
                      id="nav-label"
                      type="text"
                      placeholder="Matched Earring Pairs"
                      value={newNavLabel}
                      onChange={(e) => setNewNavLabel(e.target.value)}
                      className="w-full rounded-[12px] bg-[#FAF3E3]/60 border border-[#E5D4B3] px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="sm:col-span-5">
                    <label
                      htmlFor="nav-href"
                      className="block font-mono text-xs uppercase text-[#6B5A45] mb-1"
                    >
                      Destination Path
                    </label>
                    <input
                      id="nav-href"
                      type="text"
                      placeholder="/pairs"
                      value={newNavHref}
                      onChange={(e) => setNewNavHref(e.target.value)}
                      className="w-full rounded-[12px] bg-[#FAF3E3]/60 border border-[#E5D4B3] px-3 py-2 text-sm font-mono"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <button
                      type="submit"
                      className="w-full py-2.5 px-3 rounded-full gold-gradient-cta text-xs font-mono uppercase tracking-wider inline-flex items-center justify-center gap-1 font-semibold"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* AI-OPS TAB */}
          {activeTab === 'ai-ops' && (
            <div className="space-y-8">
              <div className="border-b border-[#E5D4B3] pb-3">
                <h1 className="text-3xl font-normal text-[#1A1612]">
                  AI-Ops Pipeline Queue &amp; Guarded Dead-Letter Requeue
                </h1>
                <p className="text-sm text-[#5C4E3C]">
                  Monitor spectral classification, provenance OCR, and WebAR mesh jobs. Dead-letter jobs require explicit operator confirmation and an audit note before requeueing.
                </p>
              </div>

              <section className="rounded-[24px] bg-[#FFFDF9] border border-[#E5D4B3] p-6 space-y-4">
                <h2 className="text-2xl font-normal text-[#1A1612]">Pipeline Jobs</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs font-mono">
                    <thead>
                      <tr className="border-b border-[#E5D4B3] text-[#8C6D2F] uppercase">
                        <th className="py-2 pr-4">Job ID</th>
                        <th className="py-2 pr-4">Queue</th>
                        <th className="py-2 pr-4">Target SKU</th>
                        <th className="py-2 pr-4">Status</th>
                        <th className="py-2 pr-4">Attempts</th>
                        <th className="py-2">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EFE5D1]">
                      {aiJobs.map((job) => (
                        <tr key={job.jobId}>
                          <td className="py-3 pr-4 font-semibold">{job.jobId}</td>
                          <td className="py-3 pr-4">{job.queue}</td>
                          <td className="py-3 pr-4 text-[#8C6D2F]">{job.targetSku}</td>
                          <td className="py-3 pr-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full border ${
                                job.status === 'DEAD_LETTER'
                                  ? 'bg-[#FEF2F2] border-[#FECACA] text-[#B91C1C]'
                                  : job.status === 'COMPLETED'
                                  ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#15803D]'
                                  : 'bg-[#FAF3E3] border-[#E5D4B3] text-[#1A1612]'
                              }`}
                            >
                              {job.status}
                            </span>
                            {job.lastError && (
                              <p className="text-[11px] text-[#B91C1C] mt-1">
                                {job.lastError}
                              </p>
                            )}
                          </td>
                          <td className="py-3 pr-4 tabular-nums">{job.attempts}</td>
                          <td className="py-3">
                            {job.status === 'DEAD_LETTER' ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setRequeueTargetJobId(job.jobId);
                                  setRequeueError(null);
                                }}
                                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#B45309] text-white uppercase tracking-wider hover:bg-[#92400E]"
                              >
                                <RefreshCw className="w-3 h-3" />
                                Guarded Requeue
                              </button>
                            ) : (
                              <span className="text-[#5C4E3C]">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {requeueTargetJobId && (
                  <form
                    onSubmit={handleExecuteGuardedRequeue}
                    className="mt-4 p-5 rounded-[18px] bg-[#FAF3E3] border-2 border-[#B45309] space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs uppercase tracking-wider text-[#B45309] font-semibold">
                        Guarded Dead-Letter Requeue Authorization · {requeueTargetJobId}
                      </span>
                      <button
                        type="button"
                        onClick={() => setRequeueTargetJobId(null)}
                        className="text-xs font-mono text-[#5C4E3C] underline"
                      >
                        Cancel
                      </button>
                    </div>

                    <div>
                      <label
                        htmlFor="requeue-audit-note"
                        className="block font-mono text-xs uppercase text-[#1A1612] mb-1"
                      >
                        Mandatory Operator Audit Note
                      </label>
                      <input
                        id="requeue-audit-note"
                        type="text"
                        placeholder="e.g., Recalibrated goniometer scan; safe to retry"
                        value={requeueAuditNote}
                        onChange={(e) => setRequeueAuditNote(e.target.value)}
                        className="w-full rounded-[12px] bg-white border border-[#E5D4B3] px-3 py-2 text-sm"
                      />
                    </div>

                    <label className="flex items-center gap-2 text-xs font-mono text-[#1A1612]">
                      <input
                        type="checkbox"
                        checked={requeueConfirmChecked}
                        onChange={(e) => setRequeueConfirmChecked(e.target.checked)}
                      />
                      I confirm that the upstream optical/OCR artifact for{' '}
                      {requeueTargetJobId} has been verified before requeueing.
                    </label>

                    {requeueError && (
                      <p role="alert" className="text-xs font-mono text-[#B91C1C]">
                        {requeueError}
                      </p>
                    )}

                    <button
                      type="submit"
                      className="px-5 py-2 rounded-full gold-gradient-cta text-xs font-mono uppercase tracking-wider font-semibold"
                    >
                      Confirm &amp; Requeue Job
                    </button>
                  </form>
                )}
              </section>

              <section className="rounded-[24px] bg-[#1C1610] text-[#FAF3E3] border border-[#C5A059]/30 p-6 space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="font-mono text-xs uppercase tracking-wider text-[#E6C97A] flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    AI-Ops Telemetry Log Tail
                  </span>
                  <span className="font-mono text-[11px] text-[#D8CEBE]">
                    {aiLogs.length} events
                  </span>
                </div>
                <div className="space-y-2 font-mono text-xs max-h-64 overflow-y-auto">
                  {aiLogs.map((entry, idx) => (
                    <div
                      key={idx}
                      className="border-b border-white/10 pb-1.5 text-[#FAF3E3]"
                    >
                      {entry}
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
