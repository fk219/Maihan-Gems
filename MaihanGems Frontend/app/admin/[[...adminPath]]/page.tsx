import React from 'react';
import AdminConsoleClient, { AdminTabId } from '@/components/operator/AdminConsoleClient';
import { getAdminInitialState } from '@/lib/storefront-data';

export default async function AdminCatchAllPage({
  params,
  searchParams,
}: {
  params: Promise<{ adminPath?: string[] }>;
  searchParams: Promise<{ autostart?: string }>;
}) {
  const { adminPath } = await params;
  const { autostart } = await searchParams;
  const segment = adminPath?.[0] || 'overview';

  const initialSection: AdminTabId =
    segment === 'inventory'
      ? 'inventory'
      : segment === 'payments' || segment === 'payouts' || segment === 'audit'
      ? 'payments'
      : segment === 'vendors' || segment === 'kyb'
      ? 'vendors'
      : segment === 'seo'
      ? 'seo'
      : segment === 'navigation'
      ? 'navigation'
      : segment === 'ai-ops'
      ? 'ai-ops'
      : 'overview';

  const adminState = getAdminInitialState();

  return (
    <AdminConsoleClient
      initialSection={initialSection}
      initialAuthenticated={autostart === '1'}
      initialSeoEntries={adminState.seoMetadata}
      initialRedirects={adminState.redirectRules}
      initialNavigation={adminState.navigationConfig}
      initialAiJobs={adminState.aiOpsJobs}
      initialAiLogs={adminState.aiOpsLogs}
    />
  );
}
