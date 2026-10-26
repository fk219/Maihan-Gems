import React from 'react';
import type { Metadata } from 'next';
import { AccountPortalClient } from '@/components/account/AccountPortalClient';

export const metadata: Metadata = {
  title: 'Multi-Role Authentication, Client Dossier & Order Ledger | Maihan Gems',
  description:
    'Authenticate via Email or Google Sign-In, switch between Customer, Vendor, and Admin roles, and manage insured vault orders.',
  robots: { index: false, follow: false },
};

export default async function AccountCatchAllPage({
  params,
}: {
  params: Promise<{ accountPath?: string[] }>;
}) {
  const { accountPath } = await params;
  const subPath = accountPath && accountPath.length > 0 ? accountPath : ['overview'];

  return (
    <div className="golden-cloud-gallery min-h-screen font-[family-name:var(--font-eb-garamond)] text-[#1A1612]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-8">
        <div className="border-b border-[#E5D4B3] pb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[#8C6D2F] font-semibold">
              PRIVATE CLIENT, VENDOR &amp; ADMIN IDENTITY HUB · GENEVA REGISTRY
            </p>
            <h1 className="mt-1.5 text-3xl sm:text-5xl font-normal text-[#1A1612]">
              Client Dossier &amp; Multi-Role Access
            </h1>
          </div>
          <p className="text-sm text-[#5C4E3C] max-w-md">
            Unified identity &amp; role-based access control for Private Clients, Mine &amp; Lapidary Vendors, and Vault Administrators.
          </p>
        </div>

        <AccountPortalClient subPath={subPath} />
      </div>
    </div>
  );
}
