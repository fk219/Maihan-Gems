/**
 * apps/web/src/app/(storefront)/account/[[...accountPath]]/page.tsx
 *
 * `/account/**` — develop's CustomerAccountApp, verbatim, on main's session.
 *
 * The component is byte-identical to develop's copy. Everything it reads comes
 * from `/api/fresh/auth/**`, implemented as thin adapters over main's ADR-027
 * session and `packages/db` customer repositories — so there is one identity
 * model, one `maihan_session` cookie and one `customers` row, not a second
 * auth stack.
 *
 * A static segment outranks this optional catch-all, so `/account/login` and
 * `/account/register` keep rendering main's sign-in pages. This page handles
 * the mounted app for every other `/account...` path (the app derives its
 * section from the trailing segments).
 */
import type { Metadata } from 'next';
import { headers } from 'next/headers';

import { CustomerAccountApp } from '@/components/mgh/account/CustomerAccountApp';
import { ClientSurface } from '@/components/mgh/providers/ClientSurface';
import { resolveSiteOrigin } from '../../../../lib/site-origin.js';
import '../../../../styles/portal-premium.css';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const base = resolveSiteOrigin(await headers());
  return {
    title: 'Your Account | Maihan Gems',
    robots: { index: false, follow: false },
    ...(base === null ? {} : { alternates: { canonical: `${base}/account` } }),
  };
}

export default async function AccountPage({
  params,
}: {
  params: Promise<{ accountPath?: string[] }>;
}) {
  const { accountPath } = await params;
  return (
    <ClientSurface>
      <div className="client-frame">
        <CustomerAccountApp subPath={accountPath ?? []} />
      </div>
    </ClientSurface>
  );
}
