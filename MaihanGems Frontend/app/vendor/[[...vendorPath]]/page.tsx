import React from 'react';
import VendorPortalClient, { VendorTabId } from '@/components/operator/VendorPortalClient';
import { getVendorInitialState } from '@/lib/storefront-data';

export default async function VendorCatchAllPage({
  params,
  searchParams,
}: {
  params: Promise<{ vendorPath?: string[] }>;
  searchParams: Promise<{ autostart?: string; invite?: string }>;
}) {
  const { vendorPath } = await params;
  const { autostart, invite } = await searchParams;
  const segment = vendorPath?.[0] || (invite ? 'onboarding' : 'overview');

  const initialSection: VendorTabId =
    invite
      ? 'onboarding'
      : segment === 'listings' || segment === 'inventory'
      ? 'listings'
      : segment === 'orders'
      ? 'orders'
      : segment === 'payments' || segment === 'payouts'
      ? 'payments'
      : segment === 'onboarding' || segment === 'kyb'
      ? 'onboarding'
      : 'overview';

  const { listings, orders } = getVendorInitialState();

  return (
    <VendorPortalClient
      initialSection={initialSection}
      initialAuthenticated={autostart === '1' || Boolean(invite)}
      initialInviteToken={invite || ''}
      listings={listings}
      orders={orders}
    />
  );
}
