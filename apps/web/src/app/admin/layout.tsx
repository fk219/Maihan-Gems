/**
 * apps/web/src/app/admin/layout.tsx
 *
 * Admin route group layout.
 *
 * SoT 12.2: "admin/ — separate layout, separate authz". Auth, RBAC and the
 * admin console are Phase 13; the structural separation (a distinct layout,
 * no storefront chrome, non-indexable) is what Task 1 establishes.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
