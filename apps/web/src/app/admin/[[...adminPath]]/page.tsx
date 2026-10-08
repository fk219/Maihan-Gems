/**
 * apps/web/src/app/admin/[[...adminPath]]/page.tsx
 *
 * `/admin/**` — back office. SoT 13.2 new target-only route
 * (`/admin/** — back office`).Auth, RBAC and console UI are Phase 13; a
 * single catch-all holds the shape (zero storefront functionality) until
 * that phase prescribes the real sub-routes.
 */
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return null;
}
