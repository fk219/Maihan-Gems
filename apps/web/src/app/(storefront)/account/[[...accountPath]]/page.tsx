import type { Metadata } from 'next';
import { CustomerAccountApp } from '@/components/mgh/account/CustomerAccountApp';
import { PortalSurface } from '@/components/mgh/providers/PortalSurface';
import { SITE_URL } from '@/lib/mgh/site-url';
import '../../../../styles/portal-premium.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Your Account | Maihan Gems',
  robots: { index: false, follow: false },
  alternates: { canonical: `${SITE_URL}/account` },
};

export default async function AccountPage({
  params,
}: {
  params: Promise<{ accountPath?: string[] }>;
}) {
  const { accountPath } = await params;
  return (
    <div className="portal-theme">
      <div className="client-frame">
        <PortalSurface />
        <CustomerAccountApp subPath={accountPath ?? []} />
      </div>
    </div>
  );
}
