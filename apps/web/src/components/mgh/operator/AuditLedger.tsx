'use client';

import React, { useState, useMemo } from 'react';
import { Search, CheckCircle2, ArrowUpDown, RotateCcw } from 'lucide-react';
import { formatUsd } from '@/lib/mgh/storefront-data';
import {
  calculatePaymentLedgerMetrics,
  filterPaymentAuditLogs,
} from '@/lib/mgh/platform-governance';
import type { PaymentAuditLogEntry, PaymentAuditStatus } from '@/lib/mgh/platform-governance';

export interface AuditLedgerProps {
  logs: PaymentAuditLogEntry[];
  operatorEmail: string;
  onUpdateStatus: (transactionId: string, nextStatus: PaymentAuditStatus) => void;
  onAddTransaction: (entry: PaymentAuditLogEntry) => void;
}

export function AuditLedger({
  logs,
  operatorEmail,
  onUpdateStatus,
  onAddTransaction,
}: AuditLedgerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PaymentAuditStatus | 'ALL'>('ALL');
  const [vendorFilter, setVendorFilter] = useState<string>('ALL');
  const [paymentRailFilter, setPaymentRailFilter] = useState<string>('ALL');
  const [sortOrder, setSortOrder] = useState<'NEWEST' | 'OLDEST' | 'AMOUNT_DESC' | 'AMOUNT_ASC'>(
    'NEWEST'
  );
  const [feedback, setFeedback] = useState<string | null>(null);

  // Record New Audit Transaction Form State
  const [newTxOrderId, setNewTxOrderId] = useState('ORD-2026-9099');
  const [newTxPoNumber] = useState('PO-MHG-2026-109');
  const [newTxCustomerId, setNewTxCustomerId] = useState('USR-CLAIRE-8841');
  const [newTxVendorId, setNewTxVendorId] = useState('VND-ARUSHA-01');
  const [newTxSku, setNewTxSku] = useState('MG-TZ-0131');
  const [newTxGrossUsd, setNewTxGrossUsd] = useState('14800');
  const [newTxStatus, setNewTxStatus] = useState<PaymentAuditStatus>('SETTLED');
  const [newTxAuditNote, setNewTxAuditNote] = useState(
    'Verified treasury wire settlement and released vendor payout.'
  );

  const uniqueVendors = useMemo(() => {
    const map = new Map<string, string>();
    for (const entry of logs) {
      map.set(entry.vendorId, entry.vendorName);
    }
    return Array.from(map.entries());
  }, [logs]);

  const filteredAndSortedLogs = useMemo(() => {
    const filtered = filterPaymentAuditLogs(logs, {
      status: statusFilter,
      vendorId: vendorFilter,
      paymentMethod: paymentRailFilter,
      query: searchQuery,
    });

    return [...filtered].sort((a, b) => {
      if (sortOrder === 'NEWEST') return b.timestamp.localeCompare(a.timestamp);
      if (sortOrder === 'OLDEST') return a.timestamp.localeCompare(b.timestamp);
      if (sortOrder === 'AMOUNT_DESC') return b.grossAmountUsd - a.grossAmountUsd;
      return a.grossAmountUsd - b.grossAmountUsd;
    });
  }, [logs, statusFilter, vendorFilter, paymentRailFilter, searchQuery, sortOrder]);

  const metrics = useMemo(
    () => calculatePaymentLedgerMetrics(filteredAndSortedLogs),
    [filteredAndSortedLogs]
  );

  const handleCreateTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const gross = Number(newTxGrossUsd) || 10000;
    const fee = Math.round(gross * 0.12);
    const net = gross - fee;
    const vendorMap: Record<
      string,
      { name: string; jurisdiction: string; ref: string }
    > = {
      'VND-ARUSHA-01': {
        name: 'Arusha Lapidary Cooperative',
        jurisdiction: 'Tanzania · Merelani Zone',
        ref: 'CRDB / UBS · TZ59CRDB...2900',
      },
      'VND-RATNAPURA-02': {
        name: 'Ratnapura Corundum Syndicate',
        jurisdiction: 'Sri Lanka · Sabaragamuwa',
        ref: 'Commercial Bank PLC · LK88CCEY...7102',
      },
      'VND-GENEVA-03': {
        name: 'Geneva Master Bench #4',
        jurisdiction: 'Switzerland · Rue du Rhône',
        ref: 'UBS Geneva · CH930076...2957',
      },
      'VND-CHIVOR-04': {
        name: 'Bogotá & Chivor Emerald Guild',
        jurisdiction: 'Colombia · Boyacá District',
        ref: 'Bancolombia · CO890070...1029',
      },
    };
    const meta = vendorMap[newTxVendorId.trim()] || {
      name: 'Authorized Partner Atelier',
      jurisdiction: 'Geneva Vault Clearing',
      ref: 'UBS Treasury · CH930076...0001',
    };

    const entry: PaymentAuditLogEntry = {
      transactionId: `TXN-2026-${Date.now().toString().slice(-5)}`,
      timestamp: new Date().toISOString(),
      orderId: newTxOrderId.trim() || 'ORD-2026-9100',
      poNumber: newTxPoNumber.trim() || 'PO-MHG-2026-110',
      customerId: newTxCustomerId.trim() || 'USR-CLAIRE-8841',
      vendorId: newTxVendorId.trim() || 'VND-ARUSHA-01',
      vendorName: meta.name,
      vendorJurisdiction: meta.jurisdiction,
      vendorSettlementRef: meta.ref,
      stoneSku: newTxSku.trim() || 'MG-TZ-0131',
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

    onAddTransaction(entry);
    setFeedback(
      `Recorded payment audit entry ${entry.transactionId} (${entry.orderId}) for ${entry.vendorName}.`
    );
  };

  const handleStatusTransition = (txId: string, next: PaymentAuditStatus) => {
    onUpdateStatus(txId, next);
    setFeedback(`Transaction ${txId} status updated to ${next}.`);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setVendorFilter('ALL');
    setPaymentRailFilter('ALL');
    setSortOrder('NEWEST');
  };

  return (
    <div className="space-y-8" data-testid="admin-audit-ledger">
      {/* Header & Summary Strip */}
      <div className="border-b border-[#E5D4B3] pb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#8C6D2F]">
            Treasury Governance · Immutable Payment &amp; Settlement Trail
          </p>
          <h1 className="text-3xl font-normal text-[#1A1612] mt-1">
            Audit Ledger — Payment Transactions &amp; Vendor Settlements
          </h1>
          <p className="text-sm text-[#5C4E3C] mt-1">
            Search and filter all platform payment transactions across timestamps, amounts, transaction statuses, order IDs, and associated vendor profiles.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
          <div className="rounded-[14px] border border-[#E5D4B3] bg-[#FFFDF9] px-4 py-2.5">
            <span className="text-[#8C6D2F] block text-[10px] uppercase">Filtered Settled Volume</span>
            <span className="text-base font-semibold text-[#1A1612] tabular-nums">
              {formatUsd(metrics.totalSettledVolumeUsd)}
            </span>
          </div>
          <div className="rounded-[14px] border border-[#E5D4B3] bg-[#FFFDF9] px-4 py-2.5">
            <span className="text-[#8C6D2F] block text-[10px] uppercase">Platform Commission</span>
            <span className="text-base font-semibold text-[#1A1612] tabular-nums">
              {formatUsd(metrics.totalPlatformCommissionUsd)}
            </span>
          </div>
          <div className="rounded-[14px] border border-[#E5D4B3] bg-[#FFFDF9] px-4 py-2.5">
            <span className="text-[#8C6D2F] block text-[10px] uppercase">Matching Records</span>
            <span className="text-base font-semibold text-[#15803D] tabular-nums">
              {filteredAndSortedLogs.length} / {logs.length}
            </span>
          </div>
        </div>
      </div>

      {feedback && (
        <div
          role="status"
          className="rounded-[14px] border border-[#166534] bg-[#F0FDF4] p-4 text-xs font-mono text-[#166534] flex items-center gap-2"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Search & Multi-Facet Filter Bar */}
      <section
        aria-label="Audit Ledger Search and Filters"
        className="rounded-[24px] bg-[#FFFDF9] border border-[#E5D4B3] p-5 space-y-4 shadow-[0_8px_24px_rgba(36,26,14,0.04)]"
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-4">
            <label
              htmlFor="audit-ledger-search"
              className="block font-mono text-[11px] uppercase tracking-wider text-[#6B5A45] mb-1"
            >
              Search Ledger (Order ID, Tx ID, Vendor, SKU, Timestamp)
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#8C6D2F] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="audit-ledger-search"
                data-testid="audit-ledger-search-input"
                type="text"
                placeholder="Search ORD-2026-9012, Arusha, TXN-2026..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/50 pl-9 pr-3.5 py-2 text-xs font-mono text-[#1A1612] focus:border-[#8C6D2F] focus:outline-none"
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <label
              htmlFor="audit-ledger-status-filter"
              className="block font-mono text-[11px] uppercase tracking-wider text-[#6B5A45] mb-1"
            >
              Transaction Status
            </label>
            <select
              id="audit-ledger-status-filter"
              data-testid="audit-ledger-status-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as PaymentAuditStatus | 'ALL')}
              className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/50 px-3 py-2 text-xs font-mono text-[#1A1612]"
            >
              <option value="ALL">All Statuses</option>
              <option value="SETTLED">SETTLED</option>
              <option value="ESCROW_HOLD">ESCROW_HOLD</option>
              <option value="PENDING_WIRE">PENDING_WIRE</option>
              <option value="FLAGGED_COMPLIANCE">FLAGGED_COMPLIANCE</option>
              <option value="REFUNDED">REFUNDED</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <label
              htmlFor="audit-ledger-vendor-filter"
              className="block font-mono text-[11px] uppercase tracking-wider text-[#6B5A45] mb-1"
            >
              Associated Vendor
            </label>
            <select
              id="audit-ledger-vendor-filter"
              data-testid="audit-ledger-vendor-select"
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
              className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/50 px-3 py-2 text-xs font-mono text-[#1A1612]"
            >
              <option value="ALL">All Vendors ({uniqueVendors.length})</option>
              {uniqueVendors.map(([vId, vName]) => (
                <option key={vId} value={vId}>
                  {vId} — {vName}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label
              htmlFor="audit-ledger-sort"
              className="block font-mono text-[11px] uppercase tracking-wider text-[#6B5A45] mb-1"
            >
              Sort Order
            </label>
            <div className="relative">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#8C6D2F] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                id="audit-ledger-sort"
                value={sortOrder}
                onChange={(e) =>
                  setSortOrder(
                    e.target.value as 'NEWEST' | 'OLDEST' | 'AMOUNT_DESC' | 'AMOUNT_ASC'
                  )
                }
                className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/50 pl-8 pr-3 py-2 text-xs font-mono text-[#1A1612]"
              >
                <option value="NEWEST">Timestamp: Newest</option>
                <option value="OLDEST">Timestamp: Oldest</option>
                <option value="AMOUNT_DESC">Amount: High → Low</option>
                <option value="AMOUNT_ASC">Amount: Low → High</option>
              </select>
            </div>
          </div>

          <div className="md:col-span-1">
            <button
              type="button"
              onClick={handleResetFilters}
              title="Reset ledger filters"
              className="w-full inline-flex items-center justify-center gap-1 rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3] hover:bg-[#EFE5D1] px-3 py-2 text-xs font-mono text-[#5C4E3C] transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>
        </div>
      </section>

      {/* Searchable, Filterable Audit Ledger Table */}
      <section className="rounded-[24px] bg-[#FFFDF9] border border-[#E5D4B3] p-6 overflow-x-auto shadow-[0_10px_28px_rgba(36,26,14,0.05)]">
        <table
          className="w-full text-left border-collapse text-xs font-mono"
          data-testid="audit-ledger-table"
        >
          <thead>
            <tr className="border-b border-[#E5D4B3] text-[#8C6D2F] uppercase">
              <th className="py-3 pr-4">Timestamp &amp; Tx ID</th>
              <th className="py-3 pr-4">Order ID &amp; Client</th>
              <th className="py-3 pr-4">Amount (Gross / Net)</th>
              <th className="py-3 pr-4">Transaction Status</th>
              <th className="py-3 pr-4">Associated Vendor Info</th>
              <th className="py-3">Treasury Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EFE5D1]">
            {filteredAndSortedLogs.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-sm font-sans text-[#6B5A45]">
                  No payment transactions match your current filter criteria.
                </td>
              </tr>
            ) : (
              filteredAndSortedLogs.map((log) => (
                <tr key={log.transactionId} className="hover:bg-[#FAF3E3]/40 align-top">
                  {/* Column 1: Timestamp & Transaction ID */}
                  <td className="py-3.5 pr-4 whitespace-nowrap">
                    <span className="font-semibold text-[#1A1612] tabular-nums block">
                      {log.timestamp.replace('T', ' ').replace('Z', ' UTC')}
                    </span>
                    <span className="text-[11px] text-[#8C6D2F] block mt-0.5">
                      {log.transactionId}
                    </span>
                    <span className="text-[10px] text-[#6B5A45] block">
                      {log.paymentMethod} · {log.referenceHash.slice(0, 18)}
                    </span>
                  </td>

                  {/* Column 2: Order ID & Customer */}
                  <td className="py-3.5 pr-4 whitespace-nowrap">
                    <span className="font-semibold text-[#1A1612] block">{log.orderId}</span>
                    <span className="text-[11px] text-[#6B5A45] block">
                      PO: {log.poNumber} · SKU: {log.stoneSku}
                    </span>
                    <span className="text-[11px] text-[#8C6D2F] block">
                      Customer: {log.customerId}
                    </span>
                  </td>

                  {/* Column 3: Amount Breakdown */}
                  <td className="py-3.5 pr-4 tabular-nums whitespace-nowrap">
                    <span className="font-semibold text-sm text-[#1A1612] block">
                      {formatUsd(log.grossAmountUsd)}
                    </span>
                    <span className="text-[11px] text-[#6B5A45] block">
                      Fee: {formatUsd(log.platformCommissionUsd)}
                    </span>
                    <span className="text-[11px] font-semibold text-[#15803D] block">
                      Net Payout: {formatUsd(log.netPayoutUsd)}
                    </span>
                  </td>

                  {/* Column 4: Transaction Status */}
                  <td className="py-3.5 pr-4 whitespace-nowrap">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-[10px] uppercase font-semibold ${
                        log.status === 'SETTLED'
                          ? 'bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]'
                          : log.status === 'FLAGGED_COMPLIANCE' || log.status === 'REFUNDED'
                          ? 'bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA]'
                          : 'bg-[#FAF3E3] text-[#8C6D2F] border border-[#E5D4B3]'
                      }`}
                    >
                      {log.status}
                    </span>
                    <span className="block text-[10px] text-[#6B5A45] mt-1">
                      {log.direction.replace(/_/g, ' ')}
                    </span>
                  </td>

                  {/* Column 5: Associated Vendor Info */}
                  <td className="py-3.5 pr-4 max-w-xs">
                    <span className="font-sans font-semibold text-[#1A1612] block">
                      {log.vendorName}
                    </span>
                    <span className="text-[11px] text-[#8C6D2F] block">
                      ID: {log.vendorId}{' '}
                      {log.vendorJurisdiction ? `· ${log.vendorJurisdiction}` : ''}
                    </span>
                    {log.vendorSettlementRef && (
                      <span className="text-[11px] text-[#6B5A45] block">
                        Rail: {log.vendorSettlementRef}
                      </span>
                    )}
                    <p className="font-sans text-[11px] text-[#5C4E3C] mt-1 line-clamp-2">
                      {log.auditNote}
                    </p>
                  </td>

                  {/* Column 6: Admin Governance Actions */}
                  <td className="py-3.5 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1.5">
                      {log.status !== 'SETTLED' && (
                        <button
                          type="button"
                          onClick={() => handleStatusTransition(log.transactionId, 'SETTLED')}
                          className="px-2.5 py-1 rounded-full bg-[#15803D] text-white text-[10px] uppercase tracking-wider hover:bg-[#166534] cursor-pointer"
                        >
                          Release Payout
                        </button>
                      )}
                      {log.status !== 'ESCROW_HOLD' && log.status !== 'SETTLED' && (
                        <button
                          type="button"
                          onClick={() =>
                            handleStatusTransition(log.transactionId, 'ESCROW_HOLD')
                          }
                          className="px-2.5 py-1 rounded-full border border-[#8C6D2F] text-[#8C6D2F] text-[10px] uppercase tracking-wider hover:bg-[#FAF3E3] cursor-pointer"
                        >
                          Hold Escrow
                        </button>
                      )}
                      {log.status !== 'FLAGGED_COMPLIANCE' && (
                        <button
                          type="button"
                          onClick={() =>
                            handleStatusTransition(log.transactionId, 'FLAGGED_COMPLIANCE')
                          }
                          className="px-2.5 py-1 rounded-full bg-[#B91C1C] text-white text-[10px] uppercase tracking-wider hover:bg-[#991B1B] cursor-pointer"
                        >
                          Flag AML
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {/* Record New Treasury Wire / Payment Audit Event */}
      <section className="rounded-[24px] bg-[#FFFDF9] border border-[#E5D4B3] p-6 space-y-4">
        <h2 className="text-xl font-normal text-[#1A1612]">
          Record Treasury Wire / Vendor Payout Audit Entry
        </h2>
        <form
          onSubmit={handleCreateTransaction}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end"
        >
          <div>
            <label
              htmlFor="adm-tx-order"
              className="block font-mono text-xs uppercase text-[#6B5A45] mb-1"
            >
              Order ID
            </label>
            <input
              id="adm-tx-order"
              type="text"
              value={newTxOrderId}
              onChange={(e) => setNewTxOrderId(e.target.value)}
              className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/60 px-3 py-2 text-xs font-mono"
            />
          </div>
          <div>
            <label
              htmlFor="adm-tx-user"
              className="block font-mono text-xs uppercase text-[#6B5A45] mb-1"
            >
              Customer User ID
            </label>
            <input
              id="adm-tx-user"
              type="text"
              value={newTxCustomerId}
              onChange={(e) => setNewTxCustomerId(e.target.value)}
              className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/60 px-3 py-2 text-xs font-mono"
            />
          </div>
          <div>
            <label
              htmlFor="adm-tx-vendor"
              className="block font-mono text-xs uppercase text-[#6B5A45] mb-1"
            >
              Associated Vendor
            </label>
            <select
              id="adm-tx-vendor"
              value={newTxVendorId}
              onChange={(e) => setNewTxVendorId(e.target.value)}
              className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/60 px-3 py-2 text-xs font-mono"
            >
              <option value="VND-ARUSHA-01">VND-ARUSHA-01 · Arusha Lapidary</option>
              <option value="VND-RATNAPURA-02">VND-RATNAPURA-02 · Ratnapura Syndicate</option>
              <option value="VND-GENEVA-03">VND-GENEVA-03 · Geneva Master Bench #4</option>
              <option value="VND-CHIVOR-04">VND-CHIVOR-04 · Bogotá &amp; Chivor Guild</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="adm-tx-gross"
              className="block font-mono text-xs uppercase text-[#6B5A45] mb-1"
            >
              Gross Amount (USD)
            </label>
            <input
              id="adm-tx-gross"
              type="number"
              value={newTxGrossUsd}
              onChange={(e) => setNewTxGrossUsd(e.target.value)}
              className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/60 px-3 py-2 text-xs font-mono"
            />
          </div>
          <div>
            <label
              htmlFor="adm-tx-sku"
              className="block font-mono text-xs uppercase text-[#6B5A45] mb-1"
            >
              Stone / Setting SKU
            </label>
            <input
              id="adm-tx-sku"
              type="text"
              value={newTxSku}
              onChange={(e) => setNewTxSku(e.target.value)}
              className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/60 px-3 py-2 text-xs font-mono"
            />
          </div>
          <div>
            <label
              htmlFor="adm-tx-status"
              className="block font-mono text-xs uppercase text-[#6B5A45] mb-1"
            >
              Settlement Status
            </label>
            <select
              id="adm-tx-status"
              value={newTxStatus}
              onChange={(e) => setNewTxStatus(e.target.value as PaymentAuditStatus)}
              className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/60 px-3 py-2 text-xs font-mono"
            >
              <option value="SETTLED">SETTLED</option>
              <option value="ESCROW_HOLD">ESCROW_HOLD</option>
              <option value="PENDING_WIRE">PENDING_WIRE</option>
              <option value="FLAGGED_COMPLIANCE">FLAGGED_COMPLIANCE</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="adm-tx-note"
              className="block font-mono text-xs uppercase text-[#6B5A45] mb-1"
            >
              Audit Note
            </label>
            <input
              id="adm-tx-note"
              type="text"
              value={newTxAuditNote}
              onChange={(e) => setNewTxAuditNote(e.target.value)}
              className="w-full rounded-[12px] border border-[#E5D4B3] bg-[#FAF3E3]/60 px-3 py-2 text-xs"
            />
          </div>
          <div>
            <button
              type="submit"
              data-testid="admin-record-payment-btn"
              className="w-full py-2.5 px-4 rounded-full gold-gradient-cta text-xs font-mono uppercase tracking-wider font-semibold cursor-pointer"
            >
              + Log Payment Event
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
